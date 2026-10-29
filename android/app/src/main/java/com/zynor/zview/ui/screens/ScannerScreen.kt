package com.zynor.zview.ui.screens

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.RotateRight
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import com.zynor.zview.data.local.DocumentEntity
import com.zynor.zview.data.local.EnhancementMode
import com.zynor.zview.ui.viewmodel.ZViewViewModel
import java.io.File

@Composable
fun ScannerScreen(
    viewModel: ZViewViewModel,
    onBack: () -> Unit,
    onFinishedExport: (DocumentEntity) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val state by viewModel.scannerState.collectAsState()
    val colors = MaterialTheme.colorScheme

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }
    var permissionDeniedPermanently by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        permissionDeniedPermanently = !granted
    }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(10)
    ) { uris ->
        uris.forEach { uri ->
            context.contentResolver.openInputStream(uri)?.use { stream ->
                BitmapFactory.decodeStream(stream)?.let { bmp ->
                    viewModel.addCapturedBitmap(bmp)
                }
            }
        }
    }

    // Request camera permission ONLY when ScannerScreen is entered
    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    // ML Kit Document Scanner launcher for automatic boundary & corner adjustment
    val mlKitScannerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartIntentSenderForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val scanResult = GmsDocumentScanningResult.fromActivityResultIntent(result.data)
            scanResult?.pages?.forEach { page ->
                context.contentResolver.openInputStream(page.imageUri)?.use { input ->
                    BitmapFactory.decodeStream(input)?.let { bmp ->
                        viewModel.addCapturedBitmap(bmp)
                    }
                }
            }
        }
    }

    val imageCapture = remember { ImageCapture.Builder().build() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = colors.onBackground
                )
            }
            Text(
                text = "Z Scan: PDF Maker (${state.pages.size} pages)",
                style = MaterialTheme.typography.titleMedium,
                color = colors.onBackground
            )
            OutlinedButton(
                onClick = {
                    val activity = context as? Activity ?: return@OutlinedButton
                    val options = GmsDocumentScannerOptions.Builder()
                        .setGalleryImportAllowed(true)
                        .setPageLimit(24)
                        .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
                        .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
                        .build()
                    GmsDocumentScanning.getClient(options)
                        .getStartScanIntent(activity)
                        .addOnSuccessListener { intentSender ->
                            mlKitScannerLauncher.launch(
                                IntentSenderRequest.Builder(intentSender).build()
                            )
                        }
                },
                border = BorderStroke(1.dp, colors.primary)
            ) {
                Text("Auto-Edge Scan", color = colors.onBackground)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (!hasCameraPermission && state.pages.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(colors.surface, RoundedCornerShape(16.dp))
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = if (permissionDeniedPermanently)
                            "Camera Access Denied"
                        else
                            "Camera Permission Required",
                        style = MaterialTheme.typography.titleLarge,
                        color = colors.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Z Scan: PDF Maker requests camera access only while scanning physical documents. Your captures remain 100% offline on your device.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                            colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                        ) {
                            Text("Grant Camera", color = colors.onPrimary)
                        }
                        OutlinedButton(
                            onClick = {
                                photoPickerLauncher.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                )
                            }
                        ) {
                            Text("Import Photos", color = colors.onSurface)
                        }
                    }
                }
            }
        } else {
            val selectedPage = state.pages.getOrNull(state.selectedPageIndex)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(colors.surface, RoundedCornerShape(16.dp))
                    .border(1.dp, colors.secondary.copy(alpha = 0.7f), RoundedCornerShape(16.dp))
            ) {
                if (selectedPage != null) {
                    Image(
                        bitmap = selectedPage.processedBitmap.asImageBitmap(),
                        contentDescription = "Captured Document Page",
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp)
                    )
                } else {
                    AndroidView(
                        modifier = Modifier.fillMaxSize(),
                        factory = { ctx ->
                            val previewView = PreviewView(ctx)
                            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                            cameraProviderFuture.addListener({
                                val cameraProvider = cameraProviderFuture.get()
                                val preview = Preview.Builder().build().also {
                                    it.surfaceProvider = previewView.surfaceProvider
                                }
                                runCatching {
                                    cameraProvider.unbindAll()
                                    cameraProvider.bindToLifecycle(
                                        lifecycleOwner,
                                        CameraSelector.DEFAULT_BACK_CAMERA,
                                        preview,
                                        imageCapture
                                    )
                                }
                            }, ContextCompat.getMainExecutor(ctx))
                            previewView
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Capture, Import & Page Editor Controls
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = {
                    val tempFile = File(context.cacheDir, "capture_${System.currentTimeMillis()}.jpg")
                    val outputOpts = ImageCapture.OutputFileOptions.Builder(tempFile).build()
                    imageCapture.takePicture(
                        outputOpts,
                        ContextCompat.getMainExecutor(context),
                        object : ImageCapture.OnImageSavedCallback {
                            override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                                BitmapFactory.decodeFile(tempFile.absolutePath)?.let { bmp ->
                                    viewModel.addCapturedBitmap(bmp)
                                }
                            }
                            override fun onError(exception: ImageCaptureException) = Unit
                        }
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.CameraAlt, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Capture Page")
            }

            IconButton(
                onClick = {
                    photoPickerLauncher.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                    )
                }
            ) {
                Icon(Icons.Default.PhotoLibrary, contentDescription = "Import from Photo Picker", tint = colors.primary)
            }

            if (state.pages.isNotEmpty()) {
                IconButton(onClick = { viewModel.updateCurrentPageEdits(rotationDelta = 90) }) {
                    Icon(Icons.Default.RotateRight, contentDescription = "Rotate 90 degrees", tint = colors.onBackground)
                }
                IconButton(onClick = { viewModel.removePage(state.selectedPageIndex) }) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete Page", tint = colors.error)
                }
            }
        }

        if (state.pages.isNotEmpty()) {
            Spacer(modifier = Modifier.height(10.dp))
            val currentPage = state.pages.getOrNull(state.selectedPageIndex)
            if (currentPage != null) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(EnhancementMode.entries.size) { idx ->
                        val mode = EnhancementMode.entries[idx]
                        FilterChip(
                            selected = currentPage.enhancementMode == mode,
                            onClick = { viewModel.updateCurrentPageEdits(mode = mode) },
                            label = { Text(mode.displayName) }
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Contrast", color = colors.onSurfaceVariant, modifier = Modifier.width(72.dp))
                    Slider(
                        value = currentPage.contrast,
                        onValueChange = { viewModel.updateCurrentPageEdits(contrast = it) },
                        valueRange = 0.5f..2.0f,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                itemsIndexed(state.pages) { idx, page ->
                    val isSelected = idx == state.selectedPageIndex
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .border(
                                width = if (isSelected) 2.dp else 1.dp,
                                color = if (isSelected) colors.secondary else colors.outline,
                                shape = RoundedCornerShape(8.dp)
                            )
                            .clickable { viewModel.selectPage(idx) }
                    ) {
                        Image(
                            bitmap = page.processedBitmap.asImageBitmap(),
                            contentDescription = "Page ${idx + 1}",
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = state.documentName,
                onValueChange = viewModel::updateDraftDocumentName,
                label = { Text("PDF Filename") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            state.errorMessage?.let { err ->
                Text(text = err, color = colors.error, style = MaterialTheme.typography.bodyMedium)
            }

            Spacer(modifier = Modifier.height(10.dp))

            Button(
                onClick = {
                    viewModel.saveAndExportPdf(allowOverwrite = true, onSuccess = onFinishedExport)
                },
                enabled = !state.isExportingPdf,
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                Icon(Icons.Default.PictureAsPdf, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(if (state.isExportingPdf) "Generating PDF..." else "Create & Save PDF (${state.pages.size} Pages)")
            }
        }
    }
}
