package com.zynor.zview

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ZViewInstrumentedTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun homeScreenDisplaysZScanPdfMakerBrandAndActions() {
        composeTestRule.onNodeWithText("Z Scan: PDF Maker").assertIsDisplayed()
        composeTestRule.onNodeWithText("Scan Document").assertIsDisplayed()
        composeTestRule.onNodeWithText("Import Images").assertIsDisplayed()
    }

    @Test
    fun navigateToSettingsShowsThemeModesAndFeedbackOption() {
        composeTestRule.onNodeWithText("Settings").performClick()
        composeTestRule.onNodeWithText("Appearance & Theme Mode").assertIsDisplayed()
        composeTestRule.onNodeWithText("System Default").assertIsDisplayed()
        composeTestRule.onNodeWithText("Light Mode").assertIsDisplayed()
        composeTestRule.onNodeWithText("Dark Mode").assertIsDisplayed()
        composeTestRule.onNodeWithText("Personal Review & Feedback").assertIsDisplayed()
    }
}
