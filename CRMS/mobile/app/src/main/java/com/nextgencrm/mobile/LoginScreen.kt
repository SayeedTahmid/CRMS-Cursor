package com.nextgencrm.mobile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.ui.text.input.PasswordVisualTransformation
import com.nextgencrm.mobile.ui.theme.Border
import com.nextgencrm.mobile.ui.theme.PrimaryPurple
import com.nextgencrm.mobile.ui.theme.TextSecondary
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLogin: (String, String) -> Unit,
    onRegister: (String, String, String) -> Unit
) {
    var isSignUp by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            "Welcome Next Gen CRM System",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.size(16.dp))
        Text(
            if (isSignUp) "Create a new account" else "Please sign in to your account",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
        Spacer(Modifier.size(16.dp))
        
        if (isSignUp) {
            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = { Text("Display Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = TextFieldDefaults.outlinedTextFieldColors(
                    focusedBorderColor = PrimaryPurple,
                    unfocusedBorderColor = Border,
                    cursorColor = PrimaryPurple,
                    focusedLabelColor = PrimaryPurple,
                    unfocusedLabelColor = TextSecondary
                )
            )
            Spacer(Modifier.size(12.dp))
        }
        
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email address") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = TextFieldDefaults.outlinedTextFieldColors(
                focusedBorderColor = PrimaryPurple,
                unfocusedBorderColor = Border,
                cursorColor = PrimaryPurple,
                focusedLabelColor = PrimaryPurple,
                unfocusedLabelColor = TextSecondary
            )
        )
        Spacer(Modifier.size(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            colors = TextFieldDefaults.outlinedTextFieldColors(
                focusedBorderColor = PrimaryPurple,
                unfocusedBorderColor = Border,
                cursorColor = PrimaryPurple,
                focusedLabelColor = PrimaryPurple,
                unfocusedLabelColor = TextSecondary
            )
        )
        Spacer(Modifier.size(4.dp))
        if (!isSignUp) {
            androidx.compose.material3.TextButton(
                onClick = { /* TODO: Implement forgot password */ },
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(0.dp)
            ) {
                Text(
                    "Forgot password?",
                    style = MaterialTheme.typography.bodySmall,
                    color = PrimaryPurple
                )
            }
        }
        Spacer(Modifier.size(16.dp))
        Button(
            onClick = {
                if (isSignUp) {
                    onRegister(email.trim(), password, displayName.trim())
                } else {
                    onLogin(email.trim(), password)
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = email.isNotBlank() && password.isNotBlank() && (!isSignUp || displayName.isNotBlank()),
            colors = ButtonDefaults.buttonColors(
                containerColor = PrimaryPurple
            )
        ) {
            Text(if (isSignUp) "Sign Up" else "Sign in")
        }
        Spacer(Modifier.size(12.dp))
        androidx.compose.material3.TextButton(
            onClick = { isSignUp = !isSignUp },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                if (isSignUp) "Already have an account? Sign In" else "Don't have an account? Register here",
                style = MaterialTheme.typography.bodySmall,
                color = PrimaryPurple
            )
        }
    }
}


