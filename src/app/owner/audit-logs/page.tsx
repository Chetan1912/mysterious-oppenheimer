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

  const formatDetails = (detailStr: string | null) => {
    if (!detailStr) return "—";
    try {
      const parsed = JSON.parse(detailStr);
      return Object.entries(parsed)
        .map(([key, val]) => `${key}: ${typeof val === "object" ? JSON.stringify(val) : val}`)
        .join(", ");
    } catch (e) {
      return detailStr;
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
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <div>
                      <span style={{ fontWeight: 600 }}>{log.user.name}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--neutral-500)", display: "block" }}>
                        {log.user.email}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.roleBadge} data-role={log.user.role}>
                      {log.user.role}
                    </span>
                  </td>
                  <td>
                    <span className={styles.actionBadge}>{log.action}</span>
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--neutral-600)", maxWidth: "350px", wordBreak: "break-all" }}>
                    {formatDetails(log.details)}
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
