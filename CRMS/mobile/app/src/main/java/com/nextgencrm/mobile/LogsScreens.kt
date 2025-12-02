package com.nextgencrm.mobile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import com.nextgencrm.mobile.ui.theme.DarkBgCard
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogsScreen(
    authToken: String,
    onLogClick: (LogItem) -> Unit,
    initialCustomerId: String? = null
) {
    val scope = rememberCoroutineScope()
    var logs by remember { mutableStateOf<List<LogItem>>(emptyList()) }
    var customers by remember { mutableStateOf<List<Customer>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showForm by remember { mutableStateOf(false) }
    var editingLog by remember { mutableStateOf<LogItem?>(null) }
    var selectedCustomerFilter by remember { mutableStateOf<String?>(initialCustomerId) }
    var selectedTypeFilter by remember { mutableStateOf<String?>(null) }

    fun loadLogs() {
        scope.launch {
            loading = true
            error = null
            try {
                val resp = ApiClient.logsApi.listLogs(
                    auth = "Bearer $authToken",
                    customerId = selectedCustomerFilter,
                    type = selectedTypeFilter
                )
                logs = resp.logs
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(authToken, selectedCustomerFilter, selectedTypeFilter) {
        loadLogs()
    }

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

    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("Logs / Activity") },
            actions = {
                IconButton(onClick = {
                    editingLog = null
                    showForm = true
                }) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = "Add log")
                }
            }
        )

        // Filters
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = selectedTypeFilter == null,
                onClick = { selectedTypeFilter = null },
                label = { Text("All Types") }
            )
            FilterChip(
                selected = selectedTypeFilter == "call",
                onClick = { selectedTypeFilter = if (selectedTypeFilter == "call") null else "call" },
                label = { Text("Call") }
            )
            FilterChip(
                selected = selectedTypeFilter == "email",
                onClick = { selectedTypeFilter = if (selectedTypeFilter == "email") null else "email" },
                label = { Text("Email") }
            )
            FilterChip(
                selected = selectedTypeFilter == "meeting",
                onClick = { selectedTypeFilter = if (selectedTypeFilter == "meeting") null else "meeting" },
                label = { Text("Meeting") }
            )
            FilterChip(
                selected = selectedTypeFilter == "note",
                onClick = { selectedTypeFilter = if (selectedTypeFilter == "note") null else "note" },
                label = { Text("Note") }
            )
        }

        when {
            loading -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                CircularProgressIndicator()
            }
            error != null -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                Text("Error: $error")
            }
            else -> {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(logs) { log ->
                        LogRow(
                            log = log,
                            customers = customers,
                            onClick = { onLogClick(log) },
                            onEdit = {
                                editingLog = log
                                showForm = true
                            }
                        )
                    }
                }
            }
        }
    }

    if (showForm) {
        LogFormDialog(
            authToken = authToken,
            existing = editingLog,
            customers = customers,
            onDismiss = { showForm = false },
            onSaved = {
                loadLogs()
                showForm = false
            }
        )
    }
}

@Composable
fun LogRow(
    log: LogItem,
    customers: List<Customer>,
    onClick: () -> Unit,
    onEdit: () -> Unit
) {
    val customerName = log.customer_id?.let { customerId ->
        customers.find { it.id == customerId }?.name ?: customerId
    } ?: "No customer"
    val title = log.title ?: "(No title)"
    val type = log.type ?: "unknown"
    val date = log.log_date ?: log.created_at ?: ""

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = DarkBgCard
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium)
                    Text(text = customerName, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    Text(text = "Type: $type", style = MaterialTheme.typography.bodySmall)
                    if (date.isNotBlank()) {
                        Text(text = "Date: $date", style = MaterialTheme.typography.bodySmall)
                    }
                }
                IconButton(onClick = onEdit) {
                    Icon(imageVector = Icons.Default.Edit, contentDescription = "Edit log")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogDetailRoute(
    authToken: String,
    logId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var log by remember { mutableStateOf<LogItem?>(null) }
    var customer by remember { mutableStateOf<Customer?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var showEditForm by remember { mutableStateOf(false) }
    var customers by remember { mutableStateOf<List<Customer>>(emptyList()) }

    fun loadData() {
        scope.launch {
            loading = true
            error = null
            try {
                val authHeader = "Bearer $authToken"
                log = ApiClient.logsApi.getLog(authHeader, logId)
                log?.customer_id?.let { custId ->
                    try {
                        customer = ApiClient.customersApi.getCustomer(authHeader, custId)
                    } catch (_: Exception) {
                        // Customer might not exist
                    }
                }
                try {
                    val resp = ApiClient.customersApi.listCustomers(authHeader, limit = 100)
                    customers = resp.customers
                } catch (_: Exception) {
                    // Ignore
                }
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(logId, authToken) {
        loadData()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("Log Details") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            actions = {
                IconButton(onClick = { showEditForm = true }) {
                    Icon(imageVector = Icons.Default.Edit, contentDescription = "Edit")
                }
            }
        )

        when {
            loading -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                CircularProgressIndicator()
            }
            error != null -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                Text("Error: $error")
            }
            log != null -> LogDetailScreen(
                authToken = authToken,
                log = log!!,
                customer = customer,
                onLogUpdated = { loadData() },
                onLogDeleted = { onBack() }
            )
        }
    }

    if (showEditForm && log != null) {
        LogFormDialog(
            authToken = authToken,
            existing = log,
            customers = customers,
            onDismiss = { showEditForm = false },
            onSaved = {
                loadData()
                showEditForm = false
            }
        )
    }
}

@Composable
fun LogDetailScreen(
    authToken: String,
    log: LogItem,
    customer: Customer?,
    onLogUpdated: () -> Unit,
    onLogDeleted: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var showDeleteDialog by remember { mutableStateOf(false) }

    val title = log.title ?: "(No title)"
    val type = log.type ?: "unknown"
    val description = log.description ?: log.content ?: "No description"
    val customerName = customer?.name ?: log.customer_id ?: "N/A"
    val date = log.log_date ?: log.created_at ?: "N/A"
    val priority = log.priority ?: "N/A"
    val status = log.status ?: "N/A"
    val duration = log.duration

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.size(8.dp))
        Text("Type: $type", style = MaterialTheme.typography.bodyMedium)
        Text("Customer: $customerName", style = MaterialTheme.typography.bodyMedium)
        Text("Date: $date", style = MaterialTheme.typography.bodyMedium)
        Text("Priority: $priority", style = MaterialTheme.typography.bodyMedium)
        Text("Status: $status", style = MaterialTheme.typography.bodyMedium)
        duration?.let {
            Text("Duration: $it minutes", style = MaterialTheme.typography.bodyMedium)
        }

        Spacer(Modifier.size(16.dp))
        Text("Description", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.size(4.dp))
        Text(description, style = MaterialTheme.typography.bodyMedium)

        Spacer(Modifier.size(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick = { showDeleteDialog = true },
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.error
                )
            ) {
                Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.size(4.dp))
                Text("Delete")
            }
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Log") },
            text = {
                Column {
                    Text("Are you sure you want to delete this log?")
                    Spacer(Modifier.size(8.dp))
                    Text("This cannot be undone.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        scope.launch {
                            try {
                                val logId = log.id ?: return@launch
                                ApiClient.logsApi.deleteLog("Bearer $authToken", logId)
                                Toast.makeText(context, "Log deleted successfully", Toast.LENGTH_SHORT).show()
                                onLogDeleted()
                            } catch (e: Exception) {
                                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                            }
                        }
                        showDeleteDialog = false
                    }
                ) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogFormDialog(
    authToken: String,
    existing: LogItem?,
    customers: List<Customer>,
    onDismiss: () -> Unit,
    onSaved: (LogItem) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    
    // Parse existing log_date or use current date/time
    val defaultDateTime = if (existing?.log_date != null) {
        existing.log_date
    } else {
        val now = Date()
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.getDefault()).format(now)
    }
    
    var selectedCustomerId by remember { mutableStateOf(existing?.customer_id ?: "") }
    var type by remember { mutableStateOf(existing?.type ?: "note") }
    var title by remember { mutableStateOf(existing?.title ?: "") }
    var description by remember { mutableStateOf(existing?.description ?: existing?.content ?: "") }
    var logDate by remember { mutableStateOf(defaultDateTime) }
    var priority by remember { mutableStateOf(existing?.priority ?: "normal") }
    var status by remember { mutableStateOf(existing?.status ?: "completed") }
    var duration by remember { mutableStateOf(existing?.duration?.toString() ?: "") }
    var followUpRequired by remember { mutableStateOf(existing?.follow_up_required ?: false) }
    
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var titleError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = { Text(if (existing == null) "Create Log" else "Edit Log") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                if (error != null) {
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.size(8.dp))
                }
                
                // Customer Selector
                Text("Customer *", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Medium)
                Spacer(Modifier.size(4.dp))
                if (customers.isEmpty()) {
                    Text("Loading customers...", style = MaterialTheme.typography.bodySmall)
                } else {
                    customers.forEach { customer ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedCustomerId = customer.id ?: "" },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedCustomerId == customer.id,
                                onClick = { selectedCustomerId = customer.id ?: "" }
                            )
                            Text("${customer.name ?: customer.id} ${customer.company?.let { "($it)" } ?: ""}")
                        }
                    }
                }
                
                Spacer(Modifier.size(16.dp))
                Divider()
                Spacer(Modifier.size(16.dp))
                
                // Type
                Text("Type *", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Medium)
                Spacer(Modifier.size(4.dp))
                val types = listOf("call", "email", "meeting", "note", "task", "sample", "other")
                types.forEach { t ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { type = t },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = type == t, onClick = { type = t })
                        Text(t.replaceFirstChar { it.uppercase() })
                    }
                }
                
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = title,
                    onValueChange = {
                        title = it
                        titleError = if (it.isBlank()) "Title is required" else null
                    },
                    label = { Text("Title *") },
                    isError = titleError != null,
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                if (titleError != null) {
                    Spacer(Modifier.size(4.dp))
                    Text(text = titleError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = logDate,
                    onValueChange = { logDate = it },
                    label = { Text("Date & Time (YYYY-MM-DDTHH:mm)") },
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
                
                if (type == "call" || type == "meeting") {
                    Spacer(Modifier.size(8.dp))
                    OutlinedTextField(
                        value = duration,
                        onValueChange = { duration = it },
                        label = { Text("Duration (minutes)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                
                Spacer(Modifier.size(8.dp))
                Text("Priority", style = MaterialTheme.typography.labelMedium)
                val priorities = listOf("low", "normal", "high", "urgent")
                priorities.forEach { p ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { priority = p },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = priority == p, onClick = { priority = p })
                        Text(p.replaceFirstChar { it.uppercase() })
                    }
                }
                
                Spacer(Modifier.size(8.dp))
                Text("Status", style = MaterialTheme.typography.labelMedium)
                val statuses = listOf("pending", "completed", "cancelled")
                statuses.forEach { s ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { status = s },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = status == s, onClick = { status = s })
                        Text(s.replaceFirstChar { it.uppercase() })
                    }
                }
                
                Spacer(Modifier.size(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = followUpRequired,
                        onCheckedChange = { followUpRequired = it }
                    )
                    Text("Follow-up required")
                }
            }
        },
        confirmButton = {
            val isFormValid = selectedCustomerId.isNotBlank() && title.isNotBlank() && titleError == null
            Column {
                if (!isFormValid && !loading) {
                    Text(
                        text = when {
                            selectedCustomerId.isBlank() -> "Please select a customer"
                            title.isBlank() -> "Please enter a title"
                            else -> ""
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                Button(
                    enabled = !loading && isFormValid,
                    onClick = {
                        scope.launch {
                            loading = true
                            error = null
                            try {
                                val body = if (existing == null) {
                                    CreateLogRequest(
                                        title = title.trim(),
                                        type = type,
                                        description = description.trim().ifBlank { null },
                                        customer_id = selectedCustomerId,
                                        log_date = logDate.trim().ifBlank { null },
                                        priority = priority,
                                        status = status,
                                        duration = duration.toIntOrNull(),
                                        follow_up_required = followUpRequired
                                    )
                                } else {
                                    UpdateLogRequest(
                                        title = title.trim(),
                                        type = type,
                                        description = description.trim().ifBlank { null },
                                        customer_id = selectedCustomerId,
                                        log_date = logDate.trim().ifBlank { null },
                                        priority = priority,
                                        status = status,
                                        duration = duration.toIntOrNull(),
                                        follow_up_required = followUpRequired
                                    )
                                }
                                
                                val resp = if (existing == null) {
                                    ApiClient.logsApi.createLog("Bearer $authToken", body as CreateLogRequest)
                                } else {
                                    val logId = existing.id ?: return@launch
                                    ApiClient.logsApi.updateLog("Bearer $authToken", logId, body as UpdateLogRequest)
                                }
                                
                                val saved = if (existing == null) {
                                    (resp as CreateLogResponse).log
                                } else {
                                    (resp as UpdateLogResponse).log
                                }
                                
                                if (saved != null) {
                                    Toast.makeText(context, if (existing == null) "Log created successfully" else "Log updated successfully", Toast.LENGTH_SHORT).show()
                                    onSaved(saved)
                                } else {
                                    val errorMsg = if (existing == null) {
                                        (resp as CreateLogResponse).message ?: "Failed to create log"
                                    } else {
                                        (resp as UpdateLogResponse).error ?: (resp as UpdateLogResponse).message ?: "Failed to update log"
                                    }
                                    error = errorMsg
                                    Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                                }
                            } catch (e: Exception) {
                                val errorMsg = e.message ?: "Unknown error occurred"
                                error = errorMsg
                                android.util.Log.e("LogForm", "Error saving log", e)
                                Toast.makeText(context, "Error: $errorMsg", Toast.LENGTH_LONG).show()
                            } finally {
                                loading = false
                            }
                        }
                    }
                ) {
                    if (loading) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                    } else {
                        Text(if (existing == null) "Create" else "Save")
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

