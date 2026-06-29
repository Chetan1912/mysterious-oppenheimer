package com.apex.academy.ui.login

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.apex.academy.data.api.ApiClient
import com.apex.academy.data.model.LoginRequest
import com.apex.academy.ui.navigation.Screen
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

class LoginViewModel : ViewModel() {
    var email by mutableStateOf("")
    var password by mutableStateOf("")
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    private val _loginSuccessEvent = MutableSharedFlow<String>()
    val loginSuccessEvent = _loginSuccessEvent.asSharedFlow()

    fun onLoginClick() {
        if (email.isBlank() || password.isBlank()) {
            errorMessage = "Email and password are required"
            return
        }

        isLoading = true
        errorMessage = null

        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.login(LoginRequest(email.trim(), password))
                if (response.isSuccessful && response.body()?.success == true) {
                    val user = response.body()?.user
                    if (user != null) {
                        // Emit role to navigate
                        _loginSuccessEvent.emit(user.role)
                    } else {
                        errorMessage = "Failed to retrieve user profile"
                    }
                } else {
                    errorMessage = response.body()?.error ?: "Invalid email or password"
                }
            } catch (e: Exception) {
                errorMessage = "Network error: Make sure you are connected to the internet"
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }

    fun checkExistingSession() {
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getCurrentUser()
                if (response.isSuccessful && response.body()?.user != null) {
                    val role = response.body()?.user?.role
                    if (role != null) {
                        _loginSuccessEvent.emit(role)
                    }
                }
            } catch (e: Exception) {
                // Ignore, session is not valid
            }
        }
    }
}
