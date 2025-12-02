package com.nextgencrm.mobile

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.tasks.await

/**
 * Thin wrapper around FirebaseAuth for email/password login and ID token retrieval.
 */
object FirebaseAuthManager {
    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }

    /**
     * Signs in with email and password, throwing user-friendly exceptions.
     */
    suspend fun signIn(email: String, password: String): FirebaseUser {
        return try {
            val result = auth.signInWithEmailAndPassword(email.trim(), password).await()
            result.user ?: throw AuthException("Sign-in failed: user is null")
        } catch (e: FirebaseAuthException) {
            val errorCode = e.errorCode
            val errorMessage = when (errorCode) {
                "ERROR_WRONG_PASSWORD" -> "Incorrect password. Please try again."
                "ERROR_USER_NOT_FOUND" -> "No account found with this email address. Please check your email or create an account."
                "ERROR_USER_DISABLED" -> "This account has been disabled. Please contact support."
                "ERROR_TOO_MANY_REQUESTS" -> "Too many failed login attempts. Please try again later."
                "ERROR_INVALID_EMAIL" -> "Invalid email address format. Please check your email."
                "ERROR_OPERATION_NOT_ALLOWED" -> "Email/password sign-in is not enabled. Please contact support."
                "ERROR_INVALID_CREDENTIAL" -> "The supplied auth credential is incorrect. Please check your email and password."
                "ERROR_WEAK_PASSWORD" -> "Password is too weak. Please choose a stronger password."
                else -> {
                    // Use the localized message if available, otherwise use error code
                    val localizedMsg = e.localizedMessage
                    if (localizedMsg != null && localizedMsg.isNotBlank()) {
                        localizedMsg
                    } else {
                        "Authentication failed. Please check your email and password."
                    }
                }
            }
            throw AuthException(errorMessage)
        } catch (e: AuthException) {
            // Re-throw our custom exception
            throw e
        } catch (e: Exception) {
            throw AuthException("Login failed: ${e.localizedMessage ?: e.message ?: "Unknown error. Please try again."}")
        }
    }

    fun signOut() {
        auth.signOut()
    }

    fun currentUser(): FirebaseUser? = auth.currentUser

    suspend fun getIdToken(forceRefresh: Boolean = true): String {
        val user = currentUser() ?: throw AuthException("No authenticated user")
        return try {
            val tokenResult = user.getIdToken(forceRefresh).await()
            tokenResult.token ?: throw AuthException("Failed to get authentication token")
        } catch (e: Exception) {
            throw AuthException("Failed to get authentication token: ${e.localizedMessage ?: e.message}")
        }
    }

    /**
     * Creates a new user account with email and password.
     */
    suspend fun signUp(email: String, password: String): FirebaseUser {
        return try {
            val result = auth.createUserWithEmailAndPassword(email.trim(), password).await()
            result.user ?: throw AuthException("Registration failed: user is null")
        } catch (e: FirebaseAuthException) {
            val errorCode = e.errorCode
            val errorMessage = when (errorCode) {
                "ERROR_EMAIL_ALREADY_IN_USE" -> "An account with this email already exists. Please sign in instead."
                "ERROR_INVALID_EMAIL" -> "Invalid email address format. Please check your email."
                "ERROR_WEAK_PASSWORD" -> "Password is too weak. Please choose a stronger password (at least 6 characters)."
                "ERROR_OPERATION_NOT_ALLOWED" -> "Registration is not enabled. Please contact support."
                else -> {
                    val localizedMsg = e.localizedMessage
                    if (localizedMsg != null && localizedMsg.isNotBlank()) {
                        localizedMsg
                    } else {
                        "Registration failed. Please try again."
                    }
                }
            }
            throw AuthException(errorMessage)
        } catch (e: AuthException) {
            throw e
        } catch (e: Exception) {
            throw AuthException("Registration failed: ${e.localizedMessage ?: e.message ?: "Unknown error. Please try again."}")
        }
    }
}

/**
 * User-friendly authentication exception wrapper.
 */
class AuthException(message: String) : Exception(message)


