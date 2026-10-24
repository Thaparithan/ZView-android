package com.zynor.zview.data.repository

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Privacy-respecting Cloud & Local Folder Sync Manager built on Android Storage Access Framework (SAF).
 * Allows users to optionally mirror exported PDFs to a user-chosen Google Drive, Nextcloud, or local
 * SAF directory without embedding proprietary cloud tracking SDKs or requiring ZView accounts.
 */
class CloudSyncManager(private val context: Context) {

    fun persistSafFolderPermission(treeUri: Uri) {
        val takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        context.contentResolver.takePersistableUriPermission(treeUri, takeFlags)
    }

    suspend fun syncPdfToSafTree(
        treeUriString: String,
        pdfFile: File
    ): Result<Uri> = withContext(Dispatchers.IO) {
        runCatching {
            val treeUri = Uri.parse(treeUriString)
            val docId = DocumentsContract.getTreeDocumentId(treeUri)
            val parentDocUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId)

            val targetUri = DocumentsContract.createDocument(
                context.contentResolver,
                parentDocUri,
                "application/pdf",
                pdfFile.name
            ) ?: throw IllegalStateException("Could not create cloud sync file in selected SAF folder.")

            context.contentResolver.openOutputStream(targetUri, "wt")?.use { out ->
                pdfFile.inputStream().use { input -> input.copyTo(out) }
                out.flush()
            } ?: throw IllegalStateException("Could not write PDF stream to cloud sync folder.")

            targetUri
        }
    }
}
