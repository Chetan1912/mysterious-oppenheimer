package com.apex.academy.ui.owner

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.apex.academy.data.api.ApiClient
import com.apex.academy.data.model.Notice
import com.apex.academy.data.model.OwnerDashboardResponse
import com.apex.academy.data.model.PaymentWithStudent
import com.apex.academy.ui.theme.*
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

class OwnerDashboardViewModel : ViewModel() {
    var isLoading by mutableStateOf(false)
    var dashboardData by mutableStateOf<OwnerDashboardResponse?>(null)
    var errorMessage by mutableStateOf<String?>(null)

    fun fetchDashboard() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getOwnerDashboard()
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
fun OwnerDashboardScreen(
    onNavigateToStudents: () -> Unit,
    onNavigateToFees: () -> Unit,
    onNavigateToTests: () -> Unit,
    onLogout: () -> Unit,
    viewModel: OwnerDashboardViewModel = viewModel()
) {
    LaunchedEffect(Unit) {
        viewModel.fetchDashboard()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Apex Owner Portal", fontWeight = FontWeight.Bold) },
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
                        // Spacing
                        item {
                            Text(
                                text = "Overview Metrics",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Secondary
                            )
                        }

                        // Metrics Grid
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                                    MetricCard(
                                        title = "Students",
                                        value = data.metrics.totalStudents.toString(),
                                        icon = Icons.Default.People,
                                        iconBg = PrimaryContainer,
                                        iconTint = Primary,
                                        modifier = Modifier.weight(1f)
                                    )
                                    MetricCard(
                                        title = "Batches",
                                        value = data.metrics.activeBatches.toString(),
                                        icon = Icons.Default.Class,
                                        iconBg = Color(0xFFE0F2FE),
                                        iconTint = Color(0xFF0369A1),
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                                    MetricCard(
                                        title = "Revenue",
                                        value = formatCurrency(data.metrics.totalRevenue),
                                        icon = Icons.Default.MonetizationOn,
                                        iconBg = SuccessBg,
                                        iconTint = Success,
                                        modifier = Modifier.weight(1f)
                                    )
                                    MetricCard(
                                        title = "Dues",
                                        value = formatCurrency(data.metrics.pendingDues),
                                        icon = Icons.Default.AccessTime,
                                        iconBg = DangerBg,
                                        iconTint = Danger,
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }

                        // Quick Navigation Actions
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
                                    title = "Students",
                                    icon = Icons.Default.Group,
                                    onClick = onNavigateToStudents,
                                    modifier = Modifier.weight(1f)
                                )
                                QuickActionCard(
                                    title = "Fees & Ledger",
                                    icon = Icons.Default.AccountBalanceWallet,
                                    onClick = onNavigateToFees,
                                    modifier = Modifier.weight(1f)
                                )
                                QuickActionCard(
                                    title = "Tests",
                                    icon = Icons.Default.Assignment,
                                    onClick = onNavigateToTests,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        // Recent Payments Section
                        item {
                            Text(
                                text = "Recent Fee Payments",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Secondary
                            )
                        }

                        if (data.recentPayments.isEmpty()) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                ) {
                                    Text(
                                        text = "No recent payments recorded.",
                                        color = NeutralSubText,
                                        modifier = Modifier.padding(16.dp),
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        } else {
                            items(data.recentPayments) { payment ->
                                PaymentRowItem(payment)
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

@Composable
fun MetricCard(
    title: String,
    value: String,
    icon: ImageVector,
    iconBg: Color,
    iconTint: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
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
                    .clip(CircleShape)
                    .background(iconBg),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = title, tint = iconTint)
            }
            Column {
                Text(text = title.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = NeutralSubText)
                Text(text = value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Secondary)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickActionCard(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(imageVector = icon, contentDescription = title, tint = Primary, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = title, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Secondary)
        }
    }
}

@Composable
fun PaymentRowItem(payment: PaymentWithStudent) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = payment.studentName, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Secondary)
                Text(
                    text = "Ref: ${payment.month}/${payment.year} • ${payment.paymentMethod}",
                    fontSize = 12.sp,
                    color = NeutralSubText
                )
            }
            Text(
                text = "+${formatCurrency(payment.amountPaid)}",
                color = Success,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
        }
    }
}

@Composable
fun NoticeRowItem(notice: Notice) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(text = notice.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Secondary)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = notice.message, fontSize = 13.sp, color = NeutralSubText, lineHeight = 18.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Target: ${notice.targetRole.lowercase().capitalize()} • ${notice.createdAt.take(10)}",
                fontSize = 11.sp,
                color = NeutralSubText,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

fun formatCurrency(amount: Double): String {
    val format = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
    return format.format(amount)
}
