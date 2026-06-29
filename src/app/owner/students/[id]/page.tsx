"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

interface Payment {
  id: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string | null;
  dueRecordId: string;
}

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
  payments: Payment[];
}

interface Mark {
  id: string;
  score: number;
  remarks: string | null;
  test: {
    title: string;
    maxMarks: number;
    testDate: string;
  };
}

interface StudentData {
  id: string;
  admissionId: string;
  name: string;
  joiningDate: string;
  address: string | null;
  notes: string | null;
  batch: { name: string } | null;
  parent: {
    user: { name: string; email: string; phone: string | null };
  };
  feePlan: { name: string; amount: number; dueDateDay: number; lateFeeRule: number } | null;
  dueRecords: DueRecord[];
  payments: Payment[];
  marks: Mark[];
}

export default function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"fees" | "academics" | "notes">("fees");

  // Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<DueRecord | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        const res = await fetch(`/api/owner/students/${id}`);
        if (res.ok) {
          const json = await res.json();
          setStudent(json.student);
        } else {
          setError("Failed to load student profile");
        }
      } catch (err) {
        setError("Network error loading student profile");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, [id]);

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
        // Refresh profile data
        await fetchStudentProfile();
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

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading student profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return <div className={styles.error}>{error || "Error loading profile"}</div>;
  }

  const getMonthName = (monthNum: number) => {
    return new Date(2000, monthNum - 1).toLocaleString("default", { month: "long" });
  };

  return (
    <div className={styles.container}>
      {/* Back link */}
      <button onClick={() => router.back()} className={styles.backBtn}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        <span>Back to Student Directory</span>
      </button>

      {/* Profile Header Card */}
      <div className={`${styles.profileCard} card`}>
        <div className={styles.profileMain}>
          <div className={styles.avatar}>{student.name.charAt(0).toUpperCase()}</div>
          <div className={styles.profileMeta}>
            <div className="flex align-center gap-4">
              <h2 className={styles.studentName}>{student.name}</h2>
              <span className={styles.admissionIdBadge}>{student.admissionId}</span>
            </div>
            <p className={styles.batchName}>Class: {student.batch ? student.batch.name : "Unassigned"}</p>
            <p className={styles.joiningDate}>Enrolled: {new Date(student.joiningDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div className={styles.contactDetails}>
          <div className={styles.contactCol}>
            <span className={styles.contactLabel}>Parent / Guardian</span>
            <span className={styles.contactVal}>{student.parent.user.name}</span>
          </div>
          <div className={styles.contactCol}>
            <span className={styles.contactLabel}>Parent Email</span>
            <span className={styles.contactVal}>{student.parent.user.email}</span>
          </div>
          <div className={styles.contactCol}>
            <span className={styles.contactLabel}>Parent Phone</span>
            <span className={styles.contactVal}>{student.parent.user.phone || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === "fees" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("fees")}
        >
          Fee Ledger
        </button>
        <button
          className={`${styles.tab} ${activeTab === "academics" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("academics")}
        >
          Academic Reports
        </button>
        <button
          className={`${styles.tab} ${activeTab === "notes" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("notes")}
        >
          Profile Notes
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "fees" && (
        <div className="fade-in flex flex-col gap-6">
          {/* Due Records Timeline */}
          <div className="card">
            <h3>Monthly Due Timeline</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Billing Month</th>
                    <th>Base Fee</th>
                    <th>Late Fee</th>
                    <th>Total Due</th>
                    <th>Paid Amount</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {student.dueRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", color: "var(--neutral-400)" }}>
                        No billing history found for this student.
                      </td>
                    </tr>
                  ) : (
                    student.dueRecords.map((due) => {
                      const balance = Number(due.totalDue) - Number(due.paidAmount);
                      return (
                        <tr key={due.id}>
                          <td><strong>{getMonthName(due.month)} {due.year}</strong></td>
                          <td>₹{Number(due.baseAmount).toLocaleString()}</td>
                          <td>₹{Number(due.lateFee).toLocaleString()}</td>
                          <td><strong>₹{Number(due.totalDue).toLocaleString()}</strong></td>
                          <td style={{ color: "var(--success)" }}>₹{Number(due.paidAmount).toLocaleString()}</td>
                          <td style={{ color: balance > 0 ? "var(--danger)" : "var(--neutral-500)", fontWeight: 600 }}>
                            ₹{balance.toLocaleString()}
                          </td>
                          <td>
                            <span className={`badge badge-${due.status.toLowerCase()}`}>
                              {due.status}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {due.status !== "PAID" && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                                onClick={() => openPayModal(due)}
                              >
                                Record Payment
                              </button>
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

          {/* Payment History */}
          <div className="card">
            <h3>Recent Payment Transactions</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference Month</th>
                    <th>Method</th>
                    <th>Notes</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {student.payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--neutral-400)" }}>
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    student.payments.map((p) => {
                      // Find corresponding due record month/year
                      const refDue = student.dueRecords.find((d) => d.id === p.dueRecordId);
                      const refMonthStr = refDue ? `${getMonthName(refDue.month)} ${refDue.year}` : "N/A";
                      return (
                        <tr key={p.id}>
                          <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                          <td>{refMonthStr}</td>
                          <td><span className={styles.methodBadge}>{p.paymentMethod}</span></td>
                          <td style={{ color: "var(--neutral-500)", fontSize: "0.8125rem" }}>
                            {p.notes || "—"}
                          </td>
                          <td className={styles.amountText}>₹{Number(p.amountPaid).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "academics" && (
        <div className="fade-in card">
          <h3>Test Marks & Academic Records</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Test Date</th>
                  <th>Test Name</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Teacher Remarks</th>
                </tr>
              </thead>
              <tbody>
                {student.marks.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--neutral-400)" }}>
                      No academic test records found.
                    </td>
                  </tr>
                ) : (
                  student.marks.map((m) => {
                    const scoreNum = Number(m.score);
                    const percent = ((scoreNum / m.test.maxMarks) * 100).toFixed(1);
                    return (
                      <tr key={m.id}>
                        <td>{new Date(m.test.testDate).toLocaleDateString()}</td>
                        <td><strong>{m.test.title}</strong></td>
                        <td>
                          <strong>{scoreNum}</strong> / {m.test.maxMarks}
                        </td>
                        <td>
                          <span
                            className={styles.percentText}
                            style={{
                              color: scoreNum / m.test.maxMarks >= 0.75 ? "var(--success)" : scoreNum / m.test.maxMarks >= 0.4 ? "var(--warning)" : "var(--danger)",
                            }}
                          >
                            {percent}%
                          </span>
                        </td>
                        <td style={{ color: "var(--neutral-600)", fontSize: "0.8125rem" }}>
                          {m.remarks || "No remarks entered."}
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

      {activeTab === "notes" && (
        <div className="fade-in card">
          <h3>Student Academic Profile & Background Notes</h3>
          <div className={styles.notesBox}>
            {student.notes ? (
              <p className={styles.notesText}>{student.notes}</p>
            ) : (
              <p style={{ color: "var(--neutral-400)", fontStyle: "italic" }}>
                No specific notes recorded. You can edit this student&apos;s details to add custom background notes.
              </p>
            )}
          </div>
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
              <p>Recording payment for: <strong>{getMonthName(selectedDue.month)} {selectedDue.year}</strong></p>
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
                  placeholder="e.g., GPay ref no., paid by father, etc."
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
