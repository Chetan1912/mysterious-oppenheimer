"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

interface DueRecord {
  id: string;
  month: number;
  year: number;
  baseAmount: number;
  lateFee: number;
  totalDue: number;
  paidAmount: number;
  status: "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";
  lastReminder: string | null;
  reminderCount: number;
  student: {
    name: string;
    admissionId: string;
    batch: { name: string } | null;
  };
}

interface Summary {
  collectedThisMonth: number;
  pendingThisMonth: number;
  totalOverdue: number;
}

export default function FeeManagement() {
  const [dueRecords, setDueRecords] = useState<DueRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");

  // Modal State for Payments
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<DueRecord | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Reminder status
  const [isReminderSending, setIsReminderSending] = useState<string | null>(null);
  const [isBatchSending, setIsBatchSending] = useState(false);

  const fetchFeesData = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (search) query.append("search", search);
      if (status && status !== "all") query.append("status", status);
      if (month && month !== "all") query.append("month", month);
      if (year && year !== "all") query.append("year", year);

      const res = await fetch(`/api/owner/fees?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setDueRecords(json.dueRecords || []);
        setSummary(json.summary);
      } else {
        setError("Failed to fetch fee records");
      }
    } catch (err) {
      setError("Network error loading fee ledger");
    } finally {
      setLoading(false);
    }
  }, [search, status, month, year]);

  useEffect(() => {
    fetchFeesData();
  }, [fetchFeesData]);

  const handleSendReminder = async (dueRecordId: string) => {
    setIsReminderSending(dueRecordId);
    try {
      const res = await fetch("/api/owner/fees/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueRecordId }),
      });
      if (res.ok) {
        alert("Reminder sent successfully!");
        fetchFeesData(); // Refresh counts
      } else {
        alert("Failed to send reminder");
      }
    } catch (err) {
      alert("Error sending reminder");
    } finally {
      setIsReminderSending(null);
    }
  };

  const handleSendBatchReminders = async () => {
    const confirmSend = confirm("Are you sure you want to send email reminders to ALL parents with outstanding fees?");
    if (!confirmSend) return;

    setIsBatchSending(true);
    try {
      const res = await fetch("/api/owner/fees/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_all" }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || "Batch reminders triggered successfully!");
        fetchFeesData();
      } else {
        alert("Failed to send batch reminders.");
      }
    } catch (err) {
      alert("Error sending batch reminders.");
    } finally {
      setIsBatchSending(false);
    }
  };

  const openPayModal = (due: DueRecord) => {
    setSelectedDue(due);
    const balance = Number(due.totalDue) - Number(due.paidAmount);
    setPayAmount(String(balance));
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDue) return;

    setModalSubmitting(true);
    try {
      const res = await fetch("/api/owner/fees/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueRecordId: selectedDue.id,
          amountPaid: payAmount,
          paymentMethod,
          notes: paymentNotes,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        await fetchFeesData();
        setIsPayModalOpen(false);
        setPaymentNotes("");
      } else {
        alert(json.error || "Failed to record payment");
      }
    } catch (err) {
      alert("Network error recording payment");
    } finally {
      setModalSubmitting(false);
    }
  };

  const getMonthName = (monthNum: number) => {
    return new Date(2000, monthNum - 1).toLocaleString("default", { month: "short" });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={`${styles.header} flex justify-between align-center`}>
        <div>
          <h2>Fee Ledger Management</h2>
          <p className={styles.subtitle}>Track collections, manage monthly invoices, and send automated reminders.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSendBatchReminders}
          disabled={isBatchSending || dueRecords.length === 0}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <span>{isBatchSending ? "Sending..." : "Send Reminders to All"}</span>
        </button>
      </div>

      {/* Summary Row */}
      {summary && (
        <div className="grid grid-cols-3 gap-6">
          <div className="card">
            <span className={styles.summaryLabel}>Collected (This Month)</span>
            <h2 className={styles.summaryVal} style={{ color: "var(--success)" }}>
              ₹{summary.collectedThisMonth.toLocaleString()}
            </h2>
          </div>
          <div className="card">
            <span className={styles.summaryLabel}>Pending (This Month)</span>
            <h2 className={styles.summaryVal} style={{ color: "var(--warning)" }}>
              ₹{summary.pendingThisMonth.toLocaleString()}
            </h2>
          </div>
          <div className="card">
            <span className={styles.summaryLabel}>Overdue Outstanding</span>
            <h2 className={styles.summaryVal} style={{ color: "var(--danger)" }}>
              ₹{summary.totalOverdue.toLocaleString()}
            </h2>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className={`${styles.filterBar} card`}>
        <div className={styles.filterGrid}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "0.75rem" }}>Search Student</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "0.75rem" }}>Status</label>
            <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="PENDING">PENDING</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "0.75rem" }}>Month</label>
            <select className="form-control" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "0.75rem" }}>Year</label>
            <select className="form-control" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="all">All Years</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className={styles.loading}>
          <div className="spinner"></div>
          <p>Loading fee ledger...</p>
        </div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : dueRecords.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--neutral-500)" }}>No due records found matching the criteria.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Period</th>
                <th>Total Due</th>
                <th className="hide-mobile">Paid</th>
                <th>Balance</th>
                <th className="hide-mobile">Reminders</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dueRecords.map((due) => {
                const balance = Number(due.totalDue) - Number(due.paidAmount);
                return (
                  <tr key={due.id}>
                    <td>
                      <div>
                        <span className={styles.studentName}>{due.student.name}</span>
                        <span className={styles.studentId}>{due.student.admissionId}</span>
                      </div>
                    </td>
                    <td><strong>{getMonthName(due.month)} {due.year}</strong></td>
                    <td>₹{Number(due.totalDue).toLocaleString()}</td>
                    <td className="hide-mobile" style={{ color: "var(--success)" }}>₹{Number(due.paidAmount).toLocaleString()}</td>
                    <td style={{ color: balance > 0 ? "var(--danger)" : "var(--neutral-500)", fontWeight: 600 }}>
                      ₹{balance.toLocaleString()}
                    </td>
                    <td className="hide-mobile">
                      <span className={styles.reminderCount}>
                        {due.reminderCount} sent
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${due.status.toLowerCase()}`}>
                        {due.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="flex gap-2 justify-end">
                        {due.status !== "PAID" && (
                          <>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                              onClick={() => handleSendReminder(due.id)}
                              disabled={isReminderSending === due.id}
                            >
                              {isReminderSending === due.id ? "Sending..." : "Remind"}
                            </button>
                            <button
                              className="btn btn-primary"
                              style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                              onClick={() => openPayModal(due)}
                            >
                              Pay
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPayModalOpen && selectedDue && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} card fade-in`}>
            <div className="flex justify-between align-center" style={{ marginBottom: "1.5rem" }}>
              <h3>Record Payment</h3>
              <button className={styles.closeBtn} onClick={() => setIsPayModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.modalSummary}>
              <p>Student Name: <strong>{selectedDue.student.name}</strong></p>
              <p>Billing Period: <strong>{getMonthName(selectedDue.month)} {selectedDue.year}</strong></p>
              <p>Total Due: <strong>₹{Number(selectedDue.totalDue).toLocaleString()}</strong></p>
              <p>Already Paid: <strong>₹{Number(selectedDue.paidAmount).toLocaleString()}</strong></p>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label className="form-label">Amount Received (₹)</label>
                <input
                  className="form-control"
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  max={Number(selectedDue.totalDue) - Number(selectedDue.paidAmount)}
                  min={1}
                  required
                  disabled={modalSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  disabled={modalSubmitting}
                >
                  <option value="UPI">UPI (GPay/PhonePe/Paytm)</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Notes</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="e.g., GPay ref no., cash collected, etc."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  disabled={modalSubmitting}
                />
              </div>

              <div className="flex gap-4 justify-end" style={{ marginTop: "2rem" }}>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={modalSubmitting}>
                  {modalSubmitting ? "Saving..." : "Record Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
