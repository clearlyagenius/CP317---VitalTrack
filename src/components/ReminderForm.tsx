"use client";

import { useState, useEffect } from "react";

interface Reminder {
  id: string;
  name: string;
  day: string;
  time: string;
  category: string;
  frequency: string;
  notifyVia: string;
  createdAt: string;
}

const CATEGORIES = ["Medicine", "Appointment", "Blood Test", "Exercise", "Other"];
const FREQUENCIES = ["Daily", "Weekly", "One-time"];
const DAYS = ["Every Day", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Specific Date"];
const NOTIFY_OPTIONS = ["Push + email", "Push", "Email"];

export default function ReminderForm() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [name, setName] = useState("");
  const [day, setDay] = useState("Every Day");
  const [customDate, setCustomDate] = useState("");
  const [hour, setHour] = useState("08");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");
  const [category, setCategory] = useState("Medicine");
  const [frequency, setFrequency] = useState("Daily");
  const [notifyVia, setNotifyVia] = useState("Push + email");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchReminders();
  }, []);

  async function fetchReminders() {
    try {
      const res = await fetch("/api/reminders");
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders);
      }
    } catch {
      // silently fail
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    let h = parseInt(hour, 10);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    const time = `${h.toString().padStart(2, "0")}:${minute}`;

    const finalDay = day === "Specific Date" ? customDate : day;

    if (day === "Specific Date" && !customDate) {
      setStatus("error");
      setMessage("Please select a specific date.");
      return;
    }

    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, day: finalDay, time, category, frequency, notifyVia }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage(`Reminder "${name}" saved!`);
        setName("");
        setDay("Every Day");
        setCustomDate("");
        setHour("08");
        setMinute("00");
        setAmpm("AM");
        setCategory("Medicine");
        setFrequency("Daily");
        setNotifyVia("Push + email");
        fetchReminders();
      } else {
        const result = await res.json();
        setStatus("error");
        setMessage(result.error || "Failed to save.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/reminders?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchReminders();
    } catch {
      // ignore
    }
  }

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  function formatDayDisplay(dayStr: string) {
    if (dayStr.includes("-")) {
      return new Date(dayStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return dayStr;
  }

  function isToday(reminder: Reminder) {
    // Check if the reminder's specific date matches today's local date (YYYY-MM-DD)
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISODate = new Date(today.getTime() - tzOffset).toISOString().split("T")[0];

    return reminder.frequency === "Daily" ||
      reminder.day === "Every Day" ||
      reminder.day === todayName ||
      reminder.day === localISODate;
  }

  // Split reminders into "Today" (daily/current day) and "Upcoming" (other days)
  function getTimeLabel(reminder: Reminder) {
    if (isToday(reminder)) {
      const now = new Date();
      const [hours, minutes] = reminder.time.split(":").map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);

      const diffMs = reminderTime.getTime() - now.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));

      if (diffHours < 0) return "Completed";
      if (diffHours === 0) return "Now";
      return `In ${diffHours} Hour${diffHours !== 1 ? "s" : ""}`;
    }

    return "This Week";
  }

  const todayReminders = reminders.filter(isToday);
  const upcomingReminders = reminders.filter((r) => !isToday(r));

  return (
    <div>
      {/* Status message */}
      {status === "success" && <div className="alert alert-success">{message}</div>}
      {status === "error" && <div className="alert alert-error">{message}</div>}

      {/* Create reminder form */}
      <form onSubmit={handleSubmit} className="reminder-form">
        <h2 className="reminder-form-title">+ Create a reminder</h2>

        {/* Name + Time row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div>
            <label htmlFor="reminderName">Reminder Name</label>
            <input
              id="reminderName"
              type="text"
              placeholder="e.g Vitamin D supplement"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Time</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="select-input"
                style={{ padding: "12px 6px", flex: 1.5, minWidth: 0 }}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="select-input"
                style={{ padding: "12px 6px", flex: 1, minWidth: 0 }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h.toString().padStart(2, "0")}>
                    {h.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="select-input"
                style={{ padding: "12px 6px", flex: 1, minWidth: 0 }}
              >
                {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={ampm}
                onChange={(e) => setAmpm(e.target.value)}
                className="select-input"
                style={{ padding: "12px 6px", flex: 1, minWidth: 0 }}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
            {day === "Specific Date" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="select-input"
                style={{ marginTop: 8 }}
                required
              />
            )}
          </div>
        </div>

        {/* Category chips */}
        <div style={{ marginTop: 16 }}>
          <label>Category</label>
          <div className="chip-group">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip ${category === cat ? "chip-active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency + Notify Via row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div>
            <label htmlFor="frequency">Frequency</label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="select-input"
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notifyVia">Notify Via</label>
            <select
              id="notifyVia"
              value={notifyVia}
              onChange={(e) => setNotifyVia(e.target.value)}
              className="select-input"
            >
              {NOTIFY_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Save button */}
        <button
          type="submit"
          className="btn-primary"
          disabled={status === "loading"}
          style={{ marginTop: 24 }}
        >
          {status === "loading" ? "Saving..." : "Save Reminder"}
        </button>
      </form>

      {/* Today's reminders */}
      {todayReminders.length > 0 && (
        <div className="reminder-section">
          <h2>Today</h2>
          {todayReminders.map((r) => (
            <div key={r.id} className="reminder-item">
              <div className="reminder-info">
                <span className="reminder-name">{r.name}</span>
                <span className="reminder-meta">{r.category} · {r.day !== "Every Day" ? formatDayDisplay(r.day) + " " : ""}{r.time}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className={`reminder-badge ${getTimeLabel(r) === "Completed" ? "reminder-badge-done" : ""}`}>
                  {getTimeLabel(r)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: "1.2rem", padding: "0 4px" }}
                  aria-label="Delete reminder"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming reminders */}
      {upcomingReminders.length > 0 && (
        <div className="reminder-section">
          <h2>Upcoming</h2>
          {upcomingReminders.map((r) => (
            <div key={r.id} className="reminder-item">
              <div className="reminder-info">
                <span className="reminder-name">{r.name}</span>
                <span className="reminder-meta">{r.category} · {r.day !== "Every Day" ? formatDayDisplay(r.day) + " " : ""}{r.time}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="reminder-badge">{getTimeLabel(r)}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: "1.2rem", padding: "0 4px" }}
                  aria-label="Delete reminder"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {reminders.length === 0 && (
        <p style={{ marginTop: 32, color: "var(--gray-400)", textAlign: "center" }}>
          No reminders yet. Create one above!
        </p>
      )}
    </div>
  );
}
