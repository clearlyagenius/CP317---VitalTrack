"use client";

import { useState, type FormEvent } from "react";

export default function LoginForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = e.currentTarget;
    const data = {
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    };

    try {
      const res = await fetch("/api/login", {
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
    <form onSubmit={handleSubmit}>
      {/* Status messages */}
      {status === "success" && <div className="alert alert-success">{message}</div>}
      {status === "error" && <div className="alert alert-error">{message}</div>}

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
          placeholder="Enter your password"
          minLength={8}
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
        {status === "loading" ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}
