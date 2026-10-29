package com.zynor.zview

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.viewmodel.compose.viewModel
import com.zynor.zview.ui.navigation.ZViewNavHost
import com.zynor.zview.ui.theme.ZViewTheme
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
            ZViewTheme {
                val viewModel: ZViewViewModel = viewModel(factory = factory)
                ZViewNavHost(viewModel = viewModel)
            }
        }
    }
}
