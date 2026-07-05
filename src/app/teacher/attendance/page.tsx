"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

interface BatchOpt {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  admissionId: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  remarks: string | null;
}

interface RosterState {
  [studentId: string]: {
    status: "PRESENT" | "ABSENT" | "LATE";
    remarks: string;
  };
}

export default function TeacherAttendancePage() {
  const [batches, setBatches] = useState<BatchOpt[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Selectors for date and month
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  // Active view tab: "mark" or "monthly"
  const [activeTab, setActiveTab] = useState<"mark" | "monthly">("mark");

  // Roster attendance states to modify
  const [roster, setRoster] = useState<RosterState>({});

  const fetchInitialBatches = async () => {
    try {
      const res = await fetch("/api/teacher/attendance");
      if (res.ok) {
        const json = await res.json();
        setBatches(json.batches || []);
        if (json.batches?.length > 0) {
          setSelectedBatchId(json.batches[0].id);
        }
      } else {
        setError("Failed to load classes configuration");
      }
    } catch (err) {
      setError("Network error loading page");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialBatches();
  }, []);

  const fetchBatchAttendance = useCallback(async () => {
    if (!selectedBatchId) return;
    setDataLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(
        `/api/teacher/attendance?batchId=${selectedBatchId}&month=${selectedMonth}&year=${selectedYear}`
      );
      if (res.ok) {
        const json = await res.json();
        setStudents(json.students || []);
        setAttendance(json.attendance || []);

        // Initialize roster state for the selected date
        const initialRoster: RosterState = {};
        json.students.forEach((student: Student) => {
          // Check if there is an existing record for this date
          const existing = (json.attendance || []).find((record: AttendanceRecord) => {
            const recordDateOnly = new Date(record.date).toISOString().split("T")[0];
            return record.studentId === student.id && recordDateOnly === selectedDate;
          });

          initialRoster[student.id] = {
            status: existing ? existing.status : "PRESENT",
            remarks: existing?.remarks || "",
          };
        });
        setRoster(initialRoster);
      } else {
        setError("Failed to fetch students roster and attendance data");
      }
    } catch (err) {
      setError("Network error loading attendance logs");
    } finally {
      setDataLoading(false);
    }
  }, [selectedBatchId, selectedMonth, selectedYear, selectedDate]);

  useEffect(() => {
    fetchBatchAttendance();
  }, [selectedBatchId, selectedMonth, selectedYear, fetchBatchAttendance]);

  // Sync roster status if selectedDate changes
  useEffect(() => {
    const updatedRoster: RosterState = {};
    students.forEach((student) => {
      const existing = (attendance || []).find((record) => {
        const recordDateOnly = new Date(record.date).toISOString().split("T")[0];
        return record.studentId === student.id && recordDateOnly === selectedDate;
      });

      updatedRoster[student.id] = {
        status: existing ? existing.status : "PRESENT",
        remarks: existing?.remarks || "",
      };
    });
    setRoster(updatedRoster);
  }, [selectedDate, students, attendance]);

  const handleStatusChange = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE") => {
    setRoster((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRoster((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || students.length === 0) return;

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    const attendanceData = Object.entries(roster).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      remarks: data.remarks,
    }));

    try {
      const res = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatchId,
          date: selectedDate,
          attendanceData,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Attendance for ${new Date(selectedDate).toLocaleDateString()} saved successfully!`);
        // Refresh grid
        fetchBatchAttendance();
      } else {
        setError(json.error || "Failed to submit attendance records");
      }
    } catch (err) {
      setError("Network error saving attendance sheet");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to count days in a month
  const getDaysInMonth = (monthStr: string, yearStr: string) => {
    return new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
  };

  const daysCount = getDaysInMonth(selectedMonth, selectedYear);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading attendance configuration...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div>
        <h2>Attendance Management</h2>
        <p className={styles.subtitle}>Track daily attendance and view monthly classroom summaries.</p>
      </div>

      {/* Messages */}
      {error && <div className="error" style={{ marginBottom: "1.5rem" }}>{error}</div>}
      {successMsg && <div className="success" style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--success-bg)", color: "var(--success)" }}>{successMsg}</div>}

      {/* Configuration Header Controls */}
      <div className={`${styles.controlsRow} card`}>
        <div className="form-group">
          <label className="form-label">Select Class / Batch</label>
          <select
            className="form-control"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            disabled={submitting}
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Select Month</label>
          <select
            className="form-control"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={submitting}
          >
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Select Year</label>
          <select
            className="form-control"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={submitting}
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === "mark" ? styles.tabBtnActive : ""}`}
          onClick={() => {
            setActiveTab("mark");
            setError("");
            setSuccessMsg("");
          }}
        >
          Daily Attendance Sheet
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "monthly" ? styles.tabBtnActive : ""}`}
          onClick={() => {
            setActiveTab("monthly");
            setError("");
            setSuccessMsg("");
          }}
        >
          Monthly Summary Matrix
        </button>
      </div>

      {/* Data loader loader */}
      {dataLoading ? (
        <div className={styles.loading}>
          <div className="spinner"></div>
          <p>Fetching class records...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--neutral-500)" }}>No students registered in this batch.</p>
        </div>
      ) : activeTab === "mark" ? (
        /* Mark Daily Attendance Form */
        <div className="card">
          <div className={styles.sheetHeader}>
            <h3>Mark Attendance</h3>
            <div className="form-group" style={{ margin: 0, minWidth: "180px" }}>
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.attendanceForm} style={{ marginTop: "1.5rem" }}>
            <div className={styles.rosterContainer}>
              <div className={styles.rosterHeader}>
                <div>Student Name</div>
                <div style={{ textAlign: "center" }}>Status Selection</div>
                <div>Remarks / Notes</div>
              </div>

              {students.map((student) => {
                const sRoster = roster[student.id] || { status: "PRESENT", remarks: "" };
                return (
                  <div key={student.id} className={styles.rosterRow}>
                    <div className={styles.rosterStudentInfo}>
                      <span className={styles.rosterName}>{student.name}</span>
                      <span className={styles.rosterId}>{student.admissionId}</span>
                    </div>

                    <div className={styles.statusButtonsGroup}>
                      <button
                        type="button"
                        className={`${styles.statusBtn} ${styles.btnPresent} ${sRoster.status === "PRESENT" ? styles.activePresent : ""}`}
                        onClick={() => handleStatusChange(student.id, "PRESENT")}
                        disabled={submitting}
                      >
                        P
                      </button>
                      <button
                        type="button"
                        className={`${styles.statusBtn} ${styles.btnLate} ${sRoster.status === "LATE" ? styles.activeLate : ""}`}
                        onClick={() => handleStatusChange(student.id, "LATE")}
                        disabled={submitting}
                      >
                        L
                      </button>
                      <button
                        type="button"
                        className={`${styles.statusBtn} ${styles.btnAbsent} ${sRoster.status === "ABSENT" ? styles.activeAbsent : ""}`}
                        onClick={() => handleStatusChange(student.id, "ABSENT")}
                        disabled={submitting}
                      >
                        A
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. medical leave"
                        value={sRoster.remarks}
                        onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                        disabled={submitting}
                        style={{ fontSize: "0.875rem", padding: "0.375rem 0.75rem" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.formActions}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting Attendance..." : "Save Daily Attendance"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Monthly Attendance Matrix */
        <div className="card">
          <div className="flex justify-between align-center" style={{ marginBottom: "1.5rem" }}>
            <h3>Monthly Roster Log ({selectedMonth}/{selectedYear})</h3>
            <div className={styles.legend}>
              <span className={styles.legendItem}><span className={`${styles.matrixDot} ${styles.dotPresent}`}>P</span> Present</span>
              <span className={styles.legendItem}><span className={`${styles.matrixDot} ${styles.dotLate}`}>L</span> Late</span>
              <span className={styles.legendItem}><span className={`${styles.matrixDot} ${styles.dotAbsent}`}>A</span> Absent</span>
            </div>
          </div>

          <div className={styles.matrixWrapper}>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th className={styles.matrixNameCol}>Student Full Name</th>
                  {daysArray.map((day) => (
                    <th key={day} className={styles.matrixDayCol}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className={styles.matrixNameCol}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{student.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--neutral-400)" }}>{student.admissionId}</div>
                      </div>
                    </td>
                    {daysArray.map((day) => {
                      // Find attendance for this student on this day
                      const record = attendance.find((r) => {
                        const recDate = new Date(r.date);
                        return (
                          r.studentId === student.id &&
                          recDate.getUTCDate() === day &&
                          recDate.getUTCMonth() + 1 === parseInt(selectedMonth, 10) &&
                          recDate.getUTCFullYear() === parseInt(selectedYear, 10)
                        );
                      });

                      let dotClass = "";
                      let label = "—";

                      if (record) {
                        if (record.status === "PRESENT") {
                          dotClass = styles.dotPresent;
                          label = "P";
                        } else if (record.status === "LATE") {
                          dotClass = styles.dotLate;
                          label = "L";
                        } else if (record.status === "ABSENT") {
                          dotClass = styles.dotAbsent;
                          label = "A";
                        }
                      }

                      return (
                        <td key={day} className={styles.matrixDayCol}>
                          {record ? (
                            <span className={`${styles.matrixDot} ${dotClass}`} title={record.remarks || undefined}>
                              {label}
                            </span>
                          ) : (
                            <span className={styles.matrixEmpty}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
