"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";

interface TeacherOpt {
  id: string;
  user: {
    name: string;
  };
}

interface Batch {
  id: string;
  name: string;
  description: string | null;
  teacherId: string | null;
  teacher: {
    user: {
      name: string;
    };
  } | null;
  createdAt: string;
}

interface FeePlan {
  id: string;
  name: string;
  amount: number;
  dueDateDay: number;
  lateFeeRule: number;
  createdAt: string;
}

export default function BatchesPlansPage() {
  const [activeTab, setActiveTab] = useState<"batches" | "plans">("batches");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [feePlans, setFeePlans] = useState<FeePlan[]>([]);
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Batch Form State
  const [batchName, setBatchName] = useState("");
  const [batchDesc, setBatchDesc] = useState("");
  const [batchTeacher, setBatchTeacher] = useState("");
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Plan Form State
  const [planName, setPlanName] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const [planDueDate, setPlanDueDate] = useState("5");
  const [planLateFee, setPlanLateFee] = useState("0");
  const [planSubmitting, setPlanSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/owner/batches-plans");
      if (res.ok) {
        const json = await res.json();
        setBatches(json.batches || []);
        setFeePlans(json.feePlans || []);
        setTeachers(json.teachers || []);
      } else {
        setError("Failed to fetch batches and plans configurations");
      }
    } catch (err) {
      setError("Network error fetching configuration data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/owner/batches-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "batch",
          name: batchName,
          description: batchDesc,
          teacherId: batchTeacher || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Successfully created batch "${batchName}"!`);
        setBatchName("");
        setBatchDesc("");
        setBatchTeacher("");
        // Reload list
        fetchData();
      } else {
        setError(json.error || "Failed to create new batch");
      }
    } catch (err) {
      setError("Network error adding batch");
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/owner/batches-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "plan",
          name: planName,
          amount: planAmount,
          dueDateDay: planDueDate,
          lateFeeRule: planLateFee,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Successfully created plan "${planName}"!`);
        setPlanName("");
        setPlanAmount("");
        setPlanDueDate("5");
        setPlanLateFee("0");
        // Reload list
        fetchData();
      } else {
        setError(json.error || "Failed to create new fee plan");
      }
    } catch (err) {
      setError("Network error adding plan");
    } finally {
      setPlanSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading batches and fee plans configuration...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div>
        <h2>Batches & Fee Plans</h2>
        <p className={styles.subtitle}>Configure academic batches, handled teachers, and student fee structures.</p>
      </div>

      {/* Messages */}
      {error && <div className="error" style={{ marginBottom: "1.5rem" }}>{error}</div>}
      {successMsg && <div className="success" style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--success-bg)", color: "var(--success)" }}>{successMsg}</div>}

      {/* Tab Switcher */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === "batches" ? styles.tabBtnActive : ""}`}
          onClick={() => {
            setActiveTab("batches");
            setError("");
            setSuccessMsg("");
          }}
        >
          Manage Batches & Classes
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "plans" ? styles.tabBtnActive : ""}`}
          onClick={() => {
            setActiveTab("plans");
            setError("");
            setSuccessMsg("");
          }}
        >
          Manage Fee Plans
        </button>
      </div>

      {/* Batches Tab View */}
      {activeTab === "batches" && (
        <div className={styles.splitGrid}>
          {/* Add Batch Form */}
          <div className="card">
            <h3>Add New Batch / Class</h3>
            <form onSubmit={handleAddBatch} className={styles.form} style={{ marginTop: "1.5rem" }}>
              <div className="form-group">
                <label className="form-label">Batch Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Grade 10 - Mathematics"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  required
                  disabled={batchSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Subject Details</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Algebra and Trigonometry syllabus"
                  value={batchDesc}
                  onChange={(e) => setBatchDesc(e.target.value)}
                  disabled={batchSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Teacher</label>
                <select
                  className="form-control"
                  value={batchTeacher}
                  onChange={(e) => setBatchTeacher(e.target.value)}
                  disabled={batchSubmitting}
                >
                  <option value="">-- No Assigned Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.name}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={batchSubmitting}>
                {batchSubmitting ? "Adding Batch..." : "Add Academic Batch"}
              </button>
            </form>
          </div>

          {/* Batches List */}
          <div className="card">
            <h3>Existing Academic Batches</h3>
            <div className={styles.listContainer} style={{ marginTop: "1.5rem" }}>
              {batches.length === 0 ? (
                <p style={{ color: "var(--neutral-500)", textAlign: "center", padding: "2rem" }}>No batches registered yet.</p>
              ) : (
                <div className={styles.listGrid}>
                  {batches.map((b) => (
                    <div key={b.id} className={styles.listItem}>
                      <div>
                        <div className={styles.itemName}>{b.name}</div>
                        {b.description && <div className={styles.itemSub}>{b.description}</div>}
                      </div>
                      <div className={styles.itemMeta}>
                        <span className={styles.badge}>
                          {b.teacher ? `Teacher: ${b.teacher.user.name}` : "No Teacher"}
                        </span>
                        <span className={styles.dateLabel}>
                          Added {new Date(b.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plans Tab View */}
      {activeTab === "plans" && (
        <div className={styles.splitGrid}>
          {/* Add Fee Plan Form */}
          <div className="card">
            <h3>Add New Fee Plan</h3>
            <form onSubmit={handleAddPlan} className={styles.form} style={{ marginTop: "1.5rem" }}>
              <div className="form-group">
                <label className="form-label">Plan Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Standard Monthly Plan"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  required
                  disabled={planSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Billing Amount (₹ per month) *</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 5000"
                  value={planAmount}
                  onChange={(e) => setPlanAmount(e.target.value)}
                  required
                  disabled={planSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Due Date Day of Month (1 - 31) *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="form-control"
                  placeholder="e.g. 5"
                  value={planDueDate}
                  onChange={(e) => setPlanDueDate(e.target.value)}
                  required
                  disabled={planSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Late Fee Fine Rule (₹ Penalty)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 250"
                  value={planLateFee}
                  onChange={(e) => setPlanLateFee(e.target.value)}
                  disabled={planSubmitting}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={planSubmitting}>
                {planSubmitting ? "Adding Fee Plan..." : "Add Billing Fee Plan"}
              </button>
            </form>
          </div>

          {/* Fee Plans List */}
          <div className="card">
            <h3>Existing Fee Plans</h3>
            <div className={styles.listContainer} style={{ marginTop: "1.5rem" }}>
              {feePlans.length === 0 ? (
                <p style={{ color: "var(--neutral-500)", textAlign: "center", padding: "2rem" }}>No fee plans configured yet.</p>
              ) : (
                <div className={styles.listGrid}>
                  {feePlans.map((fp) => (
                    <div key={fp.id} className={styles.listItem}>
                      <div>
                        <div className={styles.itemName}>{fp.name}</div>
                        <div className={styles.itemSub}>
                          Monthly: ₹{Number(fp.amount).toLocaleString()}
                        </div>
                      </div>
                      <div className={styles.itemMeta}>
                        <span className={styles.badge} style={{ backgroundColor: "var(--info-bg)", color: "var(--info)" }}>
                          Due Day: {fp.dueDateDay}
                        </span>
                        {Number(fp.lateFeeRule) > 0 && (
                          <span className={styles.badge} style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger)" }}>
                            Late Penalty: ₹{Number(fp.lateFeeRule)}
                          </span>
                        )}
                        <span className={styles.dateLabel}>
                          Added {new Date(fp.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
