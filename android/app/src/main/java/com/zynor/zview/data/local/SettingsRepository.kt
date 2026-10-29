package com.zynor.zview.data.local

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "zscan_settings")

data class UserPreferences(
    val themeMode: AppThemeMode = AppThemeMode.SYSTEM,
    val defaultPageSize: PdfPageSize = PdfPageSize.A4,
    val defaultEnhancement: EnhancementMode = EnhancementMode.DOCUMENT_ENHANCE,
    val highContrastUi: Boolean = false,
    val safCloudBackupUri: String? = null
)

class SettingsRepository(private val context: Context) {
    private object Keys {
        val APP_THEME_MODE = stringPreferencesKey("app_theme_mode")
        val DEFAULT_PAGE_SIZE = stringPreferencesKey("default_page_size")
        val DEFAULT_ENHANCEMENT = stringPreferencesKey("default_enhancement")
        val HIGH_CONTRAST_UI = booleanPreferencesKey("high_contrast_ui")
        val SAF_CLOUD_BACKUP_URI = stringPreferencesKey("saf_cloud_backup_uri")
    }

    val preferencesFlow: Flow<UserPreferences> = context.dataStore.data.map { prefs ->
        val themeName = prefs[Keys.APP_THEME_MODE] ?: AppThemeMode.SYSTEM.name
        val sizeName = prefs[Keys.DEFAULT_PAGE_SIZE] ?: PdfPageSize.A4.name
        val enhanceName = prefs[Keys.DEFAULT_ENHANCEMENT] ?: EnhancementMode.DOCUMENT_ENHANCE.name
        UserPreferences(
            themeMode = runCatching { AppThemeMode.valueOf(themeName) }.getOrDefault(AppThemeMode.SYSTEM),
            defaultPageSize = runCatching { PdfPageSize.valueOf(sizeName) }.getOrDefault(PdfPageSize.A4),
            defaultEnhancement = runCatching { EnhancementMode.valueOf(enhanceName) }.getOrDefault(EnhancementMode.DOCUMENT_ENHANCE),
            highContrastUi = prefs[Keys.HIGH_CONTRAST_UI] ?: false,
            safCloudBackupUri = prefs[Keys.SAF_CLOUD_BACKUP_URI]
        )
    }

    suspend fun setThemeMode(mode: AppThemeMode) {
        context.dataStore.edit { it[Keys.APP_THEME_MODE] = mode.name }
    }

    suspend fun setDefaultPageSize(pageSize: PdfPageSize) {
        context.dataStore.edit { it[Keys.DEFAULT_PAGE_SIZE] = pageSize.name }
    }

    suspend fun setDefaultEnhancement(mode: EnhancementMode) {
        context.dataStore.edit { it[Keys.DEFAULT_ENHANCEMENT] = mode.name }
    }

    suspend fun setHighContrastUi(enabled: Boolean) {
        context.dataStore.edit { it[Keys.HIGH_CONTRAST_UI] = enabled }
    }

    suspend fun setSafCloudBackupUri(uriString: String?) {
        context.dataStore.edit {
            if (uriString == null) it.remove(Keys.SAF_CLOUD_BACKUP_URI)
            else it[Keys.SAF_CLOUD_BACKUP_URI] = uriString
        }
    }
}
