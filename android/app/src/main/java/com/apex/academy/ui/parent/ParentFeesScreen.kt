package com.apex.academy.ui.parent

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.apex.academy.ui.owner.DueRecordCardItem
import com.apex.academy.ui.owner.PaymentRowItem
import com.apex.academy.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParentFeesScreen(
    onNavigateBack: () -> Unit,
    viewModel: ParentDashboardViewModel = viewModel()
) {
    LaunchedEffect(Unit) {
        viewModel.fetchDashboard()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Fee Ledger", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
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
                val student = viewModel.dashboardData?.student
                if (student != null) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Monthly Dues Heading
                        item {
                            Text(
                                text = "Monthly Dues",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Secondary
                            )
                        }

                        val dues = student.dueRecords ?: emptyList()
                        if (dues.isEmpty()) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                ) {
                                    Text(
                                        text = "No fee installments created.",
                                        color = NeutralSubText,
                                        modifier = Modifier.padding(16.dp),
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        } else {
                            items(dues) { due ->
                                DueRecordCardItem(
                                    due = due,
                                    isReminding = false,
                                    onSendReminder = {},
                                    onRecordPayment = {}
                                )
                            }
                        }

                        // Payments History Heading
                        item {
                            Text(
                                text = "Recent Transactions",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Secondary
                            )
                        }

                        val payments = student.payments ?: emptyList()
                        if (payments.isEmpty()) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                ) {
                                    Text(
                                        text = "No payments recorded yet.",
                                        color = NeutralSubText,
                                        modifier = Modifier.padding(16.dp),
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        } else {
                            items(payments) { payment ->
                                // Adapt Payment structure to PaymentWithStudent UI row
                                val mappedPayment = com.apex.academy.data.model.PaymentWithStudent(
                                    id = payment.id,
                                    amountPaid = payment.amountPaid,
                                    paymentDate = payment.paymentDate,
                                    paymentMethod = payment.paymentMethod,
                                    notes = payment.notes,
                                    studentName = student.name,
                                    studentId = student.admissionId,
                                    month = 0,
                                    year = 0
                                )
                                PaymentRowItem(mappedPayment)
                            }
                        }
                    }
                }
            }
        }
    }
}
