package com.nextgencrm.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import com.nextgencrm.mobile.ui.theme.NextGenCRMMobileTheme
import androidx.compose.ui.Modifier

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NextGenCRMMobileTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    // RootApp is in the same package, so no extra import needed
                    RootApp()
                }
            }
        }
    }
}
