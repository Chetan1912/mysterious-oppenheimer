package com.apex.academy.ui.owner

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.NotificationImportant
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.apex.academy.data.api.ApiClient
import com.apex.academy.data.model.DueRecord
import com.apex.academy.data.model.RecordPaymentRequest
import com.apex.academy.ui.theme.*
import kotlinx.coroutines.launch

class OwnerFeesViewModel : ViewModel() {
    var isLoading by mutableStateOf(false)
    var dueRecords by mutableStateOf<List<DueRecord>>(emptyList())
    var errorMessage by mutableStateOf<String?>(null)

    // Reminder state
    var remindingRecordId by mutableStateOf<String?>(null)

    // Payment Dialog State
    var showPaymentDialog by mutableStateOf(false)
    var selectedDueRecord by mutableStateOf<DueRecord?>(null)
    var amountPaidInput by mutableStateOf("")
    var selectedMethod by mutableStateOf("CASH")
    var paymentNotes by mutableStateOf("")
    var paymentSubmitting by mutableStateOf(false)
    var paymentError by mutableStateOf<String?>(null)

    fun fetchFees() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getFees()
                if (response.isSuccessful) {
                    dueRecords = response.body()?.dueRecords ?: emptyList()
                } else {
                    errorMessage = "Failed to load fee ledger"
                }
            } catch (e: Exception) {
                errorMessage = "Network error"
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }

    fun sendReminder(dueRecordId: String, onComplete: (String) -> Unit) {
        remindingRecordId = dueRecordId
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.sendFeeReminder(mapOf("dueRecordId" to dueRecordId))
                if (response.isSuccessful) {
                    onComplete("Reminder notification sent successfully!")
                    fetchFees() // Refresh count
                } else {
                    onComplete("Failed to send reminder")
                }
            } catch (e: Exception) {
                onComplete("Network error")
            } finally {
                remindingRecordId = null
            }
        }
    }

    fun submitPayment(onComplete: (String) -> Unit) {
        val record = selectedDueRecord ?: return
        val amount = amountPaidInput.toDoubleOrNull()
        if (amount == null || amount <= 0) {
            paymentError = "Please enter a valid positive amount"
            return
        }

        paymentSubmitting = true
        paymentError = null
        viewModelScope.launch {
            try {
                val request = RecordPaymentRequest(
                    dueRecordId = record.id,
                    amountPaid = amount,
                    paymentMethod = selectedMethod,
                    notes = paymentNotes.takeIf { it.isNotBlank() }
                )
                val response = ApiClient.apiService.recordPayment(request)
                if (response.isSuccessful) {
                    showPaymentDialog = false
                    resetPaymentForm()
                    fetchFees()
                    onComplete("Payment of ₹${amount.toInt()} recorded successfully!")
                } else {
                    paymentError = "Failed to record payment"
                }
            } catch (e: Exception) {
                paymentError = "Network error"
            } finally {
                paymentSubmitting = false
            }
        }
    }

    private fun resetPaymentForm() {
        amountPaidInput = ""
        selectedMethod = "CASH"
        paymentNotes = ""
        paymentError = null
        selectedDueRecord = null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OwnerFeesScreen(
    onNavigateBack: () -> Unit,
    viewModel: OwnerFeesViewModel = viewModel()
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        viewModel.fetchFees()
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Fee Ledger & Collection", fontWeight = FontWeight.Bold) },
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
                    Button(onClick = { viewModel.fetchFees() }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
                        Text("Retry")
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(viewModel.dueRecords) { due ->
                        DueRecordCardItem(
                            due = due,
                            isReminding = viewModel.remindingRecordId == due.id,
                            onSendReminder = {
                                viewModel.sendReminder(due.id) { msg ->
                                    coroutineScope.launch { snackbarHostState.showSnackbar(msg) }
                                }
                            },
                            onRecordPayment = {
                                viewModel.selectedDueRecord = due
                                viewModel.amountPaidInput = (due.totalDue - due.paidAmount).toInt().toString()
                                viewModel.showPaymentDialog = true
                            }
                        )
                    }
                }
            }

            // Record Payment Dialog
            if (viewModel.showPaymentDialog) {
                val due = viewModel.selectedDueRecord
                AlertDialog(
                    onDismissRequest = { if (!viewModel.paymentSubmitting) viewModel.showPaymentDialog = false },
                    title = { Text("Record Fee Payment", fontWeight = FontWeight.Bold, color = Secondary) },
                    text = {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (due != null) {
                                Text(
                                    text = "Student: ${due.student.name}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "Pending: ${formatCurrency(due.totalDue - due.paidAmount)}",
                                    color = Danger,
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 13.sp
                                )
                            }

                            if (viewModel.paymentError != null) {
                                Text(text = viewModel.paymentError ?: "", color = Danger, fontSize = 13.sp)
                            }

                            OutlinedTextField(
                                value = viewModel.amountPaidInput,
                                onValueChange = { viewModel.amountPaidInput = it },
                                label = { Text("Amount Paid (₹) *") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !viewModel.paymentSubmitting
                            )

                            // Payment Method Select
                            Text("Payment Method *", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = NeutralSubText)
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                val methods = listOf("CASH", "UPI", "CHEQUE")
                                methods.forEach { method ->
                                    val isSelected = viewModel.selectedMethod == method
                                    FilterChip(
                                        selected = isSelected,
                                        onClick = { viewModel.selectedMethod = method },
                                        label = { Text(method) },
                                        enabled = !viewModel.paymentSubmitting,
                                        modifier = Modifier.weight(1f),
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = PrimaryContainer,
                                            selectedLabelColor = Primary
                                        )
                                    )
                                }
                            }

                            OutlinedTextField(
                                value = viewModel.paymentNotes,
                                onValueChange = { viewModel.paymentNotes = it },
                                label = { Text("Transaction Notes (Optional)") },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !viewModel.paymentSubmitting
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                viewModel.submitPayment { msg ->
                                    coroutineScope.launch { snackbarHostState.showSnackbar(msg) }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Primary),
                            enabled = !viewModel.paymentSubmitting
                        ) {
                            if (viewModel.paymentSubmitting) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            } else {
                                Text("Record")
                            }
                        }
                    },
                    dismissButton = {
                        TextButton(
                            onClick = { viewModel.showPaymentDialog = false },
                            enabled = !viewModel.paymentSubmitting
                        ) {
                            Text("Cancel", color = NeutralSubText)
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun DueRecordCardItem(
    due: DueRecord,
    isReminding: Boolean,
    onSendReminder: () -> Unit,
    onRecordPayment: () -> Unit
) {
    val balance = due.totalDue - due.paidAmount
    val statusColor = when (due.status) {
        "PAID" -> Success
        "PARTIAL" -> Warning
        else -> Danger
    }
    val statusBg = when (due.status) {
        "PAID" -> SuccessBg
        "PARTIAL" -> WarningBg
        else -> DangerBg
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = due.student.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Secondary)
                    Text(
                        text = "Period: ${getMonthName(due.month)} ${due.year}",
                        fontSize = 12.sp,
                        color = NeutralSubText
                    )
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(9999.dp))
                        .background(statusBg)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = due.status,
                        color = statusColor,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp
                    )
                }
            }

            Divider(color = NeutralBorder, thickness = 0.5.dp)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(text = "TOTAL DUE", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = NeutralSubText)
                    Text(text = formatCurrency(due.totalDue), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Secondary)
                }
                Column {
                    Text(text = "PAID", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = NeutralSubText)
                    Text(text = formatCurrency(due.paidAmount), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Success)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "BALANCE", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = NeutralSubText)
                    Text(
                        text = formatCurrency(balance),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (balance > 0) Danger else Secondary
                    )
                }
            }

            if (due.status != "PAID") {
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Send Reminder Button
                    OutlinedButton(
                        onClick = onSendReminder,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(vertical = 4.dp),
                        enabled = !isReminding
                    ) {
                        Icon(
                            imageVector = Icons.Default.NotificationImportant,
                            contentDescription = "Remind",
                            tint = Primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (isReminding) "Sending..." else "Remind (${due.reminderCount})",
                            fontSize = 12.sp,
                            color = Primary
                        )
                    }

                    // Record Payment Button
                    Button(
                        onClick = onRecordPayment,
                        modifier = Modifier.weight(1.2f),
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(vertical = 4.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Payment,
                            contentDescription = "Pay",
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Record Payment", fontSize = 12.sp, color = Color.White)
                    }
                }
            }
        }
    }
}

fun getMonthName(month: Int): String {
    val months = listOf(
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    )
    return if (month in 1..12) months[month - 1] else "N/A"
}
