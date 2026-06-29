package com.apex.academy.ui.parent

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
import com.apex.academy.data.model.ParentDashboardResponse
import com.apex.academy.ui.owner.NoticeRowItem
import com.apex.academy.ui.owner.QuickActionCard
import com.apex.academy.ui.teacher.ClassScheduleCard
import com.apex.academy.ui.theme.*
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

class ParentDashboardViewModel : ViewModel() {
    var isLoading by mutableStateOf(false)
    var dashboardData by mutableStateOf<ParentDashboardResponse?>(null)
    var errorMessage by mutableStateOf<String?>(null)

    fun fetchDashboard() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getParentDashboard()
                if (response.isSuccessful) {
                    dashboardData = response.body()
                } else {
                    errorMessage = "Failed to load parent dashboard"
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
fun ParentDashboardScreen(
    onNavigateToFees: () -> Unit,
    onNavigateToAcademics: () -> Unit,
    onLogout: () -> Unit,
    viewModel: ParentDashboardViewModel = viewModel()
) {
    LaunchedEffect(Unit) {
        viewModel.fetchDashboard()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Parent Portal", fontWeight = FontWeight.Bold) },
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
                        // Child profile summary
                        item {
                            val student = data.student
                            if (student != null) {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(44.dp)
                                                .background(PrimaryContainer, RoundedCornerShape(22.dp)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = student.name.first().uppercase(),
                                                color = Primary,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 20.sp
                                            )
                                        }
                                        Column {
                                            Text(text = student.name, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Secondary)
                                            Text(
                                                text = "Batch: ${student.batch?.name ?: "Unassigned"} • ID: ${student.admissionId}",
                                                fontSize = 12.sp,
                                                color = NeutralSubText
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Outstanding Dues Alert
                        if (data.pendingDues > 0) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = DangerBg)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text("PENDING FEES DUE", color = Danger, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
                                            Text(
                                                text = formatCurrency(data.pendingDues),
                                                color = Danger,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 22.sp
                                            )
                                            Text("Please clear outstanding installments.", color = Danger, fontSize = 11.sp)
                                        }
                                        Icon(
                                            imageVector = Icons.Default.Warning,
                                            contentDescription = "Warning",
                                            tint = Danger,
                                            modifier = Modifier.size(32.dp)
                                        )
                                    }
                                }
                            }
                        } else {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = SuccessBg)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text("ALL DUES CLEARED", color = Success, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
                                            Text("₹0.00 Outstanding", color = Success, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                        }
                                        Icon(
                                            imageVector = Icons.Default.CheckCircle,
                                            contentDescription = "Success",
                                            tint = Success,
                                            modifier = Modifier.size(32.dp)
                                        )
                                    }
                                }
                            }
                        }

                        // Navigation Actions
                        item {
                            Text(
                                text = "Parent Services",
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
                                    title = "Fee Ledger",
                                    icon = Icons.Default.AccountBalanceWallet,
                                    onClick = onNavigateToFees,
                                    modifier = Modifier.weight(1f)
                                )
                                QuickActionCard(
                                    title = "Academic Reports",
                                    icon = Icons.Default.Assignment,
                                    onClick = onNavigateToAcademics,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        // Today's classes
                        item {
                            Text(
                                text = "Today's Schedule",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Secondary
                            )
                        }

                        val schedule = data.todaySchedule ?: emptyList()
                        if (schedule.isEmpty()) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                ) {
                                    Text(
                                        text = "No classes scheduled for today.",
                                        color = NeutralSubText,
                                        modifier = Modifier.padding(16.dp),
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        } else {
                            items(schedule) { classItem ->
                                ClassScheduleCard(classItem)
                            }
                        }

                        // Notices Section
                        item {
                            Text(
                                text = "Notice Board",
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

private fun formatCurrency(amount: Double): String {
    val format = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
    return format.format(amount)
}
