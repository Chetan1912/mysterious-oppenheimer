"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";

interface Batch {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  startTime: string;
  endTime: string;
  isExtraClass: boolean;
  isCancelled: boolean;
  notes: string | null;
  batch: { name: string };
}

export default function TeacherSchedule() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form State for New Schedule
  const [batchId, setBatchId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("16:00");
  const [durationMins, setDurationMins] = useState("90");
  const [isExtraClass, setIsExtraClass] = useState(false);
  const [notes, setNotes] = useState("");

  const fetchScheduleData = async () => {
    try {
      const res = await fetch("/api/teacher/schedule");
      if (res.ok) {
        const json = await res.json();
        setSchedules(json.schedules || []);
        setBatches(json.batches || []);
        if (json.batches?.length > 0) {
          setBatchId(json.batches[0].id);
        }
      } else {
        setError("Failed to load schedule data");
      }
    } catch (err) {
      setError("Network error loading schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId || !startDate || !startTime || !durationMins) return;

    setSubmitting(true);
    setError("");

    // Calculate start and end times
    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(start.getTime() + parseInt(durationMins, 10) * 60000);

    try {
      const res = await fetch("/api/teacher/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          isExtraClass,
          notes,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        alert("Class scheduled successfully!");
        setNotes("");
        setIsExtraClass(false);
        fetchScheduleData(); // Refresh list
      } else {
        setError(json.error || "Failed to schedule class");
      }
    } catch (err) {
      setError("Network error scheduling class");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClass = async (scheduleId: string) => {
    const confirmCancel = confirm("Are you sure you want to cancel this class? Parents will be notified immediately.");
    if (!confirmCancel) return;

    try {
      const res = await fetch("/api/teacher/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId,
          isCancelled: true,
        }),
      });

      if (res.ok) {
        alert("Class cancelled successfully!");
        fetchScheduleData();
      } else {
        alert("Failed to cancel class");
      }
    } catch (err) {
      alert("Error cancelling class");
    }
  };

  const formatDate = (timeStr: string) => {
    return new Date(timeStr).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading schedule planner...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div>
        <h2>Schedule Planner</h2>
        <p className={styles.subtitle}>Plan your weekly classes, schedule extra revision sessions, or cancel scheduled classes.</p>
      </div>

      {/* Main Grid: Form + List */}
      <div className={`${styles.mainGrid} grid gap-6`}>
        {/* Left Side: Create Schedule Form */}
        <div className="card">
          <h3>Schedule a New Class</h3>
          {error && <div className="error" style={{ margin: "1rem 0" }}>{error}</div>}

          <form onSubmit={handleCreateSchedule} style={{ marginTop: "1.5rem" }}>
            <div className="form-group">
              <label className="form-label">Select Batch *</label>
              <select
                className="form-control"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                required
                disabled={submitting}
              >
                {batches.length === 0 ? (
                  <option value="">No batches assigned</option>
                ) : (
                  batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Class Date *</label>
                <input
                  className="form-control"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <input
                  className="form-control"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Duration (Minutes) *</label>
                <select
                  className="form-control"
                  value={durationMins}
                  onChange={(e) => setDurationMins(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                  <option value="180">180 minutes</option>
                </select>
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "center", paddingTop: "1.75rem" }}>
                <label className="flex align-center gap-2" style={{ cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={isExtraClass}
                    onChange={(e) => setIsExtraClass(e.target.checked)}
                    disabled={submitting}
                    style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                  />
                  <span>Mark as Extra Class</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Topic / Instructions</label>
              <input
                className="form-control"
                type="text"
                placeholder="e.g., Solving quadratic equations, bring text book"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
              />
            </div>

            <button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: "1rem" }} disabled={submitting || batches.length === 0}>
              {submitting ? "Scheduling..." : "Schedule Session"}
            </button>
          </form>
        </div>

        {/* Right Side: Timetable List */}
        <div className="card">
          <h3>Schedules & Timetable</h3>
          {schedules.length === 0 ? (
            <p className={styles.emptyText} style={{ marginTop: "1.5rem" }}>No classes scheduled yet.</p>
          ) : (
            <div className={styles.scheduleTimeline} style={{ marginTop: "1.5rem" }}>
              {schedules.map((sched) => (
                <div
                  key={sched.id}
                  className={`${styles.scheduleItem} ${sched.isExtraClass ? styles.extraClass : ""} ${sched.isCancelled ? styles.cancelledClass : ""}`}
                >
                  <div className={styles.scheduleHeader}>
                    <div>
                      <strong>{sched.batch.name}</strong>
                      <div className={styles.timeInfo}>
                        {formatDate(sched.startTime)} | {formatTime(sched.startTime)} - {formatTime(sched.endTime)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {sched.isExtraClass && <span className="badge badge-partial">Extra</span>}
                      {sched.isCancelled && <span className="badge badge-pending">Cancelled</span>}
                    </div>
                  </div>
                  {sched.notes && <p className={styles.notesText}>✏️ {sched.notes}</p>}
                  
                  {!sched.isCancelled && (
                    <button
                      className={`${styles.cancelBtn} btn-danger`}
                      onClick={() => handleCancelClass(sched.id)}
                    >
                      Cancel Class
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
