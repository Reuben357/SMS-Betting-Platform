"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Midnight Gold theme (consistent with the rest of the app)
const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // Redirect away if setup is not required (i.e., admin already exists)
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
        background: BG_DARK,
      }}
    >
      <div
        style={{
          background: CARD_BG,
          padding: "40px",
          borderRadius: "16px",
          border: `1px solid ${GOLD}33`,
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            marginBottom: "8px",
            color: GOLD,
          }}
        >
          MULTITIPS Setup
        </h1>
        <p
          style={{
            color: TEXT_SECONDARY,
            fontSize: "14px",
            marginBottom: "28px",
          }}
        >
          Create the administrator account. This page is only available once.
        </p>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                color: "#10B981",
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
                background: GOLD,
                color: BG_DARK,
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "bold",
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
                    color: TEXT_SECONDARY,
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
                    border: `1px solid ${GOLD}33`,
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: BG_DARK,
                    color: TEXT_PRIMARY,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            {error && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "#2A1C1C",
                  border: "1px solid #EF4444",
                  borderRadius: "8px",
                  color: "#EF4444",
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
                background: loading ? TEXT_SECONDARY : GOLD,
                color: BG_DARK,
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
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
