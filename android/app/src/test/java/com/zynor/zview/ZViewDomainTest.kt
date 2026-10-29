package com.zynor.zview

import com.zynor.zview.data.local.AppThemeMode
import com.zynor.zview.data.local.EnhancementMode
import com.zynor.zview.data.local.PdfPageSize
import com.zynor.zview.domain.FilenameValidator
import com.zynor.zview.ui.screens.ZSCAN_FEEDBACK_URL
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ZViewDomainTest {

    @Test
    fun `filename validator accepts clean names and strips pdf suffix`() {
        val result = FilenameValidator.validate("Tax_Return_2026.pdf")
        assertTrue(result.isValid)
        assertEquals("Tax_Return_2026", result.sanitizedName)
    }

    @Test
    fun `filename validator rejects empty or illegal characters and dots`() {
        val emptyResult = FilenameValidator.validate("   ")
        assertFalse(emptyResult.isValid)

        val illegalChars = FilenameValidator.validate("Invoice:2026/04*?")
        assertFalse(illegalChars.isValid)
        assertEquals("Invoice_2026_04__", illegalChars.sanitizedName)

        val dotsOnly = FilenameValidator.validate("..")
        assertFalse(dotsOnly.isValid)
        assertEquals("ZScan_Document", dotsOnly.sanitizedName)
    }

    @Test
    fun `feedback website URL matches exact deployed web app`() {
        assertEquals("https://zynor-view.web.app/", ZSCAN_FEEDBACK_URL)
    }

    @Test
    fun `pdf page sizes, enhancement modes, and theme modes have expected values`() {
        assertEquals(595, PdfPageSize.A4.widthPt)
        assertEquals(842, PdfPageSize.A4.heightPt)
        assertEquals(4, EnhancementMode.entries.size)
        assertEquals(
            listOf(AppThemeMode.SYSTEM, AppThemeMode.LIGHT, AppThemeMode.DARK),
            AppThemeMode.entries
        )
    }
}
