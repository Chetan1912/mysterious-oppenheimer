package com.apex.academy.ui.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
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
import com.apex.academy.data.model.Batch
import com.apex.academy.data.model.ClassSchedule
import com.apex.academy.data.model.CreateScheduleRequest
import com.apex.academy.ui.theme.*
import kotlinx.coroutines.launch

class TeacherScheduleViewModel : ViewModel() {
    var isLoading by mutableStateOf(false)
    var classes by mutableStateOf<List<ClassSchedule>>(emptyList())
    var batches by mutableStateOf<List<Batch>>(emptyList())
    var errorMessage by mutableStateOf<String?>(null)

    // Form state
    var showAddDialog by mutableStateOf(false)
    var selectedBatchId by mutableStateOf("")
    var formDate by mutableStateOf("2026-06-29")
    var formStartTime by mutableStateOf("10:00 AM")
    var formEndTime by mutableStateOf("11:30 AM")
    var formIsExtra by mutableStateOf(false)
    var formNotes by mutableStateOf("")
    
    var formSubmitting by mutableStateOf(false)
    var formError by mutableStateOf<String?>(null)

    fun fetchSchedule() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getTeacherSchedule()
                if (response.isSuccessful) {
                    classes = response.body()?.classes ?: emptyList()
                } else {
                    errorMessage = "Failed to load schedule"
                }

                // Fetch batches for dropdown
                val admissionConfig = ApiClient.apiService.getAdmissionConfig()
                if (admissionConfig.isSuccessful) {
                    val body = admissionConfig.body()
                    if (body != null) {
                        val rawBatches = body["batches"] as? List<Map<String, Any>> ?: emptyList()
                        batches = rawBatches.map {
                            Batch(id = it["id"] as String, name = it["name"] as String)
                        }
                        if (batches.isNotEmpty() && selectedBatchId.isEmpty()) {
                            selectedBatchId = batches.first().id
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

    fun submitSchedule(onSuccess: () -> Unit) {
        if (selectedBatchId.isEmpty() || formDate.isBlank() || formStartTime.isBlank() || formEndTime.isBlank()) {
            formError = "Please fill in all required fields"
            return
        }

        formSubmitting = true
        formError = null
        viewModelScope.launch {
            try {
                val request = CreateScheduleRequest(
                    batchId = selectedBatchId,
                    date = formDate,
                    startTime = formStartTime.trim(),
                    endTime = formEndTime.trim(),
                    isExtra = formIsExtra,
                    isCancelled = false,
                    notes = formNotes.takeIf { it.isNotBlank() }
                )
                val response = ApiClient.apiService.createSchedule(request)
                if (response.isSuccessful) {
                    showAddDialog = false
                    resetForm()
                    fetchSchedule()
                    onSuccess()
                } else {
                    formError = "Failed to create schedule"
                }
            } catch (e: Exception) {
                formError = "Network error"
            } finally {
                formSubmitting = false
            }
        }
    }

    private fun resetForm() {
        formStartTime = "10:00 AM"
        formEndTime = "11:30 AM"
        formIsExtra = false
        formNotes = ""
        formError = null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherScheduleScreen(
    onNavigateBack: () -> Unit,
    viewModel: TeacherScheduleViewModel = viewModel()
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        viewModel.fetchSchedule()
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Schedule Planner", fontWeight = FontWeight.Bold) },
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
                onClick = { viewModel.showAddDialog = true },
                containerColor = Primary,
                contentColor = Color.White
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = "Add Class")
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
                    Button(onClick = { viewModel.fetchSchedule() }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
                        Text("Retry")
                    }
                }
            } else {
                if (viewModel.classes.isEmpty()) {
                    Text(
                        text = "No classes scheduled yet.",
                        color = NeutralSubText,
                        modifier = Modifier.align(Alignment.Center),
                        fontSize = 14.sp
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(viewModel.classes) { classItem ->
                            ClassScheduleCard(classItem)
                        }
                    }
                }
            }

            // Add Class Dialog
            if (viewModel.showAddDialog) {
                AlertDialog(
                    onDismissRequest = { if (!viewModel.formSubmitting) viewModel.showAddDialog = false },
                    title = { Text("Schedule Class", fontWeight = FontWeight.Bold, color = Secondary) },
                    text = {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (viewModel.formError != null) {
                                Text(text = viewModel.formError ?: "", color = Danger, fontSize = 13.sp)
                            }

                            // Batch Selector Dropdown
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

                            OutlinedTextField(
                                value = viewModel.formDate,
                                onValueChange = { viewModel.formDate = it },
                                label = { Text("Date (YYYY-MM-DD) *") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !viewModel.formSubmitting
                            )

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = viewModel.formStartTime,
                                    onValueChange = { viewModel.formStartTime = it },
                                    label = { Text("Start Time *") },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f),
                                    enabled = !viewModel.formSubmitting
                                )

                                OutlinedTextField(
                                    value = viewModel.formEndTime,
                                    onValueChange = { viewModel.formEndTime = it },
                                    label = { Text("End Time *") },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f),
                                    enabled = !viewModel.formSubmitting
                                )
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Is Extra Class?", fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                Switch(
                                    checked = viewModel.formIsExtra,
                                    onCheckedChange = { viewModel.formIsExtra = it },
                                    enabled = !viewModel.formSubmitting
                                )
                            }

                            OutlinedTextField(
                                value = viewModel.formNotes,
                                onValueChange = { viewModel.formNotes = it },
                                label = { Text("Lesson Notes (Optional)") },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !viewModel.formSubmitting
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                viewModel.submitSchedule {
                                    coroutineScope.launch {
                                        snackbarHostState.showSnackbar("Class scheduled successfully!")
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Primary),
                            enabled = !viewModel.formSubmitting
                        ) {
                            if (viewModel.formSubmitting) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            } else {
                                Text("Schedule")
                            }
                        }
                    },
                    dismissButton = {
                        TextButton(
                            onClick = { viewModel.showAddDialog = false },
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
fun ClassScheduleCard(classItem: ClassSchedule) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (classItem.isCancelled) Color(0xFFF1F5F9) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (classItem.isCancelled) Color.LightGray else PrimaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.CalendarMonth,
                    contentDescription = "Class",
                    tint = if (classItem.isCancelled) Color.DarkGray else Primary
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = classItem.batch.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = if (classItem.isCancelled) NeutralSubText else Secondary
                    )
                    
                    if (classItem.isCancelled) {
                        Box(
                            modifier = Modifier
                                .background(DangerBg, RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text("CANCELLED", color = Danger, fontWeight = FontWeight.Bold, fontSize = 8.sp)
                        }
                    } else if (classItem.isExtra) {
                        Box(
                            modifier = Modifier
                                .background(WarningBg, RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text("EXTRA", color = Warning, fontWeight = FontWeight.Bold, fontSize = 8.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "${classItem.startTime} - ${classItem.endTime}",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    color = Secondary
                )

                Text(
                    text = "Date: ${classItem.date.take(10)}",
                    fontSize = 11.sp,
                    color = NeutralSubText
                )

                if (!classItem.notes.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Notes: ${classItem.notes}",
                        fontSize = 12.sp,
                        color = Secondary,
                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                    )
                }
            }
        }
    }
}
