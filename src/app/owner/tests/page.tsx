"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";

interface Test {
  id: string;
  title: string;
  maxMarks: number;
  testDate: string;
  batch: { name: string };
  _count: { marks: number };
}

interface Mark {
  id: string;
  score: number;
  remarks: string | null;
  student: {
    name: string;
    admissionId: string;
  };
}

interface TestDetail {
  test: {
    title: string;
    maxMarks: number;
    testDate: string;
    batch: { name: string };
  };
  marks: Mark[];
  stats: {
    highest: number;
    lowest: number;
    average: number;
    count: number;
  };
}

export default function OwnerTests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State
  const [selectedTestId, setSelectedTestId] = useState("");
  const [testDetail, setTestDetail] = useState<TestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await fetch("/api/owner/tests");
      if (res.ok) {
        const json = await res.json();
        setTests(json.tests || []);
      } else {
        setError("Failed to load tests");
      }
    } catch (err) {
      setError("Network error loading tests");
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = async (testId: string) => {
    setSelectedTestId(testId);
    setDetailLoading(true);
    setIsModalOpen(true);
    try {
      const res = await fetch(`/api/owner/tests?testId=${testId}`);
      if (res.ok) {
        const json = await res.json();
        setTestDetail(json);
      } else {
        alert("Failed to load test details");
        setIsModalOpen(false);
      }
    } catch (err) {
      alert("Error loading test details");
      setIsModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading tests...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div>
        <h2>Test & Examination Records</h2>
        <p className={styles.subtitle}>Review academic performances, class averages, and test marks recorded by teachers.</p>
      </div>

      {/* Tests Table */}
      {tests.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--neutral-500)" }}>No tests have been created yet.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Batch / Class</th>
                <th>Test Date</th>
                <th>Max Marks</th>
                <th>Graded Students</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id}>
                  <td><strong>{test.title}</strong></td>
                  <td>
                    <span className={styles.batchBadge}>{test.batch.name}</span>
                  </td>
                  <td>{new Date(test.testDate).toLocaleDateString()}</td>
                  <td>{test.maxMarks} marks</td>
                  <td>{test._count.marks} graded</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8125rem" }}
                      onClick={() => handleViewResults(test.id)}
                    >
                      View Results
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results Detail Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} card fade-in`}>
            <div className="flex justify-between align-center" style={{ marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.125rem" }}>Test Performance Report</h3>
                {testDetail && <p className={styles.modalSubtitle}>{testDetail.test.batch.name} • {testDetail.test.title}</p>}
              </div>
              <button className={styles.closeBtn} onClick={() => { setIsModalOpen(false); setTestDetail(null); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {detailLoading || !testDetail ? (
              <div className={styles.loading} style={{ height: "30vh" }}>
                <div className="spinner"></div>
                <p>Loading scores sheet...</p>
              </div>
            ) : (
              <div className={styles.modalContent}>
                {/* Stats Grid */}
                <div className={`${styles.statsGrid} grid grid-cols-3 gap-4`}>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Class Average</span>
                    <h3 className={styles.statVal}>{testDetail.stats.average}</h3>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Highest Score</span>
                    <h3 className={styles.statVal} style={{ color: "var(--success)" }}>{testDetail.stats.highest}</h3>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Lowest Score</span>
                    <h3 className={styles.statVal} style={{ color: "var(--danger)" }}>{testDetail.stats.lowest}</h3>
                  </div>
                </div>

                {/* Score Sheet */}
                <h4 style={{ marginTop: "1.5rem", marginBottom: "0.75rem" }}>Student Grades</h4>
                <div className={styles.scoresList}>
                  {testDetail.marks.length === 0 ? (
                    <p style={{ color: "var(--neutral-500)", fontSize: "0.875rem", padding: "1rem 0" }}>No scores entered.</p>
                  ) : (
                    testDetail.marks.map((m) => {
                      const score = Number(m.score);
                      const percent = ((score / testDetail.test.maxMarks) * 100).toFixed(0);
                      return (
                        <div key={m.id} className={styles.scoreRow}>
                          <div>
                            <span className={styles.studentName}>{m.student.name}</span>
                            <span className={styles.studentId}>{m.student.admissionId}</span>
                            {m.remarks && <p className={styles.remarksText}>Remark: {m.remarks}</p>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span className={styles.scoreText}>{score} / {testDetail.test.maxMarks}</span>
                            <span
                              className={styles.percentText}
                              style={{
                                color: score / testDetail.test.maxMarks >= 0.75 ? "var(--success)" : score / testDetail.test.maxMarks >= 0.4 ? "var(--warning)" : "var(--danger)",
                                fontWeight: "bold",
                                fontSize: "0.75rem",
                              }}
                            >
                              {percent}%
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
