package com.nextgencrm.mobile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import com.nextgencrm.mobile.ui.theme.DarkBgCard
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Button
import androidx.compose.material3.RadioButton
import androidx.compose.material3.AlertDialog
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.ExperimentalMaterial3Api
import retrofit2.HttpException

@Composable
fun DashboardScreen(
    authToken: String,
    onLogClick: ((LogItem) -> Unit)? = null,
    onCustomerClick: ((String) -> Unit)? = null,
    onComplaintClick: ((String) -> Unit)? = null,
    onViewAllLogs: (() -> Unit)? = null,
    onNewCustomer: (() -> Unit)? = null,
    onNewComplaint: (() -> Unit)? = null,
    onCall: (() -> Unit)? = null,
    onEmail: (() -> Unit)? = null,
    onAuthError: (() -> Unit)? = null
) {
    var showEmailDialog by remember { mutableStateOf(false) }
    var showCallLogDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    var metrics by remember { mutableStateOf<MetricsResponse?>(null) }
    var recentLogs by remember { mutableStateOf<List<LogItem>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(authToken) {
        val authHeader = "Bearer $authToken"
        scope.launch {
            loading = true
            error = null
            try {
                // Load metrics and logs in parallel
                val metricsDeferred = launch { 
                    try {
                        metrics = ApiClient.metricsApi.getMetrics(authHeader)
                    } catch (e: retrofit2.HttpException) {
                        if (e.code() == 401) {
                            onAuthError?.invoke()
                            return@launch
                        }
                        throw e
                    }
                }
                val logsDeferred = launch {
                    try {
                        val resp = ApiClient.logsApi.listLogs(authHeader)
                        recentLogs = resp.logs
                    } catch (e: retrofit2.HttpException) {
                        if (e.code() == 401) {
                            onAuthError?.invoke()
                            return@launch
                        }
                        throw e
                    }
                }
                metricsDeferred.join()
                logsDeferred.join()
            } catch (e: retrofit2.HttpException) {
                if (e.code() == 401) {
                    onAuthError?.invoke()
                } else {
                    error = "Error: ${e.message}"
                }
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text("CRM", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.size(16.dp))

        when {
            loading -> Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
            error != null -> Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text("Error: $error")
            }
            metrics != null -> {
                val m = metrics!!
                // Top metrics grid (2 x 2)
                Row(Modifier.fillMaxWidth()) {
                    HomeMetricCard(
                        title = "Customers",
                        value = m.active_customers.toString(),
                        icon = Icons.Default.Person,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(Modifier.size(8.dp))
                    HomeMetricCard(
                        title = "Unread",
                        value = "—", // Placeholder until email unread count exists
                        icon = Icons.Default.Email,
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(Modifier.size(8.dp))
                Row(Modifier.fillMaxWidth()) {
                    HomeMetricCard(
                        title = "Complaints",
                        value = m.open_complaints.toString(),
                        icon = Icons.Default.List,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(Modifier.size(8.dp))
                    HomeMetricCard(
                        title = "Calls",
                        value = m.recent_logs_7d.toString(),
                        icon = Icons.Default.Call,
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(Modifier.size(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Recent Activity", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium)
                    onViewAllLogs?.let { onViewAll ->
                        TextButton(onClick = onViewAll) {
                            Text("View All", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
                Spacer(Modifier.size(8.dp))

                if (recentLogs.isEmpty()) {
                    Text("No recent activity.", style = MaterialTheme.typography.bodySmall)
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .weight(1f, fill = false)
                            .fillMaxWidth()
                    ) {
                        items(recentLogs.take(3)) { log ->
                            RecentActivityCard(
                                log = log,
                                onClick = {
                                    // Navigate based on log type or always to log detail
                                    onLogClick?.invoke(log)
                                }
                            )
                        }
                    }
                }

                Spacer(Modifier.size(8.dp))
                Text("[+ Quick Actions]", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                Spacer(Modifier.size(4.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    QuickAction(
                        icon = Icons.Default.Person,
                        label = "New Customer",
                        onClick = { onNewCustomer?.invoke() }
                    )
                    QuickAction(
                        icon = Icons.Default.List,
                        label = "New Complaint",
                        onClick = { onNewComplaint?.invoke() }
                    )
                    QuickAction(
                        icon = Icons.Default.Call,
                        label = "Call",
                        onClick = { onCall?.invoke() ?: run { showCallLogDialog = true } }
                    )
                    QuickAction(
                        icon = Icons.Default.Email,
                        label = "Email",
                        onClick = { onEmail?.invoke() ?: run { showEmailDialog = true } }
                    )
                }
            }
            else -> {
                Text("No metrics available", style = MaterialTheme.typography.bodyMedium)
            }
        }
    }

    // Email Compose Dialog
    if (showEmailDialog) {
        EmailComposeDialog(
            authToken = authToken,
            onDismiss = { showEmailDialog = false },
            onSent = { showEmailDialog = false }
        )
    }

    // Call Log Dialog
    if (showCallLogDialog) {
        CallLogDialog(
            authToken = authToken,
            onDismiss = { showCallLogDialog = false },
            onSaved = { showCallLogDialog = false }
        )
    }
}

@Composable
private fun HomeMetricCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .height(72.dp),
        colors = CardDefaults.cardColors(containerColor = DarkBgCard)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = title, modifier = Modifier.size(24.dp))
            Spacer(Modifier.size(8.dp))
            Column {
                Text(value, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                Text(title, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun RecentActivityCard(
    log: LogItem,
    onClick: () -> Unit
) {
    val title = log.title ?: log.type ?: "Activity"
    val description = log.description ?: ""
    val time = log.log_date ?: log.created_at ?: ""

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = DarkBgCard)
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            if (description.isNotBlank()) {
                Spacer(Modifier.size(2.dp))
                Text(description, style = MaterialTheme.typography.bodySmall)
            }
            if (time.isNotBlank()) {
                Spacer(Modifier.size(2.dp))
                Text(time, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun QuickAction(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        IconButton(onClick = onClick) {
            Icon(icon, contentDescription = label)
        }
        Text(label, style = MaterialTheme.typography.labelSmall)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmailComposeDialog(
    authToken: String,
    onDismiss: () -> Unit,
    onSent: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var to by remember { mutableStateOf("") }
    var subject by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = { Text("Send Email") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                if (error != null) {
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.size(8.dp))
                }
                OutlinedTextField(
                    value = to,
                    onValueChange = { to = it },
                    label = { Text("To *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = subject,
                    onValueChange = { subject = it },
                    label = { Text("Subject *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = message,
                    onValueChange = { message = it },
                    label = { Text("Message *") },
                    singleLine = false,
                    maxLines = 6,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                enabled = !loading && to.isNotBlank() && subject.isNotBlank() && message.isNotBlank(),
                onClick = {
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            val authHeader = "Bearer $authToken"
                            val body = EmailSendRequest(
                                to = to.trim(),
                                subject = subject.trim(),
                                text = message.trim(),
                                trigger = "dashboard_quick_action"
                            )
                            val resp = ApiClient.emailApi.sendEmail(authHeader, body)
                            if (resp.success == true) {
                                Toast.makeText(context, "Email sent successfully", Toast.LENGTH_SHORT).show()
                                onSent()
                            } else {
                                error = resp.message ?: "Failed to send email"
                            }
                        } catch (e: Exception) {
                            error = e.message ?: "Failed to send email"
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
                    Text("Send")
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
fun CallLogDialog(
    authToken: String,
    onDismiss: () -> Unit,
    onSaved: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var phoneNumber by remember { mutableStateOf("") }
    var customerId by remember { mutableStateOf<String?>(null) }
    var customers by remember { mutableStateOf<List<Customer>>(emptyList()) }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var duration by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    // Load customers for selection
    LaunchedEffect(authToken) {
        scope.launch {
            try {
                val resp = ApiClient.customersApi.listCustomers("Bearer $authToken", limit = 100)
                customers = resp.customers
            } catch (_: Exception) {
                // Ignore
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = { Text("Log Call") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                if (error != null) {
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.size(8.dp))
                }
                OutlinedTextField(
                    value = phoneNumber,
                    onValueChange = { phoneNumber = it },
                    label = { Text("Phone Number") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.size(8.dp))
                Text("Customer (optional)", style = MaterialTheme.typography.labelMedium)
                if (customers.isEmpty()) {
                    Text("Loading customers...", style = MaterialTheme.typography.bodySmall)
                } else {
                    customers.forEach { customer ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { customerId = customer.id },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = customerId == customer.id,
                                onClick = { customerId = customer.id }
                            )
                            Text("${customer.name ?: customer.id} ${customer.company?.let { "($it)" } ?: ""}")
                        }
                    }
                }
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Title *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    singleLine = false,
                    maxLines = 4,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = duration,
                    onValueChange = { duration = it },
                    label = { Text("Duration (minutes)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Column {
                if (!loading && title.isBlank()) {
                    Text(
                        text = "Please enter a title",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                Button(
                    enabled = !loading && title.isNotBlank(),
                    onClick = {
                        // Open dialer if phone number provided
                        if (phoneNumber.isNotBlank()) {
                            val intent = Intent(Intent.ACTION_DIAL).apply {
                                data = Uri.parse("tel:$phoneNumber")
                            }
                            context.startActivity(intent)
                        }
                        
                        // Save call log
                        scope.launch {
                            loading = true
                            error = null
                            try {
                                val authHeader = "Bearer $authToken"
                                val body = CreateLogRequest(
                                    title = title.trim(),
                                    type = "call",
                                    description = description.trim().ifBlank { null },
                                    customer_id = customerId,
                                    duration = duration.toIntOrNull()
                                )
                                val resp = ApiClient.logsApi.createLog(authHeader, body)
                                if (resp.log != null) {
                                    Toast.makeText(context, "Call logged successfully", Toast.LENGTH_SHORT).show()
                                    onSaved()
                                } else {
                                    error = resp.message ?: "Failed to log call"
                                }
                            } catch (e: Exception) {
                                error = e.message ?: "Failed to log call"
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
                        Text("Log Call")
                    }
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

