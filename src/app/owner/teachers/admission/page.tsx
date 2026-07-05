"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function TeacherAdmission() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{ name: string; email: string } | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/owner/teachers/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessData({
          name: json.teacher.user.name,
          email: json.teacher.user.email,
        });
        // Clear form
        setName("");
        setEmail("");
        setPassword("");
        setPhone("");
      } else {
        setError(json.error || "Failed to register teacher");
      }
    } catch (err) {
      setError("Network error submitting form");
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className={`${styles.successCard} card fade-in`}>
        <div className={styles.successIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2>Registration Successful!</h2>
        <p className={styles.successDesc}>The teacher has been successfully registered and can now log in.</p>

        <div className={styles.summaryDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Teacher Name</span>
            <span className={styles.detailVal}>{successData.name}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Login Email (Gmail)</span>
            <span className={styles.detailVal}>{successData.email}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Login Credentials Status</span>
            <span className={styles.detailVal}>Active</span>
          </div>
        </div>

        <div className="flex gap-4 justify-center" style={{ marginTop: "2rem" }}>
          <button className="btn btn-primary" onClick={() => setSuccessData(null)}>
            Admit Another Teacher
          </button>
          <button className="btn btn-secondary" onClick={() => router.push("/owner/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="card">
        <h2 style={{ marginBottom: "0.5rem" }}>Teacher Admission Form</h2>
        <p className={styles.subtitle} style={{ marginBottom: "2rem" }}>Register a new teacher and create their system credentials.</p>

        {error && (
          <div
            className="error"
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              backgroundColor: "var(--danger-bg)",
              color: "var(--danger)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="grid grid-cols-2 gap-6">
            <div className="form-group">
              <label className="form-label">Teacher Full Name *</label>
              <input
                className="form-control"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Prof. Rajesh Kumar"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gmail / Email Address *</label>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@gmail.com"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="form-group">
              <label className="form-label">Portal Password *</label>
              <input
                className="form-control"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set secure password"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone Number</label>
              <input
                className="form-control"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +919988776655"
                disabled={submitting}
              />
            </div>
          </div>

          <div
            className="flex gap-4 justify-end"
            style={{
              marginTop: "2.5rem",
              borderTop: "1px solid var(--neutral-200)",
              paddingTop: "1.5rem",
            }}
          >
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Complete Teacher Admission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
