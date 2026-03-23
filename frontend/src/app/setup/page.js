"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // Redirect away if setup is not required
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/setup/status`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.setup_required) {
          router.replace("/admin");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/setup/admin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed.");

      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "40px",
          borderRadius: "8px",
          border: "1px solid #eee",
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          System Setup
        </h1>
        <p style={{ color: "#666", fontSize: "14px", marginBottom: "28px" }}>
          Create the administrator account. This page is only available once.
        </p>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                color: "#16a34a",
                fontWeight: 600,
                marginBottom: "16px",
              }}
            >
              Admin account created successfully.
            </p>
            <a
              href="/api/auth/login"
              style={{
                display: "inline-block",
                padding: "10px 24px",
                background: "#111",
                color: "#fff",
                borderRadius: "4px",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Proceed to Login
            </a>
          </div>
        ) : (
          <>
            {[
              {
                label: "Full Name",
                key: "name",
                type: "text",
                placeholder: "Benjamin Ogola",
              },
              {
                label: "Email Address",
                key: "email",
                type: "email",
                placeholder: "admin@example.com",
              },
              {
                label: "Password",
                key: "password",
                type: "password",
                placeholder: "Minimum 8 characters",
              },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "6px",
                  }}
                >
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            {error && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "4px",
                  color: "#dc2626",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !form.name || !form.email || !form.password}
              style={{
                width: "100%",
                padding: "10px",
                background: loading ? "#ccc" : "#111",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "14px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {loading ? "Creating account..." : "Create Admin Account"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
