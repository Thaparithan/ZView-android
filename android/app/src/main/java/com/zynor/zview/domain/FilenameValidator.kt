package com.zynor.zview.domain

object FilenameValidator {
    private val INVALID_CHARS = Regex("[\\\\/:*?\"<>|\\x00-\\x1F]")
    private val RESERVED_NAMES = setOf("CON", "PRN", "AUX", "NUL", "COM1", "LPT1")

    data class ValidationResult(
        val isValid: Boolean,
        val sanitizedName: String,
        val errorMessage: String? = null
    )

    fun validate(rawInput: String): ValidationResult {
        val trimmed = rawInput.trim().removeSuffix(".pdf").removeSuffix(".PDF").trim()
        if (trimmed.isEmpty()) {
            return ValidationResult(
                isValid = false,
                sanitizedName = "",
                errorMessage = "Document name cannot be empty."
            )
        }
        if (trimmed.length > 80) {
            return ValidationResult(
                isValid = false,
                sanitizedName = trimmed.take(80),
                errorMessage = "Document name must be 80 characters or fewer."
            )
        }
        if (INVALID_CHARS.containsMatchIn(trimmed)) {
            return ValidationResult(
                isValid = false,
                sanitizedName = trimmed.replace(INVALID_CHARS, "_"),
                errorMessage = "Filename cannot contain / \\ : * ? \" < > | characters."
            )
        }
        if (RESERVED_NAMES.contains(trimmed.uppercase())) {
            return ValidationResult(
                isValid = false,
                sanitizedName = "${trimmed}_Scan",
                errorMessage = "Filename uses a reserved system name."
            )
        }
        if (trimmed == "." || trimmed == "..") {
            return ValidationResult(
                isValid = false,
                sanitizedName = "ZScan_Document",
                errorMessage = "Filename cannot be only dots."
            )
        }
        return ValidationResult(
            isValid = true,
            sanitizedName = trimmed,
            errorMessage = null
        )
    }
}
