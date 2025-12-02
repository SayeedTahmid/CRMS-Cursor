package com.nextgencrm.mobile

import android.widget.Toast
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberTopAppBarState
import com.nextgencrm.mobile.ui.theme.DarkBgCard
import com.nextgencrm.mobile.ui.theme.DarkBgSecondary
import com.nextgencrm.mobile.ui.theme.PrimaryPurple
import com.nextgencrm.mobile.ui.theme.TextSecondary
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import kotlinx.coroutines.launch

/**
 * Root navigation graph and bottom navigation shell.
 */

sealed class RootDestination(
    val route: String,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    object Dashboard : RootDestination("dashboard", "Dashboard", Icons.Filled.Home)
    object Customers : RootDestination("customers", "Customers", Icons.Filled.Person)
    object Complaints : RootDestination("complaints", "Complaints", Icons.Filled.List)
    object Settings : RootDestination("settings", "Settings", Icons.Filled.Settings)
}

@Composable
fun RootApp() {
    val navController = rememberNavController()
    var token by remember { mutableStateOf("") }
    var isAuthenticated by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Try to restore existing session from stored token or Firebase user
    LaunchedEffect(Unit) {
        val saved = AuthPrefs.getToken(context)?.trim().orEmpty()
        if (saved.isNotEmpty()) {
            token = saved
            scope.launch {
                try {
                    val resp = ApiClient.authApi.getStatus("Bearer $saved")
                    if (resp.status == "ok") {
                        // Mark authenticated; UI will recompose into MainScaffold
                        isAuthenticated = true
                    } else {
                        AuthPrefs.clear(context)
                        token = ""
                        isAuthenticated = false
                    }
                } catch (_: Exception) {
                    AuthPrefs.clear(context)
                    token = ""
                    isAuthenticated = false
                }
            }
        } else {
            // If we have a Firebase user but no stored token, fetch a fresh ID token
            val user = FirebaseAuthManager.currentUser()
            if (user != null) {
                scope.launch {
                    try {
                        val idToken = FirebaseAuthManager.getIdToken(forceRefresh = false)
                        val resp = ApiClient.authApi.getStatus("Bearer $idToken")
                        if (resp.status == "ok") {
                            token = idToken
                            AuthPrefs.saveToken(context, idToken)
                            // Mark authenticated; UI will recompose into MainScaffold
                            isAuthenticated = true
                        }
                    } catch (_: Exception) {
                        // Ignore and fall back to login
                        AuthPrefs.clear(context)
                        token = ""
                        isAuthenticated = false
                    }
                }
            }
        }
    }

    if (!isAuthenticated) {
        LoginScreen(
            onLogin = { email, password ->
                scope.launch {
                    try {
                        // 1) Sign in with Firebase (email/password)
                        FirebaseAuthManager.signIn(email, password)
                        // 2) Get ID token to talk to backend
                        val idToken = FirebaseAuthManager.getIdToken(forceRefresh = true)
                        token = idToken
                        // 3) Validate with backend /api/auth/status
                        val resp = ApiClient.authApi.getStatus("Bearer $idToken")
                        if (resp.status == "ok") {
                            // Persist token and let UI recompose to main graph
                            isAuthenticated = true
                            AuthPrefs.saveToken(context, idToken)
                            Toast.makeText(
                                context,
                                "Signed in successfully",
                                Toast.LENGTH_SHORT
                            ).show()
                        } else {
                            Toast.makeText(
                                context,
                                "Auth status: ${resp.status}",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    } catch (e: AuthException) {
                        // User-friendly error message from FirebaseAuthManager
                        Toast.makeText(
                            context,
                            e.message ?: "Login failed",
                            Toast.LENGTH_LONG
                        ).show()
                    } catch (e: Exception) {
                        // Generic error message
                        val errorMsg = e.localizedMessage ?: e.message ?: "Unknown error"
                        Toast.makeText(
                            context,
                            "Login failed: $errorMsg",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            },
            onRegister = { email, password, displayName ->
                scope.launch {
                    try {
                        // 1) Create user in Firebase Auth
                        val firebaseUser = FirebaseAuthManager.signUp(email, password)
                        val firebaseUid = firebaseUser.uid
                        
                        // 2) Get ID token
                        val idToken = FirebaseAuthManager.getIdToken(forceRefresh = true)
                        token = idToken
                        
                        // 3) Register user in backend Firestore
                        val registerRequest = RegisterRequest(
                            email = email,
                            firebase_uid = firebaseUid,
                            display_name = displayName.ifBlank { email.split("@").firstOrNull() ?: email },
                            tenant_id = "default"
                        )
                        val registerResp = ApiClient.authApi.register("Bearer $idToken", registerRequest)
                        
                        // 4) Validate with backend /api/auth/status
                        val resp = ApiClient.authApi.getStatus("Bearer $idToken")
                        if (resp.status == "ok") {
                            // Persist token and let UI recompose to main graph
                            isAuthenticated = true
                            AuthPrefs.saveToken(context, idToken)
                            Toast.makeText(
                                context,
                                "Account created successfully",
                                Toast.LENGTH_SHORT
                            ).show()
                        } else {
                            Toast.makeText(
                                context,
                                "Registration complete but auth failed: ${resp.status}",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    } catch (e: AuthException) {
                        // User-friendly error message from FirebaseAuthManager
                        Toast.makeText(
                            context,
                            e.message ?: "Registration failed",
                            Toast.LENGTH_LONG
                        ).show()
                    } catch (e: Exception) {
                        // Generic error message
                        val errorMsg = e.localizedMessage ?: e.message ?: "Unknown error"
                        Toast.makeText(
                            context,
                            "Registration failed: $errorMsg",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
        )
    } else {
        MainScaffold(
            navController = navController,
            token = token,
            onLogout = {
                isAuthenticated = false
                token = ""
                FirebaseAuthManager.signOut()
                AuthPrefs.clear(context)
            },
            onAuthError = {
                // Handle 401 - logout and return to login
                isAuthenticated = false
                token = ""
                FirebaseAuthManager.signOut()
                AuthPrefs.clear(context)
            }
        )
    }
}

@Composable
fun MainScaffold(
    navController: NavHostController,
    token: String,
    onLogout: () -> Unit,
    onAuthError: () -> Unit
) {
    val items = listOf(
        RootDestination.Dashboard,
        RootDestination.Customers,
        RootDestination.Complaints,
        RootDestination.Settings
    )
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: RootDestination.Dashboard.route

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = DarkBgSecondary,
                contentColor = TextSecondary
            ) {
                items.forEach { dest ->
                    val selected = currentRoute == dest.route
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(dest.icon, contentDescription = dest.label) },
                        label = { Text(dest.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = PrimaryPurple,
                            selectedTextColor = PrimaryPurple,
                            indicatorColor = DarkBgCard,
                            unselectedIconColor = TextSecondary,
                            unselectedTextColor = TextSecondary
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = RootDestination.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(RootDestination.Dashboard.route) {
                DashboardScreen(
                    authToken = token,
                    onLogClick = { log ->
                        log.id?.let { logId ->
                            navController.navigate("logs/$logId")
                        }
                    },
                    onCustomerClick = { customerId ->
                        navController.navigate("customers/$customerId")
                    },
                    onComplaintClick = { complaintId ->
                        navController.navigate("complaints/$complaintId")
                    },
                    onViewAllLogs = {
                        navController.navigate("logs")
                    },
                    onAuthError = onAuthError,
                    onNewCustomer = {
                        // Navigate to Customers screen - user can click + button to add
                        navController.navigate(RootDestination.Customers.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onNewComplaint = {
                        // Navigate to Complaints screen - user can click + button to add
                        navController.navigate(RootDestination.Complaints.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
            composable(RootDestination.Customers.route) {
                CustomersScreen(
                    authToken = token,
                    onCustomerClick = { customer ->
                        customer.id?.let { id ->
                            navController.navigate("customers/$id")
                        }
                    }
                )
            }
            composable(RootDestination.Complaints.route) {
                ComplaintsScreen(
                    authToken = token,
                    onComplaintClick = { complaint ->
                        complaint.id?.let { id ->
                            navController.navigate("complaints/$id")
                        }
                    }
                )
            }
            composable("customers/{id}") { backStackEntry ->
                val customerId = backStackEntry.arguments?.getString("id") ?: return@composable
                CustomerDetailRoute(
                    authToken = token,
                    customerId = customerId,
                    onBack = { navController.popBackStack() }
                )
            }
            composable("complaints/{id}") { backStackEntry ->
                val complaintId = backStackEntry.arguments?.getString("id") ?: return@composable
                ComplaintDetailRoute(
                    authToken = token,
                    complaintId = complaintId,
                    onBack = { navController.popBackStack() }
                )
            }
            composable("logs") {
                LogsScreen(
                    authToken = token,
                    onLogClick = { log ->
                        log.id?.let { logId ->
                            navController.navigate("logs/$logId")
                        }
                    }
                )
            }
            composable("logs/{id}") { backStackEntry ->
                val logId = backStackEntry.arguments?.getString("id") ?: return@composable
                LogDetailRoute(
                    authToken = token,
                    logId = logId,
                    onBack = { navController.popBackStack() }
                )
            }
            composable(RootDestination.Settings.route) {
                SettingsScreen(authToken = token, onLogout = onLogout)
            }
        }
    }
}


