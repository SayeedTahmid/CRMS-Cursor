package com.nextgencrm.mobile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nextgencrm.mobile.ui.theme.DarkBgCard
import com.nextgencrm.mobile.ui.theme.PrimaryPurple
import com.nextgencrm.mobile.ui.theme.TextSecondary
import com.nextgencrm.mobile.ui.theme.Success

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GeneralTabContent(
    language: String,
    dateFormat: String,
    timeZone: String,
    onLanguageChange: (String) -> Unit,
    onDateFormatChange: (String) -> Unit,
    onTimeZoneChange: (String) -> Unit,
    onDeleteAccountClick: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
            "General Settings",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold
        )
        
        // Language
        Column {
            Text(
                "Language",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
            Spacer(Modifier.size(8.dp))
            var expanded by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
                OutlinedTextField(
                    value = "English",
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    DropdownMenuItem(text = { Text("English") }, onClick = { expanded = false })
                }
            }
        }
        
        // Date Format
        Column {
            Text(
                "Date Format",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
            Spacer(Modifier.size(8.dp))
            var expanded by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
                OutlinedTextField(
                    value = dateFormat,
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    listOf("MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD").forEach { format ->
                        DropdownMenuItem(
                            text = { Text(format) },
                            onClick = {
                                onDateFormatChange(format)
                                expanded = false
                            }
                        )
                    }
                }
            }
        }
        
        // Time Zone
        Column {
            Text(
                "Time Zone",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
            Spacer(Modifier.size(8.dp))
            var expanded by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
                OutlinedTextField(
                    value = timeZone,
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    DropdownMenuItem(
                        text = { Text("Asia/Dhaka (Bangladesh)") },
                        onClick = {
                            onTimeZoneChange("Asia/Dhaka")
                            expanded = false
                        }
                    )
                }
            }
        }
        
        // Delete Account
        Spacer(Modifier.size(16.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = DarkBgCard)
        ) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    "Delete Account",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
                Spacer(Modifier.size(4.dp))
                Text(
                    "Permanently delete your account and all associated data",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
                Spacer(Modifier.size(12.dp))
                Button(
                    onClick = onDeleteAccountClick,
                    colors = ButtonDefaults.buttonColors(containerColor = com.nextgencrm.mobile.ui.theme.Error)
                ) {
                    Text("Delete Account")
                }
            }
        }
    }
}

@Composable
fun NotificationsTabContent(
    emailNotifications: Boolean,
    pushNotifications: Boolean,
    weeklySummary: Boolean,
    complaintUpdates: Boolean,
    customerUpdates: Boolean,
    onEmailNotificationsChange: (Boolean) -> Unit,
    onPushNotificationsChange: (Boolean) -> Unit,
    onWeeklySummaryChange: (Boolean) -> Unit,
    onComplaintUpdatesChange: (Boolean) -> Unit,
    onCustomerUpdatesChange: (Boolean) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            "Notification Preferences",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold
        )
        
        NotificationToggleItem(
            title = "Email notifications",
            description = "Receive notifications via email",
            checked = emailNotifications,
            onCheckedChange = onEmailNotificationsChange
        )
        
        NotificationToggleItem(
            title = "Push notifications",
            description = "Receive browser push notifications",
            checked = pushNotifications,
            onCheckedChange = onPushNotificationsChange
        )
        
        NotificationToggleItem(
            title = "Weekly summary",
            description = "Get weekly activity summary",
            checked = weeklySummary,
            onCheckedChange = onWeeklySummaryChange
        )
        
        NotificationToggleItem(
            title = "Complaint updates",
            description = "Notify when complaints are updated",
            checked = complaintUpdates,
            onCheckedChange = onComplaintUpdatesChange
        )
        
        NotificationToggleItem(
            title = "Customer updates",
            description = "Notify when customers are updated",
            checked = customerUpdates,
            onCheckedChange = onCustomerUpdatesChange
        )
    }
}

@Composable
fun NotificationToggleItem(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = DarkBgCard)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Spacer(Modifier.size(4.dp))
                Text(
                    description,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = androidx.compose.ui.graphics.Color.White,
                    checkedTrackColor = PrimaryPurple
                )
            )
        }
    }
}

@Composable
fun EmailTabContent(
    emailStatus: EmailStatusResponse?,
    emailLoading: Boolean,
    emailError: String?,
    emailTestTo: String,
    emailTestSubject: String,
    emailTestMessage: String,
    emailTestResult: String?,
    onEmailTestToChange: (String) -> Unit,
    onEmailTestSubjectChange: (String) -> Unit,
    onEmailTestMessageChange: (String) -> Unit,
    onSendTestEmail: () -> Unit,
    onRefreshStatus: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
            "Email (Resend) Settings",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold
        )
        
        // Status Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = DarkBgCard)
        ) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    "Service Status",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
                Spacer(Modifier.size(8.dp))
                when {
                    emailLoading -> CircularProgressIndicator(modifier = Modifier.size(20.dp))
                    emailError != null -> Text("Error: $emailError", color = MaterialTheme.colorScheme.error)
                    emailStatus != null -> {
                        val s = emailStatus!!
                        Text(
                            "Status: ${if (s.configured) "Configured" else "Not configured"}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (s.configured) Success else MaterialTheme.colorScheme.error
                        )
                        s.from_email?.let {
                            Spacer(Modifier.size(4.dp))
                            Text("From: $it", style = MaterialTheme.typography.bodySmall)
                        }
                        s.message?.let {
                            Spacer(Modifier.size(4.dp))
                            Text(it, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        }
                    }
                    else -> Text("Status not loaded", style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.size(12.dp))
                Button(onClick = onRefreshStatus) {
                    Text("Refresh Status")
                }
            }
        }
        
        // Test Email Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = DarkBgCard)
        ) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    "Send Test Email",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
                Spacer(Modifier.size(12.dp))
                
                OutlinedTextField(
                    value = emailTestTo,
                    onValueChange = onEmailTestToChange,
                    label = { Text("Recipient") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.size(8.dp))
                
                OutlinedTextField(
                    value = emailTestSubject,
                    onValueChange = onEmailTestSubjectChange,
                    label = { Text("Subject") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.size(8.dp))
                
                OutlinedTextField(
                    value = emailTestMessage,
                    onValueChange = onEmailTestMessageChange,
                    label = { Text("Message") },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 120.dp),
                    maxLines = 6
                )
                
                emailTestResult?.let {
                    Spacer(Modifier.size(8.dp))
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (it.startsWith("Error", ignoreCase = true)) MaterialTheme.colorScheme.error else Success
                    )
                }
                
                Spacer(Modifier.size(12.dp))
                Button(onClick = onSendTestEmail, modifier = Modifier.fillMaxWidth()) {
                    Text("Send Test Email")
                }
            }
        }
    }
}

@Composable
fun UsersTabContent(
    users: List<UserInfo>,
    usersLoading: Boolean,
    onInviteClick: () -> Unit,
    onRoleClick: (UserInfo) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "User Management",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Button(
                onClick = onInviteClick,
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryPurple)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.size(4.dp))
                Text("Invite User")
            }
        }
        
        when {
            usersLoading -> {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            users.isEmpty() -> {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text(
                        "No users found.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
            }
            else -> {
                users.forEach { user ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DarkBgCard)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    user.displayName ?: user.email ?: user.id ?: "Unknown",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium
                                )
                                user.email?.let {
                                    Spacer(Modifier.size(4.dp))
                                    Text(it, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                }
                                user.role?.let {
                                    Spacer(Modifier.size(4.dp))
                                    Text(
                                        "Role: ${it.uppercase()}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = PrimaryPurple
                                    )
                                }
                            }
                            TextButton(onClick = { onRoleClick(user) }) {
                                Text("Change Role")
                            }
                        }
                    }
                    Spacer(Modifier.size(8.dp))
                }
            }
        }
    }
}

@Composable
fun DeleteAccountDialog(
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete Account") },
        text = {
            Text("Are you sure? This action cannot be undone. This will permanently delete your account and all associated data.")
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(containerColor = com.nextgencrm.mobile.ui.theme.Error)
            ) {
                Text("Delete")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

