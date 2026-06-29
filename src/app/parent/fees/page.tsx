"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";

interface Payment {
  id: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string | null;
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
  payments: Payment[];
}

interface ChildFees {
  id: string;
  name: string;
  admissionId: string;
  dueRecords: DueRecord[];
}

export default function ParentFees() {
  const [children, setChildren] = useState<ChildFees[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFees = async () => {
    try {
      const res = await fetch("/api/parent/fees");
      if (res.ok) {
        const json = await res.json();
        setChildren(json.children || []);
      } else {
        setError("Failed to load fee ledger");
      }
    } catch (err) {
      setError("Network error loading fees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const getMonthName = (monthNum: number) => {
    return new Date(2000, monthNum - 1).toLocaleString("default", { month: "long" });
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading fee ledger...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div>
        <h2>Fee Ledger</h2>
        <p className={styles.subtitle}>View monthly billing, payment history, and instructions for fee clearance.</p>
      </div>

      {/* Main Grid: Ledger + Payment Instructions */}
      <div className={`${styles.mainGrid} grid gap-6`}>
        {/* Left Column: Children Ledgers */}
        <div className="flex flex-col gap-6">
          {children.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "var(--neutral-500)" }}>No student records found.</p>
            </div>
          ) : (
            children.map((child) => (
              <div key={child.id} className="card">
                <div className={styles.childHeader} style={{ marginBottom: "1.5rem" }}>
                  <h3>{child.name}</h3>
                  <span className={styles.admissionId}>{child.admissionId}</span>
                </div>

                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Base Fee</th>
                        <th>Late Fee</th>
                        <th>Total Due</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {child.dueRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", color: "var(--neutral-400)" }}>
                            No billing records generated yet.
                          </td>
                        </tr>
                      ) : (
                        child.dueRecords.map((due) => {
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
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Transactions list */}
                {child.dueRecords.some((d) => d.payments.length > 0) && (
                  <div className={styles.transactions} style={{ marginTop: "2rem" }}>
                    <h4 style={{ marginBottom: "1rem" }}>Recent Payments</h4>
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
                          {child.dueRecords.flatMap((due) =>
                            due.payments.map((p) => (
                              <tr key={p.id}>
                                <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                                <td>{getMonthName(due.month)} {due.year}</td>
                                <td><span className={styles.methodBadge}>{p.paymentMethod}</span></td>
                                <td style={{ color: "var(--neutral-500)", fontSize: "0.8125rem" }}>
                                  {p.notes || "—"}
                                </td>
                                <td className={styles.amountText}>₹{Number(p.amountPaid).toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right Column: Payment Instructions */}
        <div className="flex flex-col gap-6">
          <div className="card">
            <h3>How to Pay</h3>
            <p className={styles.instructionText} style={{ marginTop: "1rem", fontSize: "0.875rem", color: "var(--neutral-600)", lineHeight: "1.6" }}>
              Please transfer the outstanding fee amount using one of the payment methods below. Once paid, please share the transaction receipt with the institute owner to update the portal.
            </p>

            <div className={styles.paymentMethods} style={{ marginTop: "1.5rem" }}>
              <div className={styles.paymentMethodItem}>
                <span className={styles.methodTitle}>UPI Transfer</span>
                <p className={styles.methodDetail}><strong>UPI ID:</strong> apex@okhdfcbank</p>
                <p className={styles.methodDetail}><strong>Name:</strong> Apex Academy</p>
              </div>

              <div className={styles.paymentMethodItem} style={{ marginTop: "1.25rem" }}>
                <span className={styles.methodTitle}>Bank Account Transfer</span>
                <p className={styles.methodDetail}><strong>Account Name:</strong> Apex Educational Trust</p>
                <p className={styles.methodDetail}><strong>Account No:</strong> 50100238472948</p>
                <p className={styles.methodDetail}><strong>IFSC Code:</strong> HDFC0000240</p>
                <p className={styles.methodDetail}><strong>Branch:</strong> Dwarka Sector 11, New Delhi</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
