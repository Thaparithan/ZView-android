package com.zynor.zview.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.zynor.zview.ui.screens.DocumentPreviewScreen
import com.zynor.zview.ui.screens.DocumentsScreen
import com.zynor.zview.ui.screens.HomeScreen
import com.zynor.zview.ui.screens.ScannerScreen
import com.zynor.zview.ui.screens.SettingsScreen
import com.zynor.zview.ui.theme.CeruleanBlue
import com.zynor.zview.ui.theme.DarkSurface
import com.zynor.zview.ui.theme.ElevatedSurface
import com.zynor.zview.ui.theme.JetBlack
import com.zynor.zview.ui.theme.NeonRose
import com.zynor.zview.ui.theme.PureWhite
import com.zynor.zview.ui.theme.SecondaryText
import com.zynor.zview.ui.viewmodel.ZViewViewModel

object Routes {
    const val HOME = "home"
    const val DOCUMENTS = "documents"
    const val SETTINGS = "settings"
    const val SCANNER = "scanner"
    const val PREVIEW = "preview/{documentId}"
    fun previewRoute(documentId: String) = "preview/$documentId"
}

@Composable
fun ZViewNavHost(viewModel: ZViewViewModel) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in listOf(Routes.HOME, Routes.DOCUMENTS, Routes.SETTINGS)

    Scaffold(
        containerColor = JetBlack,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = DarkSurface) {
                    val items = listOf(
                        Triple(Routes.HOME, "Home", Icons.Default.Home),
                        Triple(Routes.DOCUMENTS, "Documents", Icons.Default.Description),
                        Triple(Routes.SETTINGS, "Settings", Icons.Default.Settings)
                    )
                    items.forEach { (route, label, icon) ->
                        val selected = currentRoute == route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                if (currentRoute != route) {
                                    navController.navigate(route) {
                                        popUpTo(Routes.HOME) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = { Icon(imageVector = icon, contentDescription = label) },
                            label = { Text(text = label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = PureWhite,
                                selectedTextColor = NeonRose,
                                indicatorColor = CeruleanBlue.copy(alpha = 0.25f),
                                unselectedIconColor = SecondaryText,
                                unselectedTextColor = SecondaryText
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Routes.HOME) {
                HomeScreen(
                    viewModel = viewModel,
                    onStartScan = {
                        viewModel.startNewScanSession()
                        navController.navigate(Routes.SCANNER)
                    },
                    onOpenDocuments = { navController.navigate(Routes.DOCUMENTS) },
                    onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                    onOpenPreview = { docId -> navController.navigate(Routes.previewRoute(docId)) }
                )
            }
            composable(Routes.DOCUMENTS) {
                DocumentsScreen(
                    viewModel = viewModel,
                    onOpenPreview = { docId -> navController.navigate(Routes.previewRoute(docId)) },
                    onStartScan = {
                        viewModel.startNewScanSession()
                        navController.navigate(Routes.SCANNER)
                    }
                )
            }
            composable(Routes.SCANNER) {
                ScannerScreen(
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() },
                    onFinishedExport = { savedDoc ->
                        navController.navigate(Routes.previewRoute(savedDoc.id)) {
                            popUpTo(Routes.HOME)
                        }
                    }
                )
            }
            composable(
                route = Routes.PREVIEW,
                arguments = listOf(navArgument("documentId") { type = NavType.StringType })
            ) { entry ->
                val docId = entry.arguments?.getString("documentId").orEmpty()
                DocumentPreviewScreen(
                    documentId = docId,
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() }
                )
            }
            composable(Routes.SETTINGS) {
                SettingsScreen(viewModel = viewModel)
            }
        }
    }
}
