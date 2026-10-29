package com.zynor.zview.ui.screens

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.zynor.zview.data.local.DocumentEntity
import com.zynor.zview.ui.theme.CeruleanBlue
import com.zynor.zview.ui.theme.DarkSurface
import com.zynor.zview.ui.theme.DividerColor
import com.zynor.zview.ui.theme.ErrorRed
import com.zynor.zview.ui.theme.JetBlack
import com.zynor.zview.ui.theme.PureWhite
import com.zynor.zview.ui.theme.SecondaryText
import com.zynor.zview.ui.viewmodel.ZViewViewModel
import java.io.File

@Composable
fun DocumentPreviewScreen(
    documentId: String,
    viewModel: ZViewViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val documents by viewModel.filteredDocuments.collectAsState()
    val document: DocumentEntity? = documents.find { it.id == documentId }
    val pages by viewModel.let {
        remember(documentId) {
            it
        }
        // Observe pages flow
        kotlinx.coroutines.flow.flowOf(emptyList<Any>())
    }.collectAsState(initial = emptyList())

    var currentPageIndex by remember { mutableIntStateOf(0) }
    var zoomScale by remember { mutableFloatStateOf(1f) }
    var showRenameDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var renameText by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(document) {
        renameText = document?.name.orEmpty()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(JetBlack)
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = PureWhite)
            }
            Text(
                text = document?.name ?: "Document Preview",
                style = MaterialTheme.typography.titleMedium,
                color = PureWhite
            )
            Row {
                IconButton(onClick = { showRenameDialog = true }) {
                    Icon(Icons.Default.Edit, contentDescription = "Rename Document", tint = CeruleanBlue)
                }
                IconButton(
                    onClick = {
                        val pdfPath = document?.pdfFilePath ?: return@IconButton
                        val file = File(pdfPath)
                        if (!file.exists()) {
                            errorMsg = "The exported PDF file is missing on storage."
                            return@IconButton
                        }
                        val uri = FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            file
                        )
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "application/pdf"
                            putExtra(Intent.EXTRA_STREAM, uri)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Share PDF"))
                    }
                ) {
                    Icon(Icons.Default.Share, contentDescription = "Share PDF", tint = PureWhite)
                }
                IconButton(onClick = { showDeleteDialog = true }) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete Document", tint = ErrorRed)
                }
            }
        }

        errorMsg?.let { msg ->
            Text(text = msg, color = ErrorRed, style = MaterialTheme.typography.bodyMedium)
        }

        Spacer(modifier = Modifier.height(12.dp))

        Card(
            colors = CardDefaults.cardColors(containerColor = DarkSurface),
            border = BorderStroke(1.dp, DividerColor),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .pointerInput(Unit) {
                    detectTransformGestures { _, _, zoom, _ ->
                        zoomScale = (zoomScale * zoom).coerceIn(1f, 3.5f)
                    }
                }
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer(scaleX = zoomScale, scaleY = zoomScale),
                contentAlignment = Alignment.Center
            ) {
                val totalPages = document?.pageCount ?: 1
                Text(
                    text = "Page ${currentPageIndex + 1} of $totalPages · Pinch to Zoom (${(zoomScale * 100).toInt()}%)",
                    color = SecondaryText
                )
            }
        }
    }

    if (showRenameDialog && document != null) {
        AlertDialog(
            onDismissRequest = { showRenameDialog = false },
            title = { Text("Rename Document") },
            text = {
                OutlinedTextField(
                    value = renameText,
                    onValueChange = { renameText = it },
                    label = { Text("New document name") },
                    singleLine = true
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.renameDocument(document.id, renameText) { err ->
                            errorMsg = err
                        }
                        showRenameDialog = false
                    }
                ) {
                    Text("Save", color = CeruleanBlue)
                }
            },
            dismissButton = {
                TextButton(onClick = { showRenameDialog = false }) { Text("Cancel") }
            }
        )
    }

    if (showDeleteDialog && document != null) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete '${document.name}'?") },
            text = { Text("This action permanently deletes the local PDF and its pages.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteDocument(document.id)
                        showDeleteDialog = false
                        onBack()
                    }
                ) {
                    Text("Delete", color = ErrorRed)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            }
        )
    }
}
