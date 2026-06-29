package com.apex.academy.ui.owner

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AssignmentTurnedIn
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
import com.apex.academy.data.model.Mark
import com.apex.academy.data.model.Test
import com.apex.academy.ui.theme.*
import kotlinx.coroutines.launch

class OwnerTestsViewModel : ViewModel() {
    var isLoading by mutableStateOf(false)
    var tests by mutableStateOf<List<Test>>(emptyList())
    var errorMessage by mutableStateOf<String?>(null)

    // Results Dialog State
    var showResultsDialog by mutableStateOf(false)
    var selectedTestName by mutableStateOf("")
    var selectedTestMaxMarks by mutableStateOf(100)
    var testMarksList by mutableStateOf<List<Mark>>(emptyList())
    var resultsLoading by mutableStateOf(false)
    var resultsError by mutableStateOf<String?>(null)

    fun fetchTests() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getTests()
                if (response.isSuccessful) {
                    tests = response.body()?.tests ?: emptyList()
                } else {
                    errorMessage = "Failed to load tests list"
                }
            } catch (e: Exception) {
                errorMessage = "Network error"
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }

    fun viewResults(test: Test) {
        selectedTestName = test.title
        selectedTestMaxMarks = test.maxMarks
        showResultsDialog = true
        resultsLoading = true
        resultsError = null

        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getTestResults(test.id)
                if (response.isSuccessful) {
                    testMarksList = response.body()?.marks ?: emptyList()
                } else {
                    resultsError = "Failed to load student results"
                }
            } catch (e: Exception) {
                resultsError = "Network error"
            } finally {
                resultsLoading = false
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OwnerTestsScreen(
    onNavigateBack: () -> Unit,
    viewModel: OwnerTestsViewModel = viewModel()
) {
    LaunchedEffect(Unit) {
        viewModel.fetchTests()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tests & Exam Oversight", fontWeight = FontWeight.Bold) },
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
                    Button(onClick = { viewModel.fetchTests() }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
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
                    items(viewModel.tests) { test ->
                        TestCardItem(
                            test = test,
                            onViewResults = { viewModel.viewResults(test) }
                        )
                    }
                }
            }

            // Results Dialog
            if (viewModel.showResultsDialog) {
                AlertDialog(
                    onDismissRequest = { viewModel.showResultsDialog = false },
                    title = {
                        Column {
                            Text(text = viewModel.selectedTestName, fontWeight = FontWeight.Bold, color = Secondary, fontSize = 18.sp)
                            Text(text = "Max Marks: ${viewModel.selectedTestMaxMarks}", fontSize = 12.sp, color = NeutralSubText)
                        }
                    },
                    text = {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 350.dp)
                        ) {
                            if (viewModel.resultsLoading) {
                                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center), color = Primary)
                            } else if (viewModel.resultsError != null) {
                                Text(
                                    text = viewModel.resultsError ?: "",
                                    color = Danger,
                                    modifier = Modifier.align(Alignment.Center)
                                )
                            } else if (viewModel.testMarksList.isEmpty()) {
                                Text(
                                    text = "No marks entered yet for this test.",
                                    color = NeutralSubText,
                                    modifier = Modifier.align(Alignment.Center),
                                    fontSize = 14.sp
                                )
                            } else {
                                LazyColumn(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(viewModel.testMarksList) { mark ->
                                        // Find student name from custom mapping or model.
                                        // Note: in TestResultsResponse, the mark structure contains student name details
                                        val scoreVal = mark.score
                                        val percent = ((scoreVal / viewModel.selectedTestMaxMarks) * 100).toInt()
                                        val scoreColor = when {
                                            percent >= 75 -> Success
                                            percent >= 40 -> Warning
                                            else -> Danger
                                        }

                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            colors = CardDefaults.cardColors(containerColor = NeutralLight),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(12.dp),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column(modifier = Modifier.weight(1f)) {
                                                    // Standard mark response contains student name
                                                    Text(
                                                        text = "Student Record",
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 13.sp,
                                                        color = Secondary
                                                    )
                                                    if (!mark.remarks.isNullOrBlank()) {
                                                        Text(
                                                            text = "\"${mark.remarks}\"",
                                                            fontSize = 11.sp,
                                                            color = NeutralSubText,
                                                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                                                        )
                                                    }
                                                }
                                                Column(horizontalAlignment = Alignment.End) {
                                                    Text(
                                                        text = "${scoreVal.toInt()}/${viewModel.selectedTestMaxMarks}",
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 14.sp,
                                                        color = Secondary
                                                    )
                                                    Text(
                                                        text = "$percent%",
                                                        color = scoreColor,
                                                        fontWeight = FontWeight.ExtraBold,
                                                        fontSize = 12.sp
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    confirmButton = {
                        TextButton(onClick = { viewModel.showResultsDialog = false }) {
                            Text("Close", color = Primary, fontWeight = FontWeight.Bold)
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun TestCardItem(
    test: Test,
    onViewResults: () -> Unit
) {
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
                    Text(text = test.title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Secondary)
                    Text(
                        text = "Date: ${test.testDate.take(10)}",
                        fontSize = 12.sp,
                        color = NeutralSubText
                    )
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(PrimaryContainer)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = test.batch.name,
                        color = Primary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
            }

            Divider(color = NeutralBorder, thickness = 0.5.dp)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = "MAX MARKS", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = NeutralSubText)
                    Text(text = "${test.maxMarks} Marks", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Secondary)
                }
                Column {
                    Text(text = "GRADED", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = NeutralSubText)
                    Text(text = "${test.count?.marks ?: 0} Students", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Secondary)
                }

                Button(
                    onClick = onViewResults,
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Icon(
                        imageVector = Icons.Default.AssignmentTurnedIn,
                        contentDescription = "Results",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = "Results", fontSize = 12.sp, color = Color.White)
                }
            }
        }
    }
}
