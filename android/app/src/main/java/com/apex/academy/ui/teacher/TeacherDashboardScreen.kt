package com.apex.academy.ui.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.apex.academy.data.api.ApiClient
import com.apex.academy.data.model.TeacherDashboardResponse
import com.apex.academy.ui.owner.MetricCard
import com.apex.academy.ui.owner.NoticeRowItem
import com.apex.academy.ui.owner.QuickActionCard
import com.apex.academy.ui.theme.*
import kotlinx.coroutines.launch

class TeacherDashboardViewModel : ViewModel() {
    var isLoading by mutableStateOf(false)
    var dashboardData by mutableStateOf<TeacherDashboardResponse?>(null)
    var errorMessage by mutableStateOf<String?>(null)

    fun fetchDashboard() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getTeacherDashboard()
                if (response.isSuccessful) {
                    dashboardData = response.body()
                } else {
                    errorMessage = "Failed to load dashboard metrics"
                }
            } catch (e: Exception) {
                errorMessage = "Network error"
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherDashboardScreen(
    onNavigateToSchedule: () -> Unit,
    onNavigateToMarks: () -> Unit,
    onLogout: () -> Unit,
    viewModel: TeacherDashboardViewModel = viewModel()
) {
    LaunchedEffect(Unit) {
        viewModel.fetchDashboard()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Teacher Portal", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = {
                        viewModel.viewModelScope.launch {
                            try {
                                ApiClient.apiService.logout()
                            } catch (e: Exception) {}
                            onLogout()
                        }
                    }) {
                        Icon(imageVector = Icons.Default.ExitToApp, contentDescription = "Log Out", tint = Danger)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Background)
        ) {
            if (viewModel.isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center), color = Primary)
            } else if (viewModel.errorMessage != null) {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(text = viewModel.errorMessage ?: "", color = Danger)
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(onClick = { viewModel.fetchDashboard() }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
                        Text("Retry")
                    }
                }
            } else {
                val data = viewModel.dashboardData
                if (data != null) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Next Class Banner
                        item {
                            Text(
                                text = "Next Class Schedule",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Secondary
                            )
                        }

                        item {
                            val next = data.nextClass
                            if (next != null) {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = PrimaryContainer)
                                ) {
                                    Column(
                                        modifier = Modifier.padding(16.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = next.batch.name,
                                                fontWeight = FontWeight.ExtraBold,
                                                fontSize = 18.sp,
                                                color = Primary
                                            )
                                            if (next.isExtra) {
                                                Box(
                                                    modifier = Modifier
                                                        .background(WarningBg, RoundedCornerShape(4.dp))
                                                        .padding(horizontal = 8.dp, vertical = 2.dp)
                                                ) {
                                                    Text("EXTRA CLASS", color = Warning, fontWeight = FontWeight.Bold, fontSize = 9.sp)
                                                }
                                            }
                                        }
                                        Text(
                                            text = "Timing: ${next.startTime} - ${next.endTime}",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = Secondary
                                        )
                                        Text(
                                            text = "Date: ${next.date.take(10)}",
                                            fontSize = 12.sp,
                                            color = NeutralSubText
                                        )
                                        if (!next.notes.isNullOrBlank()) {
                                            Text(
                                                text = "Notes: ${next.notes}",
                                                fontSize = 12.sp,
                                                color = Secondary,
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                    }
                                }
                            } else {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                ) {
                                    Text(
                                        text = "No upcoming classes scheduled today.",
                                        color = NeutralSubText,
                                        modifier = Modifier.padding(16.dp),
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        }

                        // Overview metrics
                        item {
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                                MetricCard(
                                    title = "Today's Classes",
                                    value = data.todayScheduleCount.toString(),
                                    icon = Icons.Default.Event,
                                    iconBg = Color(0xFFE0F2FE),
                                    iconTint = Color(0xFF0369A1),
                                    modifier = Modifier.weight(1f)
                                )
                                MetricCard(
                                    title = "Graded Exams",
                                    value = data.gradedTestsCount.toString(),
                                    icon = Icons.Default.DoneAll,
                                    iconBg = SuccessBg,
                                    iconTint = Success,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        // Navigation Actions
                        item {
                            Text(
                                text = "Quick Actions",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Secondary
                            )
                        }

                        item {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                QuickActionCard(
                                    title = "Schedule Planner",
                                    icon = Icons.Default.CalendarToday,
                                    onClick = onNavigateToSchedule,
                                    modifier = Modifier.weight(1f)
                                )
                                QuickActionCard(
                                    title = "Marks Entry",
                                    icon = Icons.Default.EditNote,
                                    onClick = onNavigateToMarks,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        // Notices Section
                        item {
                            Text(
                                text = "Active Notices",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Secondary
                            )
                        }

                        if (data.notices.isEmpty()) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                ) {
                                    Text(
                                        text = "No notices posted yet.",
                                        color = NeutralSubText,
                                        modifier = Modifier.padding(16.dp),
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        } else {
                            items(data.notices) { notice ->
                                NoticeRowItem(notice)
                            }
                        }
                    }
                }
            }
        }
    }
}
