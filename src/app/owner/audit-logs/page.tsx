"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/owner/audit-logs");
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
      } else {
        setError("Failed to load audit logs");
      }
    } catch (err) {
      setError("Network error loading audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const renderDetails = (detailStr: string | null) => {
    if (!detailStr) return <span>—</span>;
    try {
      const parsed = JSON.parse(detailStr);
      const entries = Object.entries(parsed);
      if (entries.length === 0) return <span>—</span>;
      return (
        <div className={styles.detailsGrid}>
          {entries.map(([key, val]) => {
            const displayVal = typeof val === "object" ? JSON.stringify(val) : String(val);
            return (
              <div key={key} className={styles.detailItem}>
                <span className={styles.detailKey}>{key}:</span>
                <span className={styles.detailVal}>{displayVal}</span>
              </div>
            );
          })}
        </div>
      );
    } catch (e) {
      return <span style={{ wordBreak: "break-all" }}>{detailStr}</span>;
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading audit logs...</p>
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
        <h2>System Audit Logs</h2>
        <p className={styles.subtitle}>View a record of all critical administrative and academic actions performed on the portal.</p>
      </div>

      {/* Logs Table */}
      {logs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--neutral-500)" }}>No audit logs recorded yet.</p>
        </div>
      ) : (
        <div className={`table-container ${styles.tableContainer}`}>
          <table className={`table ${styles.table}`}>
            <thead>
              <tr>
                <th className={styles.colUser}>User</th>
                <th className={styles.colRole}>Role</th>
                <th className={styles.colAction}>Action</th>
                <th className={styles.colTime}>Timestamp</th>
                <th className={styles.colDetails}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td data-label="User" className={styles.colUser}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{log.user.name}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--neutral-500)", display: "block" }}>
                        {log.user.email}
                      </span>
                    </div>
                  </td>
                  <td data-label="Role" className={styles.colRole}>
                    <span className={styles.roleBadge} data-role={log.user.role}>
                      {log.user.role}
                    </span>
                  </td>
                  <td data-label="Action" className={styles.colAction}>
                    <span className={styles.actionBadge}>{log.action}</span>
                  </td>
                  <td data-label="Timestamp" className={styles.colTime}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td data-label="Details" className={styles.colDetails}>
                    {renderDetails(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
