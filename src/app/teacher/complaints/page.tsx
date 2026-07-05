"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

interface BatchOpt {
  id: string;
  name: string;
}

interface StudentOpt {
  id: string;
  name: string;
  admissionId: string;
}

interface Complaint {
  id: string;
  studentId: string;
  studentName: string;
  batchName: string;
  title: string;
  description: string;
  parentName: string;
  parentEmail: string;
  createdAt: string;
}

export default function TeacherComplaintsPage() {
  const [batches, setBatches] = useState<BatchOpt[]>([]);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form State
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const fetchInitialData = async () => {
    try {
      const res = await fetch("/api/teacher/complaints");
      if (res.ok) {
        const json = await res.json();
        setBatches(json.batches || []);
        setComplaints(json.complaints || []);
        if (json.batches?.length > 0) {
          setSelectedBatchId(json.batches[0].id);
        }
      } else {
        setError("Failed to fetch initial teacher configurations");
      }
    } catch (err) {
      setError("Network error loading dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchStudents = useCallback(async (batchId: string) => {
    if (!batchId) return;
    setStudentsLoading(true);
    try {
      const res = await fetch(`/api/teacher/complaints?batchId=${batchId}`);
      if (res.ok) {
        const json = await res.json();
        setStudents(json.students || []);
        if (json.students?.length > 0) {
          setSelectedStudentId(json.students[0].id);
        } else {
          setSelectedStudentId("");
        }
      } else {
        setError("Failed to fetch students for selected batch");
      }
    } catch (err) {
      setError("Network error fetching student data");
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      fetchStudents(selectedBatchId);
    }
  }, [selectedBatchId, fetchStudents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !title || !description) {
      setError("Please complete all required fields");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/teacher/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          title,
          description,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg("Complaint filed successfully and parent has been notified!");
        setTitle("");
        setDescription("");
        // Reload list
        fetchInitialData();
      } else {
        setError(json.error || "Failed to submit complaint");
      }
    } catch (err) {
      setError("Network error filing complaint");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading complaints dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div>
        <h2>Student Complaints</h2>
        <p className={styles.subtitle}>File academic or behavioral complaints to notify student parents directly.</p>
      </div>

      {/* Messages */}
      {error && <div className="error" style={{ marginBottom: "1.5rem" }}>{error}</div>}
      {successMsg && <div className="success" style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--success-bg)", color: "var(--success)" }}>{successMsg}</div>}

      <div className={styles.splitGrid}>
        {/* File Complaint Form */}
        <div className="card">
          <h3>File a New Complaint</h3>
          <form onSubmit={handleSubmit} className={styles.form} style={{ marginTop: "1.5rem" }}>
            <div className="form-group">
              <label className="form-label">Select Class / Batch *</label>
              <select
                className="form-control"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                disabled={submitting}
                required
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Select Student *</label>
              <select
                className="form-control"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={submitting || studentsLoading || students.length === 0}
                required
              >
                {studentsLoading ? (
                  <option>Loading class list...</option>
                ) : students.length === 0 ? (
                  <option value="">-- No Students Registered --</option>
                ) : (
                  students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.admissionId})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Complaint Title *</label>
              <input
                className="form-control"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Incomplete Homework, Disrespectful Behavior"
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Complaint Description *</label>
              <textarea
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed information regarding the issue..."
                rows={5}
                disabled={submitting}
                required
                style={{ resize: "vertical" }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "1rem" }}
              disabled={submitting || students.length === 0}
            >
              {submitting ? "Filing Complaint..." : "Submit & Notify Parent"}
            </button>
          </form>
        </div>

        {/* Complaints History List */}
        <div className="card">
          <h3>Filed Complaints History</h3>
          <div className={styles.listContainer} style={{ marginTop: "1.5rem" }}>
            {complaints.length === 0 ? (
              <p style={{ color: "var(--neutral-500)", textAlign: "center", padding: "3rem" }}>
                No complaints filed yet.
              </p>
            ) : (
              <div className={styles.listGrid}>
                {complaints.map((c) => (
                  <div key={c.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div>
                        <span className={styles.studentName}>{c.studentName}</span>
                        <span className={styles.batchBadge}>{c.batchName}</span>
                      </div>
                      <span className={styles.timestamp}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className={styles.complaintBody}>
                      <div className={styles.complaintTitle}>{c.title}</div>
                      <p className={styles.complaintDesc}>{c.description}</p>
                    </div>

                    <div className={styles.itemFooter}>
                      <div className={styles.parentMeta}>
                        <span>Parent: <strong>{c.parentName}</strong></span>
                        <span style={{ fontSize: "0.75rem", color: "var(--neutral-400)", display: "block" }}>
                          ({c.parentEmail})
                        </span>
                      </div>
                      <span className={styles.statusBadge}>Notified</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
