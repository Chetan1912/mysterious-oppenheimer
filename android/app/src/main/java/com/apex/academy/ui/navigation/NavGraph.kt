package com.apex.academy.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.apex.academy.ui.login.LoginScreen
import com.apex.academy.ui.owner.OwnerDashboardScreen
import com.apex.academy.ui.owner.OwnerFeesScreen
import com.apex.academy.ui.owner.OwnerStudentsScreen
import com.apex.academy.ui.owner.OwnerTestsScreen
import com.apex.academy.ui.parent.ParentAcademicsScreen
import com.apex.academy.ui.parent.ParentDashboardScreen
import com.apex.academy.ui.parent.ParentFeesScreen
import com.apex.academy.ui.teacher.TeacherDashboardScreen
import com.apex.academy.ui.teacher.TeacherMarksScreen
import com.apex.academy.ui.teacher.TeacherScheduleScreen

@Composable
fun NavGraph(
    navController: NavHostController,
    startDestination: String = Screen.Login.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onNavigateToDashboard = { role ->
                    val destination = when (role) {
                        "OWNER" -> Screen.OwnerDashboard.route
                        "TEACHER" -> Screen.TeacherDashboard.route
                        "PARENT" -> Screen.ParentDashboard.route
                        else -> Screen.Login.route
                    }
                    navController.navigate(destination) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        // Owner screens
        composable(Screen.OwnerDashboard.route) {
            OwnerDashboardScreen(
                onNavigateToStudents = { navController.navigate(Screen.OwnerStudents.route) },
                onNavigateToFees = { navController.navigate(Screen.OwnerFees.route) },
                onNavigateToTests = { navController.navigate(Screen.OwnerTests.route) },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.OwnerDashboard.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.OwnerStudents.route) {
            OwnerStudentsScreen(onNavigateBack = { navController.popBackStack() })
        }
        composable(Screen.OwnerFees.route) {
            OwnerFeesScreen(onNavigateBack = { navController.popBackStack() })
        }
        composable(Screen.OwnerTests.route) {
            OwnerTestsScreen(onNavigateBack = { navController.popBackStack() })
        }

        // Teacher screens
        composable(Screen.TeacherDashboard.route) {
            TeacherDashboardScreen(
                onNavigateToSchedule = { navController.navigate(Screen.TeacherSchedule.route) },
                onNavigateToMarks = { navController.navigate(Screen.TeacherMarks.route) },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.TeacherDashboard.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.TeacherSchedule.route) {
            TeacherScheduleScreen(onNavigateBack = { navController.popBackStack() })
        }
        composable(Screen.TeacherMarks.route) {
            TeacherMarksScreen(onNavigateBack = { navController.popBackStack() })
        }

        // Parent screens
        composable(Screen.ParentDashboard.route) {
            ParentDashboardScreen(
                onNavigateToFees = { navController.navigate(Screen.ParentFees.route) },
                onNavigateToAcademics = { navController.navigate(Screen.ParentAcademics.route) },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.ParentDashboard.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.ParentFees.route) {
            ParentFeesScreen(onNavigateBack = { navController.popBackStack() })
        }
        composable(Screen.ParentAcademics.route) {
            ParentAcademicsScreen(onNavigateBack = { navController.popBackStack() })
        }
    }
}
