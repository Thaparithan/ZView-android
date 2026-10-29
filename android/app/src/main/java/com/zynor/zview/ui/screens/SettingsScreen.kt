package com.zynor.zview.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.zynor.zview.data.local.EnhancementMode
import com.zynor.zview.data.local.PdfPageSize
import com.zynor.zview.ui.theme.CeruleanBlue
import com.zynor.zview.ui.theme.DarkSurface
import com.zynor.zview.ui.theme.DividerColor
import com.zynor.zview.ui.theme.ErrorRed
import com.zynor.zview.ui.theme.JetBlack
import com.zynor.zview.ui.theme.NeonRose
import com.zynor.zview.ui.theme.PureWhite
import com.zynor.zview.ui.theme.SecondaryText
import com.zynor.zview.ui.theme.SuccessGreen
import com.zynor.zview.ui.viewmodel.ZViewViewModel

const val ZVIEW_FEEDBACK_URL = "https://zynor-view.web.app/"

@Composable
fun SettingsScreen(viewModel: ZViewViewModel) {
    val context = LocalContext.current
    val preferences by viewModel.preferences.collectAsState()
    var feedbackError by remember { mutableStateOf<String?>(null) }
    var copiedBanner by remember { mutableStateOf(false) }

    val safFolderLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocumentTree()
    ) { treeUri ->
        treeUri?.let { viewModel.bindSafCloudBackupFolder(it) }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(JetBlack)
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Settings",
                style = MaterialTheme.typography.headlineMedium,
                color = PureWhite
            )
            Text(
                text = "ZView v1.0.0 · Offline-First Native Android Scanner",
                style = MaterialTheme.typography.labelMedium,
                color = SecondaryText
            )
        }

        // Personal Review & Feedback Section (https://zynor-view.web.app/)
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = BorderStroke(1.dp, NeonRose.copy(alpha = 0.7f)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(
                        text = "Personal Review & Feedback",
                        style = MaterialTheme.typography.titleLarge,
                        color = PureWhite
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Share your review or feedback on the official ZView portal ($ZVIEW_FEEDBACK_URL). Opens in a secure HTTPS Custom Tab without requiring account login.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = SecondaryText
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    Button(
                        onClick = {
                            feedbackError = null
                            val opened = openFeedbackWebsite(context, ZVIEW_FEEDBACK_URL)
                            if (!opened) {
                                feedbackError = "Could not launch a browser for $ZVIEW_FEEDBACK_URL. You can retry or copy the URL below."
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CeruleanBlue),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Personal Review & Feedback", color = PureWhite)
                    }

                    feedbackError?.let { err ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = err, color = ErrorRed, style = MaterialTheme.typography.bodyMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    clipboard.setPrimaryClip(ClipData.newPlainText("ZView Feedback URL", ZVIEW_FEEDBACK_URL))
                                    copiedBanner = true
                                }
                            ) {
                                Text("Copy URL", color = PureWhite)
                            }
                        }
                    }

                    if (copiedBanner) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Copied https://zynor-view.web.app/ to clipboard.",
                            color = SuccessGreen,
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                }
            }
        }

        // Default PDF Page Size
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = BorderStroke(1.dp, DividerColor),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text("Default PDF Page Size", style = MaterialTheme.typography.titleMedium, color = PureWhite)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PdfPageSize.entries.forEach { size ->
                            FilterChip(
                                selected = preferences.defaultPageSize == size,
                                onClick = { viewModel.setDefaultPageSize(size) },
                                label = { Text(size.name) }
                            )
                        }
                    }
                }
            }
        }

        // Default Enhancement Preference
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = BorderStroke(1.dp, DividerColor),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text("Default Image Enhancement", style = MaterialTheme.typography.titleMedium, color = PureWhite)
                    Spacer(modifier = Modifier.height(8.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        EnhancementMode.entries.forEach { mode ->
                            FilterChip(
                                selected = preferences.defaultEnhancement == mode,
                                onClick = { viewModel.setDefaultEnhancement(mode) },
                                label = { Text(mode.displayName) }
                            )
                        }
                    }
                }
            }
        }

        // Storage & SAF Cloud Folder Sync
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = BorderStroke(1.dp, DividerColor),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text("Local Storage & SAF Cloud Folder Sync", style = MaterialTheme.typography.titleMedium, color = PureWhite)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = preferences.safCloudBackupUri
                            ?.let { "Linked SAF Sync Folder: $it" }
                            ?: "All PDFs are stored locally in app-private storage by default. Optionally link a Google Drive, Nextcloud, or local SAF folder for automatic PDF backup.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = SecondaryText
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedButton(onClick = { safFolderLauncher.launch(null) }) {
                        Text("Select SAF Backup / Cloud Folder", color = CeruleanBlue)
                    }
                }
            }
        }

        // Privacy & About ZView
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = BorderStroke(1.dp, DividerColor),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text("Privacy & About ZView", style = MaterialTheme.typography.titleMedium, color = PureWhite)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "ZView is 100% free, ad-free, and offline-first. No user accounts, analytics SDKs, or remote servers ever touch your documents. Camera access is requested strictly when scanning.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = SecondaryText
                    )
                }
            }
        }
    }
}

fun openFeedbackWebsite(context: Context, url: String): Boolean {
    return try {
        val uri = Uri.parse(url)
        val colorParams = CustomTabColorSchemeParams.Builder()
            .setToolbarColor(JetBlack.toArgb())
            .setNavigationBarColor(JetBlack.toArgb())
            .build()
        val customTabsIntent = CustomTabsIntent.Builder()
            .setDefaultColorSchemeParams(colorParams)
            .setShowTitle(true)
            .build()
        customTabsIntent.launchUrl(context, uri)
        true
    } catch (_: Exception) {
        try {
            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(browserIntent)
            true
        } catch (_: Exception) {
            false
        }
    }
}
