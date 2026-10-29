package com.zynor.zview

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.viewmodel.compose.viewModel
import com.zynor.zview.ui.navigation.ZViewNavHost
import com.zynor.zview.ui.theme.ZScanTheme
import com.zynor.zview.ui.viewmodel.ZViewViewModel
import com.zynor.zview.ui.viewmodel.ZViewViewModelFactory

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as ZViewApplication
        val factory = ZViewViewModelFactory(
            app.documentRepository,
            app.settingsRepository,
            app.cloudSyncManager
        )

        setContent {
            val viewModel: ZViewViewModel = viewModel(factory = factory)
            val preferences by viewModel.preferences.collectAsState()

            ZScanTheme(themeMode = preferences.themeMode) {
                ZViewNavHost(viewModel = viewModel)
            }
        }
    }
}
