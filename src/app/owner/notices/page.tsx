"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";

interface Notice {
  id: string;
  title: string;
  content: string;
  targetRoles: string[];
  createdAt: string;
}

export default function OwnerNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetParents, setTargetParents] = useState(true);
  const [targetTeachers, setTargetTeachers] = useState(true);

  const fetchNotices = async () => {
    try {
      const res = await fetch("/api/owner/notices");
      if (res.ok) {
        const json = await res.json();
        setNotices(json.notices || []);
      } else {
        setError("Failed to load notices");
      }
    } catch (err) {
      setError("Network error loading notice board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const targetRoles: string[] = [];
    if (targetParents) targetRoles.push("PARENT");
    if (targetTeachers) targetRoles.push("TEACHER");

    if (targetRoles.length === 0) {
      setError("Please select at least one target role (Parents or Teachers).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/owner/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          targetRoles,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        alert("Notice published successfully!");
        setTitle("");
        setContent("");
        fetchNotices();
      } else {
        setError(json.error || "Failed to publish notice");
      }
    } catch (err) {
      setError("Network error publishing notice");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading notices...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div>
        <h2>Notice Board & Announcements</h2>
        <p className={styles.subtitle}>Publish exam alerts, holiday schedules, fee reminders, or emergency class timing updates.</p>
      </div>

      {/* Main Grid: Form + List */}
      <div className={`${styles.mainGrid} grid gap-6`}>
        {/* Left Column: Form */}
        <div className="card">
          <h3>Create Announcement</h3>
          {error && <div className="error" style={{ margin: "1rem 0" }}>{error}</div>}

          <form onSubmit={handlePostNotice} style={{ marginTop: "1.5rem" }}>
            <div className="form-group">
              <label className="form-label">Notice Title *</label>
              <input
                className="form-control"
                type="text"
                placeholder="e.g., Summer Vacation Holiday, Midterm Timetable"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Audience *</label>
              <div className="flex gap-6" style={{ paddingTop: "0.25rem" }}>
                <label className="flex align-center gap-2" style={{ cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={targetParents}
                    onChange={(e) => setTargetParents(e.target.checked)}
                    disabled={submitting}
                    style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                  />
                  <span>Parents / Students</span>
                </label>

                <label className="flex align-center gap-2" style={{ cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={targetTeachers}
                    onChange={(e) => setTargetTeachers(e.target.checked)}
                    disabled={submitting}
                    style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                  />
                  <span>Teachers</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notice Content *</label>
              <textarea
                className="form-control"
                placeholder="Write the details of the announcement here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                disabled={submitting}
                rows={5}
                style={{ resize: "vertical" }}
              />
            </div>

            <button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: "1rem" }} disabled={submitting}>
              {submitting ? "Publishing..." : "Publish Announcement"}
            </button>
          </form>
        </div>

        {/* Right Column: List */}
        <div className="card">
          <h3>Announcement History</h3>
          {notices.length === 0 ? (
            <p className={styles.emptyText} style={{ marginTop: "1.5rem" }}>No announcements published yet.</p>
          ) : (
            <div className={styles.noticeTimeline} style={{ marginTop: "1.5rem" }}>
              {notices.map((notice) => (
                <div key={notice.id} className={styles.noticeItem}>
                  <div className={styles.noticeHeader}>
                    <strong>{notice.title}</strong>
                    <span className={styles.noticeDate}>
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={styles.noticeBody}>{notice.content}</p>
                  <div className="flex gap-2" style={{ marginTop: "0.5rem" }}>
                    {notice.targetRoles.map((role) => (
                      <span key={role} className={styles.roleBadge}>
                        {role === "PARENT" ? "Parents" : "Teachers"}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
