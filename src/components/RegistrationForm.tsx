"use client";

import { useState, type FormEvent } from "react";

export default function RegistrationForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = e.currentTarget;
    const data = {
      firstName: (form.elements.namedItem("firstName") as HTMLInputElement).value.trim(),
      lastName: (form.elements.namedItem("lastName") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      dateOfBirth: (form.elements.namedItem("dateOfBirth") as HTMLInputElement).value,
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        window.location.href = "/dashboard/reports";
      } else {
        setStatus("error");
        setMessage(result.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      {/* Status messages */}
      {status === "success" && <div className="alert alert-success">{message}</div>}
      {status === "error" && <div className="alert alert-error">{message}</div>}

      {/* Name row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div>
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            placeholder="John"
            required
          />
        </div>
        <div>
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Doe"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div style={{ marginTop: 16 }}>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>

      {/* Password */}
      <div style={{ marginTop: 16 }}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Min. 8 characters"
          minLength={8}
          required
        />
      </div>

      {/* Date of Birth */}
      <div style={{ marginTop: 16 }}>
        <label htmlFor="dateOfBirth">Date of Birth</label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          required
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="btn-primary"
        disabled={status === "loading"}
        style={{ marginTop: 24 }}
      >
        {status === "loading" ? "Creating Account..." : "Create Account"}
      </button>
    </form>
  );
}
