package com.zynor.zview.data.repository

import android.content.Context
import android.graphics.Bitmap
import com.zynor.zview.data.local.DocumentDao
import com.zynor.zview.data.local.DocumentEntity
import com.zynor.zview.data.local.EnhancementMode
import com.zynor.zview.data.local.PageEntity
import com.zynor.zview.data.local.PdfPageSize
import com.zynor.zview.domain.FilenameValidator
import com.zynor.zview.domain.PdfExporter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

class DocumentRepository(
    private val context: Context,
    private val documentDao: DocumentDao,
    private val cloudSyncManager: CloudSyncManager
) {
    val allDocuments: Flow<List<DocumentEntity>> = documentDao.observeAllDocuments()
    val recentDocuments: Flow<List<DocumentEntity>> = documentDao.observeRecentDocuments(5)

    fun observePages(documentId: String): Flow<List<PageEntity>> =
        documentDao.observePagesForDocument(documentId)

    suspend fun getDocumentById(documentId: String): DocumentEntity? =
        documentDao.getDocumentById(documentId)

    suspend fun getPages(documentId: String): List<PageEntity> =
        documentDao.getPagesForDocument(documentId)

    /**
     * Checks whether the underlying PDF file still exists on local storage.
     */
    suspend fun verifyDocumentFiles(document: DocumentEntity): Boolean = withContext(Dispatchers.IO) {
        val pdfPath = document.pdfFilePath ?: return@withContext false
        val file = File(pdfPath)
        file.exists() && file.length() > 0L
    }

    suspend fun saveBitmapToInternalStorage(bitmap: Bitmap, prefix: String = "page"): File =
        withContext(Dispatchers.IO) {
            val pagesDir = File(context.filesDir, "pages").apply { mkdirs() }
            val outFile = File(pagesDir, "${prefix}_${UUID.randomUUID()}.jpg")
            FileOutputStream(outFile).use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
                out.fd.sync()
            }
            outFile
        }

    suspend fun createAndSaveDocument(
        rawName: String,
        pages: List<PageEntity>,
        pageSize: PdfPageSize,
        allowOverwrite: Boolean,
        safBackupUri: String? = null
    ): Result<DocumentEntity> = withContext(Dispatchers.IO) {
        runCatching {
            val validation = FilenameValidator.validate(rawName)
            require(validation.isValid) { validation.errorMessage ?: "Invalid document name." }
            require(pages.isNotEmpty()) { "At least one scanned page is required." }

            val pdfResult = PdfExporter.generatePdf(
                context = context,
                documentName = validation.sanitizedName,
                pageImagePaths = pages.map { it.processedImagePath },
                pageSize = pageSize,
                allowOverwrite = allowOverwrite
            )

            val pdfSuccess = when (pdfResult) {
                is PdfExporter.PdfResult.Success -> pdfResult
                is PdfExporter.PdfResult.Error -> throw IllegalStateException(pdfResult.reason)
            }

            var syncedToCloud = false
            if (!safBackupUri.isNullOrBlank()) {
                syncedToCloud = cloudSyncManager.syncPdfToSafTree(safBackupUri, pdfSuccess.file).isSuccess
            }

            val now = System.currentTimeMillis()
            val docId = pages.first().documentId
            val entity = DocumentEntity(
                id = docId,
                name = validation.sanitizedName,
                createdAt = now,
                updatedAt = now,
                pageCount = pages.size,
                pdfFilePath = pdfSuccess.file.absolutePath,
                fileSizeBytes = pdfSuccess.sizeBytes,
                thumbnailPath = pages.first().processedImagePath,
                pageSize = pageSize.name,
                isSyncedToSafBackup = syncedToCloud
            )

            documentDao.saveDocumentWithPages(entity, pages)
            entity
        }
    }

    suspend fun renameDocument(documentId: String, newRawName: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val validation = FilenameValidator.validate(newRawName)
                require(validation.isValid) { validation.errorMessage ?: "Invalid document name." }

                val current = documentDao.getDocumentById(documentId)
                    ?: throw IllegalStateException("Document not found.")

                var updatedPdfPath = current.pdfFilePath
                current.pdfFilePath?.let { path ->
                    val oldFile = File(path)
                    if (oldFile.exists()) {
                        val targetFile = File(oldFile.parentFile, "${validation.sanitizedName}.pdf")
                        if (targetFile.exists() && targetFile.absolutePath != oldFile.absolutePath) {
                            throw IllegalStateException("A file with that name already exists.")
                        }
                        if (oldFile.renameTo(targetFile)) {
                            updatedPdfPath = targetFile.absolutePath
                        }
                    }
                }

                documentDao.renameDocument(
                    documentId = documentId,
                    newName = validation.sanitizedName,
                    updatedAt = System.currentTimeMillis(),
                    newPdfPath = updatedPdfPath
                )
            }
        }

    suspend fun deleteDocument(documentId: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val doc = documentDao.getDocumentById(documentId)
            val pages = documentDao.getPagesForDocument(documentId)
            pages.forEach { page ->
                runCatching { File(page.originalImagePath).delete() }
                runCatching { File(page.processedImagePath).delete() }
            }
            doc?.pdfFilePath?.let { runCatching { File(it).delete() } }
            documentDao.deleteDocumentById(documentId)
        }
    }
}
