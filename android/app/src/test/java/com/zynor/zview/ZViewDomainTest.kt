package com.zynor.zview

import com.zynor.zview.data.local.EnhancementMode
import com.zynor.zview.data.local.PdfPageSize
import com.zynor.zview.domain.FilenameValidator
import com.zynor.zview.ui.screens.ZVIEW_FEEDBACK_URL
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
    fun `filename validator rejects empty or illegal characters`() {
        val emptyResult = FilenameValidator.validate("   ")
        assertFalse(emptyResult.isValid)

        val illegalChars = FilenameValidator.validate("Invoice:2026/04*?")
        assertFalse(illegalChars.isValid)
        assertEquals("Invoice_2026_04__", illegalChars.sanitizedName)
    }

    @Test
    fun `feedback website URL matches exact deployed web app`() {
        assertEquals("https://zynor-view.web.app/", ZVIEW_FEEDBACK_URL)
    }

    @Test
    fun `pdf page sizes and enhancement modes have expected defaults`() {
        assertEquals(595, PdfPageSize.A4.widthPt)
        assertEquals(842, PdfPageSize.A4.heightPt)
        assertEquals(4, EnhancementMode.entries.size)
    }
}
