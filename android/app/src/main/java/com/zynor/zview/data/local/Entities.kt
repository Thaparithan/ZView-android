package com.zynor.zview.data.local

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

enum class EnhancementMode(val displayName: String) {
    ORIGINAL("Original Color"),
    GRAYSCALE("Grayscale"),
    BLACK_AND_WHITE("Black and White"),
    DOCUMENT_ENHANCE("Document Enhancement")
}

enum class PdfPageSize(val displayName: String, val widthPt: Int, val heightPt: Int) {
    A4("A4 (210 × 297 mm)", 595, 842),
    LETTER("US Letter (8.5 × 11 in)", 612, 792),
    LEGAL("US Legal (8.5 × 14 in)", 612, 1008),
    FIT_IMAGE("Fit to Scan Aspect", 595, 842)
}

@Entity(tableName = "documents")
data class DocumentEntity(
    @PrimaryKey val id: String,
    val name: String,
    val createdAt: Long,
    val updatedAt: Long,
    val pageCount: Int,
    val pdfFilePath: String?,
    val fileSizeBytes: Long,
    val thumbnailPath: String?,
    val pageSize: String = PdfPageSize.A4.name,
    val isSyncedToSafBackup: Boolean = false
)

@Entity(
    tableName = "document_pages",
    foreignKeys = [
        ForeignKey(
            entity = DocumentEntity::class,
            parentColumns = ["id"],
            childColumns = ["documentId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("documentId")]
)
data class PageEntity(
    @PrimaryKey val id: String,
    val documentId: String,
    val pageIndex: Int,
    val originalImagePath: String,
    val processedImagePath: String,
    val enhancementMode: String = EnhancementMode.DOCUMENT_ENHANCE.name,
    val rotationDegrees: Int = 0,
    val brightness: Float = 0f,
    val contrast: Float = 1f
)
