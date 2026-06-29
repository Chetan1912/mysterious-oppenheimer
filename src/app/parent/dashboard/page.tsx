"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

interface ChildData {
  student: {
    id: string;
    admissionId: string;
    name: string;
    batch: { name: string } | null;
  };
  totalPending: number;
  recentMarks: Array<{
    id: string;
    score: number;
    remarks: string | null;
    test: {
      title: string;
      maxMarks: number;
      testDate: string;
    };
  }>;
  todaySchedule: Array<{
    id: string;
    startTime: string;
    endTime: string;
    isExtraClass: boolean;
    isCancelled: boolean;
    notes: string | null;
  }>;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface ParentDashboardData {
  children: ChildData[];
  notices: Notice[];
}

export default function ParentDashboard() {
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchParentData();
  }, []);

  const fetchParentData = async () => {
    try {
      const res = await fetch("/api/parent/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("Failed to load parent dashboard");
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
        <p>Loading student profiles...</p>
      </div>
    );
  }

  if (error || !data) {
    return <div className={styles.error}>{error || "Error loading dashboard"}</div>;
  }

  const { children, notices } = data;

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={styles.container}>
      {/* Dashboard Overview */}
      <div className={`${styles.mainGrid} grid gap-6`}>
        {/* Left Column: Children Cards */}
        <div className="flex flex-col gap-6">
          {children.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "var(--neutral-500)" }}>No children registered under this account.</p>
            </div>
          ) : (
            children.map((child) => (
              <div key={child.student.id} className={`${styles.childCard} card`}>
                {/* Child Header */}
                <div className={`${styles.childHeader} flex justify-between align-center`}>
                  <div className="flex align-center gap-3">
                    <div className={styles.avatar}>
                      {child.student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className={styles.childName}>{child.student.name}</h3>
                      <span className={styles.admissionId}>{child.student.admissionId}</span>
                    </div>
                  </div>
                  <span className={styles.batchBadge}>
                    {child.student.batch ? child.student.batch.name : "Unassigned"}
                  </span>
                </div>

                {/* Child Quick Summary Grid */}
                <div className="grid grid-cols-2 gap-6" style={{ marginTop: "1.5rem" }}>
                  {/* Fee Status Card */}
                  <div className={styles.statusCard}>
                    <div className="flex justify-between align-center">
                      <span className={styles.cardTitle}>Fee Status</span>
                      <Link href="/parent/fees" className={styles.cardLink}>Ledger</Link>
                    </div>
                    <div className={styles.statusValWrapper}>
                      {child.totalPending > 0 ? (
                        <div>
                          <h2 className={styles.pendingVal}>₹{child.totalPending.toLocaleString()}</h2>
                          <span className={styles.dueAlert}>Outstanding Dues</span>
                        </div>
                      ) : (
                        <div>
                          <h2 className={styles.paidVal}>₹0</h2>
                          <span className={styles.paidAlert}>All Fees Cleared</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Today's Schedule Card */}
                  <div className={styles.statusCard}>
                    <div className="flex justify-between align-center">
                      <span className={styles.cardTitle}>Today's Schedule</span>
                      <Link href="/parent/schedule" className={styles.cardLink}>Timetable</Link>
                    </div>
                    <div className={styles.scheduleValWrapper}>
                      {child.todaySchedule.length === 0 ? (
                        <p className={styles.noClassesText}>No classes scheduled today.</p>
                      ) : (
                        child.todaySchedule.map((sched) => (
                          <div key={sched.id} className={styles.scheduleItemMini}>
                            <span className={styles.classTime}>
                              {formatTime(sched.startTime)} - {formatTime(sched.endTime)}
                            </span>
                            {sched.isExtraClass && <span className={styles.extraClassLabel}>Extra</span>}
                            {sched.isCancelled && <span className={styles.cancelledLabel}>Cancelled</span>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Academic Scores */}
                <div className={styles.academicsSection} style={{ marginTop: "1.5rem" }}>
                  <div className="flex justify-between align-center" style={{ marginBottom: "0.75rem" }}>
                    <span className={styles.sectionTitle}>Recent Test Performance</span>
                    <Link href="/parent/reports" className={styles.cardLink}>All Reports</Link>
                  </div>

                  {child.recentMarks.length === 0 ? (
                    <p className={styles.emptyText}>No test marks uploaded recently.</p>
                  ) : (
                    <div className={styles.marksList}>
                      {child.recentMarks.map((mark) => {
                        const score = Number(mark.score);
                        const percent = ((score / mark.test.maxMarks) * 100).toFixed(0);
                        return (
                          <div key={mark.id} className={styles.markItem}>
                            <div>
                              <span className={styles.testTitle}>{mark.test.title}</span>
                              <span className={styles.testDate}>
                                {new Date(mark.test.testDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span className={styles.scoreText}>{score}/{mark.test.maxMarks}</span>
                              <span
                                className={styles.percentText}
                                style={{
                                  color: score / mark.test.maxMarks >= 0.75 ? "var(--success)" : score / mark.test.maxMarks >= 0.4 ? "var(--warning)" : "var(--danger)",
                                }}
                              >
                                {percent}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Notice Board */}
        <div className="flex flex-col gap-6">
          <div className="card">
            <h3>Institute Notice Board</h3>
            {notices.length === 0 ? (
              <p className={styles.emptyText}>No notices posted recently.</p>
            ) : (
              <div className={styles.noticeList}>
                {notices.map((notice) => (
                  <div key={notice.id} className={styles.noticeItem}>
                    <h4 className={styles.noticeTitle}>{notice.title}</h4>
                    <p className={styles.noticeBody}>{notice.content}</p>
                    <span className={styles.noticeDate}>
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </span>
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
