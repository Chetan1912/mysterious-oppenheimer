package com.apex.academy.ui.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
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
import com.apex.academy.data.model.*
import com.apex.academy.ui.theme.*
import kotlinx.coroutines.launch

class TeacherMarksViewModel : ViewModel() {
    var isLoading by mutableStateOf(false)
    var batches by mutableStateOf<List<Batch>>(emptyList())
    var tests by mutableStateOf<List<Test>>(emptyList())
    var students by mutableStateOf<List<StudentShort>>(emptyList())
    var errorMessage by mutableStateOf<String?>(null)

    var selectedBatchId by mutableStateOf("")
    var selectedTestId by mutableStateOf("")

    // Score sheet state
    var scoresGrid = mutableStateMapOf<String, StudentMarkEntry>()
    var submittingMarks by mutableStateOf(false)

    // Create Test Dialog State
    var showCreateTestDialog by mutableStateOf(false)
    var testTitle by mutableStateOf("")
    var testMaxMarks by mutableStateOf("100")
    var testDate by mutableStateOf("2026-06-29")
    var createTestSubmitting by mutableStateOf(false)
    var createTestError by mutableStateOf<String?>(null)

    fun fetchConfig() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                // Get batches
                val configResponse = ApiClient.apiService.getAdmissionConfig()
                if (configResponse.isSuccessful) {
                    val body = configResponse.body()
                    if (body != null) {
                        val rawBatches = body["batches"] as? List<Map<String, Any>> ?: emptyList()
                        batches = rawBatches.map {
                            Batch(id = it["id"] as String, name = it["name"] as String)
                        }
                        if (batches.isNotEmpty() && selectedBatchId.isEmpty()) {
                            selectedBatchId = batches.first().id
                            fetchMarksConfig(batches.first().id)
                        }
                    }
                }
            } catch (e: Exception) {
                errorMessage = "Network error"
            } finally {
                isLoading = false
            }
        }
    }

    fun fetchMarksConfig(batchId: String) {
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getTeacherMarks(batchId)
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null) {
                        // Parse tests
                        val rawTests = body["tests"] as? List<Map<String, Any>> ?: emptyList()
                        tests = rawTests.map {
                            Test(
                                id = it["id"] as String,
                                title = it["title"] as String,
                                maxMarks = (it["maxMarks"] as Number).toInt(),
                                testDate = it["testDate"] as String,
                                batch = Batch(id = batchId, name = ""),
                                count = null
                            )
                        }

                        // Parse students
                        val rawStudents = body["students"] as? List<Map<String, Any>> ?: emptyList()
                        students = rawStudents.map {
                            StudentShort(
                                id = it["id"] as String,
                                name = it["name"] as String,
                                admissionId = it["admissionId"] as String
                            )
                        }

                        // Clear and populate marks grid
                        scoresGrid.clear()
                        students.forEach { student ->
                            scoresGrid[student.id] = StudentMarkEntry(0.0, "")
                        }

                        if (tests.isNotEmpty()) {
                            selectedTestId = tests.first().id
                        } else {
                            selectedTestId = ""
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun createTest(onSuccess: () -> Unit) {
        val max = testMaxMarks.toIntOrNull()
        if (testTitle.isBlank() || max == null || max <= 0) {
            createTestError = "Please enter valid test details"
            return
        }

        createTestSubmitting = true
        createTestError = null
        viewModelScope.launch {
            try {
                val request = CreateTestRequest(
                    title = testTitle.trim(),
                    maxMarks = max,
                    testDate = testDate,
                    batchId = selectedBatchId
                )
                val response = ApiClient.apiService.createTest(request)
                if (response.isSuccessful) {
                    showCreateTestDialog = false
                    testTitle = ""
                    testMaxMarks = "100"
                    fetchMarksConfig(selectedBatchId)
                    onSuccess()
                } else {
                    createTestError = "Failed to create test"
                }
            } catch (e: Exception) {
                createTestError = "Network error"
            } finally {
                createTestSubmitting = false
            }
        }
    }

    fun submitMarks(onSuccess: () -> Unit, onFailure: (String) -> Unit) {
        val activeTest = tests.find { it.id == selectedTestId } ?: return
        
        // Validate marks
        for ((studentId, entry) in scoresGrid) {
            if (entry.score > activeTest.maxMarks) {
                onFailure("Score cannot exceed maximum marks (${activeTest.maxMarks})")
                return
            }
            if (entry.score < 0) {
                onFailure("Score cannot be negative")
                return
            }
        }

        submittingMarks = true
        viewModelScope.launch {
            try {
                val request = SubmitMarksRequest(
                    testId = selectedTestId,
                    marks = scoresGrid.toMap()
                )
                val response = ApiClient.apiService.submitMarks(request)
                if (response.isSuccessful) {
                    onSuccess()
                } else {
                    onFailure("Failed to submit marks sheet")
                }
            } catch (e: Exception) {
                onFailure("Network error")
            } finally {
                submittingMarks = false
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherMarksScreen(
    onNavigateBack: () -> Unit,
    viewModel: TeacherMarksViewModel = viewModel()
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        viewModel.fetchConfig()
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Student Marks Entry", fontWeight = FontWeight.Bold) },
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
                    Button(onClick = { viewModel.fetchConfig() }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
                        Text("Retry")
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Batch and Test Selection card
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                // Batch Select Dropdown
                                var batchExpanded by remember { mutableStateOf(false) }
                                Box(modifier = Modifier.fillMaxWidth()) {
                                    OutlinedButton(
                                        onClick = { batchExpanded = true },
                                        modifier = Modifier.fillMaxWidth()
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
                                                    viewModel.fetchMarksConfig(batch.id)
                                                    batchExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }

                                // Test Select Dropdown
                                var testExpanded by remember { mutableStateOf(false) }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
Box(modifier = Modifier.weight(1f)) {
                                        OutlinedButton(
                                            onClick = { testExpanded = true },
                                            modifier = Modifier.fillMaxWidth(),
                                            enabled = viewModel.tests.isNotEmpty()
                                        ) {
                                            val activeTest = viewModel.tests.find { it.id == viewModel.selectedTestId }
                                            val activeTestName = if (activeTest != null) "${activeTest.title} (Max: ${activeTest.maxMarks})" else "No tests created"
                                            Text(activeTestName, color = Secondary, maxLines = 1)
                                        }
                                        DropdownMenu(
                                            expanded = testExpanded,
                                            onDismissRequest = { testExpanded = false }
                                        ) {
                                            viewModel.tests.forEach { test ->
                                                DropdownMenuItem(
                                                    text = { Text(test.title) },
                                                    onClick = {
                                                        viewModel.selectedTestId = test.id
                                                        testExpanded = false
                                                    }
                                                )
                                            }
                                        }
                                    }

                                    IconButton(
                                        onClick = { viewModel.showCreateTestDialog = true },
                                        colors = IconButtonDefaults.iconButtonColors(containerColor = PrimaryContainer)
                                    ) {
                                        Icon(imageVector = Icons.Default.Add, contentDescription = "Create Test", tint = Primary)
                                    }
                                }
                            }
                        }
                    }

                    // Marks Sheet Heading
                    if (viewModel.selectedTestId.isNotEmpty()) {
                        val activeTest = viewModel.tests.find { it.id == viewModel.selectedTestId }
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Marks Sheet", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Secondary)
                                Text("Max: ${activeTest?.maxMarks ?: 100} Marks", color = Primary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }

                        // Students Score Grid
                        items(viewModel.students) { student ->
                            val entry = viewModel.scoresGrid[student.id] ?: StudentMarkEntry(0.0, "")
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
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
                                        Column {
                                            Text(student.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Secondary)
                                            Text("ID: ${student.admissionId}", fontSize = 11.sp, color = NeutralSubText)
                                        }

                                        OutlinedTextField(
                                            value = if (entry.score == 0.0) "" else entry.score.toInt().toString(),
                                            onValueChange = {
                                                val score = it.toDoubleOrNull() ?: 0.0
                                                viewModel.scoresGrid[student.id] = entry.copy(score = score)
                                            },
                                            placeholder = { Text("0") },
                                            singleLine = true,
                                            modifier = Modifier.width(80.dp),
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = Primary,
                                                unfocusedBorderColor = NeutralBorder
                                            ),
                                            enabled = !viewModel.submittingMarks
                                        )
                                    }

                                    OutlinedTextField(
                                        value = entry.remarks ?: "",
                                        onValueChange = {
                                            viewModel.scoresGrid[student.id] = entry.copy(remarks = it)
                                        },
                                        placeholder = { Text("Add feedback / remarks") },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = Primary,
                                            unfocusedBorderColor = NeutralBorder
                                        ),
                                        enabled = !viewModel.submittingMarks
                                    )
                                }
                            }
                        }

                        // Submit Button
                        item {
                            Button(
                                onClick = {
                                    viewModel.submitMarks(
                                        onSuccess = {
                                            coroutineScope.launch { snackbarHostState.showSnackbar("Marks sheet submitted successfully!") }
                                        },
                                        onFailure = { err ->
                                            coroutineScope.launch { snackbarHostState.showSnackbar(err) }
                                        }
                                    )
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                enabled = !viewModel.submittingMarks
                            ) {
                                if (viewModel.submittingMarks) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                                } else {
                                    Icon(imageVector = Icons.Default.Check, contentDescription = "Submit")
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Submit Marks Sheet")
                                }
                            }
                        }
                    }
                }
            }

            // Create Test Dialog
            if (viewModel.showCreateTestDialog) {
                AlertDialog(
                    onDismissRequest = { if (!viewModel.createTestSubmitting) viewModel.showCreateTestDialog = false },
                    title = { Text("Create New Test", fontWeight = FontWeight.Bold, color = Secondary) },
                    text = {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (viewModel.createTestError != null) {
                                Text(text = viewModel.createTestError ?: "", color = Danger, fontSize = 13.sp)
                            }

                            OutlinedTextField(
                                value = viewModel.testTitle,
                                onValueChange = { viewModel.testTitle = it },
                                label = { Text("Test Title *") },
                                placeholder = { Text("e.g. Physics Unit Test 1") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !viewModel.createTestSubmitting
                            )

                            OutlinedTextField(
                                value = viewModel.testMaxMarks,
                                onValueChange = { viewModel.testMaxMarks = it },
                                label = { Text("Maximum Marks *") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !viewModel.createTestSubmitting
                            )

                            OutlinedTextField(
                                value = viewModel.testDate,
                                onValueChange = { viewModel.testDate = it },
                                label = { Text("Test Date (YYYY-MM-DD) *") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !viewModel.createTestSubmitting
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                viewModel.createTest {
                                    coroutineScope.launch { snackbarHostState.showSnackbar("Test created successfully!") }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Primary),
                            enabled = !viewModel.createTestSubmitting
                        ) {
                            if (viewModel.createTestSubmitting) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                            } else {
                                Text("Create")
                            }
                        }
                    },
                    dismissButton = {
                        TextButton(
                            onClick = { viewModel.showCreateTestDialog = false },
                            enabled = !viewModel.createTestSubmitting
                        ) {
                            Text("Cancel", color = NeutralSubText)
                        }
                    }
                )
            }
        }
    }
}
