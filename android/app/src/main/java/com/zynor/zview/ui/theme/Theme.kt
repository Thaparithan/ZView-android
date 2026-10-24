package com.zynor.zview.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val ZViewDarkColorScheme = darkColorScheme(
    primary = CeruleanBlue,
    onPrimary = PureWhite,
    secondary = NeonRose,
    onSecondary = PureWhite,
    tertiary = CeruleanBlue,
    background = JetBlack,
    onBackground = PureWhite,
    surface = DarkSurface,
    onSurface = PureWhite,
    surfaceVariant = ElevatedSurface,
    onSurfaceVariant = SecondaryText,
    outline = DividerColor,
    error = ErrorRed,
    onError = PureWhite
)

@Composable
fun ZViewTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = ZViewDarkColorScheme,
        typography = ZViewTypography,
        content = content
    )
}
