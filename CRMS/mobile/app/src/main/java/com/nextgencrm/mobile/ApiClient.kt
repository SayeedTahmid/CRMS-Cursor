package com.nextgencrm.mobile

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.DELETE
import retrofit2.http.Body

// Emulator → host machine backend
// IMPORTANT: must end with "/"
private const val DEFAULT_BASE_URL = "http://10.0.2.2:5000/api/"

// ---------- API INTERFACES & MODELS ----------

interface AuthApi {
    @GET("auth/status")
    suspend fun getStatus(
        @Header("Authorization") auth: String
    ): AuthStatusResponse

    @GET("auth/user")
    suspend fun getCurrentUser(
        @Header("Authorization") auth: String
    ): CurrentUserResponse

    @POST("auth/register")
    suspend fun register(
        @Header("Authorization") auth: String,
        @Body body: RegisterRequest
    ): RegisterResponse
}

data class AuthStatusResponse(
    val status: String,
    val service: String,
    val message: String? = null
)

data class CurrentUserResponse(
    val user: UserInfo? = null,
    val error: String? = null
)

data class RegisterRequest(
    val email: String,
    val firebase_uid: String,
    val display_name: String? = null,
    val tenant_id: String = "default"
)

data class RegisterResponse(
    val message: String? = null,
    val user: UserInfo? = null,
    val error: String? = null
)

interface ComplaintsApi {
    @GET("complaints")
    suspend fun listComplaints(
        @Header("Authorization") auth: String,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): ComplaintsResponse

    @GET("complaints/{id}")
    suspend fun getComplaint(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): Complaint

    @POST("complaints")
    suspend fun createComplaint(
        @Header("Authorization") auth: String,
        @Body body: CreateComplaintRequest
    ): CreateComplaintResponse

    @PUT("complaints/{id}")
    suspend fun updateComplaint(
        @Header("Authorization") auth: String,
        @Path("id") id: String,
        @Body body: UpdateComplaintRequest
    ): UpdateComplaintResponse

    @PUT("complaints/{id}/status")
    suspend fun updateComplaintStatus(
        @Header("Authorization") auth: String,
        @Path("id") id: String,
        @Body body: UpdateStatusRequest
    ): UpdateComplaintResponse
}

interface CustomersApi {
    @GET("customers")
    suspend fun listCustomers(
        @Header("Authorization") auth: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("search") search: String? = null
    ): CustomersResponse

    @GET("customers/{id}")
    suspend fun getCustomer(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): Customer

    @GET("customers/{id}/logs")
    suspend fun getCustomerLogs(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): CustomerLogsResponse

    @GET("customers/{id}/complaints")
    suspend fun getCustomerComplaints(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): CustomerComplaintsResponse

    @POST("customers")
    suspend fun createCustomer(
        @Header("Authorization") auth: String,
        @Body body: CustomerWriteRequest
    ): CustomerWriteResponse

    @PUT("customers/{id}")
    suspend fun updateCustomer(
        @Header("Authorization") auth: String,
        @Path("id") id: String,
        @Body body: CustomerWriteRequest
    ): CustomerWriteResponse

    @DELETE("customers/{id}")
    suspend fun deleteCustomer(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): GenericResponse
}

interface MetricsApi {
    @GET("metrics")
    suspend fun getMetrics(
        @Header("Authorization") auth: String
    ): MetricsResponse
}

interface EmailApi {
    @GET("email/status")
    suspend fun getEmailStatus(
        @Header("Authorization") auth: String
    ): EmailStatusResponse

    @POST("email/send")
    suspend fun sendEmail(
        @Header("Authorization") auth: String,
        @Body body: EmailSendRequest
    ): EmailSendResponse

    @GET("email/history")
    suspend fun getEmailHistory(
        @Header("Authorization") auth: String,
        @Query("customerId") customerId: String? = null,
        @Query("complaintId") complaintId: String? = null,
        @Query("limit") limit: Int = 20
    ): EmailHistoryResponse
}

interface TelegramApi {
    @GET("telegram/status")
    suspend fun getTelegramStatus(
        @Header("Authorization") auth: String
    ): TelegramStatusResponse

    @POST("telegram/test-notification")
    suspend fun sendTestNotification(
        @Header("Authorization") auth: String,
        @Body body: TelegramTestRequest
    ): GenericResponse
}

interface TaigaApi {
    @GET("taiga/status")
    suspend fun getTaigaStatus(
        @Header("Authorization") auth: String
    ): TaigaStatusResponse

    @POST("taiga/create-issue")
    suspend fun createTaigaIssue(
        @Header("Authorization") auth: String,
        @Body body: CreateTaigaIssueRequest
    ): TaigaIssueResponse

    @POST("taiga/link-issue")
    suspend fun linkTaigaIssue(
        @Header("Authorization") auth: String,
        @Body body: LinkTaigaIssueRequest
    ): TaigaIssueResponse

    @POST("taiga/unlink-issue")
    suspend fun unlinkTaigaIssue(
        @Header("Authorization") auth: String,
        @Body body: UnlinkTaigaIssueRequest
    ): GenericResponse

    @POST("taiga/sync-status")
    suspend fun syncTaigaStatus(
        @Header("Authorization") auth: String,
        @Body body: SyncTaigaStatusRequest
    ): SyncTaigaStatusResponse

    @GET("taiga/issue/{issueId}")
    suspend fun getTaigaIssue(
        @Header("Authorization") auth: String,
        @Path("issueId") issueId: Int
    ): TaigaIssueDetailResponse
}

data class ComplaintsResponse(
    val complaints: List<Complaint>,
    val page: Int,
    val pageSize: Int,
    val hasMore: Boolean,
    val total: Int
)

data class Complaint(
    val id: String? = null,
    val customer_id: String? = null,
    val subject: String? = null,
    val title: String? = null,
    val description: String? = null,
    val type: String? = null,
    val category: String? = null,
    val status: String? = null,
    val priority: String? = null,
    val ticket_number: String? = null,
    val taiga_issue_id: Int? = null,
    val taiga_issue_ref: Int? = null,
    val taiga_issue_url: String? = null,
    val taiga_status: String? = null
)

data class CreateComplaintRequest(
    val customerId: String,
    val title: String,
    val description: String? = null,
    val category: String? = null,
    val priority: String? = null,
    val status: String? = null
)

data class CreateComplaintResponse(
    val success: Boolean? = null,
    val data: Any? = null,
    val complaint: Complaint? = null,
    val error: String? = null,
    val message: String? = null
)

data class UpdateComplaintRequest(
    val title: String? = null,
    val description: String? = null,
    val type: String? = null,
    val category: String? = null,
    val priority: String? = null,
    val status: String? = null
)

data class UpdateStatusRequest(
    val status: String,
    val resolutionNotes: String? = null,
    val customerSatisfaction: String? = null
)

data class UpdateComplaintResponse(
    val status: String? = null,
    val message: String? = null,
    val complaint: Complaint? = null,
    val error: String? = null
)

data class Customer(
    val id: String? = null,
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val company: String? = null,
    val status: String? = null,
    val type: String? = null
)

data class CustomerWriteRequest(
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val company: String? = null,
    val status: String? = null,
    val type: String? = null
)

data class CustomerWriteResponse(
    val message: String? = null,
    val customer: Customer? = null
)

data class CustomersResponse(
    val customers: List<Customer>,
    val total: Int,
    val page: Int? = null,
    val limit: Int? = null
)

data class CustomerLog(
    val id: String? = null,
    val title: String? = null,
    val type: String? = null,
    val description: String? = null,
    val log_date: String? = null
)

data class CustomerLogsResponse(
    val logs: List<CustomerLog>,
    val total: Int? = null
)

data class CustomerComplaintSummary(
    val id: String? = null,
    val subject: String? = null,
    val status: String? = null,
    val priority: String? = null,
    val ticket_number: String? = null
)

data class CustomerComplaintsResponse(
    val complaints: List<CustomerComplaintSummary>,
    val total: Int? = null
)

data class CreateLogRequest(
    val title: String,
    val type: String? = null,
    val description: String? = null,
    val customer_id: String? = null,
    val log_date: String? = null,
    val content: String? = null,
    val priority: String? = null,
    val status: String? = null,
    val duration: Int? = null,
    val follow_up_required: Boolean? = null
)

data class UpdateLogRequest(
    val title: String? = null,
    val type: String? = null,
    val description: String? = null,
    val customer_id: String? = null,
    val log_date: String? = null,
    val content: String? = null,
    val priority: String? = null,
    val status: String? = null,
    val duration: Int? = null,
    val follow_up_required: Boolean? = null
)

data class CreateLogResponse(
    val message: String? = null,
    val log: LogItem? = null
)

data class UpdateLogResponse(
    val message: String? = null,
    val log: LogItem? = null,
    val error: String? = null
)

data class MetricsResponse(
    val active_customers: Int,
    val open_complaints: Int,
    val recent_logs_7d: Int,
    val performance_month: Int
)

data class EmailStatusResponse(
    val configured: Boolean,
    val from_email: String? = null,
    val message: String? = null
)

data class EmailSendRequest(
    val to: String,
    val subject: String,
    val text: String? = null,
    val html: String? = null,
    val customer_id: String? = null,
    val complaint_id: String? = null,
    val trigger: String? = null
)

data class EmailHistoryItem(
    val id: String? = null,
    val subject: String? = null,
    val to: List<String>? = null,
    val sent_at: String? = null,
    val status: String? = null,
    val trigger: String? = null
)

data class EmailHistoryResponse(
    val history: List<EmailHistoryItem>,
    val count: Int
)

data class EmailSendResponse(
    val success: Boolean? = null,
    val message: String? = null,
    val email_id: String? = null,
    val result: Any? = null
)

data class TelegramBotInfo(
    val id: Long? = null,
    val username: String? = null,
    val first_name: String? = null,
    val is_bot: Boolean? = null
)

data class TelegramStatusResponse(
    val configured: Boolean,
    val message: String? = null,
    val bot_info: TelegramBotInfo? = null,
    val error: String? = null
)

data class TelegramTestRequest(
    val chat_id: String? = null
)

data class TaigaStatusResponse(
    val configured: Boolean,
    val project_slug: String? = null,
    val message: String? = null,
    val error: String? = null
)

data class CreateTaigaIssueRequest(
    val complaint_id: String,
    val project_slug: String? = null,
    val priority: String? = null,
    val tags: List<String>? = null
)

data class LinkTaigaIssueRequest(
    val complaint_id: String,
    val taiga_issue_id: Int
)

data class UnlinkTaigaIssueRequest(
    val complaint_id: String
)

data class SyncTaigaStatusRequest(
    val complaint_id: String
)

data class TaigaIssueResponse(
    val success: Boolean? = null,
    val taiga_issue: Any? = null,
    val message: String? = null,
    val error: String? = null
)

data class SyncTaigaStatusResponse(
    val success: Boolean? = null,
    val taiga_status: String? = null,
    val crm_status: String? = null,
    val message: String? = null,
    val error: String? = null
)

data class TaigaIssueDetailResponse(
    val success: Boolean? = null,
    val issue: Any? = null,
    val error: String? = null
)

data class GenericResponse(
    val success: Boolean? = null,
    val message: String? = null,
    val error: String? = null
)

// Logs API (for recent activity on dashboard and creating logs)
interface UsersApi {
    @GET("users")
    suspend fun listUsers(
        @Header("Authorization") auth: String
    ): UsersResponse

    @POST("users/invite")
    suspend fun inviteUser(
        @Header("Authorization") auth: String,
        @Body body: InviteUserRequest
    ): InviteUserResponse

    @PUT("users/{uid}/role")
    suspend fun setUserRole(
        @Header("Authorization") auth: String,
        @Path("uid") uid: String,
        @Body body: SetUserRoleRequest
    ): GenericResponse
}

interface LogsApi {
    @GET("logs")
    suspend fun listLogs(
        @Header("Authorization") auth: String,
        @Query("customer_id") customerId: String? = null,
        @Query("type") type: String? = null
    ): LogsResponse

    @GET("logs/{id}")
    suspend fun getLog(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): LogItem

    @POST("logs")
    suspend fun createLog(
        @Header("Authorization") auth: String,
        @Body body: CreateLogRequest
    ): CreateLogResponse

    @PUT("logs/{id}")
    suspend fun updateLog(
        @Header("Authorization") auth: String,
        @Path("id") id: String,
        @Body body: UpdateLogRequest
    ): UpdateLogResponse

    @DELETE("logs/{id}")
    suspend fun deleteLog(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): GenericResponse
}

data class LogItem(
    val id: String? = null,
    val type: String? = null,
    val title: String? = null,
    val description: String? = null,
    val customer_id: String? = null,
    val log_date: String? = null,
    val created_at: String? = null,
    val content: String? = null,
    val priority: String? = null,
    val status: String? = null,
    val duration: Int? = null,
    val follow_up_required: Boolean? = null
)

data class LogsResponse(
    val logs: List<LogItem>,
    val total: Int? = null
)

data class UserInfo(
    val id: String? = null,
    val email: String? = null,
    val displayName: String? = null,
    val role: String? = null,
    val tenant_id: String? = null
)

data class UsersResponse(
    val users: List<UserInfo>,
    val total: Int? = null
)

data class InviteUserRequest(
    val email: String,
    val role: String = "viewer"
)

data class InviteUserResponse(
    val message: String? = null,
    val uid: String? = null,
    val role: String? = null,
    val error: String? = null
)

data class SetUserRoleRequest(
    val role: String
)


// ---------- Retrofit client ----------

object ApiClient {

    private fun createRetrofit(baseUrl: String = DEFAULT_BASE_URL): Retrofit {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    private val retrofit: Retrofit = createRetrofit()

    val authApi: AuthApi = retrofit.create(AuthApi::class.java)
    val complaintsApi: ComplaintsApi = retrofit.create(ComplaintsApi::class.java)
    val customersApi: CustomersApi = retrofit.create(CustomersApi::class.java)
    val metricsApi: MetricsApi = retrofit.create(MetricsApi::class.java)
    val emailApi: EmailApi = retrofit.create(EmailApi::class.java)
    val telegramApi: TelegramApi = retrofit.create(TelegramApi::class.java)
    val taigaApi: TaigaApi = retrofit.create(TaigaApi::class.java)
    val logsApi: LogsApi = retrofit.create(LogsApi::class.java)
    val usersApi: UsersApi = retrofit.create(UsersApi::class.java)
}
