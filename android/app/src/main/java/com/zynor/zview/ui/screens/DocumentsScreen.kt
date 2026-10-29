package com.zynor.zview.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
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
import com.zynor.zview.data.local.DocumentEntity
import com.zynor.zview.ui.theme.CeruleanBlue
import com.zynor.zview.ui.theme.DarkSurface
import com.zynor.zview.ui.theme.DividerColor
import com.zynor.zview.ui.theme.ElevatedSurface
import com.zynor.zview.ui.theme.ErrorRed
import com.zynor.zview.ui.theme.JetBlack
import com.zynor.zview.ui.theme.PureWhite
import com.zynor.zview.ui.theme.SecondaryText
import com.zynor.zview.ui.viewmodel.SortOption
import com.zynor.zview.ui.viewmodel.ZViewViewModel

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
    var pendingDeleteDoc by remember { mutableStateOf<DocumentEntity?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(JetBlack)
            .padding(20.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Document Library",
                style = MaterialTheme.typography.headlineMedium,
                color = PureWhite
            )
            IconButton(onClick = viewModel::toggleViewMode) {
                Icon(
                    imageVector = if (isGridView) Icons.Default.ViewList else Icons.Default.GridView,
                    contentDescription = if (isGridView) "Switch to List View" else "Switch to Grid View",
                    tint = CeruleanBlue
                )
            }
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
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = BorderStroke(1.dp, DividerColor),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("No matching documents found", color = PureWhite)
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = onStartScan,
                        colors = ButtonDefaults.buttonColors(containerColor = CeruleanBlue)
                    ) {
                        Text("Scan New Document")
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
                        onRequestDelete = { pendingDeleteDoc = doc }
                    )
                }
            }
        }
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
                    Text("Delete", color = ErrorRed)
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
    onRequestDelete: () -> Unit
) {
    val kb = (doc.fileSizeBytes / 1024L).coerceAtLeast(1L)
    Card(
        colors = CardDefaults.cardColors(containerColor = ElevatedSurface),
        border = BorderStroke(1.dp, DividerColor),
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
            Column(modifier = Modifier.weight(1f)) {
                Text(text = doc.name, style = MaterialTheme.typography.titleMedium, color = PureWhite)
                Text(
                    text = "${doc.pageCount} pages · ${kb} KB · ${doc.pageSize}",
                    style = MaterialTheme.typography.labelMedium,
                    color = SecondaryText
                )
            }
            IconButton(onClick = onRequestDelete) {
                Icon(Icons.Default.Delete, contentDescription = "Delete ${doc.name}", tint = ErrorRed)
            }
        }
    }
}
