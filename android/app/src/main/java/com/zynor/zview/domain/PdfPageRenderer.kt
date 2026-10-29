package com.zynor.zview.domain

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.Closeable
import java.io.File

/**
 * Thread-safe, lifecycle-aware Android PDF page renderer built on android.graphics.pdf.PdfRenderer.
 * Supports opening PDFs from raw filesystem paths, file:// URIs, and content:// URIs,
 * renders individual pages on demand at bounded resolution, and deterministically releases
 * ParcelFileDescriptor and PdfRenderer resources when closed.
 */
class PdfPageRenderer private constructor(
    private val fileDescriptor: ParcelFileDescriptor,
    private val pdfRenderer: PdfRenderer
) : Closeable {

    private val renderMutex = Mutex()

    @Volatile
    private var isClosed = false

    val pageCount: Int
        get() = if (isClosed) 0 else pdfRenderer.pageCount

    suspend fun renderPage(
        pageIndex: Int,
        maxDimensionPx: Int = 1600
    ): Result<Bitmap> = withContext(Dispatchers.IO) {
        renderMutex.withLock {
            runCatching {
                check(!isClosed) { "PDF renderer has already been closed." }
                require(pageIndex in 0 until pdfRenderer.pageCount) {
                    "Requested page index $pageIndex out of bounds (total ${pdfRenderer.pageCount})."
                }

                pdfRenderer.openPage(pageIndex).use { page ->
                    val rawW = page.width.coerceAtLeast(1)
                    val rawH = page.height.coerceAtLeast(1)
                    val scale = (maxDimensionPx.toFloat() / maxOf(rawW, rawH).toFloat())
                        .coerceIn(0.5f, 2.5f)
                    val targetW = (rawW * scale).toInt().coerceAtLeast(1)
                    val targetH = (rawH * scale).toInt().coerceAtLeast(1)

                    val bitmap = Bitmap.createBitmap(targetW, targetH, Bitmap.Config.ARGB_8888)
                    bitmap.eraseColor(Color.WHITE)
                    page.render(
                        bitmap,
                        null,
                        null,
                        PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY
                    )
                    bitmap
                }
            }
        }
    }

    override fun close() {
        if (isClosed) return
        isClosed = true
        runCatching { pdfRenderer.close() }
        runCatching { fileDescriptor.close() }
    }

    companion object {
        /**
         * Opens a PdfPageRenderer from either a raw filesystem path or a content:// / file:// URI string.
         */
        suspend fun open(
            context: Context,
            pathOrUri: String?
        ): Result<PdfPageRenderer> = withContext(Dispatchers.IO) {
            runCatching {
                require(!pathOrUri.isNullOrBlank()) { "PDF file path or URI is missing." }

                val pfd: ParcelFileDescriptor = when {
                    pathOrUri.startsWith("content://") || pathOrUri.startsWith("file://") -> {
                        val uri = Uri.parse(pathOrUri)
                        context.contentResolver.openFileDescriptor(uri, "r")
                            ?: throw IllegalStateException("Unable to open PDF descriptor from URI.")
                    }
                    else -> {
                        val file = File(pathOrUri)
                        if (!file.exists() || !file.canRead() || file.length() <= 0L) {
                            throw IllegalStateException("The PDF file does not exist or was deleted.")
                        }
                        ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
                    }
                }

                try {
                    val renderer = PdfRenderer(pfd)
                    if (renderer.pageCount <= 0) {
                        renderer.close()
                        pfd.close()
                        throw IllegalStateException("The PDF document contains zero pages.")
                    }
                    PdfPageRenderer(pfd, renderer)
                } catch (e: Exception) {
                    runCatching { pfd.close() }
                    throw IllegalStateException("Corrupt or unreadable PDF file: ${e.message}", e)
                }
            }
        }
    }
}
