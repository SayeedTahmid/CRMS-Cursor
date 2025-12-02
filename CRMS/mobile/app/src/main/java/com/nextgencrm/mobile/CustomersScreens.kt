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
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nextgencrm.mobile.ui.theme.DarkBgCard
import kotlinx.coroutines.launch
import android.content.Intent
import android.net.Uri

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomersScreen(
    authToken: String,
    onCustomerClick: (Customer) -> Unit
) {
    val scope = rememberCoroutineScope()
    var customers by remember { mutableStateOf<List<Customer>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showForm by remember { mutableStateOf(false) }
    var editingCustomer by remember { mutableStateOf<Customer?>(null) }
    var searchText by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf<String?>(null) }
    var typeFilter by remember { mutableStateOf<String?>(null) }
    var deletingCustomer by remember { mutableStateOf<Customer?>(null) }

    fun loadCustomers() {
        scope.launch {
            loading = true
            error = null
            try {
                val resp = ApiClient.customersApi.listCustomers(
                    auth = "Bearer $authToken",
                    page = 1,
                    limit = 100,
                    search = searchText.ifBlank { null }
                )
                // Client-side filter for status/type; backend already supports status/type but keep simple for now
                customers = resp.customers.filter { c ->
                    val matchesStatus = statusFilter.isNullOrBlank() || c.status == statusFilter
                    val matchesType = typeFilter.isNullOrBlank() || c.type == typeFilter
                    matchesStatus && matchesType
                }
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(authToken) {
        loadCustomers()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            TopAppBar(
                title = { Text("Customers") },
                actions = {
                    IconButton(
                        onClick = {
                            editingCustomer = null
                            showForm = true
                        }
                    ) {
                        Icon(imageVector = Icons.Default.Add, contentDescription = "Add customer")
                    }
                }
            )

            // Search + filters row
            OutlinedTextField(
                value = searchText,
                onValueChange = {
                    searchText = it
                    loadCustomers()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                label = { Text("Search by name, email, phone") },
                singleLine = true
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = statusFilter == null,
                    onClick = {
                        statusFilter = null
                        loadCustomers()
                    },
                    label = { Text("All Status") }
                )
                FilterChip(
                    selected = statusFilter == "active",
                    onClick = {
                        statusFilter = if (statusFilter == "active") null else "active"
                        loadCustomers()
                    },
                    label = { Text("Active") }
                )
                FilterChip(
                    selected = statusFilter == "inactive",
                    onClick = {
                        statusFilter = if (statusFilter == "inactive") null else "inactive"
                        loadCustomers()
                    },
                    label = { Text("Inactive") }
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
                        items(customers) { customer ->
                            CustomerRow(
                                customer = customer,
                                onClick = { onCustomerClick(customer) },
                                onEdit = {
                                    editingCustomer = customer
                                    showForm = true
                                },
                                onDelete = {
                                    deletingCustomer = customer
                                }
                            )
                        }
                    }
                }
            }
        }

        if (showForm) {
            CustomerFormDialog(
                authToken = authToken,
                existing = editingCustomer,
                onDismiss = { showForm = false },
                onSaved = { saved ->
                    // Merge into current list (add or replace)
                    customers = customers
                        .filterNot { it.id == saved.id }
                        .plus(saved)
                        .sortedBy { it.name ?: "" }
                    showForm = false
                }
            )
        }

        if (deletingCustomer != null) {
            ConfirmDeleteCustomerDialog(
                authToken = authToken,
                customer = deletingCustomer!!,
                onDismiss = { deletingCustomer = null },
                onDeleted = { deletedId ->
                    customers = customers.filterNot { it.id == deletedId }
                    deletingCustomer = null
                }
            )
        }
    }
}

@Composable
fun CustomerRow(
    customer: Customer,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val name = customer.name ?: "(No name)"
    val company = customer.company ?: ""
    val email = customer.email ?: ""
    val status = customer.status ?: "unknown"

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
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium)
                    if (company.isNotBlank()) {
                        Text(
                            text = company,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    if (email.isNotBlank()) {
                        Text(text = email, style = MaterialTheme.typography.bodySmall)
                    }
                    Text(
                        text = "Status: $status",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                IconButton(onClick = onEdit) {
                    Icon(imageVector = Icons.Default.Edit, contentDescription = "Edit customer")
                }
                IconButton(onClick = onDelete) {
                    Icon(imageVector = Icons.Default.Delete, contentDescription = "Delete customer")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerDetailRoute(
    authToken: String,
    customerId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var customer by remember { mutableStateOf<Customer?>(null) }
    var logs by remember { mutableStateOf<List<CustomerLog>>(emptyList()) }
    var complaints by remember { mutableStateOf<List<CustomerComplaintSummary>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(customerId, authToken) {
        scope.launch {
            loading = true
            error = null
            try {
                val authHeader = "Bearer $authToken"
                customer = ApiClient.customersApi.getCustomer(authHeader, customerId)
                logs = ApiClient.customersApi.getCustomerLogs(authHeader, customerId).logs
                complaints = ApiClient.customersApi.getCustomerComplaints(authHeader, customerId).complaints
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("Customer Details") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
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
            customer != null -> CustomerDetailScreen(
                authToken = authToken,
                customer = customer!!,
                logs = logs,
                complaints = complaints,
                onComplaintCreated = { newComplaint ->
                    complaints = listOf(newComplaint) + complaints
                }
            )
        }
    }
}

@Composable
fun CustomerDetailScreen(
    authToken: String,
    customer: Customer,
    logs: List<CustomerLog>,
    complaints: List<CustomerComplaintSummary>,
    onComplaintCreated: (CustomerComplaintSummary) -> Unit
) {
    val name = customer.name ?: "(No name)"
    val company = customer.company ?: ""
    val email = customer.email ?: ""
    val phone = customer.phone ?: ""
    val status = customer.status ?: "unknown"
    val type = customer.type ?: "unknown"
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var showComplaintDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        if (company.isNotBlank()) {
            Spacer(Modifier.size(4.dp))
            Text(company, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
        }
        Spacer(Modifier.size(8.dp))
        if (email.isNotBlank()) {
            Text("Email: $email", style = MaterialTheme.typography.bodyMedium)
        }
        if (phone.isNotBlank()) {
            Text("Phone: $phone", style = MaterialTheme.typography.bodyMedium)
        }
        Spacer(Modifier.size(8.dp))
        Text("Status: $status", style = MaterialTheme.typography.bodyMedium)
        Text("Type: $type", style = MaterialTheme.typography.bodyMedium)

        Spacer(Modifier.size(16.dp))
        Text("Quick Actions", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.size(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (phone.isNotBlank()) {
                OutlinedButton(
                    onClick = {
                        val intent = Intent(Intent.ACTION_DIAL).apply {
                            data = Uri.parse("tel:$phone")
                        }
                        context.startActivity(intent)
                    }
                ) {
                    Icon(Icons.Default.Phone, contentDescription = null)
                    Spacer(Modifier.size(4.dp))
                    Text("Call")
                }
            }
            if (email.isNotBlank()) {
                OutlinedButton(
                    onClick = {
                        val intent = Intent(Intent.ACTION_SENDTO).apply {
                            data = Uri.parse("mailto:$email")
                        }
                        context.startActivity(intent)
                    }
                ) {
                    Icon(Icons.Default.Email, contentDescription = null)
                    Spacer(Modifier.size(4.dp))
                    Text("Email")
                }
            }
            OutlinedButton(
                onClick = {
                    showComplaintDialog = true
                }
            ) {
                Icon(Icons.Default.List, contentDescription = null)
                Spacer(Modifier.size(4.dp))
                Text("New Complaint")
            }
        }

        if (showComplaintDialog) {
            CreateComplaintDialog(
                authToken = authToken,
                customer = customer,
                onDismiss = { showComplaintDialog = false },
                onCreated = { created ->
                    onComplaintCreated(
                        CustomerComplaintSummary(
                            id = created.id,
                            subject = created.subject,
                            status = created.status,
                            priority = created.priority,
                            ticket_number = created.ticket_number
                        )
                    )
                    showComplaintDialog = false
                }
            )
        }

        if (logs.isNotEmpty()) {
            Spacer(Modifier.size(16.dp))
            Text("Recent Activity", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.size(4.dp))
            logs.take(5).forEach { log ->
                val title = log.title ?: "(No title)"
                val typeLabel = log.type ?: "log"
                val date = log.log_date ?: ""
                Text("• [$typeLabel] $title $date", style = MaterialTheme.typography.bodySmall)
            }
        }

        if (complaints.isNotEmpty()) {
            Spacer(Modifier.size(16.dp))
            Text("Complaints", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.size(4.dp))
            complaints.take(5).forEach { c ->
                val subj = c.subject ?: c.ticket_number ?: "(No subject)"
                val statusLabel = c.status ?: "unknown"
                val priorityLabel = c.priority ?: "unknown"
                Text("• $subj – $statusLabel / $priorityLabel", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerFormDialog(
    authToken: String,
    existing: Customer?,
    onDismiss: () -> Unit,
    onSaved: (Customer) -> Unit
) {
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf(existing?.name ?: "") }
    var email by remember { mutableStateOf(existing?.email ?: "") }
    var phone by remember { mutableStateOf(existing?.phone ?: "") }
    var company by remember { mutableStateOf(existing?.company ?: "") }
    var status by remember { mutableStateOf(existing?.status ?: "") }
    var type by remember { mutableStateOf(existing?.type ?: "") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var nameError by remember { mutableStateOf<String?>(null) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var phoneError by remember { mutableStateOf<String?>(null) }
    var companyError by remember { mutableStateOf<String?>(null) }

    fun validateName(value: String): String? {
        val trimmed = value.trim()
        if (trimmed.isEmpty()) return "Name is required"
        if (trimmed.length < 2) return "Name must be at least 2 characters"
        if (trimmed.length > 80) return "Name must be at most 80 characters"
        return null
    }

    fun validateEmail(value: String): String? {
        val trimmed = value.trim()
        if (trimmed.isEmpty()) return "Email is required"
        if (trimmed.length > 120) return "Email must be at most 120 characters"
        val pattern = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+\$")
        if (!pattern.matches(trimmed)) return "Please enter a valid email address"
        return null
    }

    fun validatePhone(value: String): String? {
        val trimmed = value.trim()
        if (trimmed.isEmpty()) return null
        if (trimmed.startsWith("-")) return "Phone number cannot be negative."
        val digitsOnly = trimmed.replace("[\\s+]".toRegex(), "")
        val digitCount = digitsOnly.replace("\\D".toRegex(), "").length
        if (digitCount in 1..6) return "Phone number must contain at least 7 digits"
        if (digitCount > 20) return "Phone number must contain at most 20 digits"
        val phonePattern = Regex("^[\\d\\s+]+\$")
        if (!phonePattern.matches(trimmed)) return "Phone number can only contain digits, spaces, and +"
        return null
    }

    fun validateCompany(value: String): String? {
        return if (value.length > 80) "Company must be at most 80 characters" else null
    }

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = {
            Text(if (existing == null) "New Customer" else "Edit Customer")
        },
        text = {
            Column {
                if (error != null) {
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.size(8.dp))
                }
                OutlinedTextField(
                    value = name,
                    onValueChange = {
                        name = it
                        nameError = validateName(it)
                    },
                    label = { Text("Name *") },
                    isError = nameError != null,
                    singleLine = true
                )
                if (nameError != null) {
                    Spacer(Modifier.size(4.dp))
                    Text(text = nameError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = email,
                    onValueChange = {
                        email = it
                        emailError = validateEmail(it)
                    },
                    label = { Text("Email") },
                    isError = emailError != null,
                    singleLine = true
                )
                if (emailError != null) {
                    Spacer(Modifier.size(4.dp))
                    Text(text = emailError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = phone,
                    onValueChange = {
                        phone = it
                        phoneError = validatePhone(it)
                    },
                    label = { Text("Phone") },
                    isError = phoneError != null,
                    singleLine = true
                )
                if (phoneError != null) {
                    Spacer(Modifier.size(4.dp))
                    Text(text = phoneError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = company,
                    onValueChange = {
                        company = it
                        companyError = validateCompany(it)
                    },
                    label = { Text("Company") },
                    isError = companyError != null,
                    singleLine = true
                )
                if (companyError != null) {
                    Spacer(Modifier.size(4.dp))
                    Text(text = companyError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = status,
                    onValueChange = { status = it },
                    label = { Text("Status") },
                    singleLine = true
                )
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = type,
                    onValueChange = { type = it },
                    label = { Text("Type") },
                    singleLine = true
                )
            }
        },
        confirmButton = {
            val hasValidationErrors = listOf(nameError, emailError, phoneError, companyError).any { it != null }
            TextButton(
                enabled = !loading &&
                    name.isNotBlank() &&
                    (email.isNotBlank() || phone.isNotBlank()) &&
                    !hasValidationErrors,
                onClick = {
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            val authHeader = "Bearer $authToken"
                            val body = CustomerWriteRequest(
                                name = name.trim(),
                                email = email.trim().ifBlank { null },
                                phone = phone.trim().ifBlank { null },
                                company = company.trim().ifBlank { null },
                                status = status.trim().ifBlank { null },
                                type = type.trim().ifBlank { null }
                            )
                            val response = if (existing?.id == null) {
                                ApiClient.customersApi.createCustomer(authHeader, body)
                            } else {
                                ApiClient.customersApi.updateCustomer(authHeader, existing.id!!, body)
                            }
                            val saved = response.customer
                            if (saved != null) {
                                onSaved(saved)
                            } else {
                                error = response.message ?: "Unknown error saving customer"
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

@Composable
fun ConfirmDeleteCustomerDialog(
    authToken: String,
    customer: Customer,
    onDismiss: () -> Unit,
    onDeleted: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = { Text("Delete customer") },
        text = {
            Column {
                Text("Are you sure you want to permanently delete '${customer.name ?: "this customer"}'?")
                Spacer(Modifier.size(8.dp))
                Text(
                    "This cannot be undone.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
                if (error != null) {
                    Spacer(Modifier.size(8.dp))
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !loading,
                onClick = {
                    val id = customer.id ?: return@TextButton
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            val resp = ApiClient.customersApi.deleteCustomer(
                                auth = "Bearer $authToken",
                                id = id
                            )
                            if (resp.success == false) {
                                error = resp.error ?: resp.message ?: "Failed to delete customer"
                            } else {
                                onDeleted(id)
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
                    Text("Delete")
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

// Validation functions for complaint form
fun validateComplaintTitle(value: String): String? {
    val trimmed = value.trim()
    if (trimmed.isEmpty()) {
        return "Title is required"
    }
    if (trimmed.length < 3) {
        return "Title must be at least 3 characters"
    }
    if (trimmed.length > 200) {
        return "Title must be at most 200 characters"
    }
    return null
}

fun validateComplaintPriority(value: String): String? {
    val trimmed = value.trim().lowercase()
    if (trimmed.isNotEmpty()) {
        val validPriorities = listOf("low", "medium", "high", "urgent")
        if (!validPriorities.contains(trimmed)) {
            return "Priority must be one of: low, medium, high, urgent"
        }
    }
    return null
}

fun validateComplaintDescription(value: String): String? {
    if (value.length > 2000) {
        return "Description must be at most 2000 characters"
    }
    return null
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateComplaintDialog(
    authToken: String,
    customer: Customer,
    onDismiss: () -> Unit,
    onCreated: (Complaint) -> Unit
) {
    val scope = rememberCoroutineScope()
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var priority by remember { mutableStateOf("low") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var titleError by remember { mutableStateOf<String?>(null) }
    var priorityError by remember { mutableStateOf<String?>(null) }
    var descriptionError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = { Text("New Complaint") },
        text = {
            Column {
                if (error != null) {
                    Text(text = error.orEmpty(), color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.size(8.dp))
                }
                Text(
                    text = "Customer: ${customer.name ?: customer.id ?: ""}",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = title,
                    onValueChange = {
                        title = it
                        titleError = validateComplaintTitle(it)
                    },
                    label = { Text("Title *") },
                    isError = titleError != null,
                    singleLine = true
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
                    maxLines = 3
                )
                if (descriptionError != null) {
                    Spacer(Modifier.size(4.dp))
                    Text(text = descriptionError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.size(8.dp))
                OutlinedTextField(
                    value = priority,
                    onValueChange = {
                        priority = it
                        priorityError = validateComplaintPriority(it)
                    },
                    label = { Text("Priority (low, medium, high, urgent)") },
                    isError = priorityError != null,
                    singleLine = true
                )
                if (priorityError != null) {
                    Spacer(Modifier.size(4.dp))
                    Text(text = priorityError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            val hasValidationErrors = listOf(titleError, priorityError, descriptionError).any { it != null }
            TextButton(
                enabled = !loading &&
                    title.isNotBlank() &&
                    (customer.id != null) &&
                    !hasValidationErrors,
                onClick = {
                    val customerId = customer.id ?: return@TextButton
                    // Re-validate before submission
                    val finalTitleError = validateComplaintTitle(title)
                    val finalPriorityError = validateComplaintPriority(priority)
                    val finalDescriptionError = validateComplaintDescription(description)
                    
                    if (finalTitleError != null || finalPriorityError != null || finalDescriptionError != null) {
                        titleError = finalTitleError
                        priorityError = finalPriorityError
                        descriptionError = finalDescriptionError
                        return@TextButton
                    }
                    
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            val body = CreateComplaintRequest(
                                customerId = customerId,
                                title = title.trim(),
                                description = description.trim().ifBlank { null },
                                priority = priority.trim().lowercase().ifBlank { null },
                                status = "new"
                            )
                            val resp = ApiClient.complaintsApi.createComplaint(
                                auth = "Bearer $authToken",
                                body = body
                            )
                            val created = resp.complaint
                            if (created != null) {
                                onCreated(created)
                            } else {
                                error = resp.error ?: resp.message ?: "Failed to create complaint"
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
                    Text("Create")
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


