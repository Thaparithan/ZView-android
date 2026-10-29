package com.zynor.zview.domain

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import android.net.Uri
import com.zynor.zview.data.local.PdfPageSize
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

object PdfExporter {

    sealed class PdfResult {
        data class Success(val file: File, val sizeBytes: Long) : PdfResult()
        data class Error(val reason: String) : PdfResult()
    }

    /**
     * Generates a real multi-page PDF file using Android's native PdfDocument API on Dispatchers.IO.
     * Verifies output existence and non-zero byte count before returning Success.
     */
    suspend fun generatePdf(
        context: Context,
        documentName: String,
        pageImagePaths: List<String>,
        pageSize: PdfPageSize = PdfPageSize.A4,
        allowOverwrite: Boolean = false
    ): PdfResult = withContext(Dispatchers.IO) {
        if (pageImagePaths.isEmpty()) {
            return@withContext PdfResult.Error("Cannot create a PDF with zero pages.")
        }

        val validation = FilenameValidator.validate(documentName)
        if (!validation.isValid) {
            return@withContext PdfResult.Error(validation.errorMessage ?: "Invalid filename.")
        }

        val pdfDir = File(context.filesDir, "pdfs").apply { mkdirs() }
        val targetFile = File(pdfDir, "${validation.sanitizedName}.pdf")

        if (targetFile.exists() && !allowOverwrite) {
            return@withContext PdfResult.Error("A PDF named '${validation.sanitizedName}.pdf' already exists.")
        }

        val pdfDocument = PdfDocument()
        try {
            pageImagePaths.forEachIndexed { index, imagePath ->
                val file = File(imagePath)
                if (!file.exists()) {
                    throw IllegalStateException("Page ${index + 1} image file is missing.")
                }

                val boundsOpts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeFile(file.absolutePath, boundsOpts)
                if (boundsOpts.outWidth <= 0 || boundsOpts.outHeight <= 0) {
                    throw IllegalStateException("Page ${index + 1} image is corrupt or unsupported.")
                }

                val sampleSize = calculateInSampleSize(boundsOpts.outWidth, boundsOpts.outHeight, 1800, 2400)
                val decodeOpts = BitmapFactory.Options().apply { inSampleSize = sampleSize }
                val bitmap = BitmapFactory.decodeFile(file.absolutePath, decodeOpts)
                    ?: throw IllegalStateException("Unable to decode page ${index + 1}.")

                try {
                    val isLandscape = bitmap.width > bitmap.height
                    val pageWidth = when {
                        pageSize == PdfPageSize.FIT_IMAGE -> bitmap.width.coerceIn(300, 1600)
                        isLandscape -> pageSize.heightPt
                        else -> pageSize.widthPt
                    }
                    val pageHeight = when {
                        pageSize == PdfPageSize.FIT_IMAGE -> bitmap.height.coerceIn(300, 2200)
                        isLandscape -> pageSize.widthPt
                        else -> pageSize.heightPt
                    }

                    val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, index + 1).create()
                    val page = pdfDocument.startPage(pageInfo)
                    val canvas = page.canvas
                    canvas.drawColor(Color.WHITE)

                    val margin = if (pageSize == PdfPageSize.FIT_IMAGE) 0f else 24f
                    val availW = pageWidth - margin * 2
                    val availH = pageHeight - margin * 2
                    val scale = minOf(availW / bitmap.width.toFloat(), availH / bitmap.height.toFloat())
                    val destW = bitmap.width * scale
                    val destH = bitmap.height * scale
                    val left = (pageWidth - destW) / 2f
                    val top = (pageHeight - destH) / 2f

                    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
                    canvas.drawBitmap(bitmap, null, RectF(left, top, left + destW, top + destH), paint)
                    pdfDocument.finishPage(page)
                } finally {
                    bitmap.recycle()
                }
            }

            FileOutputStream(targetFile).use { out ->
                pdfDocument.writeTo(out)
                out.fd.sync()
            }

            if (!targetFile.exists() || targetFile.length() <= 0L) {
                return@withContext PdfResult.Error("PDF generation failed verification.")
            }

            PdfResult.Success(targetFile, targetFile.length())
        } catch (e: Exception) {
            targetFile.delete()
            PdfResult.Error(e.message ?: "Failed to generate PDF document.")
        } finally {
            pdfDocument.close()
        }
    }

    /**
     * Copies an internal verified PDF to a user-selected Android Storage Access Framework (SAF) URI.
     */
    suspend fun exportPdfToSafUri(
        context: Context,
        sourcePdfFile: File,
        destinationUri: Uri
    ): Result<Long> = withContext(Dispatchers.IO) {
        runCatching {
            if (!sourcePdfFile.exists() || sourcePdfFile.length() == 0L) {
                throw IllegalStateException("Source PDF file does not exist.")
            }
            val resolver = context.contentResolver
            resolver.openOutputStream(destinationUri, "wt")?.use { out ->
                sourcePdfFile.inputStream().use { input ->
                    input.copyTo(out)
                }
                out.flush()
            } ?: throw IllegalStateException("Unable to open destination URI for writing.")
            sourcePdfFile.length()
        }
    }

    private fun calculateInSampleSize(width: Int, height: Int, reqWidth: Int, reqHeight: Int): Int {
        var inSampleSize = 1
        if (height > reqHeight || width > reqWidth) {
            val halfHeight = height / 2
            val halfWidth = width / 2
            while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                inSampleSize *= 2
            }
        }
        return inSampleSize
    }
}
