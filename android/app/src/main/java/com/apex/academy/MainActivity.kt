package com.apex.academy

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.navigation.compose.rememberNavController
import com.apex.academy.ui.navigation.NavGraph
import com.apex.academy.ui.theme.ApexTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ApexTheme {
                val navController = rememberNavController()
                NavGraph(navController = navController)
            }
        }
    }
}
