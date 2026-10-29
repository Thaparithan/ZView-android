package com.zynor.zview.ui.screens

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ZoomIn
import androidx.compose.material.icons.filled.ZoomOut
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.zynor.zview.data.local.DocumentEntity
import com.zynor.zview.domain.PdfPageRenderer
import com.zynor.zview.ui.viewmodel.ZViewViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Dedicated in-app PDF Viewer & Document Preview Screen inside Z Scan.
 * Renders actual multi-page PDF documents using PdfPageRenderer (android.graphics.pdf.PdfRenderer)
 * from both filesystem paths and content:// URIs, with fallback to stored page images,
 * vertical scrolling, page thumbnails, pinch/button zoom, and deterministic Bitmap/FD release.
 */
@Composable
fun DocumentPreviewScreen(
    documentId: String,
    viewModel: ZViewViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val colors = MaterialTheme.colorScheme

    val documents by viewModel.filteredDocuments.collectAsState()
    val document: DocumentEntity? = documents.find { it.id == documentId }
    val storedPages by remember(documentId) {
        viewModel.observeDocumentPages(documentId)
    }.collectAsState(initial = emptyList())

    val renderedBitmaps = remember { mutableStateListOf<Bitmap>() }
    var isLoadingPdf by remember { mutableStateOf(true) }
    var viewerError by remember { mutableStateOf<String?>(null) }

    var currentPageIndex by remember { mutableIntStateOf(0) }
    var zoomScale by remember { mutableFloatStateOf(1f) }
    var showRenameDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var renameText by remember { mutableStateOf("") }

    val listState = rememberLazyListState()

    LaunchedEffect(document?.name) {
        renameText = document?.name.orEmpty()
    }

    // Load actual PDF pages via PdfPageRenderer (or fallback to stored page images)
    // and release PdfPageRenderer + Bitmaps deterministically when leaving screen.
    DisposableEffect(documentId, document?.pdfFilePath, storedPages.size) {
        var activeRenderer: PdfPageRenderer? = null
        val job = coroutineScope.launch {
            isLoadingPdf = true
            viewerError = null
            renderedBitmaps.clear()

            val pdfPathOrUri = document?.pdfFilePath
            val openResult = PdfPageRenderer.open(context, pdfPathOrUri)

            if (openResult.isSuccess) {
                val renderer = openResult.getOrNull()!!
                activeRenderer = renderer
                val count = renderer.pageCount
                for (pageIdx in 0 until count) {
                    val bmpResult = renderer.renderPage(pageIdx, maxDimensionPx = 1400)
                    bmpResult.onSuccess { bmp ->
                        renderedBitmaps.add(bmp)
                    }.onFailure { err ->
                        viewerError = err.message ?: "Failed to render PDF page ${pageIdx + 1}."
                    }
                }
                isLoadingPdf = false
            } else {
                // Fallback: attempt to decode stored PageEntity processed images if PDF path was moved
                if (storedPages.isNotEmpty()) {
                    withContext(Dispatchers.IO) {
                        storedPages.forEach { pageEntity ->
                            val file = File(pageEntity.processedImagePath)
                            if (file.exists()) {
                                BitmapFactory.decodeFile(file.absolutePath)?.let { bmp ->
                                    withContext(Dispatchers.Main) {
                                        renderedBitmaps.add(bmp)
                                    }
                                }
                            }
                        }
                    }
                }
                isLoadingPdf = false
                if (renderedBitmaps.isEmpty()) {
                    viewerError = openResult.exceptionOrNull()?.message
                        ?: "The PDF file is missing, deleted, or inaccessible."
                }
            }
        }

        onDispose {
            job.cancel()
            activeRenderer?.close()
            renderedBitmaps.clear()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp)
    ) {
        // Top Viewer Toolbar
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back to Documents",
                        tint = colors.onBackground
                    )
                }
                Column {
                    Text(
                        text = document?.name?.let { "$it.pdf" } ?: "PDF Viewer",
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.onBackground
                    )
                    Text(
                        text = if (renderedBitmaps.isNotEmpty())
                            "Page ${currentPageIndex + 1} of ${renderedBitmaps.size} · ${(zoomScale * 100).toInt()}%"
                        else
                            "PDF Preview",
                        style = MaterialTheme.typography.labelMedium,
                        color = colors.onSurfaceVariant
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { zoomScale = (zoomScale - 0.25f).coerceAtLeast(1f) }) {
                    Icon(Icons.Default.ZoomOut, contentDescription = "Zoom Out", tint = colors.onBackground)
                }
                IconButton(onClick = { zoomScale = (zoomScale + 0.25f).coerceAtMost(3f) }) {
                    Icon(Icons.Default.ZoomIn, contentDescription = "Zoom In", tint = colors.onBackground)
                }
                IconButton(onClick = { showRenameDialog = true }) {
                    Icon(Icons.Default.Edit, contentDescription = "Rename Document", tint = colors.primary)
                }
                IconButton(
                    onClick = {
                        val pdfPath = document?.pdfFilePath ?: return@IconButton
                        val shareUri: Uri? = when {
                            pdfPath.startsWith("content://") -> Uri.parse(pdfPath)
                            else -> {
                                val file = File(pdfPath)
                                if (!file.exists()) {
                                    viewerError = "The exported PDF file is missing on storage."
                                    null
                                } else {
                                    FileProvider.getUriForFile(
                                        context,
                                        "${context.packageName}.fileprovider",
                                        file
                                    )
                                }
                            }
                        }
                        if (shareUri != null) {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "application/pdf"
                                putExtra(Intent.EXTRA_STREAM, shareUri)
                                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Share PDF"))
                        }
                    }
                ) {
                    Icon(Icons.Default.Share, contentDescription = "Share PDF", tint = colors.onBackground)
                }
                IconButton(onClick = { showDeleteDialog = true }) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete Document", tint = colors.error)
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        when {
            isLoadingPdf -> {
                Card(
                    colors = CardDefaults.cardColors(containerColor = colors.surface),
                    border = BorderStroke(1.dp, colors.outline),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = colors.primary)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Rendering PDF pages...", color = colors.onSurfaceVariant)
                        }
                    }
                }
            }

            viewerError != null && renderedBitmaps.isEmpty() -> {
                Card(
                    colors = CardDefaults.cardColors(containerColor = colors.surface),
                    border = BorderStroke(1.dp, colors.error),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "Unable to Open PDF",
                                style = MaterialTheme.typography.titleLarge,
                                color = colors.error
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = viewerError.orEmpty(),
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            renderedBitmaps.isEmpty() -> {
                Card(
                    colors = CardDefaults.cardColors(containerColor = colors.surface),
                    border = BorderStroke(1.dp, colors.outline),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("This PDF has no renderable pages.", color = colors.onSurfaceVariant)
                    }
                }
            }

            else -> {
                // Vertical Multi-Page PDF Scroll Viewer with Zoom
                Card(
                    colors = CardDefaults.cardColors(containerColor = colors.surface),
                    border = BorderStroke(1.dp, colors.outline),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .pointerInput(Unit) {
                            detectTransformGestures { _, _, zoom, _ ->
                                zoomScale = (zoomScale * zoom).coerceIn(1f, 3.0f)
                            }
                        }
                ) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp)
                            .graphicsLayer(scaleX = zoomScale, scaleY = zoomScale),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        itemsIndexed(renderedBitmaps) { index, pageBitmap ->
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { currentPageIndex = index }
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(colors.surfaceVariant, RoundedCornerShape(8.dp))
                                        .border(
                                            width = if (currentPageIndex == index) 2.dp else 1.dp,
                                            color = if (currentPageIndex == index) colors.secondary else colors.outline,
                                            shape = RoundedCornerShape(8.dp)
                                        )
                                        .padding(6.dp)
                                ) {
                                    Image(
                                        bitmap = pageBitmap.asImageBitmap(),
                                        contentDescription = "PDF Page ${index + 1} of ${renderedBitmaps.size}",
                                        contentScale = ContentScale.FillWidth,
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Page ${index + 1} of ${renderedBitmaps.size}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = colors.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                // Multi-page thumbnail navigation strip
                if (renderedBitmaps.size > 1) {
                    Spacer(modifier = Modifier.height(10.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        itemsIndexed(renderedBitmaps) { idx, bmp ->
                            val selected = idx == currentPageIndex
                            Box(
                                modifier = Modifier
                                    .width(56.dp)
                                    .height(74.dp)
                                    .border(
                                        width = if (selected) 2.dp else 1.dp,
                                        color = if (selected) colors.secondary else colors.outline,
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                    .clickable {
                                        currentPageIndex = idx
                                        coroutineScope.launch {
                                            listState.animateScrollToItem(idx)
                                        }
                                    }
                            ) {
                                Image(
                                    bitmap = bmp.asImageBitmap(),
                                    contentDescription = "Jump to Page ${idx + 1}",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                        }
                    }
                }
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
                            viewerError = err
                        }
                        showRenameDialog = false
                    }
                ) {
                    Text("Save", color = colors.primary)
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
                    Text("Delete", color = colors.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            }
        )
    }
}
