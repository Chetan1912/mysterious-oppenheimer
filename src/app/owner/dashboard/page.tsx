"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

interface DashboardData {
  metrics: {
    studentCount: number;
    batchCount: number;
    monthlyCollections: number;
    totalOutstanding: number;
  };
  recentPayments: Array<{
    id: string;
    amountPaid: number;
    paymentDate: string;
    paymentMethod: string;
    student: { name: string; admissionId: string };
  }>;
  overdueAccounts: Array<{
    id: string;
    month: number;
    year: number;
    totalDue: number;
    paidAmount: number;
    status: string;
    student: {
      id: string;
      name: string;
      admissionId: string;
      parent: { user: { name: string; phone: string } };
    };
  }>;
  recentNotices: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }>;
}

export default function OwnerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isReminderSending, setIsReminderSending] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/owner/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("Failed to load dashboard metrics");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const sendManualReminder = async (dueRecordId: string) => {
    setIsReminderSending(dueRecordId);
    try {
      const res = await fetch(`/api/owner/fees/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueRecordId }),
      });
      if (res.ok) {
        alert("Reminder sent successfully!");
      } else {
        alert("Failed to send reminder.");
      }
    } catch (err) {
      alert("Error sending reminder.");
    } finally {
      setIsReminderSending(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return <div className={styles.error}>{error || "Error loading dashboard"}</div>;
  }

  const { metrics, recentPayments, overdueAccounts, recentNotices } = data;

  return (
    <div className={styles.container}>
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card flex align-center gap-4">
          <div className={`${styles.iconCircle} ${styles.indigoBg}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <span className={styles.metricLabel}>Total Students</span>
            <h2 className={styles.metricVal}>{metrics.studentCount}</h2>
          </div>
        </div>

        <div className="card flex align-center gap-4">
          <div className={`${styles.iconCircle} ${styles.blueBg}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
          </div>
          <div>
            <span className={styles.metricLabel}>Active Batches</span>
            <h2 className={styles.metricVal}>{metrics.batchCount}</h2>
          </div>
        </div>

        <div className="card flex align-center gap-4">
          <div className={`${styles.iconCircle} ${styles.greenBg}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <span className={styles.metricLabel}>Collected (This Month)</span>
            <h2 className={styles.metricVal}>₹{metrics.monthlyCollections.toLocaleString()}</h2>
          </div>
        </div>

        <div className="card flex align-center gap-4">
          <div className={`${styles.iconCircle} ${styles.redBg}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <span className={styles.metricLabel}>Total Outstanding</span>
            <h2 className={styles.metricVal}>₹{metrics.totalOutstanding.toLocaleString()}</h2>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className={`${styles.mainGrid} grid gap-6`}>
        {/* Left Side: Payments & Overdues */}
        <div className="flex flex-col gap-6">
          {/* Recent Payments */}
          <div className="card">
            <div className={`${styles.cardHeader} flex justify-between align-center`}>
              <h3>Recent Payments</h3>
              <Link href="/owner/fees" className={styles.viewAll}>View All</Link>
            </div>
            {recentPayments.length === 0 ? (
              <p className={styles.emptyText}>No payments recorded recently.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Date</th>
                      <th className="hide-mobile">Method</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          <div>
                            <span className={styles.tableName}>{payment.student.name}</span>
                            <span className={styles.tableSub}>{payment.student.admissionId}</span>
                          </div>
                        </td>
                        <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                        <td className="hide-mobile"><span className={styles.methodBadge}>{payment.paymentMethod}</span></td>
                        <td className={styles.amountText}>₹{Number(payment.amountPaid).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Overdue Accounts */}
          <div className="card">
            <div className={`${styles.cardHeader} flex justify-between align-center`}>
              <h3>Outstanding Dues</h3>
              <Link href="/owner/fees" className={styles.viewAll}>Manage Fees</Link>
            </div>
            {overdueAccounts.length === 0 ? (
              <p className={styles.emptyText}>No outstanding dues. Good job!</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th className="hide-mobile">Period</th>
                      <th>Pending Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueAccounts.map((account) => {
                      const pending = Number(account.totalDue) - Number(account.paidAmount);
                      const monthName = new Date(2000, account.month - 1).toLocaleString("default", { month: "short" });
                      return (
                        <tr key={account.id}>
                          <td>
                            <div>
                              <span className={styles.tableName}>{account.student.name}</span>
                              <span className={styles.tableSub}>Parent: {account.student.parent.user.name}</span>
                            </div>
                          </td>
                          <td className="hide-mobile">{monthName} {account.year}</td>
                          <td className={styles.pendingText}>₹{pending.toLocaleString()}</td>
                          <td>
                            <button
                              className="btn btn-secondary"
                              onClick={() => sendManualReminder(account.id)}
                              disabled={isReminderSending === account.id}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            >
                              {isReminderSending === account.id ? "Sending..." : "Remind"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Notices & Quick Actions */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="card">
            <h3>Quick Actions</h3>
            <div className={styles.actionGrid}>
              <Link href="/owner/students/admission" className={styles.actionBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="16" y1="11" x2="22" y2="11" />
                </svg>
                <span>New Admission</span>
              </Link>

              <Link href="/owner/fees" className={styles.actionBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span>Record Payment</span>
              </Link>

              <Link href="/owner/notices" className={styles.actionBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span>Post Announcement</span>
              </Link>

              <Link href="/owner/tests" className={styles.actionBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
                  <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                </svg>
                <span>Create Test</span>
              </Link>
            </div>
          </div>

          {/* Recent Notices */}
          <div className="card">
            <div className={`${styles.cardHeader} flex justify-between align-center`}>
              <h3>Recent Notices</h3>
              <Link href="/owner/notices" className={styles.viewAll}>Notice Board</Link>
            </div>
            {recentNotices.length === 0 ? (
              <p className={styles.emptyText}>No notices published recently.</p>
            ) : (
              <div className={styles.noticeList}>
                {recentNotices.map((notice) => (
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
