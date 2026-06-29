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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.apex.academy.data.api.ApiClient
import com.apex.academy.data.model.Mark
import com.apex.academy.ui.theme.*
import kotlinx.coroutines.launch

class ParentAcademicsViewModel : ViewModel() {
    var isLoading by mutableStateOf(false)
    var marks by mutableStateOf<List<Mark>>(emptyList())
    var errorMessage by mutableStateOf<String?>(null)

    fun fetchReports() {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getParentReports()
                if (response.isSuccessful) {
                    marks = response.body() ?: emptyList()
                } else {
                    errorMessage = "Failed to load academic reports"
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
fun ParentAcademicsScreen(
    onNavigateBack: () -> Unit,
    viewModel: ParentAcademicsViewModel = viewModel()
) {
    LaunchedEffect(Unit) {
        viewModel.fetchReports()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Academic Reports", fontWeight = FontWeight.Bold) },
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
                    Button(onClick = { viewModel.fetchReports() }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
                        Text("Retry")
                    }
                }
            } else {
                if (viewModel.marks.isEmpty()) {
                    Text(
                        text = "No academic test records found.",
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
                        items(viewModel.marks) { mark ->
                            ParentMarkCardItem(mark)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ParentMarkCardItem(mark: Mark) {
    val percent = ((mark.score / mark.test.maxMarks) * 100).toInt()
    val scoreColor = when {
        percent >= 75 -> Success
        percent >= 40 -> Warning
        else -> Danger
    }
    val scoreBg = when {
        percent >= 75 -> SuccessBg
        percent >= 40 -> WarningBg
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
                    Text(text = mark.test.title, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Secondary)
                    Text(
                        text = "Date: ${mark.test.testDate.take(10)}",
                        fontSize = 12.sp,
                        color = NeutralSubText
                    )
                }
                Box(
                    modifier = Modifier
                        .background(scoreBg, RoundedCornerShape(9999.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "$percent%",
                        color = scoreColor,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
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
                    Text(text = "SCORE OBTAINED", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = NeutralSubText)
                    Text(
                        text = "${mark.score.toInt()} / ${mark.test.maxMarks} Marks",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Secondary
                    )
                }
            }

            if (!mark.remarks.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(2.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = NeutralLight),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Text(text = "TEACHER REMARKS", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = NeutralSubText)
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "\"${mark.remarks}\"",
                            fontSize = 12.sp,
                            color = Secondary,
                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                        )
                    }
                }
            }
        }
    }
}
