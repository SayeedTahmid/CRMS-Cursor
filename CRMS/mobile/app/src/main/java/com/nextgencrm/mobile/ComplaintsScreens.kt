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
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import android.widget.Toast
import androidx.compose.ui.platform.LocalContext
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import com.nextgencrm.mobile.ui.theme.DarkBgCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ComplaintsScreen(
    authToken: String,
    onComplaintClick: (Complaint) -> Unit
) {
    val scope = rememberCoroutineScope()
    var complaints by remember { mutableStateOf<List<Complaint>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showCreateForm by remember { mutableStateOf(false) }

    fun loadComplaints() {
        scope.launch {
            loading = true
            error = null
            try {
                val resp = ApiClient.complaintsApi.listComplaints("Bearer $authToken")
                complaints = resp.complaints
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(authToken) {
        loadComplaints()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("Complaints") },
            actions = {
                IconButton(onClick = { showCreateForm = true }) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = "Create complaint")
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
            else -> {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(complaints) { complaint ->
                        ComplaintRow(
                            complaint = complaint,
                            onClick = { onComplaintClick(complaint) }
                        )
                    }
                }
            }
        }
    }

    if (showCreateForm) {
        CreateComplaintFormDialog(
            authToken = authToken,
            onDismiss = { showCreateForm = false },
            onCreated = {
                loadComplaints()
                showCreateForm = false
            }
        )
    }
}

@Composable
fun ComplaintRow(
    complaint: Complaint,
    onClick: () -> Unit
) {
    val title = complaint.subject ?: complaint.title ?: complaint.type ?: complaint.ticket_number ?: "(No subject)"
    val status = complaint.status ?: "unknown"
    val priority = complaint.priority ?: "unknown"
    val ticketNumber = complaint.ticket_number

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
            Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium)
            if (!ticketNumber.isNullOrBlank()) {
                Text(
                    text = ticketNumber,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            Text(
                text = "Status: $status • Priority: $priority",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ComplaintDetailRoute(
    authToken: String,
    complaintId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var complaint by remember { mutableStateOf<Complaint?>(null) }
    var customer by remember { mutableStateOf<Customer?>(null) }
    var emailHistory by remember { mutableStateOf<List<EmailHistoryItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var showEditForm by remember { mutableStateOf(false) }
    var showStatusDialog by remember { mutableStateOf(false) }
    var showEmailDialog by remember { mutableStateOf(false) }

    fun loadData() {
        scope.launch {
            loading = true
            error = null
            try {
                val authHeader = "Bearer $authToken"
                complaint = ApiClient.complaintsApi.getComplaint(authHeader, complaintId)
                complaint?.customer_id?.let { custId ->
                    try {
                        customer = ApiClient.customersApi.getCustomer(authHeader, custId)
                    } catch (_: Exception) {
                        // Customer might not exist
                    }
                }
                try {
                    val historyResp = ApiClient.emailApi.getEmailHistory(
                        authHeader,
                        complaintId = complaintId,
                        limit = 10
                    )
                    emailHistory = historyResp.history
                } catch (_: Exception) {
                    // Email history might fail
                }
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(complaintId, authToken) {
        loadData()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("Complaint Details") },
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
            complaint != null -> ComplaintDetailScreen(
                authToken = authToken,
                complaint = complaint!!,
                customer = customer,
                emailHistory = emailHistory,
                onStatusChange = { showStatusDialog = true },
                onSendEmail = { showEmailDialog = true },
                onTaigaLink = { loadData() },
                onTaigaUnlink = { loadData() },
                onTaigaSync = { loadData() },
                onComplaintUpdated = { loadData() }
            )
        }
    }

    if (showEditForm && complaint != null) {
        EditComplaintDialog(
            authToken = authToken,
            complaint = complaint!!,
            onDismiss = { showEditForm = false },
            onUpdated = {
                loadData()
                showEditForm = false
            }
        )
    }

    if (showStatusDialog && complaint != null) {
        ChangeStatusDialog(
            authToken = authToken,
            complaint = complaint!!,
            onDismiss = { showStatusDialog = false },
            onStatusChanged = {
                loadData()
                showStatusDialog = false
            }
        )
    }

    if (showEmailDialog && complaint != null && customer != null) {
        SendEmailDialog(
            authToken = authToken,
            complaint = complaint!!,
            customer = customer!!,
            onDismiss = { showEmailDialog = false },
            onSent = {
                loadData()
                showEmailDialog = false
            }
        )
    }
}

@Composable
fun ComplaintDetailScreen(
    authToken: String,
    complaint: Complaint,
    customer: Customer?,
    emailHistory: List<EmailHistoryItem>,
    onStatusChange: () -> Unit,
    onSendEmail: () -> Unit,
    onTaigaLink: () -> Unit,
    onTaigaUnlink: () -> Unit,
    onTaigaSync: () -> Unit,
    onComplaintUpdated: () -> Unit
) {
    val title = complaint.subject ?: complaint.title ?: complaint.type ?: complaint.ticket_number ?: "(No subject)"
    val status = complaint.status ?: "unknown"
    val priority = complaint.priority ?: "unknown"
    val description = complaint.description ?: "No description available"
    val ticketNumber = complaint.ticket_number ?: "N/A"
    val customerName = customer?.name ?: complaint.customer_id ?: "N/A"
    val type = complaint.type ?: complaint.category ?: "N/A"
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.size(8.dp))
        Text("Ticket: $ticketNumber", style = MaterialTheme.typography.bodyMedium)
        Text("Customer: $customerName", style = MaterialTheme.typography.bodyMedium)
        Text("Type: $type", style = MaterialTheme.typography.bodyMedium)
        Text("Status: $status", style = MaterialTheme.typography.bodyMedium)
        Text("Priority: $priority", style = MaterialTheme.typography.bodyMedium)

        Spacer(Modifier.size(16.dp))
        Text("Description", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.size(4.dp))
        Text(description, style = MaterialTheme.typography.bodyMedium)

        // Taiga Integration Section
        Spacer(Modifier.size(16.dp))
        Text("Taiga Integration", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.size(8.dp))
        if (complaint.taiga_issue_id != null) {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkBgCard),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Linked to Taiga Issue", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                    Text("Issue ID: ${complaint.taiga_issue_id}", style = MaterialTheme.typography.bodySmall)
                    complaint.taiga_issue_ref?.let {
                        Text("Ref: #$it", style = MaterialTheme.typography.bodySmall)
                    }
                    complaint.taiga_status?.let {
                        Text("Status: $it", style = MaterialTheme.typography.bodySmall)
                    }
                    Spacer(Modifier.size(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = {
                            scope.launch {
                                try {
                                    val complaintId = complaint.id ?: return@launch
                                    val resp = ApiClient.taigaApi.syncTaigaStatus(
                                        "Bearer $authToken",
                                        SyncTaigaStatusRequest(complaint_id = complaintId)
                                    )
                                    if (resp.success == true) {
                                        Toast.makeText(context, "Status synced successfully", Toast.LENGTH_SHORT).show()
                                        onTaigaSync()
                                    } else {
                                        Toast.makeText(context, resp.error ?: "Failed to sync", Toast.LENGTH_SHORT).show()
                                    }
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }) {
                            Text("Sync Status")
                        }
                        OutlinedButton(onClick = {
                            scope.launch {
                                try {
                                    val complaintId = complaint.id ?: return@launch
                                    val resp = ApiClient.taigaApi.unlinkTaigaIssue(
                                        "Bearer $authToken",
                                        UnlinkTaigaIssueRequest(complaint_id = complaintId)
                                    )
                                    if (resp.success == true) {
                                        Toast.makeText(context, "Issue unlinked successfully", Toast.LENGTH_SHORT).show()
                                        onTaigaUnlink()
                                    } else {
                                        Toast.makeText(context, resp.error ?: "Failed to unlink", Toast.LENGTH_SHORT).show()
                                    }
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }) {
                            Text("Unlink")
                        }
                    }
                }
            }
        } else {
            var showLinkDialog by remember { mutableStateOf(false) }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = {
                    scope.launch {
                        try {
                            val complaintId = complaint.id ?: return@launch
                            val resp = ApiClient.taigaApi.createTaigaIssue(
                                "Bearer $authToken",
                                CreateTaigaIssueRequest(complaint_id = complaintId)
                            )
                            if (resp.success == true) {
                                Toast.makeText(context, "Taiga issue created successfully", Toast.LENGTH_SHORT).show()
                                onTaigaLink()
                            } else {
                                Toast.makeText(context, resp.error ?: "Failed to create issue", Toast.LENGTH_SHORT).show()
                            }
                        } catch (e: Exception) {
                            Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }) {
                    Text("Create Taiga Issue")
                }
                OutlinedButton(onClick = { showLinkDialog = true }) {
                    Text("Link Existing Issue")
                }
            }
            if (showLinkDialog) {
                TaigaLinkDialog(
                    authToken = authToken,
                    complaintId = complaint.id ?: "",
                    onDismiss = { showLinkDialog = false },
                    onLinked = {
                        onTaigaLink()
                        showLinkDialog = false
                    }
                )
            }
        }

        // Actions Section
        Spacer(Modifier.size(24.dp))
        Card(
            colors = CardDefaults.cardColors(containerColor = DarkBgCard),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Actions", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.size(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = onStatusChange,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Change Status")
                    }
                    if (customer?.email != null) {
                        Button(
                            onClick = onSendEmail,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Email, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.size(8.dp))
                            Text("Send Email to Customer")
                        }
                    } else {
                        Text(
                            "Email not available for this customer",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        // Email History Section
        if (emailHistory.isNotEmpty()) {
            Spacer(Modifier.size(16.dp))
            Text("Email History", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.size(4.dp))
            emailHistory.forEach { email ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = DarkBgCard),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(email.subject ?: "(No subject)", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                        email.to?.let {
                            Text("To: ${it.joinToString()}", style = MaterialTheme.typography.bodySmall)
                        }
                        email.sent_at?.let {
                            Text("Sent: $it", style = MaterialTheme.typography.bodySmall)
                        }
                        email.status?.let {
                            Text("Status: $it", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

// Create Complaint Form Dialog
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateComplaintFormDialog(
    authToken: String,
    onDismiss: () -> Unit,
    onCreated: (Complaint) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var customers by remember { mutableStateOf<List<Customer>>(emptyList()) }
    var selectedCustomerId by remember { mutableStateOf<String?>(null) }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("other") }
    var priority by remember { mutableStateOf("medium") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var titleError by remember { mutableStateOf<String?>(null) }
    var priorityError by remember { mutableStateOf<String?>(null) }
    var descriptionError by remember { mutableStateOf<String?>(null) }

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
        title = { Text("Create Complaint") },
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
                                .clickable { selectedCustomerId = customer.id },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedCustomerId == customer.id,
                                onClick = { selectedCustomerId = customer.id }
                            )
                            Text("${customer.name ?: customer.id} ${customer.company?.let { "($it)" } ?: ""}")
                        }
                    }
                }
                
                Spacer(Modifier.size(16.dp))
                Divider()
                Spacer(Modifier.size(16.dp))
                
                // Subject field - make it more prominent
                Text("Subject *", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Medium)
                Spacer(Modifier.size(4.dp))
                OutlinedTextField(
                    value = title,
                    onValueChange = {
                        title = it
                        titleError = validateComplaintTitle(it)
                    },
                    label = { Text("Enter complaint subject (required)") },
                    placeholder = { Text("e.g., Product defect, Billing issue...") },
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
                    value = description,
                    onValueChange = {
                        description = it
                        descriptionError = validateComplaintDescription(it)
                    },
                    label = { Text("Description") },
                    isError = descriptionError != null,
                    singleLine = false,
                    maxLines = 4
                )
                if (descriptionError != null) {
                    Spacer(Modifier.size(4.dp))
                    Text(text = descriptionError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                
                Spacer(Modifier.size(8.dp))
                Text("Type", style = MaterialTheme.typography.labelMedium)
                val types = listOf("product", "service", "billing", "delivery", "support", "other")
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
                Text("Priority", style = MaterialTheme.typography.labelMedium)
                val priorities = listOf("low", "medium", "high", "urgent")
                priorities.forEach { p ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                priority = p
                                priorityError = validateComplaintPriority(p)
                            },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = priority == p, onClick = {
                            priority = p
                            priorityError = validateComplaintPriority(p)
                        })
                        Text(p.replaceFirstChar { it.uppercase() })
                    }
                }
            }
        },
        confirmButton = {
            val hasValidationErrors = listOf(titleError, priorityError, descriptionError).any { it != null }
            val isFormValid = selectedCustomerId != null && title.isNotBlank() && !hasValidationErrors
            Column {
                if (!isFormValid && !loading) {
                    Text(
                        text = when {
                            selectedCustomerId == null -> "Please select a customer"
                            title.isBlank() -> "Please enter a subject"
                            hasValidationErrors -> "Please fix validation errors"
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
                        val customerId = selectedCustomerId ?: return@Button
                        scope.launch {
                            loading = true
                            error = null
                            try {
                                val body = CreateComplaintRequest(
                                    customerId = customerId,
                                    title = title.trim(),
                                    description = description.trim().ifBlank { null },
                                    category = type,
                                    priority = priority.trim().lowercase().ifBlank { null },
                                    status = "new"
                                )
                                val resp = ApiClient.complaintsApi.createComplaint("Bearer $authToken", body)
                                // Backend returns: {"success": True, "complaint": {...}, "data": {...}}
                                if (resp.success == true || resp.complaint != null) {
                                    val created = resp.complaint
                                    Toast.makeText(context, "Complaint created successfully", Toast.LENGTH_SHORT).show()
                                    if (created != null) {
                                        onCreated(created)
                                    } else {
                                        // If complaint is null but success is true, close dialog and let parent reload
                                        onDismiss()
                                    }
                                } else {
                                    val errorMsg = resp.error ?: resp.message ?: "Failed to create complaint"
                                    error = errorMsg
                                    Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                                }
                            } catch (e: Exception) {
                                val errorMsg = e.message ?: "Unknown error occurred"
                                error = errorMsg
                                // Log full exception for debugging
                                android.util.Log.e("CreateComplaint", "Error creating complaint", e)
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
                        Text("Create")
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

// Edit Complaint Dialog
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditComplaintDialog(
    authToken: String,
    complaint: Complaint,
    onDismiss: () -> Unit,
    onUpdated: (Complaint) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var title by remember { mutableStateOf(complaint.subject ?: complaint.title ?: "") }
    var description by remember { mutableStateOf(complaint.description ?: "") }
    var priority by remember { mutableStateOf(complaint.priority ?: "medium") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = { Text("Edit Complaint") },
        text = {
            Column {
                if (error != null) {
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.size(8.dp))
                }
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Subject *") },
                    singleLine = true
                )
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    singleLine = false,
                    maxLines = 4
                )
                Spacer(Modifier.size(8.dp))
                Text("Priority", style = MaterialTheme.typography.labelMedium)
                val priorities = listOf("low", "medium", "high", "urgent")
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
            }
        },
        confirmButton = {
            TextButton(
                enabled = !loading && title.isNotBlank(),
                onClick = {
                    val complaintId = complaint.id ?: return@TextButton
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            val body = UpdateComplaintRequest(
                                title = title.trim(),
                                description = description.trim().ifBlank { null },
                                priority = priority.trim().lowercase().ifBlank { null }
                            )
                            val resp = ApiClient.complaintsApi.updateComplaint("Bearer $authToken", complaintId, body)
                            val updated = resp.complaint
                            if (updated != null) {
                                Toast.makeText(context, "Complaint updated successfully", Toast.LENGTH_SHORT).show()
                                onUpdated(updated)
                            } else {
                                val errorMsg = resp.error ?: resp.message ?: "Failed to update complaint"
                                error = errorMsg
                                Toast.makeText(context, errorMsg, Toast.LENGTH_SHORT).show()
                            }
                        } catch (e: Exception) {
                            val errorMsg = e.message ?: "Unknown error"
                            error = errorMsg
                            Toast.makeText(context, "Error: $errorMsg", Toast.LENGTH_SHORT).show()
                        } finally {
                            loading = false
                        }
                    }
                }
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
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

// Change Status Dialog
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangeStatusDialog(
    authToken: String,
    complaint: Complaint,
    onDismiss: () -> Unit,
    onStatusChanged: (Complaint) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var selectedStatus by remember { mutableStateOf(complaint.status ?: "new") }
    var resolutionNotes by remember { mutableStateOf("") }
    var customerSatisfaction by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val statuses = listOf("new", "acknowledged", "in_progress", "resolved", "closed")

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = { Text("Change Status") },
        text = {
            Column {
                if (error != null) {
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.size(8.dp))
                }
                Text("New Status", style = MaterialTheme.typography.labelMedium)
                statuses.forEach { status ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedStatus = status },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = selectedStatus == status, onClick = { selectedStatus = status })
                        Text(status.replace("_", " ").replaceFirstChar { it.uppercase() })
                    }
                }
                if (selectedStatus == "resolved") {
                    Spacer(Modifier.size(8.dp))
                    OutlinedTextField(
                        value = resolutionNotes,
                        onValueChange = { resolutionNotes = it },
                        label = { Text("Resolution Notes") },
                        singleLine = false,
                        maxLines = 3
                    )
                    Spacer(Modifier.size(8.dp))
                    OutlinedTextField(
                        value = customerSatisfaction,
                        onValueChange = { customerSatisfaction = it },
                        label = { Text("Customer Satisfaction") },
                        singleLine = true
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !loading,
                onClick = {
                    val complaintId = complaint.id ?: return@TextButton
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            val body = UpdateStatusRequest(
                                status = selectedStatus,
                                resolutionNotes = resolutionNotes.trim().ifBlank { null },
                                customerSatisfaction = customerSatisfaction.trim().ifBlank { null }
                            )
                            val resp = ApiClient.complaintsApi.updateComplaintStatus("Bearer $authToken", complaintId, body)
                            val updated = resp.complaint
                            if (updated != null) {
                                Toast.makeText(context, "Status updated successfully", Toast.LENGTH_SHORT).show()
                                onStatusChanged(updated)
                            } else {
                                val errorMsg = resp.error ?: resp.message ?: "Failed to update status"
                                error = errorMsg
                                Toast.makeText(context, errorMsg, Toast.LENGTH_SHORT).show()
                            }
                        } catch (e: Exception) {
                            val errorMsg = e.message ?: "Unknown error"
                            error = errorMsg
                            Toast.makeText(context, "Error: $errorMsg", Toast.LENGTH_SHORT).show()
                        } finally {
                            loading = false
                        }
                    }
                }
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Text("Update")
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

// Send Email Dialog
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SendEmailDialog(
    authToken: String,
    complaint: Complaint,
    customer: Customer,
    onDismiss: () -> Unit,
    onSent: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var subject by remember { mutableStateOf("Re: ${complaint.subject ?: complaint.title ?: "Complaint"}") }
    var text by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = { Text("Send Email") },
        text = {
            Column {
                if (error != null) {
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.size(8.dp))
                }
                Text("To: ${customer.email}", style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = subject,
                    onValueChange = { subject = it },
                    label = { Text("Subject *") },
                    singleLine = true
                )
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    label = { Text("Message *") },
                    singleLine = false,
                    maxLines = 6
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = !loading && subject.isNotBlank() && text.isNotBlank(),
                onClick = {
                    val customerEmail = customer.email ?: return@TextButton
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            val body = EmailSendRequest(
                                to = customerEmail,
                                subject = subject.trim(),
                                text = text.trim(),
                                customer_id = customer.id,
                                complaint_id = complaint.id,
                                trigger = "manual"
                            )
                            val resp = ApiClient.emailApi.sendEmail("Bearer $authToken", body)
                            if (resp.success == true) {
                                onSent()
                            } else {
                                error = resp.message ?: "Failed to send email"
                            }
                        } catch (e: Exception) {
                            error = e.message
                        } finally {
                            loading = false
                        }
                    }
                }
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
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

// Extension functions for Taiga actions (called from ComplaintDetailScreen)
@Composable
fun TaigaLinkDialog(
    authToken: String,
    complaintId: String,
    onDismiss: () -> Unit,
    onLinked: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var taigaIssueId by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = { Text("Link Taiga Issue") },
        text = {
            Column {
                if (error != null) {
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.size(8.dp))
                }
                OutlinedTextField(
                    value = taigaIssueId,
                    onValueChange = { taigaIssueId = it },
                    label = { Text("Taiga Issue ID") },
                    singleLine = true
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = !loading && taigaIssueId.isNotBlank(),
                onClick = {
                    val issueId = taigaIssueId.toIntOrNull() ?: return@TextButton
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            val body = LinkTaigaIssueRequest(
                                complaint_id = complaintId,
                                taiga_issue_id = issueId
                            )
                            val resp = ApiClient.taigaApi.linkTaigaIssue("Bearer $authToken", body)
                            if (resp.success == true) {
                                onLinked()
                            } else {
                                error = resp.error ?: resp.message ?: "Failed to link issue"
                            }
                        } catch (e: Exception) {
                            error = e.message
                        } finally {
                            loading = false
                        }
                    }
                }
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Text("Link")
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

