package com.zynor.zview.domain

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import com.zynor.zview.data.local.EnhancementMode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object ImageProcessor {

    /**
     * Non-destructively processes a source Bitmap off the main thread, applying crop,
     * rotation, enhancement mode, brightness (-100..100), and contrast (0.5..2.0).
     */
    suspend fun processPageBitmap(
        source: Bitmap,
        cropNormalized: RectF = RectF(0f, 0f, 1f, 1f),
        rotationDegrees: Int = 0,
        mode: EnhancementMode = EnhancementMode.DOCUMENT_ENHANCE,
        brightness: Float = 0f,
        contrast: Float = 1f
    ): Bitmap = withContext(Dispatchers.Default) {
        val safeLeft = (cropNormalized.left.coerceIn(0f, 0.9f) * source.width).toInt()
        val safeTop = (cropNormalized.top.coerceIn(0f, 0.9f) * source.height).toInt()
        val safeWidth = ((cropNormalized.width().coerceIn(0.1f, 1f)) * source.width).toInt()
            .coerceAtMost(source.width - safeLeft)
        val safeHeight = ((cropNormalized.height().coerceIn(0.1f, 1f)) * source.height).toInt()
            .coerceAtMost(source.height - safeTop)

        val matrix = Matrix().apply {
            if (rotationDegrees % 360 != 0) {
                postRotate(rotationDegrees.toFloat())
            }
        }

        val cropped = Bitmap.createBitmap(
            source,
            safeLeft,
            safeTop,
            safeWidth.coerceAtLeast(1),
            safeHeight.coerceAtLeast(1),
            matrix,
            true
        )

        val output = Bitmap.createBitmap(cropped.width, cropped.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        val combinedMatrix = buildColorMatrix(mode, brightness, contrast)
        paint.colorFilter = ColorMatrixColorFilter(combinedMatrix)
        canvas.drawBitmap(cropped, 0f, 0f, paint)

        if (cropped != source && !cropped.isRecycled) {
            cropped.recycle()
        }
        output
    }

    fun buildColorMatrix(
        mode: EnhancementMode,
        brightness: Float,
        contrast: Float
    ): ColorMatrix {
        val result = ColorMatrix()

        when (mode) {
            EnhancementMode.ORIGINAL -> Unit
            EnhancementMode.GRAYSCALE -> {
                result.setSaturation(0f)
            }
            EnhancementMode.BLACK_AND_WHITE -> {
                val gray = ColorMatrix().apply { setSaturation(0f) }
                val highContrast = createContrastBrightnessMatrix(contrast = 2.6f, brightness = -85f)
                result.postConcat(gray)
                result.postConcat(highContrast)
            }
            EnhancementMode.DOCUMENT_ENHANCE -> {
                val docEnhance = createContrastBrightnessMatrix(contrast = 1.38f, brightness = 12f)
                result.postConcat(docEnhance)
            }
        }

        if (brightness != 0f || contrast != 1f) {
            result.postConcat(createContrastBrightnessMatrix(contrast, brightness))
        }
        return result
    }

    private fun createContrastBrightnessMatrix(contrast: Float, brightness: Float): ColorMatrix {
        val scale = contrast.coerceIn(0.3f, 3.0f)
        val translate = (-0.5f * scale + 0.5f) * 255f + brightness.coerceIn(-120f, 120f)
        return ColorMatrix(
            floatArrayOf(
                scale, 0f, 0f, 0f, translate,
                0f, scale, 0f, 0f, translate,
                0f, 0f, scale, 0f, translate,
                0f, 0f, 0f, 1f, 0f
            )
        )
    }
}
