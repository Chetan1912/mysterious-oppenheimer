package com.apex.academy.data.model

import com.google.gson.annotations.SerializedName

// User & Auth
data class User(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("role") val role: String
)

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class LoginResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("user") val user: User?,
    @SerializedName("error") val error: String?
)

data class UserResponse(
    @SerializedName("user") val user: User?
)

// Main Domain Entities
data class Batch(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String
)

data class FeePlan(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("amount") val amount: Double
)

data class UserInfo(
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("phone") val phone: String?
)

data class ParentInfo(
    @SerializedName("user") val user: UserInfo
)

data class Student(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("admissionId") val admissionId: String,
    @SerializedName("joiningDate") val joiningDate: String,
    @SerializedName("parent") val parent: ParentInfo,
    @SerializedName("feePlan") val feePlan: FeePlan?,
    @SerializedName("batch") val batch: Batch?,
    @SerializedName("dueRecords") val dueRecords: List<DueRecord>?,
    @SerializedName("payments") val payments: List<Payment>?
)

data class StudentShort(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("admissionId") val admissionId: String
)

data class DueRecord(
    @SerializedName("id") val id: String,
    @SerializedName("month") val month: Int,
    @SerializedName("year") val year: Int,
    @SerializedName("totalDue") val totalDue: Double,
    @SerializedName("paidAmount") val paidAmount: Double,
    @SerializedName("status") val status: String,
    @SerializedName("student") val student: StudentShort,
    @SerializedName("reminderCount") val reminderCount: Int
)

data class Payment(
    @SerializedName("id") val id: String,
    @SerializedName("amountPaid") val amountPaid: Double,
    @SerializedName("paymentDate") val paymentDate: String,
    @SerializedName("paymentMethod") val paymentMethod: String,
    @SerializedName("notes") val notes: String?,
    @SerializedName("dueRecordId") val dueRecordId: String
)

data class TestCount(
    @SerializedName("marks") val marks: Int
)

data class Test(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("maxMarks") val maxMarks: Int,
    @SerializedName("testDate") val testDate: String,
    @SerializedName("batch") val batch: Batch,
    @SerializedName("_count") val count: TestCount?
)

data class TestShort(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("maxMarks") val maxMarks: Int,
    @SerializedName("testDate") val testDate: String
)

data class Mark(
    @SerializedName("id") val id: String,
    @SerializedName("score") val score: Double,
    @SerializedName("remarks") val remarks: String?,
    @SerializedName("test") val test: TestShort
)

data class Notice(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("message") val message: String,
    @SerializedName("targetRole") val targetRole: String,
    @SerializedName("createdAt") val createdAt: String
)

data class ClassSchedule(
    @SerializedName("id") val id: String,
    @SerializedName("date") val date: String,
    @SerializedName("startTime") val startTime: String,
    @SerializedName("endTime") val endTime: String,
    @SerializedName("isExtra") val isExtra: Boolean,
    @SerializedName("isCancelled") val isCancelled: Boolean,
    @SerializedName("notes") val notes: String?,
    @SerializedName("batch") val batch: Batch
)

// API Specific Responses
data class OwnerDashboardResponse(
    @SerializedName("metrics") val metrics: OwnerMetrics,
    @SerializedName("recentPayments") val recentPayments: List<PaymentWithStudent>,
    @SerializedName("notices") val notices: List<Notice>
)

data class OwnerMetrics(
    @SerializedName("totalStudents") val totalStudents: Int,
    @SerializedName("activeBatches") val activeBatches: Int,
    @SerializedName("totalRevenue") val totalRevenue: Double,
    @SerializedName("pendingDues") val pendingDues: Double
)

data class PaymentWithStudent(
    @SerializedName("id") val id: String,
    @SerializedName("amountPaid") val amountPaid: Double,
    @SerializedName("paymentDate") val paymentDate: String,
    @SerializedName("paymentMethod") val paymentMethod: String,
    @SerializedName("notes") val notes: String?,
    @SerializedName("studentName") val studentName: String,
    @SerializedName("studentId") val studentId: String,
    @SerializedName("month") val month: Int,
    @SerializedName("year") val year: Int
)

data class TeacherDashboardResponse(
    @SerializedName("nextClass") val nextClass: ClassSchedule?,
    @SerializedName("todayScheduleCount") val todayScheduleCount: Int,
    @SerializedName("gradedTestsCount") val gradedTestsCount: Int,
    @SerializedName("notices") val notices: List<Notice>
)

data class ParentDashboardResponse(
    @SerializedName("student") val student: Student?,
    @SerializedName("pendingDues") val pendingDues: Double,
    @SerializedName("notices") val notices: List<Notice>,
    @SerializedName("recentMarks") val recentMarks: List<Mark>?,
    @SerializedName("todaySchedule") val todaySchedule: List<ClassSchedule>?
)

// API Requests
data class AddStudentRequest(
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("phone") val phone: String,
    @SerializedName("batchId") val batchId: String,
    @SerializedName("feePlanId") val feePlanId: String,
    @SerializedName("joiningDate") val joiningDate: String
)

data class RecordPaymentRequest(
    @SerializedName("dueRecordId") val dueRecordId: String,
    @SerializedName("amountPaid") val amountPaid: Double,
    @SerializedName("paymentMethod") val paymentMethod: String,
    @SerializedName("notes") val notes: String?
)

data class CreateNoticeRequest(
    @SerializedName("title") val title: String,
    @SerializedName("message") val message: String,
    @SerializedName("targetRole") val targetRole: String
)

data class CreateTestRequest(
    @SerializedName("title") val title: String,
    @SerializedName("maxMarks") val maxMarks: Int,
    @SerializedName("testDate") val testDate: String,
    @SerializedName("batchId") val batchId: String
)

data class SubmitMarksRequest(
    @SerializedName("testId") val testId: String,
    @SerializedName("marks") val marks: Map<String, StudentMarkEntry>
)

data class StudentMarkEntry(
    @SerializedName("score") val score: Double,
    @SerializedName("remarks") val remarks: String?
)

data class CreateScheduleRequest(
    @SerializedName("batchId") val batchId: String,
    @SerializedName("date") val date: String,
    @SerializedName("startTime") val startTime: String,
    @SerializedName("endTime") val endTime: String,
    @SerializedName("isExtra") val isExtra: Boolean,
    @SerializedName("isCancelled") val isCancelled: Boolean,
    @SerializedName("notes") val notes: String?
)

data class GenericResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("error") val error: String?
)

data class StudentsResponse(
    @SerializedName("students") val students: List<Student>
)

data class BatchesResponse(
    @SerializedName("batches") val batches: List<Batch>
)

data class FeePlansResponse(
    @SerializedName("feePlans") val feePlans: List<FeePlan>
)

data class DuesResponse(
    @SerializedName("dueRecords") val dueRecords: List<DueRecord>
)

data class TestsResponse(
    @SerializedName("tests") val tests: List<Test>
)

data class TestResultsResponse(
    @SerializedName("test") val test: Test,
    @SerializedName("marks") val marks: List<Mark>
)

data class NoticesResponse(
    @SerializedName("notices") val notices: List<Notice>
)

data class SchedulesResponse(
    @SerializedName("classes") val classes: List<ClassSchedule>
)
