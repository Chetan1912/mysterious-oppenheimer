"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

interface Student {
  id: string;
  admissionId: string;
  name: string;
  joiningDate: string;
  batch: { name: string } | null;
  parent: { user: { name: string; email: string; phone: string } };
  feePlan: { name: string; amount: number } | null;
}

interface Batch {
  id: string;
  name: string;
}

export default function StudentDirectory() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const query = new URLSearchParams();
        if (search) query.append("search", search);
        if (batchId && batchId !== "all") query.append("batchId", batchId);

        const res = await fetch(`/api/owner/students?${query.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setStudents(json.students || []);
          // Only set batches on initial load
          if (batches.length === 0) {
            setBatches(json.batches || []);
          }
        } else {
          setError("Failed to fetch student directory");
        }
      } catch (err) {
        setError("Network error loading students");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [search, batchId, batches.length]);

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={`${styles.header} flex justify-between align-center`}>
        <div>
          <h2>Student Directory</h2>
          <p className={styles.subtitle}>Manage admissions, batch assignments, and view student profiles.</p>
        </div>
        <Link href="/owner/students/admission" className="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Admission</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className={`${styles.filterBar} card flex gap-4`}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="form-control"
            placeholder="Search by student name, admission ID, or parent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.5rem" }}
          />
        </div>

        <div className={styles.filterWrapper}>
          <select
            className="form-control"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            style={{ minWidth: "200px" }}
          >
            <option value="all">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className={styles.loading}>
          <div className="spinner"></div>
          <p>Loading directory...</p>
        </div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : students.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--neutral-500)" }}>No students found matching the criteria.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Batch</th>
                <th>Parent Info</th>
                <th>Fee Plan</th>
                <th className="hide-mobile">Joining Date</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div>
                      <span className={styles.studentName}>{student.name}</span>
                      <span className={styles.admissionId}>{student.admissionId}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.batchBadge}>
                      {student.batch ? student.batch.name : "Unassigned"}
                    </span>
                  </td>
                  <td>
                    <div>
                      <span className={styles.parentName}>{student.parent.user.name}</span>
                      <span className={styles.parentPhone}>{student.parent.user.phone || "No Phone"}</span>
                    </div>
                  </td>
                  <td>
                    {student.feePlan ? (
                      <div>
                        <span className={styles.planName}>{student.feePlan.name}</span>
                        <span className={styles.planAmount}>₹{Number(student.feePlan.amount).toLocaleString()}/mo</span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--neutral-400)" }}>None</span>
                    )}
                  </td>
                  <td className="hide-mobile">{new Date(student.joiningDate).toLocaleDateString()}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/owner/students/${student.id}`}
                      className="btn btn-secondary"
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8125rem" }}
                    >
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
