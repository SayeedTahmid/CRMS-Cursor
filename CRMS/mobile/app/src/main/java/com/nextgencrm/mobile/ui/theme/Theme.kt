package com.nextgencrm.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

// Single dark theme matching the web app colors
private val DarkColorScheme: ColorScheme = darkColorScheme(
    primary = PrimaryPurple,
    secondary = SecondaryPurple,
    background = DarkBg,
    surface = DarkBgSecondary,
    onPrimary = TextPrimary,
    onSecondary = TextPrimary,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
)

@Composable
fun NextGenCRMMobileTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    // We force darkTheme=true for now to match the web dark UI
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}