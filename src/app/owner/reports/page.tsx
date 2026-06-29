"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";

interface BatchReport {
  id: string;
  name: string;
  studentCount: number;
  testCount: number;
  averageScore: number | null;
}

interface RevenueReport {
  month: number;
  year: number;
  expected: number;
  collected: number;
  pending: number;
}

interface StudentReport {
  id: string;
  name: string;
  admissionId: string;
  batchName: string;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
}

interface ReportsData {
  batchReports: BatchReport[];
  revenueReports: RevenueReport[];
  studentReports: StudentReport[];
}

export default function OwnerReports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"revenue" | "academics" | "students">("revenue");

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/owner/reports");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("Failed to load reports data");
      }
    } catch (err) {
      setError("Network error loading reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getMonthName = (monthNum: number) => {
    return new Date(2000, monthNum - 1).toLocaleString("default", { month: "long" });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Generating reports...</p>
      </div>
    );
  }

  if (error || !data) {
    return <div className="error">{error || "Error loading reports"}</div>;
  }

  const { batchReports, revenueReports, studentReports } = data;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={`${styles.header} flex justify-between align-center`}>
        <div className={styles.headerText}>
          <h2>Institute Analytics & Reports</h2>
          <p className={styles.subtitle}>Review monthly collections, class academic averages, and student balance sheets.</p>
        </div>
        <button className="btn btn-secondary no-print" onClick={handlePrint}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* Tabs */}
      <div className={`${styles.tabContainer} no-print`}>
        <button
          className={`${styles.tab} ${activeTab === "revenue" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("revenue")}
        >
          Revenue Summary
        </button>
        <button
          className={`${styles.tab} ${activeTab === "academics" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("academics")}
        >
          Academic Averages
        </button>
        <button
          className={`${styles.tab} ${activeTab === "students" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("students")}
        >
          Student Balances
        </button>
      </div>

      {/* Report Tables */}
      <div className={styles.reportContent}>
        {/* Printable Title (Hidden on screen, visible on print) */}
        <div className={styles.printHeader}>
          <h1>Apex Academy - Official Report</h1>
          <p>Generated on: {new Date().toLocaleString()} | Role: Administrator</p>
          <hr style={{ margin: "1rem 0" }} />
        </div>

        {/* 1. Revenue Summary */}
        {activeTab === "revenue" && (
          <div className="card fade-in">
            <h3 className={styles.tableTitle}>Monthly Collection & Dues Report</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Billing Month</th>
                    <th>Expected Revenue</th>
                    <th>Actual Collections</th>
                    <th>Outstanding Balance</th>
                    <th>Collection Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--neutral-400)" }}>No billing records found.</td>
                    </tr>
                  ) : (
                    revenueReports.map((r) => {
                      const rate = r.expected > 0 ? ((r.collected / r.expected) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={`${r.month}-${r.year}`}>
                          <td><strong>{getMonthName(r.month)} {r.year}</strong></td>
                          <td>₹{r.expected.toLocaleString()}</td>
                          <td style={{ color: "var(--success)" }}>₹{r.collected.toLocaleString()}</td>
                          <td style={{ color: r.pending > 0 ? "var(--danger)" : "var(--neutral-500)", fontWeight: 600 }}>
                            ₹{r.pending.toLocaleString()}
                          </td>
                          <td>
                            <span
                              style={{
                                fontWeight: "bold",
                                color: Number(rate) >= 90 ? "var(--success)" : Number(rate) >= 60 ? "var(--warning)" : "var(--danger)",
                              }}
                            >
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Academic Performance */}
        {activeTab === "academics" && (
          <div className="card fade-in">
            <h3 className={styles.tableTitle}>Batch-wise Academic Performance Report</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Batch / Class Name</th>
                    <th>Enrolled Students</th>
                    <th>Tests Conducted</th>
                    <th>Overall Batch Average</th>
                    <th>Performance Level</th>
                  </tr>
                </thead>
                <tbody>
                  {batchReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--neutral-400)" }}>No batches found.</td>
                    </tr>
                  ) : (
                    batchReports.map((b) => {
                      const performance = b.averageScore
                        ? b.averageScore >= 40
                          ? b.averageScore >= 75
                            ? "Excellent"
                            : "Average"
                          : "Needs Attention"
                        : "No Data";
                      return (
                        <tr key={b.id}>
                          <td><strong>{b.name}</strong></td>
                          <td>{b.studentCount} students</td>
                          <td>{b.testCount} tests</td>
                          <td>
                            <strong>{b.averageScore !== null ? `${b.averageScore}%` : "—"}</strong>
                          </td>
                          <td>
                            {b.averageScore !== null ? (
                              <span
                                className={styles.performanceLabel}
                                style={{
                                  color: performance === "Excellent" ? "var(--success)" : performance === "Average" ? "var(--warning)" : "var(--danger)",
                                  fontWeight: "bold",
                                }}
                              >
                                {performance}
                              </span>
                            ) : (
                              <span style={{ color: "var(--neutral-400)" }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Student Balances */}
        {activeTab === "students" && (
          <div className="card fade-in">
            <h3 className={styles.tableTitle}>Student Financial Ledger Summary</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Class</th>
                    <th>Total Invoiced</th>
                    <th>Total Paid</th>
                    <th>Outstanding Dues</th>
                  </tr>
                </thead>
                <tbody>
                  {studentReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--neutral-400)" }}>No students found.</td>
                    </tr>
                  ) : (
                    studentReports.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div>
                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--neutral-500)", display: "block" }}>
                              {s.admissionId}
                            </span>
                          </div>
                        </td>
                        <td>{s.batchName}</td>
                        <td>₹{s.totalBilled.toLocaleString()}</td>
                        <td style={{ color: "var(--success)" }}>₹{s.totalPaid.toLocaleString()}</td>
                        <td style={{ color: s.outstanding > 0 ? "var(--danger)" : "var(--neutral-500)", fontWeight: 600 }}>
                          ₹{s.outstanding.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
