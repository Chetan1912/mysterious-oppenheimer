"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

interface Batch {
  id: string;
  name: string;
  description: string | null;
  _count: { students: number };
}

interface Schedule {
  id: string;
  startTime: string;
  endTime: string;
  isExtraClass: boolean;
  isCancelled: boolean;
  notes: string | null;
  batch: { name: string };
}

interface Test {
  id: string;
  title: string;
  maxMarks: number;
  testDate: string;
  batch: { name: string };
}

interface TeacherDashboardData {
  batches: Batch[];
  schedules: Schedule[];
  recentTests: Test[];
}

export default function TeacherDashboard() {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      const res = await fetch("/api/teacher/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("Failed to load teacher dashboard");
      }
    } catch (err) {
      setError("Network error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading teacher dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return <div className={styles.error}>{error || "Error loading dashboard"}</div>;
  }

  const { batches, schedules, recentTests } = data;

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={styles.container}>
      {/* Metrics Header */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card flex align-center gap-4">
          <div className={`${styles.iconCircle} ${styles.indigoBg}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
          </div>
          <div>
            <span className={styles.metricLabel}>Assigned Batches</span>
            <h2 className={styles.metricVal}>{batches.length}</h2>
          </div>
        </div>

        <div className="card flex align-center gap-4">
          <div className={`${styles.iconCircle} ${styles.blueBg}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <span className={styles.metricLabel}>Classes Today</span>
            <h2 className={styles.metricVal}>{schedules.length}</h2>
          </div>
        </div>
      </div>

      {/* Main Grid content */}
      <div className={`${styles.mainGrid} grid gap-6`}>
        {/* Left Side: Timetable & Batches */}
        <div className="flex flex-col gap-6">
          {/* Today's Timetable */}
          <div className="card">
            <h3>Today's Schedule</h3>
            {schedules.length === 0 ? (
              <p className={styles.emptyText}>No classes scheduled for today.</p>
            ) : (
              <div className={styles.scheduleList}>
                {schedules.map((sched) => (
                  <div key={sched.id} className={`${styles.scheduleItem} ${sched.isExtraClass ? styles.extraClass : ""}`}>
                    <div className="flex justify-between align-center">
                      <div>
                        <h4 className={styles.batchName}>{sched.batch.name}</h4>
                        <p className={styles.classTime}>
                          {formatTime(sched.startTime)} - {formatTime(sched.endTime)}
                        </p>
                      </div>
                      <div>
                        {sched.isExtraClass && <span className={`${styles.badge} badge-partial`}>Extra Class</span>}
                        {sched.isCancelled && <span className={`${styles.badge} badge-pending`}>Cancelled</span>}
                      </div>
                    </div>
                    {sched.notes && <p className={styles.classNotes}>✏️ {sched.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Batches List */}
          <div className="card">
            <h3>My Batches</h3>
            {batches.length === 0 ? (
              <p className={styles.emptyText}>You are not assigned to any batches.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Batch Name</th>
                      <th>Description</th>
                      <th style={{ textAlign: "right" }}>Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b.id}>
                        <td><strong>{b.name}</strong></td>
                        <td style={{ color: "var(--neutral-500)", fontSize: "0.8125rem" }}>
                          {b.description || "No description provided."}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{b._count.students} students</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Actions & Recent Tests */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="card">
            <h3>Quick Actions</h3>
            <div className={styles.actionGrid}>
              <Link href="/teacher/marks" className={styles.actionBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
                  <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                </svg>
                <span>Enter Test Marks</span>
              </Link>

              <Link href="/teacher/schedule" className={styles.actionBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Schedule Class</span>
              </Link>
            </div>
          </div>

          {/* Recent Tests */}
          <div className="card">
            <div className={`${styles.cardHeader} flex justify-between align-center`}>
              <h3>Recent Tests</h3>
              <Link href="/teacher/marks" className={styles.viewAll}>New Test</Link>
            </div>
            {recentTests.length === 0 ? (
              <p className={styles.emptyText}>No tests recorded yet.</p>
            ) : (
              <div className={styles.testList}>
                {recentTests.map((t) => (
                  <div key={t.id} className={styles.testItem}>
                    <h4 className={styles.testTitle}>{t.title}</h4>
                    <p className={styles.testBatch}>{t.batch.name}</p>
                    <div className="flex justify-between align-center" style={{ marginTop: "0.5rem" }}>
                      <span className={styles.testDate}>
                        {new Date(t.testDate).toLocaleDateString()}
                      </span>
                      <span className={styles.testMarks}>
                        Max: {t.maxMarks} marks
                      </span>
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
