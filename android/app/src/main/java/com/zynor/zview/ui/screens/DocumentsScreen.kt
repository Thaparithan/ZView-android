package com.zynor.zview.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.ViewList
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.zynor.zview.data.local.DocumentEntity
import com.zynor.zview.ui.viewmodel.SortOption
import com.zynor.zview.ui.viewmodel.ZViewViewModel
import java.io.File

@Composable
fun DocumentsScreen(
    viewModel: ZViewViewModel,
    onOpenPreview: (String) -> Unit,
    onStartScan: () -> Unit
) {
    val documents by viewModel.filteredDocuments.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val sortOption by viewModel.sortOption.collectAsState()
    val isGridView by viewModel.isGridView.collectAsState()
    val colors = MaterialTheme.colorScheme

    var pendingDeleteDoc by remember { mutableStateOf<DocumentEntity?>(null) }
    var pendingRenameDoc by remember { mutableStateOf<DocumentEntity?>(null) }
    var renameInput by remember { mutableStateOf("") }
    var errorBanner by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(20.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Z Scan: PDF Maker Library",
                style = MaterialTheme.typography.headlineMedium,
                color = colors.onBackground
            )
            IconButton(onClick = viewModel::toggleViewMode) {
                Icon(
                    imageVector = if (isGridView) Icons.Default.ViewList else Icons.Default.GridView,
                    contentDescription = if (isGridView) "Switch to List View" else "Switch to Grid View",
                    tint = colors.primary
                )
            }
        }

        errorBanner?.let { msg ->
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = msg, color = colors.error, style = MaterialTheme.typography.bodyMedium)
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = searchQuery,
            onValueChange = viewModel::updateSearchQuery,
            label = { Text("Search documents by name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(10.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SortOption.entries.forEach { option ->
                FilterChip(
                    selected = sortOption == option,
                    onClick = { viewModel.updateSortOption(option) },
                    label = { Text(option.label) }
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        if (documents.isEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = colors.surface),
                border = BorderStroke(1.dp, colors.outline),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = if (searchQuery.isNotBlank()) "No matching documents found" else "No saved PDFs yet",
                        color = colors.onSurface
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = onStartScan,
                        colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                    ) {
                        Text("Scan New Document", color = colors.onPrimary)
                    }
                }
            }
        } else if (isGridView) {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 156.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(documents, key = { it.id }) { doc ->
                    DocumentLibraryCard(
                        doc = doc,
                        onOpen = { onOpenPreview(doc.id) },
                        onRequestRename = {
                            pendingRenameDoc = doc
                            renameInput = doc.name
                        },
                        onRequestDelete = { pendingDeleteDoc = doc }
                    )
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(documents, key = { it.id }) { doc ->
                    DocumentLibraryCard(
                        doc = doc,
                        onOpen = { onOpenPreview(doc.id) },
                        onRequestRename = {
                            pendingRenameDoc = doc
                            renameInput = doc.name
                        },
                        onRequestDelete = { pendingDeleteDoc = doc }
                    )
                }
            }
        }
    }

    pendingRenameDoc?.let { target ->
        AlertDialog(
            onDismissRequest = { pendingRenameDoc = null },
            title = { Text("Rename Document") },
            text = {
                OutlinedTextField(
                    value = renameInput,
                    onValueChange = { renameInput = it },
                    label = { Text("New document name") },
                    singleLine = true
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.renameDocument(target.id, renameInput) { err ->
                            errorBanner = err
                        }
                        pendingRenameDoc = null
                    }
                ) {
                    Text("Save", color = colors.primary)
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingRenameDoc = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    pendingDeleteDoc?.let { target ->
        AlertDialog(
            onDismissRequest = { pendingDeleteDoc = null },
            title = { Text("Delete '${target.name}'?") },
            text = { Text("This permanently removes the local PDF and page scans from your device.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteDocument(target.id)
                        pendingDeleteDoc = null
                    }
                ) {
                    Text("Delete", color = colors.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingDeleteDoc = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun DocumentLibraryCard(
    doc: DocumentEntity,
    onOpen: () -> Unit,
    onRequestRename: () -> Unit,
    onRequestDelete: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val kb = (doc.fileSizeBytes / 1024L).coerceAtLeast(1L)
    Card(
        colors = CardDefaults.cardColors(containerColor = colors.surfaceVariant),
        border = BorderStroke(1.dp, colors.outline),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpen)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(colors.surface, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                val thumbFile = doc.thumbnailPath?.let { File(it) }
                if (thumbFile != null && thumbFile.exists()) {
                    AsyncImage(
                        model = thumbFile,
                        contentDescription = "${doc.name} thumbnail",
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Icon(Icons.Default.Description, contentDescription = null, tint = colors.primary)
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = doc.name, style = MaterialTheme.typography.titleMedium, color = colors.onSurface)
                Text(
                    text = "${doc.pageCount} pages · ${kb} KB · ${doc.pageSize}",
                    style = MaterialTheme.typography.labelMedium,
                    color = colors.onSurfaceVariant
                )
            }
            IconButton(onClick = onRequestRename) {
                Icon(Icons.Default.Edit, contentDescription = "Rename ${doc.name}", tint = colors.primary)
            }
            IconButton(onClick = onRequestDelete) {
                Icon(Icons.Default.Delete, contentDescription = "Delete ${doc.name}", tint = colors.error)
            }
        }
    }
}
