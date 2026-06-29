"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

interface Batch {
  id: string;
  name: string;
}

interface Test {
  id: string;
  title: string;
  maxMarks: number;
  testDate: string;
}

interface Student {
  id: string;
  name: string;
  admissionId: string;
}

interface MarkInput {
  studentId: string;
  score: string;
  remarks: string;
}

export default function MarksEntry() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Selection state
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");
  
  // Input grid state
  const [marksGrid, setMarksGrid] = useState<Record<string, MarkInput>>({});
  
  // Loading & UI states
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Test creation modal state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [newTestTitle, setNewTestTitle] = useState("");
  const [newTestMaxMarks, setNewTestMaxMarks] = useState("50");
  const [newTestDate, setNewTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [testCreating, setTestCreating] = useState(false);

  useEffect(() => {
    const fetchInitialBatches = async () => {
      try {
        const res = await fetch("/api/teacher/marks");
        if (res.ok) {
          const json = await res.json();
          setBatches(json.batches || []);
          if (json.batches?.length > 0) {
            setSelectedBatchId(json.batches[0].id);
          }
        } else {
          setError("Failed to load batches");
        }
      } catch (err) {
        setError("Network error loading batches");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialBatches();
  }, []);

  // Load tests & students when batch changes
  const fetchBatchConfig = useCallback(async () => {
    if (!selectedBatchId) return;
    setConfigLoading(true);
    setTests([]);
    setStudents([]);
    setSelectedTestId("");
    setMarksGrid({});
    try {
      const res = await fetch(`/api/teacher/marks?batchId=${selectedBatchId}`);
      if (res.ok) {
        const json = await res.json();
        setTests(json.tests || []);
        setStudents(json.students || []);
        
        // Populate marks grid structure
        const initialGrid: Record<string, MarkInput> = {};
        json.students?.forEach((stud: Student) => {
          initialGrid[stud.id] = {
            studentId: stud.id,
            score: "",
            remarks: "",
          };
        });
        setMarksGrid(initialGrid);

        if (json.tests?.length > 0) {
          setSelectedTestId(json.tests[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading batch config:", err);
    } finally {
      setConfigLoading(false);
    }
  }, [selectedBatchId]);

  useEffect(() => {
    fetchBatchConfig();
  }, [fetchBatchConfig]);

  // Load existing marks when test changes
  useEffect(() => {
    if (!selectedTestId) return;

    const fetchTestMarks = async () => {
      try {
        const res = await fetch(`/api/teacher/marks?batchId=${selectedBatchId}&testId=${selectedTestId}`);
        if (res.ok) {
          const json = await res.json();
          const existing = json.existingMarks || [];
          
          // Update grid with existing marks
          setMarksGrid((prev) => {
            const updated = { ...prev };
            // Reset scores first
            Object.keys(updated).forEach((key) => {
              updated[key] = { ...updated[key], score: "", remarks: "" };
            });
            // Populate existing
            existing.forEach((m: { studentId: string; score: number | string; remarks?: string | null }) => {
              if (updated[m.studentId]) {
                updated[m.studentId] = {
                  studentId: m.studentId,
                  score: String(m.score),
                  remarks: m.remarks || "",
                };
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.error("Error loading marks:", err);
      }
    };

    fetchTestMarks();
  }, [selectedTestId, selectedBatchId]);

  const handleScoreChange = (studentId: string, value: string) => {
    const activeTest = tests.find((t) => t.id === selectedTestId);
    const max = activeTest ? activeTest.maxMarks : 100;
    
    // Validate score is not greater than max marks
    const valNum = Number(value);
    if (value !== "" && (isNaN(valNum) || valNum < 0 || valNum > max)) {
      return; // Prevent input
    }

    setMarksGrid((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: value,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, value: string) => {
    setMarksGrid((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: value,
      },
    }));
  };

  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId) return;

    setSaving(true);
    const marksList = Object.values(marksGrid).filter((m) => m.score !== "");

    try {
      const res = await fetch("/api/teacher/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: selectedTestId,
          marksList,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        alert("Marks saved and parents notified successfully!");
      } else {
        alert(json.error || "Failed to save marks");
      }
    } catch (err) {
      alert("Network error saving marks");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !newTestTitle || !newTestMaxMarks) return;

    setTestCreating(true);
    try {
      const res = await fetch("/api/teacher/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatchId,
          title: newTestTitle,
          maxMarks: newTestMaxMarks,
          testDate: newTestDate,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        alert("Test created successfully!");
        setIsTestModalOpen(false);
        setNewTestTitle("");
        
        // Refresh batch configurations
        await fetchBatchConfig();
      } else {
        alert(json.error || "Failed to create test");
      }
    } catch (err) {
      alert("Network error creating test");
    } finally {
      setTestCreating(false);
    }
  };

  const activeTest = tests.find((t) => t.id === selectedTestId);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading classes configuration...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={`${styles.header} flex justify-between align-center`}>
        <div>
          <h2>Student Marks Entry</h2>
          <p className={styles.subtitle}>Create academic tests and record student marks. Parents will receive immediate updates.</p>
        </div>
        {selectedBatchId && (
          <button className="btn btn-primary" onClick={() => setIsTestModalOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create New Test</span>
          </button>
        )}
      </div>

      {/* Batch and Test Selection */}
      <div className="card">
        <div className={styles.selectionGrid}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Batch</label>
            <select
              className="form-control"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
            >
              {batches.length === 0 ? (
                <option value="">No batches assigned</option>
              ) : (
                batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Test</label>
            <select
              className="form-control"
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              disabled={configLoading || tests.length === 0}
            >
              {tests.length === 0 ? (
                <option value="">No tests created yet for this batch</option>
              ) : (
                tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} (Max: {t.maxMarks} - {new Date(t.testDate).toLocaleDateString()})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Marks Entry Sheet */}
      {configLoading ? (
        <div className={styles.loading}>
          <div className="spinner"></div>
          <p>Loading students list...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--neutral-500)" }}>
            {!selectedBatchId ? "Please select a batch." : "No students enrolled in this batch."}
          </p>
        </div>
      ) : !selectedTestId ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--neutral-500)" }}>
            Please create a test first to enter marks.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSaveMarks} className="card">
          <div className="flex justify-between align-center" style={{ marginBottom: "1.5rem" }}>
            <h3>Marks Sheet: {activeTest?.title}</h3>
            <span className={styles.maxMarksBadge}>Maximum Marks: {activeTest?.maxMarks}</span>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>Student Name</th>
                  <th style={{ width: "20%" }}>Admission ID</th>
                  <th style={{ width: "20%" }}>Score obtained</th>
                  <th style={{ width: "25%" }}>Remarks / Feedback</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td><strong>{student.name}</strong></td>
                    <td><span className={styles.admissionId}>{student.admissionId}</span></td>
                    <td>
                      <div className="flex align-center gap-2">
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: "90px", textAlign: "center", fontWeight: "bold" }}
                          placeholder="0"
                          value={marksGrid[student.id]?.score || ""}
                          onChange={(e) => handleScoreChange(student.id, e.target.value)}
                          max={activeTest?.maxMarks}
                          min={0}
                          disabled={saving}
                        />
                        <span style={{ color: "var(--neutral-400)", fontSize: "0.875rem" }}>
                          / {activeTest?.maxMarks}
                        </span>
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Good effort, weak in trigonometry"
                        value={marksGrid[student.id]?.remarks || ""}
                        onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                        disabled={saving}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end" style={{ marginTop: "2rem" }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving scores..." : "Publish Marks to Parents"}
            </button>
          </div>
        </form>
      )}

      {/* Create Test Modal */}
      {isTestModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} card fade-in`}>
            <div className="flex justify-between align-center" style={{ marginBottom: "1.5rem" }}>
              <h3>Create New Test / Exam</h3>
              <button className={styles.closeBtn} onClick={() => setIsTestModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateTest}>
              <div className="form-group">
                <label className="form-label">Test Title *</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="e.g., Trigonometry Quiz, Calculus Midterm"
                  value={newTestTitle}
                  onChange={(e) => setNewTestTitle(e.target.value)}
                  required
                  disabled={testCreating}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Max Marks *</label>
                  <input
                    className="form-control"
                    type="number"
                    value={newTestMaxMarks}
                    onChange={(e) => setNewTestMaxMarks(e.target.value)}
                    min={1}
                    required
                    disabled={testCreating}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Test Date *</label>
                  <input
                    className="form-control"
                    type="date"
                    value={newTestDate}
                    onChange={(e) => setNewTestDate(e.target.value)}
                    required
                    disabled={testCreating}
                  />
                </div>
              </div>

              <div className="flex gap-4 justify-end" style={{ marginTop: "2rem" }}>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  disabled={testCreating}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={testCreating}>
                  {testCreating ? "Creating..." : "Create Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
