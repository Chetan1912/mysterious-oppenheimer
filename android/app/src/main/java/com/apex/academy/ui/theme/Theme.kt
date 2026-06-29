package com.apex.academy.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = Color.White,
    primaryContainer = PrimaryContainer,
    secondary = Secondary,
    onSecondary = Color.White,
    background = Background,
    onBackground = NeutralText,
    surface = Surface,
    onSurface = NeutralText,
    surfaceVariant = NeutralLight,
    onSurfaceVariant = NeutralSubText,
    outline = NeutralBorder
)

private val DarkColorScheme = darkColorScheme(
    primary = Primary,
    onPrimary = Color.White,
    primaryContainer = SecondaryContainer,
    secondary = Color.White,
    onSecondary = Secondary,
    background = Secondary,
    onBackground = Color.White,
    surface = SecondaryContainer,
    onSurface = Color.White,
    surfaceVariant = SecondaryContainer,
    onSurfaceVariant = Color.LightGray,
    outline = Color.DarkGray
)

@Composable
fun ApexTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
