package com.zynor.zview

import android.app.Application
import com.zynor.zview.data.local.SettingsRepository
import com.zynor.zview.data.local.ZViewDatabase
import com.zynor.zview.data.repository.CloudSyncManager
import com.zynor.zview.data.repository.DocumentRepository

class ZViewApplication : Application() {
    val database: ZViewDatabase by lazy { ZViewDatabase.getInstance(this) }
    val cloudSyncManager: CloudSyncManager by lazy { CloudSyncManager(this) }
    val documentRepository: DocumentRepository by lazy {
        DocumentRepository(this, database.documentDao(), cloudSyncManager)
    }
    val settingsRepository: SettingsRepository by lazy { SettingsRepository(this) }
}
