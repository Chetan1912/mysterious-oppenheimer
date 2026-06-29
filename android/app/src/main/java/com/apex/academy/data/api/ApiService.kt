package com.apex.academy.data.api

import com.apex.academy.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Authentication
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("api/auth/me")
    suspend fun getCurrentUser(): Response<UserResponse>

    @POST("api/auth/logout")
    suspend fun logout(): Response<GenericResponse>

    // Owner Endpoints
    @GET("api/owner/dashboard")
    suspend fun getOwnerDashboard(): Response<OwnerDashboardResponse>

    @GET("api/owner/students")
    suspend fun getStudents(): Response<StudentsResponse>

    @POST("api/owner/students/admission")
    suspend fun admitStudent(@Body request: AddStudentRequest): Response<GenericResponse>

    @GET("api/owner/fees")
    suspend fun getFees(): Response<DuesResponse>

    @POST("api/owner/fees/remind")
    suspend fun sendFeeReminder(@Body request: Map<String, String>): Response<GenericResponse> // e.g. { "dueRecordId": "..." }

    @POST("api/owner/fees/pay")
    suspend fun recordPayment(@Body request: RecordPaymentRequest): Response<GenericResponse>

    @GET("api/owner/tests")
    suspend fun getTests(): Response<TestsResponse>

    @GET("api/owner/tests/results")
    suspend fun getTestResults(@Query("testId") testId: String): Response<TestResultsResponse>

    @GET("api/owner/notices")
    suspend fun getOwnerNotices(): Response<NoticesResponse>

    @POST("api/owner/notices")
    suspend fun createNotice(@Body request: CreateNoticeRequest): Response<GenericResponse>

    // Teacher Endpoints
    @GET("api/teacher/dashboard")
    suspend fun getTeacherDashboard(): Response<TeacherDashboardResponse>

    @GET("api/teacher/schedule")
    suspend fun getTeacherSchedule(): Response<SchedulesResponse>

    @POST("api/teacher/schedule")
    suspend fun createSchedule(@Body request: CreateScheduleRequest): Response<GenericResponse>

    @GET("api/teacher/marks")
    suspend fun getTeacherMarks(@Query("batchId") batchId: String): Response<Map<String, Any>> // Returns { tests: [], students: [] }

    @POST("api/teacher/marks")
    suspend fun submitMarks(@Body request: SubmitMarksRequest): Response<GenericResponse>

    @POST("api/teacher/tests")
    suspend fun createTest(@Body request: CreateTestRequest): Response<GenericResponse>

    // Parent Endpoints
    @GET("api/parent/dashboard")
    suspend fun getParentDashboard(): Response<ParentDashboardResponse>

    @GET("api/parent/fees")
    suspend fun getParentFees(): Response<ParentDashboardResponse> // Reuses parent dashboard payload or structured response

    @GET("api/parent/reports")
    suspend fun getParentReports(): Response<List<Mark>>

    @GET("api/parent/schedule")
    suspend fun getParentSchedule(): Response<SchedulesResponse>

    // Helper endpoints for Dropdowns
    @GET("api/owner/students/admission")
    suspend fun getAdmissionConfig(): Response<Map<String, Any>> // Returns { batches: [], feePlans: [] }
}
