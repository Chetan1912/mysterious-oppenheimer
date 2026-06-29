"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";

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

interface ChildAcademics {
  id: string;
  name: string;
  admissionId: string;
  marks: Mark[];
}

export default function ParentReports() {
  const [children, setChildren] = useState<ChildAcademics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/parent/reports");
      if (res.ok) {
        const json = await res.json();
        setChildren(json.children || []);
      } else {
        setError("Failed to load academic reports");
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

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading academic reports...</p>
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
        <h2>Academic Performance Reports</h2>
        <p className={styles.subtitle}>Track your child&apos;s examination scores, progress trends, and teacher feedback.</p>
      </div>

      {/* Children Reports */}
      <div className="flex flex-col gap-8">
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
                      <th>Test Date</th>
                      <th>Test Name</th>
                      <th>Score obtained</th>
                      <th>Percentage</th>
                      <th>Teacher Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {child.marks.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--neutral-400)", padding: "2rem" }}>
                          No test marks have been recorded for this student yet.
                        </td>
                      </tr>
                    ) : (
                      child.marks.map((m) => {
                        const score = Number(m.score);
                        const percent = ((score / m.test.maxMarks) * 100).toFixed(1);
                        return (
                          <tr key={m.id}>
                            <td>{new Date(m.test.testDate).toLocaleDateString()}</td>
                            <td><strong>{m.test.title}</strong></td>
                            <td><strong>{score}</strong> / {m.test.maxMarks}</td>
                            <td>
                              <span
                                className={styles.percentText}
                                style={{
                                  color: score / m.test.maxMarks >= 0.75 ? "var(--success)" : score / m.test.maxMarks >= 0.4 ? "var(--warning)" : "var(--danger)",
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
          ))
        )}
      </div>
    </div>
  );
}
