"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";

interface Schedule {
  id: string;
  startTime: string;
  endTime: string;
  isExtraClass: boolean;
  isCancelled: boolean;
  notes: string | null;
  teacher: {
    user: { name: string };
  };
}

interface ChildSchedule {
  id: string;
  name: string;
  admissionId: string;
  batch: {
    name: string;
    schedules: Schedule[];
  } | null;
}

export default function ParentSchedule() {
  const [children, setChildren] = useState<ChildSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const res = await fetch("/api/parent/schedule");
      if (res.ok) {
        const json = await res.json();
        setChildren(json.children || []);
      } else {
        setError("Failed to load class schedule");
      }
    } catch (err) {
      setError("Network error loading schedule");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timeStr: string) => {
    return new Date(timeStr).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading class schedule...</p>
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
        <h2>Class Timetable & Schedule</h2>
        <p className={styles.subtitle}>Stay updated with your child's weekly classes, holiday announcements, and extra sessions.</p>
      </div>

      {/* Children Schedules */}
      <div className="flex flex-col gap-8">
        {children.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--neutral-500)" }}>No student records found.</p>
          </div>
        ) : (
          children.map((child) => (
            <div key={child.id} className="card">
              <div className={styles.childHeader} style={{ marginBottom: "1.5rem" }}>
                <div>
                  <h3>{child.name}</h3>
                  <p className={styles.batchName}>Batch: {child.batch ? child.batch.name : "Unassigned"}</p>
                </div>
                <span className={styles.admissionId}>{child.admissionId}</span>
              </div>

              {!child.batch || child.batch.schedules.length === 0 ? (
                <p className={styles.emptyText}>No upcoming classes scheduled for this batch.</p>
              ) : (
                <div className={styles.scheduleTimeline}>
                  {child.batch.schedules.map((sched) => (
                    <div
                      key={sched.id}
                      className={`${styles.scheduleItem} ${sched.isExtraClass ? styles.extraClass : ""} ${sched.isCancelled ? styles.cancelledClass : ""}`}
                    >
                      <div className={styles.timeCol}>
                        <span className={styles.dateText}>{formatDate(sched.startTime)}</span>
                        <span className={styles.timeText}>
                          {formatTime(sched.startTime)} - {formatTime(sched.endTime)}
                        </span>
                      </div>
                      
                      <div className={styles.infoCol}>
                        <div className="flex justify-between align-center">
                          <span className={styles.teacherName}>Instructor: {sched.teacher.user.name}</span>
                          <div className="flex gap-2">
                            {sched.isExtraClass && <span className="badge badge-partial">Extra Class</span>}
                            {sched.isCancelled && <span className="badge badge-pending">Cancelled</span>}
                          </div>
                        </div>
                        {sched.notes && <p className={styles.notesText}>📝 {sched.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
