"use client";

import { useState, useEffect, type FormEvent } from "react";

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
}

export default function SettingsForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Load current profile on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
        setMessage(data.error);
        setStatus("error");
      } else {
        setProfile(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setEmail(data.email);
        setDateOfBirth(data.dateOfBirth);
      }
      })
      .catch(() => {
        setMessage("Failed to load profile.");
        setStatus("error");
      })
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = profile
    ? firstName !== profile.firstName ||
    lastName !== profile.lastName ||
    email !== profile.email ||
    dateOfBirth !== profile.dateOfBirth ||
    newPassword.length > 0
    : false;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    setMessage("");

    // Client-side validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !dateOfBirth) {
      setStatus("error");
      setMessage("All profile fields are required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        setStatus("error");
        setMessage("Please enter your current password to change it.");
        return;
      }
      if (newPassword.length < 8) {
        setStatus("error");
        setMessage("New password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setStatus("error");
        setMessage("New passwords do not match.");
        return;
      }
    }

    setStatus("saving");

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          dateOfBirth,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("Your profile has been updated.");
        // Reset password fields
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Update local profile snapshot so "hasChanges" resets
        setProfile({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), dateOfBirth });
      } else {
        setStatus("error");
        setMessage(result.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <h1>Account Settings</h1>
        <p style={{ color: "var(--gray-400)", marginTop: 24 }}>Loading your profile…</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>Account Settings</h1>
          <p className="settings-subtitle">Manage your profile information and password.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="settings-form" noValidate>
        {/* Status messages */}
        {status === "success" && <div className="alert alert-success">{message}</div>}
        {status === "error" && <div className="alert alert-error">{message}</div>}

        {/* ---- Profile Section ---- */}
        <div className="settings-section">
          <h2 className="settings-section-title">Profile Information</h2>
          <p className="settings-section-desc">Update your personal details below.</p>

          <div className="settings-field-row">
            <div className="settings-field">
              <label htmlFor="settings-firstName">First Name</label>
              <input
                id="settings-firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-lastName">Last Name</label>
              <input
                id="settings-lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="settings-field">
            <label htmlFor="settings-email">Email Address</label>
            <input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="settings-field">
            <label htmlFor="settings-dob">Date of Birth</label>
            <input
              id="settings-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />
          </div>
        </div>

        {/* ---- Password Section ---- */}
        <div className="settings-section">
          <h2 className="settings-section-title">Change Password</h2>
          <p className="settings-section-desc">Leave blank to keep your current password.</p>

          <div className="settings-field">
            <label htmlFor="settings-currentPassword">Current Password</label>
            <input
              id="settings-currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
          </div>

          <div className="settings-field-row">
            <div className="settings-field">
              <label htmlFor="settings-newPassword">New Password</label>
              <input
                id="settings-newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-confirmPassword">Confirm New Password</label>
              <input
                id="settings-confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        {/* ---- Submit ---- */}
        <div className="settings-actions">
          <button
            type="submit"
            className="btn-primary settings-save-btn"
            disabled={status === "saving" || !hasChanges}
          >
            {status === "saving" ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
