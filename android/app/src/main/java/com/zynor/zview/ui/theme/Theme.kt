package com.zynor.zview.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import com.zynor.zview.data.local.AppThemeMode

private val ZScanDarkColorScheme = darkColorScheme(
    primary = CeruleanBlue,
    onPrimary = PureWhite,
    secondary = NeonRose,
    onSecondary = PureWhite,
    tertiary = CeruleanBlue,
    background = JetBlack,
    onBackground = PureWhite,
    surface = DarkSurface,
    onSurface = PureWhite,
    surfaceVariant = ElevatedSurfaceDark,
    onSurfaceVariant = SecondaryTextDark,
    outline = DividerDark,
    error = ErrorRed,
    onError = PureWhite
)

private val ZScanLightColorScheme = lightColorScheme(
    primary = CeruleanBlue,
    onPrimary = PureWhite,
    secondary = NeonRose,
    onSecondary = PureWhite,
    tertiary = CeruleanBlue,
    background = LightBackground,
    onBackground = JetBlack,
    surface = LightSurface,
    onSurface = JetBlack,
    surfaceVariant = ElevatedSurfaceLight,
    onSurfaceVariant = SecondaryTextLight,
    outline = DividerLight,
    error = ErrorRed,
    onError = PureWhite
)

@Composable
fun ZScanTheme(
    themeMode: AppThemeMode = AppThemeMode.SYSTEM,
    content: @Composable () -> Unit
) {
    val systemDark = isSystemInDarkTheme()
    val useDarkTheme = when (themeMode) {
        AppThemeMode.SYSTEM -> systemDark
        AppThemeMode.DARK -> true
        AppThemeMode.LIGHT -> false
    }

    val colorScheme = if (useDarkTheme) ZScanDarkColorScheme else ZScanLightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.surface.toArgb()
            val controller = WindowCompat.getInsetsController(window, view)
            controller.isAppearanceLightStatusBars = !useDarkTheme
            controller.isAppearanceLightNavigationBars = !useDarkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = ZScanTypography,
        content = content
    )
}
