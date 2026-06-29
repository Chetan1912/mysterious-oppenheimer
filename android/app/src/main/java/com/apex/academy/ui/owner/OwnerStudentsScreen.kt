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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.apex.academy.data.api.ApiClient
import com.apex.academy.data.model.AddStudentRequest
import com.apex.academy.data.model.Batch
import com.apex.academy.data.model.FeePlan
import com.apex.academy.data.model.Student
import com.apex.academy.ui.theme.*
import kotlinx.coroutines.launch

class OwnerStudentsViewModel : ViewModel() {
    var isLoading by mutableStateOf(false)
    var students by mutableStateOf<List<Student>>(emptyList())
    var batches by mutableStateOf<List<Batch>>(emptyList())
    var feePlans by mutableStateOf<List<FeePlan>>(emptyList())
    var errorMessage by mutableStateOf<String?>(null)

    // Form State
    var showAdmissionDialog by mutableStateOf(false)
    var formName by mutableStateOf("")
    var formEmail by mutableStateOf("")
    var formPhone by mutableStateOf("")
    var selectedBatchId by mutableStateOf("")
    var selectedFeePlanId by mutableStateOf("")
    var formJoiningDate by mutableStateOf("2026-06-29") // default date

    var formSubmitting by mutableStateOf(false)
    var formError by mutableStateOf<String?>(null)

    fun fetchStudents() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val studentsResponse = ApiClient.apiService.getStudents()
                if (studentsResponse.isSuccessful) {
                    students = studentsResponse.body()?.students ?: emptyList()
                } else {
                    errorMessage = "Failed to load students list"
                }

                // Fetch configuration for admission dropdowns
                val configResponse = ApiClient.apiService.getAdmissionConfig()
                if (configResponse.isSuccessful) {
                    val body = configResponse.body()
                    if (body != null) {
                        // Cast JSON maps from Retrofit response
                        val rawBatches = body["batches"] as? List<Map<String, Any>> ?: emptyList()
                        batches = rawBatches.map {
                            Batch(id = it["id"] as String, name = it["name"] as String)
                        }

                        val rawFeePlans = body["feePlans"] as? List<Map<String, Any>> ?: emptyList()
                        feePlans = rawFeePlans.map {
                            FeePlan(
                                id = it["id"] as String,
                                name = it["name"] as String,
                                amount = (it["amount"] as? Number)?.toDouble() ?: 0.0
                            )
                        }

                        if (batches.isNotEmpty() && selectedBatchId.isEmpty()) {
                            selectedBatchId = batches.first().id
                        }
                        if (feePlans.isNotEmpty() && selectedFeePlanId.isEmpty()) {
                            selectedFeePlanId = feePlans.first().id
                        }
                    }
                }
            } catch (e: Exception) {
                errorMessage = "Network error"
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }

    fun submitAdmission(onSuccess: () -> Unit) {
        if (formName.isBlank() || formEmail.isBlank() || formPhone.isBlank()) {
            formError = "Please fill in all required fields"
            return
        }

        formSubmitting = true
        formError = null
        viewModelScope.launch {
            try {
                val request = AddStudentRequest(
                    name = formName.trim(),
                    email = formEmail.trim().lowercase(),
                    phone = formPhone.trim(),
                    batchId = selectedBatchId,
                    feePlanId = selectedFeePlanId,
                    joiningDate = formJoiningDate
                )
                val response = ApiClient.apiService.admitStudent(request)
                if (response.isSuccessful) {
                    showAdmissionDialog = false
                    resetForm()
                    fetchStudents()
                    onSuccess()
                } else {
                    formError = "Failed to register student"
                }
            } catch (e: Exception) {
                formError = "Network error"
            } finally {
                formSubmitting = false
            }
        }
    }

    private fun resetForm() {
        formName = ""
        formEmail = ""
        formPhone = ""
        formError = null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OwnerStudentsScreen(
    onNavigateBack: () -> Unit,
    viewModel: OwnerStudentsViewModel = viewModel()
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        viewModel.fetchStudents()
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Students Directory", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.showAdmissionDialog = true },
                containerColor = Primary,
                contentColor = Color.White
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = "Admit Student")
            }
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
                    Button(onClick = { viewModel.fetchStudents() }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
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
                    items(viewModel.students) { student ->
                        StudentCardItem(student)
                    }
                }
            }

            // Admission Dialog
            if (viewModel.showAdmissionDialog) {
                AlertDialog(
                    onDismissRequest = { if (!viewModel.formSubmitting) viewModel.showAdmissionDialog = false },
                    title = { Text("Admit New Student", fontWeight = FontWeight.Bold, color = Secondary) },
                    text = {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (viewModel.formError != null) {
                                Text(text = viewModel.formError ?: "", color = Danger, fontSize = 13.sp)
                            }

                            OutlinedTextField(
                                value = viewModel.formName,
                                onValueChange = { viewModel.formName = it },
                                label = { Text("Student Full Name *") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !viewModel.formSubmitting
                            )

                            OutlinedTextField(
                                value = viewModel.formEmail,
                                onValueChange = { viewModel.formEmail = it },
                                label = { Text("Parent Email Address *") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !viewModel.formSubmitting
                            )

                            OutlinedTextField(
                                value = viewModel.formPhone,
                                onValueChange = { viewModel.formPhone = it },
                                label = { Text("Parent Contact Number *") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !viewModel.formSubmitting
                            )

                            // Batch Dropdown (Simple native Spinner replacement)
                            var batchExpanded by remember { mutableStateOf(false) }
                            Box(modifier = Modifier.fillMaxWidth()) {
                                OutlinedButton(
                                    onClick = { batchExpanded = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = !viewModel.formSubmitting
                                ) {
                                    val activeBatchName = viewModel.batches.find { it.id == viewModel.selectedBatchId }?.name ?: "Select Batch"
                                    Text("Batch: $activeBatchName", color = Secondary)
                                }
                                DropdownMenu(
                                    expanded = batchExpanded,
                                    onDismissRequest = { batchExpanded = false }
                                ) {
                                    viewModel.batches.forEach { batch ->
                                        DropdownMenuItem(
                                            text = { Text(batch.name) },
                                            onClick = {
                                                viewModel.selectedBatchId = batch.id
                                                batchExpanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            // Fee Plan Dropdown
                            var feeExpanded by remember { mutableStateOf(false) }
                            Box(modifier = Modifier.fillMaxWidth()) {
                                OutlinedButton(
                                    onClick = { feeExpanded = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = !viewModel.formSubmitting
                                ) {
                                    val activePlanName = viewModel.feePlans.find { it.id == viewModel.selectedFeePlanId }?.name ?: "Select Fee Plan"
                                    Text("Fee Plan: $activePlanName", color = Secondary)
                                }
                                DropdownMenu(
                                    expanded = feeExpanded,
                                    onDismissRequest = { feeExpanded = false }
                                ) {
                                    viewModel.feePlans.forEach { plan ->
                                        DropdownMenuItem(
                                            text = { Text("${plan.name} - ₹${plan.amount}/mo") },
                                            onClick = {
                                                viewModel.selectedFeePlanId = plan.id
                                                feeExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                viewModel.submitAdmission {
                                    coroutineScope.launch {
                                        snackbarHostState.showSnackbar("Student admitted successfully!")
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Primary),
                            enabled = !viewModel.formSubmitting
                        ) {
                            if (viewModel.formSubmitting) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            } else {
                                Text("Submit")
                            }
                        }
                    },
                    dismissButton = {
                        TextButton(
                            onClick = { viewModel.showAdmissionDialog = false },
                            enabled = !viewModel.formSubmitting
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
fun StudentCardItem(student: Student) {
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
                    Text(text = student.name, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Secondary)
                    Text(text = "ID: ${student.admissionId}", fontSize = 11.sp, color = NeutralSubText, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(PrimaryContainer)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = student.batch?.name ?: "Unassigned",
                        color = Primary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
            }

            Divider(color = NeutralBorder, thickness = 0.5.dp)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1.2f)) {
                    Text(text = "PARENT CONTACT", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = NeutralSubText)
                    Text(text = student.parent.user.name, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Secondary)
                    Text(text = student.parent.user.phone ?: "No Phone", fontSize = 12.sp, color = NeutralSubText)
                }
                Column(modifier = Modifier.weight(0.8f)) {
                    Text(text = "FEE PLAN", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = NeutralSubText)
                    Text(text = student.feePlan?.name ?: "No Plan", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Secondary)
                    Text(text = "₹${student.feePlan?.amount?.toInt() ?: 0}/mo", fontSize = 12.sp, color = NeutralSubText)
                }
            }
        }
    }
}
