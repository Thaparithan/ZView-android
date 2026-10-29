package com.zynor.zview.ui.viewmodel

import android.graphics.Bitmap
import android.graphics.RectF
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.zynor.zview.data.local.DocumentEntity
import com.zynor.zview.data.local.EnhancementMode
import com.zynor.zview.data.local.PageEntity
import com.zynor.zview.data.local.PdfPageSize
import com.zynor.zview.data.local.SettingsRepository
import com.zynor.zview.data.local.UserPreferences
import com.zynor.zview.data.repository.CloudSyncManager
import com.zynor.zview.data.repository.DocumentRepository
import com.zynor.zview.domain.FilenameValidator
import com.zynor.zview.domain.ImageProcessor
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

enum class SortOption(val label: String) {
    MODIFIED_DESC("Modified Date"),
    CREATED_DESC("Creation Date"),
    NAME_ASC("Name (A–Z)")
}

data class DraftPage(
    val id: String = UUID.randomUUID().toString(),
    val originalBitmap: Bitmap,
    val processedBitmap: Bitmap,
    val originalPath: String,
    val processedPath: String,
    val enhancementMode: EnhancementMode = EnhancementMode.DOCUMENT_ENHANCE,
    val rotationDegrees: Int = 0,
    val brightness: Float = 0f,
    val contrast: Float = 1f,
    val cropNormalized: RectF = RectF(0f, 0f, 1f, 1f)
)

data class ScannerSessionState(
    val sessionId: String = UUID.randomUUID().toString(),
    val documentName: String = "ZView_${SimpleDateFormat("yyyyMMdd_HHmm", Locale.US).format(Date())}",
    val pages: List<DraftPage> = emptyList(),
    val selectedPageIndex: Int = 0,
    val selectedPageSize: PdfPageSize = PdfPageSize.A4,
    val isProcessing: Boolean = false,
    val isExportingPdf: Boolean = false,
    val errorMessage: String? = null,
    val statusMessage: String? = null
)

class ZViewViewModel(
    private val documentRepository: DocumentRepository,
    private val settingsRepository: SettingsRepository,
    private val cloudSyncManager: CloudSyncManager
) : ViewModel() {

    val preferences: StateFlow<UserPreferences> = settingsRepository.preferencesFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), UserPreferences())

    val recentDocuments: StateFlow<List<DocumentEntity>> = documentRepository.recentDocuments
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _sortOption = MutableStateFlow(SortOption.MODIFIED_DESC)
    val sortOption: StateFlow<SortOption> = _sortOption.asStateFlow()

    private val _isGridView = MutableStateFlow(false)
    val isGridView: StateFlow<Boolean> = _isGridView.asStateFlow()

    val filteredDocuments: StateFlow<List<DocumentEntity>> = combine(
        documentRepository.allDocuments,
        _searchQuery,
        _sortOption
    ) { docs, query, sort ->
        val filtered = if (query.isBlank()) docs else {
            docs.filter { it.name.contains(query.trim(), ignoreCase = true) }
        }
        when (sort) {
            SortOption.MODIFIED_DESC -> filtered.sortedByDescending { it.updatedAt }
            SortOption.CREATED_DESC -> filtered.sortedByDescending { it.createdAt }
            SortOption.NAME_ASC -> filtered.sortedBy { it.name.lowercase(Locale.ROOT) }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _scannerState = MutableStateFlow(ScannerSessionState())
    val scannerState: StateFlow<ScannerSessionState> = _scannerState.asStateFlow()

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun updateSortOption(option: SortOption) {
        _sortOption.value = option
    }

    fun toggleViewMode() {
        _isGridView.update { !it }
    }

    fun startNewScanSession() {
        val prefs = preferences.value
        _scannerState.value = ScannerSessionState(
            selectedPageSize = prefs.defaultPageSize
        )
    }

    fun updateDraftDocumentName(name: String) {
        _scannerState.update { it.copy(documentName = name, errorMessage = null) }
    }

    fun addCapturedBitmap(bitmap: Bitmap) {
        viewModelScope.launch {
            _scannerState.update { it.copy(isProcessing = true, errorMessage = null) }
            try {
                val defaultMode = preferences.value.defaultEnhancement
                val processed = ImageProcessor.processPageBitmap(
                    source = bitmap,
                    mode = defaultMode
                )
                val origFile = documentRepository.saveBitmapToInternalStorage(bitmap, "orig")
                val procFile = documentRepository.saveBitmapToInternalStorage(processed, "proc")
                val page = DraftPage(
                    originalBitmap = bitmap,
                    processedBitmap = processed,
                    originalPath = origFile.absolutePath,
                    processedPath = procFile.absolutePath,
                    enhancementMode = defaultMode
                )
                _scannerState.update { state ->
                    val updated = state.pages + page
                    state.copy(
                        pages = updated,
                        selectedPageIndex = updated.lastIndex,
                        isProcessing = false
                    )
                }
            } catch (e: Exception) {
                _scannerState.update {
                    it.copy(isProcessing = false, errorMessage = e.message ?: "Failed to process page.")
                }
            }
        }
    }

    fun selectPage(index: Int) {
        _scannerState.update { state ->
            if (index in state.pages.indices) state.copy(selectedPageIndex = index) else state
        }
    }

    fun updateCurrentPageEdits(
        mode: EnhancementMode? = null,
        rotationDelta: Int = 0,
        brightness: Float? = null,
        contrast: Float? = null
    ) {
        val currentState = _scannerState.value
        val page = currentState.pages.getOrNull(currentState.selectedPageIndex) ?: return

        viewModelScope.launch {
            _scannerState.update { it.copy(isProcessing = true) }
            val nextMode = mode ?: page.enhancementMode
            val nextRotation = (page.rotationDegrees + rotationDelta + 360) % 360
            val nextBrightness = brightness ?: page.brightness
            val nextContrast = contrast ?: page.contrast

            val processed = ImageProcessor.processPageBitmap(
                source = page.originalBitmap,
                cropNormalized = page.cropNormalized,
                rotationDegrees = nextRotation,
                mode = nextMode,
                brightness = nextBrightness,
                contrast = nextContrast
            )
            val procFile = documentRepository.saveBitmapToInternalStorage(processed, "proc")

            val updatedPage = page.copy(
                processedBitmap = processed,
                processedPath = procFile.absolutePath,
                enhancementMode = nextMode,
                rotationDegrees = nextRotation,
                brightness = nextBrightness,
                contrast = nextContrast
            )

            _scannerState.update { state ->
                val list = state.pages.toMutableList()
                if (state.selectedPageIndex in list.indices) {
                    list[state.selectedPageIndex] = updatedPage
                }
                state.copy(pages = list, isProcessing = false)
            }
        }
    }

    fun reorderPage(fromIndex: Int, toIndex: Int) {
        _scannerState.update { state ->
            if (fromIndex !in state.pages.indices || toIndex !in state.pages.indices) return@update state
            val mutable = state.pages.toMutableList()
            val item = mutable.removeAt(fromIndex)
            mutable.add(toIndex, item)
            state.copy(pages = mutable, selectedPageIndex = toIndex)
        }
    }

    fun removePage(index: Int) {
        _scannerState.update { state ->
            if (index !in state.pages.indices) return@update state
            val mutable = state.pages.toMutableList().apply { removeAt(index) }
            val nextIdx = (state.selectedPageIndex.coerceAtMost(mutable.lastIndex)).coerceAtLeast(0)
            state.copy(pages = mutable, selectedPageIndex = nextIdx)
        }
    }

    fun saveAndExportPdf(allowOverwrite: Boolean = true, onSuccess: (DocumentEntity) -> Unit) {
        val state = _scannerState.value
        if (state.isExportingPdf) return // Prevent duplicate tap file creation

        val validation = FilenameValidator.validate(state.documentName)
        if (!validation.isValid) {
            _scannerState.update { it.copy(errorMessage = validation.errorMessage) }
            return
        }

        viewModelScope.launch {
            _scannerState.update { it.copy(isExportingPdf = true, errorMessage = null) }
            val pageEntities = state.pages.mapIndexed { idx, draft ->
                PageEntity(
                    id = draft.id,
                    documentId = state.sessionId,
                    pageIndex = idx,
                    originalImagePath = draft.originalPath,
                    processedImagePath = draft.processedPath,
                    enhancementMode = draft.enhancementMode.name,
                    rotationDegrees = draft.rotationDegrees,
                    brightness = draft.brightness,
                    contrast = draft.contrast
                )
            }

            val result = documentRepository.createAndSaveDocument(
                rawName = validation.sanitizedName,
                pages = pageEntities,
                pageSize = state.selectedPageSize,
                allowOverwrite = allowOverwrite,
                safBackupUri = preferences.value.safCloudBackupUri
            )

            result.fold(
                onSuccess = { savedDoc ->
                    _scannerState.update {
                        it.copy(
                            isExportingPdf = false,
                            statusMessage = "Saved '${savedDoc.name}.pdf' (${savedDoc.pageCount} pages)"
                        )
                    }
                    onSuccess(savedDoc)
                },
                onFailure = { err ->
                    _scannerState.update {
                        it.copy(
                            isExportingPdf = false,
                            errorMessage = err.message ?: "Failed to create PDF."
                        )
                    }
                }
            )
        }
    }

    fun renameDocument(documentId: String, newName: String, onError: (String) -> Unit) {
        viewModelScope.launch {
            val res = documentRepository.renameDocument(documentId, newName)
            res.onFailure { onError(it.message ?: "Could not rename document.") }
        }
    }

    fun deleteDocument(documentId: String) {
        viewModelScope.launch {
            documentRepository.deleteDocument(documentId)
        }
    }

    fun setDefaultPageSize(size: PdfPageSize) {
        viewModelScope.launch { settingsRepository.setDefaultPageSize(size) }
    }

    fun setDefaultEnhancement(mode: EnhancementMode) {
        viewModelScope.launch { settingsRepository.setDefaultEnhancement(mode) }
    }

    fun bindSafCloudBackupFolder(treeUri: Uri) {
        viewModelScope.launch {
            cloudSyncManager.persistSafFolderPermission(treeUri)
            settingsRepository.setSafCloudBackupUri(treeUri.toString())
        }
    }
}

class ZViewViewModelFactory(
    private val documentRepository: DocumentRepository,
    private val settingsRepository: SettingsRepository,
    private val cloudSyncManager: CloudSyncManager
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return ZViewViewModel(documentRepository, settingsRepository, cloudSyncManager) as T
    }
}
