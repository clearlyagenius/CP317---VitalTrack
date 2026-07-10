import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="page-container">
      <div className="animate-in" style={{ width: "100%", maxWidth: 460 }}>
        {/* Brand */}
        <div className="brand">
          <span className="brand-name">VitalTrack</span>
        </div>

        {/* Login Card */}
        <div className="card" style={{ marginTop: 24 }}>
          <h1 style={{ marginBottom: 24 }}>Welcome back</h1>
          <LoginForm />
        </div>

        {/* Footer link */}
        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: "0.9rem",
            color: "var(--gray-500)",
          }}
        >
          Don&apos;t have an account?{" "}
          <a href="/register">Sign up</a>
        </p>
      </div>
    </main>
  );
}
