package com.apex.academy.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    
    // Owner Screens
    object OwnerDashboard : Screen("owner_dashboard")
    object OwnerStudents : Screen("owner_students")
    object OwnerFees : Screen("owner_fees")
    object OwnerTests : Screen("owner_tests")
    
    // Teacher Screens
    object TeacherDashboard : Screen("teacher_dashboard")
    object TeacherSchedule : Screen("teacher_schedule")
    object TeacherMarks : Screen("teacher_marks")
    
    // Parent Screens
    object ParentDashboard : Screen("parent_dashboard")
    object ParentFees : Screen("parent_fees")
    object ParentAcademics : Screen("parent_academics")
}
