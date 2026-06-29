"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

interface BatchOpt {
  id: string;
  name: string;
}

interface FeePlanOpt {
  id: string;
  name: string;
  amount: number;
}

export default function StudentAdmission() {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchOpt[]>([]);
  const [feePlans, setFeePlans] = useState<FeePlanOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{ admissionId: string; parentEmail: string } | null>(null);

  // Form State
  const [studentName, setStudentName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [batchId, setBatchId] = useState("");
  const [feePlanId, setFeePlanId] = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchFormData = async () => {
    try {
      const res = await fetch("/api/owner/students/admission");
      if (res.ok) {
        const json = await res.json();
        setBatches(json.batches || []);
        setFeePlans(json.feePlans || []);
        if (json.batches?.length > 0) setBatchId(json.batches[0].id);
        if (json.feePlans?.length > 0) setFeePlanId(json.feePlans[0].id);
      } else {
        setError("Failed to load batches or fee plans");
      }
    } catch (err) {
      setError("Network error loading form options");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/owner/students/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          parentName,
          parentEmail,
          parentPhone,
          address,
          notes,
          batchId,
          feePlanId,
          joiningDate,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessData({
          admissionId: json.student.admissionId,
          parentEmail,
        });
        // Clear form
        setStudentName("");
        setParentName("");
        setParentEmail("");
        setParentPhone("");
        setAddress("");
        setNotes("");
      } else {
        setError(json.error || "Failed to submit admission record");
      }
    } catch (err) {
      setError("Network error submitting form");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading admission configurations...</p>
      </div>
    );
  }

  if (successData) {
    return (
      <div className={`${styles.successCard} card fade-in`}>
        <div className={styles.successIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2>Admission Successful!</h2>
        <p className={styles.successDesc}>The student has been successfully registered in the system.</p>

        <div className={styles.summaryDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Admission ID</span>
            <span className={styles.detailVal}>{successData.admissionId}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Parent Login Email</span>
            <span className={styles.detailVal}>{successData.parentEmail}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Default Password</span>
            <span className={styles.detailVal}><code>parent123</code></span>
          </div>
        </div>

        <div className="flex gap-4 justify-center" style={{ marginTop: "2rem" }}>
          <button className="btn btn-primary" onClick={() => setSuccessData(null)}>
            Admit Another Student
          </button>
          <button className="btn btn-secondary" onClick={() => router.push("/owner/students")}>
            View Student List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="card">
        <h2 style={{ marginBottom: "0.5rem" }}>Student Admission Form</h2>
        <p className={styles.subtitle} style={{ marginBottom: "2rem" }}>Register a new student and associate them with a parent account.</p>

        {error && <div className="error" style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "var(--danger-bg)", color: "var(--danger)", borderRadius: "var(--radius-sm)" }}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.sectionTitle}>1. Student Information</div>
          <div className="grid grid-cols-2 gap-6">
            <div className="form-group">
              <label className="form-label">Student Full Name *</label>
              <input
                className="form-control"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g., Aarav Gupta"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Joining Date *</label>
              <input
                className="form-control"
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="form-group">
              <label className="form-label">Assign Batch / Class *</label>
              <select
                className="form-control"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                required
                disabled={submitting}
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assign Fee Plan *</label>
              <select
                className="form-control"
                value={feePlanId}
                onChange={(e) => setFeePlanId(e.target.value)}
                required
                disabled={submitting}
              >
                {feePlans.map((fp) => (
                  <option key={fp.id} value={fp.id}>
                    {fp.name} (₹{Number(fp.amount).toLocaleString()}/month)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Residential Address</label>
            <input
              className="form-control"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 102, Shanti Kunj, Sector 4, Dwarka"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Academic Background / Notes</label>
            <textarea
              className="form-control"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific background notes, weaknesses, strengths, etc."
              rows={3}
              disabled={submitting}
              style={{ resize: "vertical" }}
            />
          </div>

          <div className={styles.sectionTitle} style={{ marginTop: "2rem" }}>2. Parent Information</div>
          <div className="grid grid-cols-3 gap-6">
            <div className="form-group">
              <label className="form-label">Parent Full Name *</label>
              <input
                className="form-control"
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g., Rajesh Gupta"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent Email Address *</label>
              <input
                className="form-control"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent Contact Number</label>
              <input
                className="form-control"
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="e.g., +919876543212"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex gap-4 justify-end" style={{ marginTop: "2.5rem", borderTop: "1px solid var(--neutral-200)", paddingTop: "1.5rem" }}>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Complete Admission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
