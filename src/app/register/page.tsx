import RegistrationForm from "@/components/RegistrationForm";

export default function RegisterPage() {
  return (
    <main className="page-container">
      <div className="animate-in" style={{ width: "100%", maxWidth: 460 }}>
        {/* Brand */}
        <div className="brand">
          <span className="brand-name">VitalTrack</span>
        </div>

        {/* Registration Card */}
        <div className="card" style={{ marginTop: 24 }}>
          <h1 style={{ marginBottom: 24 }}>Create your account</h1>
          <RegistrationForm />
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
          Already have an account?{" "}
          <a href="/login">Log in</a>
        </p>
      </div>
    </main>
  );
}
