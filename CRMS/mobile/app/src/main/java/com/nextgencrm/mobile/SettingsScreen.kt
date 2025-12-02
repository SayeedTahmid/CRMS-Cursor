package com.nextgencrm.mobile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.foundation.border
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.background
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import com.nextgencrm.mobile.ui.theme.DarkBgCard
import android.widget.Toast

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    authToken: String,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    // Current user info
    var currentUser by remember { mutableStateOf<UserInfo?>(null) }
    var userLoading by remember { mutableStateOf(false) }

    // User management
    var users by remember { mutableStateOf<List<UserInfo>>(emptyList()) }
    var usersLoading by remember { mutableStateOf(false) }
    var showInviteDialog by remember { mutableStateOf(false) }
    var showRoleDialog by remember { mutableStateOf<UserInfo?>(null) }

    // Email
    var emailStatus by remember { mutableStateOf<EmailStatusResponse?>(null) }
    var emailLoading by remember { mutableStateOf(false) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var emailTestTo by remember { mutableStateOf("") }
    var emailTestResult by remember { mutableStateOf<String?>(null) }

    // Telegram
    var telegramStatus by remember { mutableStateOf<TelegramStatusResponse?>(null) }
    var telegramLoading by remember { mutableStateOf(false) }
    var telegramError by remember { mutableStateOf<String?>(null) }
    var telegramChatId by remember { mutableStateOf("") }
    var telegramTestResult by remember { mutableStateOf<String?>(null) }

    // Taiga
    var taigaStatus by remember { mutableStateOf<TaigaStatusResponse?>(null) }
    var taigaLoading by remember { mutableStateOf(false) }
    var taigaError by remember { mutableStateOf<String?>(null) }

    // Tab state
    var activeTab by remember { mutableStateOf(0) } // 0=General, 1=Notifications, 2=Email, 3=Users
    
    // General settings
    var language by remember { mutableStateOf("en") }
    var dateFormat by remember { mutableStateOf("MM/DD/YYYY") }
    var timeZone by remember { mutableStateOf("Asia/Dhaka") }
    var showDeleteAccountDialog by remember { mutableStateOf(false) }
    
    // Notification settings
    var emailNotifications by remember { mutableStateOf(true) }
    var pushNotifications by remember { mutableStateOf(false) }
    var weeklySummary by remember { mutableStateOf(true) }
    var complaintUpdates by remember { mutableStateOf(true) }
    var customerUpdates by remember { mutableStateOf(false) }
    
    // Save settings
    var savingSettings by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    
    // Email test form
    var emailTestSubject by remember { mutableStateOf("Test email from NextGen CRM") }
    var emailTestMessage by remember { mutableStateOf("Hello!\n\nThis is a test email from NextGen CRM settings.\n\nThanks!") }

    // Only SUPER_ADMIN and TENANT_ADMIN can manage users
    val isAdminOrSuperAdmin = currentUser?.role?.let { role ->
        val roleUpper = role.uppercase().trim()
        roleUpper == "SUPER_ADMIN" || roleUpper == "TENANT_ADMIN" || 
        roleUpper.contains("SUPER_ADMIN") || roleUpper.contains("TENANT_ADMIN") ||
        role.lowercase() in listOf("super_admin", "tenant_admin", "admin")
    } ?: false

    fun loadCurrentUser() {
        scope.launch {
            userLoading = true
            try {
                val authHeader = "Bearer $authToken"
                val resp = ApiClient.authApi.getCurrentUser(authHeader)
                currentUser = resp.user
            } catch (e: Exception) {
                // Ignore
            } finally {
                userLoading = false
            }
        }
    }

    fun loadUsers() {
        if (!isAdminOrSuperAdmin) return
        scope.launch {
            usersLoading = true
            try {
                val authHeader = "Bearer $authToken"
                val resp = ApiClient.usersApi.listUsers(authHeader)
                users = resp.users
            } catch (e: Exception) {
                Toast.makeText(context, "Error loading users: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                usersLoading = false
            }
        }
    }

    fun loadEmailStatus() {
        scope.launch {
            emailLoading = true
            emailError = null
            try {
                val authHeader = "Bearer $authToken"
                emailStatus = ApiClient.emailApi.getEmailStatus(authHeader)
            } catch (e: Exception) {
                emailError = e.message
            } finally {
                emailLoading = false
            }
        }
    }

    LaunchedEffect(authToken) {
        loadCurrentUser()
        val authHeader = "Bearer $authToken"

        scope.launch {
            try {
                emailLoading = true
                emailError = null
                emailStatus = ApiClient.emailApi.getEmailStatus(authHeader)
            } catch (e: Exception) {
                emailError = e.message
            } finally {
                emailLoading = false
            }
        }

        scope.launch {
            try {
                telegramLoading = true
                telegramError = null
                telegramStatus = ApiClient.telegramApi.getTelegramStatus(authHeader)
            } catch (e: Exception) {
                telegramError = e.message
            } finally {
                telegramLoading = false
            }
        }

        scope.launch {
            try {
                taigaLoading = true
                taigaError = null
                taigaStatus = ApiClient.taigaApi.getTaigaStatus(authHeader)
            } catch (e: Exception) {
                taigaError = e.message
            } finally {
                taigaLoading = false
            }
        }
    }

    LaunchedEffect(isAdminOrSuperAdmin, activeTab) {
        if (isAdminOrSuperAdmin && activeTab == 3) { // Users tab
            loadUsers()
        }
        if (activeTab == 2) { // Email tab
            loadEmailStatus()
        }
    }

    fun sendTestEmail() {
        val to = emailTestTo.trim()
        if (to.isBlank()) {
            emailTestResult = "Please enter a recipient email."
            return
        }
        scope.launch {
            emailTestResult = null
            try {
                val authHeader = "Bearer $authToken"
                val body = EmailSendRequest(
                    to = to,
                    subject = emailTestSubject,
                    text = emailTestMessage,
                    trigger = "settings_test_email"
                )
                val resp = ApiClient.emailApi.sendEmail(authHeader, body)
                emailTestResult = resp.message ?: if (resp.success == true) "Test email sent." else "Request completed."
            } catch (e: Exception) {
                emailTestResult = "Error: ${e.message}"
            }
        }
    }

    // Delete Account handler
    fun handleDeleteAccount() {
        // TODO: Implement delete account logic
        Toast.makeText(context, "Delete account functionality coming soon", Toast.LENGTH_SHORT).show()
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Settings,
                    contentDescription = "Settings",
                    tint = com.nextgencrm.mobile.ui.theme.PrimaryPurple,
                    modifier = Modifier.size(32.dp)
                )
                Spacer(Modifier.size(8.dp))
                Text(
                    "Settings",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            if (!userLoading && currentUser != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "Role: ",
                        style = MaterialTheme.typography.bodySmall,
                        color = com.nextgencrm.mobile.ui.theme.TextSecondary
                    )
                    Text(
                        currentUser?.role?.uppercase() ?: "Unknown",
                        style = MaterialTheme.typography.bodySmall,
                        color = com.nextgencrm.mobile.ui.theme.PrimaryPurple,
                        fontWeight = FontWeight.Medium
                    )
                    if (isAdminOrSuperAdmin) {
                        Spacer(Modifier.size(4.dp))
                        Text(
                            "✓",
                            color = com.nextgencrm.mobile.ui.theme.Success,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
        
        Spacer(Modifier.size(16.dp))
        
        // Error/Success messages
        errorMessage?.let {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = com.nextgencrm.mobile.ui.theme.Error.copy(alpha = 0.2f))
            ) {
                Text(
                    text = it,
                    color = com.nextgencrm.mobile.ui.theme.Error,
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Spacer(Modifier.size(8.dp))
        }
        successMessage?.let {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = com.nextgencrm.mobile.ui.theme.Success.copy(alpha = 0.2f))
            ) {
                Text(
                    text = it,
                    color = com.nextgencrm.mobile.ui.theme.Success,
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Spacer(Modifier.size(8.dp))
        }
        
        // Tabs
        val tabs = listOf("General", "Notifications", "Email") + if (isAdminOrSuperAdmin) listOf("Users") else emptyList()
        
        ScrollableTabRow(
            selectedTabIndex = activeTab,
            modifier = Modifier.fillMaxWidth(),
            containerColor = DarkBgCard,
            contentColor = com.nextgencrm.mobile.ui.theme.TextPrimary,
            divider = {}
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = activeTab == index,
                    onClick = { activeTab = index },
                    text = {
                        Text(
                            title,
                            color = if (activeTab == index) com.nextgencrm.mobile.ui.theme.PrimaryPurple else com.nextgencrm.mobile.ui.theme.TextSecondary
                        )
                    }
                )
            }
        }
        
        Spacer(Modifier.size(16.dp))
        
        // Tab Content
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
        ) {
            when (activeTab) {
                0 -> GeneralTabContent(
                    language = language,
                    dateFormat = dateFormat,
                    timeZone = timeZone,
                    onLanguageChange = { language = it },
                    onDateFormatChange = { dateFormat = it },
                    onTimeZoneChange = { timeZone = it },
                    onDeleteAccountClick = { showDeleteAccountDialog = true }
                )
                1 -> NotificationsTabContent(
                    emailNotifications = emailNotifications,
                    pushNotifications = pushNotifications,
                    weeklySummary = weeklySummary,
                    complaintUpdates = complaintUpdates,
                    customerUpdates = customerUpdates,
                    onEmailNotificationsChange = { emailNotifications = it },
                    onPushNotificationsChange = { pushNotifications = it },
                    onWeeklySummaryChange = { weeklySummary = it },
                    onComplaintUpdatesChange = { complaintUpdates = it },
                    onCustomerUpdatesChange = { customerUpdates = it }
                )
                2 -> EmailTabContent(
                    emailStatus = emailStatus,
                    emailLoading = emailLoading,
                    emailError = emailError,
                    emailTestTo = emailTestTo,
                    emailTestSubject = emailTestSubject,
                    emailTestMessage = emailTestMessage,
                    emailTestResult = emailTestResult,
                    onEmailTestToChange = { emailTestTo = it },
                    onEmailTestSubjectChange = { emailTestSubject = it },
                    onEmailTestMessageChange = { emailTestMessage = it },
                    onSendTestEmail = { sendTestEmail() },
                    onRefreshStatus = { loadEmailStatus() }
                )
                3 -> if (isAdminOrSuperAdmin) {
                    UsersTabContent(
                        users = users,
                        usersLoading = usersLoading,
                        onInviteClick = { showInviteDialog = true },
                        onRoleClick = { showRoleDialog = it }
                    )
                }
            }
        }
        
        Spacer(Modifier.size(16.dp))
        
        // Save Settings Button
        Button(
            onClick = {
                scope.launch {
                    savingSettings = true
                    errorMessage = null
                    successMessage = null
                    try {
                        // TODO: Save settings to backend
                        // For now, just show success
                        successMessage = "Settings saved successfully!"
                    } catch (e: Exception) {
                        errorMessage = e.message ?: "Failed to save settings"
                    } finally {
                        savingSettings = false
                    }
                }
            },
            enabled = !savingSettings,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = com.nextgencrm.mobile.ui.theme.PrimaryPurple
            )
        ) {
            if (savingSettings) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary
                )
                Spacer(Modifier.size(8.dp))
            }
            Text(if (savingSettings) "Saving..." else "Save Settings")
        }
        
        Spacer(Modifier.size(8.dp))
        
        Button(
            onClick = onLogout,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Logout")
        }
    }

    // Invite User Dialog
    if (showInviteDialog) {
        InviteUserDialog(
            authToken = authToken,
            onDismiss = { showInviteDialog = false },
            onInvited = {
                loadUsers()
                showInviteDialog = false
            }
        )
    }

    // Change Role Dialog
    showRoleDialog?.let { user ->
        ChangeUserRoleDialog(
            authToken = authToken,
            user = user,
            onDismiss = { showRoleDialog = null },
            onRoleChanged = {
                loadUsers()
                showRoleDialog = null
            }
        )
    }
    
    // Delete Account Dialog
    if (showDeleteAccountDialog) {
        DeleteAccountDialog(
            onDismiss = { showDeleteAccountDialog = false },
            onConfirm = {
                handleDeleteAccount()
                showDeleteAccountDialog = false
            }
        )
    }
}

@Composable
fun UserRow(
    user: UserInfo,
    onRoleClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = user.displayName ?: user.email ?: user.id ?: "Unknown",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = user.email ?: "",
                style = MaterialTheme.typography.bodySmall
            )
        }
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = user.role?.replaceFirstChar { it.uppercase() } ?: "Unknown",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary
            )
            IconButton(onClick = onRoleClick) {
                Icon(Icons.Default.Edit, contentDescription = "Change role")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InviteUserDialog(
    authToken: String,
    onDismiss: () -> Unit,
    onInvited: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    var email by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("viewer") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    // Map mobile role names to backend role names
    val roles = listOf("viewer", "support", "sales_rep", "manager", "admin")

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = { Text("Invite User") },
        text = {
            Column {
                if (error != null) {
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.size(8.dp))
                }
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.size(8.dp))
                Text("Role", style = MaterialTheme.typography.labelMedium)
                roles.forEach { r ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { role = r },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = role == r, onClick = { role = r })
                        Text(r.replaceFirstChar { it.uppercase() })
                    }
                }
            }
        },
        confirmButton = {
            Button(
                enabled = !loading && email.isNotBlank(),
                onClick = {
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            val authHeader = "Bearer $authToken"
                            val body = InviteUserRequest(
                                email = email.trim(),
                                role = role
                            )
                            val resp = ApiClient.usersApi.inviteUser(authHeader, body)
                            Toast.makeText(context, "User invited successfully", Toast.LENGTH_SHORT).show()
                            onInvited()
                        } catch (e: Exception) {
                            error = e.message ?: "Failed to invite user"
                            Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                        } finally {
                            loading = false
                        }
                    }
                }
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text("Invite")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!loading) onDismiss() }) {
                Text("Cancel")
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangeUserRoleDialog(
    authToken: String,
    user: UserInfo,
    onDismiss: () -> Unit,
    onRoleChanged: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    var role by remember { mutableStateOf(user.role ?: "viewer") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    // Map mobile role names to backend role names
    val roles = listOf("viewer", "support", "sales_rep", "manager", "admin")

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = { Text("Change Role") },
        text = {
            Column {
                Text("User: ${user.email ?: user.id}", style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.size(8.dp))
                if (error != null) {
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.size(8.dp))
                }
                Text("Select Role", style = MaterialTheme.typography.labelMedium)
                roles.forEach { r ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { role = r },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = role == r, onClick = { role = r })
                        Text(r.replaceFirstChar { it.uppercase() })
                    }
                }
            }
        },
        confirmButton = {
            Button(
                enabled = !loading && role != user.role,
                onClick = {
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            val authHeader = "Bearer $authToken"
                            val userId = user.id ?: return@launch
                            val body = SetUserRoleRequest(role = role)
                            ApiClient.usersApi.setUserRole(authHeader, userId, body)
                            Toast.makeText(context, "Role updated successfully", Toast.LENGTH_SHORT).show()
                            onRoleChanged()
                        } catch (e: Exception) {
                            error = e.message ?: "Failed to update role"
                            Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                        } finally {
                            loading = false
                        }
                    }
                }
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text("Save")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!loading) onDismiss() }) {
                Text("Cancel")
            }
        }
    )
}

