"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import TopBar from "@/components/TopBar";

const emptyForm = { name: "", price: "", tip_count: "", game_count: "" };

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const abortRef = useRef(null);

  const fetchPackages = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await fetch("/api/proxy/packages", {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to load packages.");
      const data = await res.json();
      setPackages(data.packages ?? []);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchPackages]);

  function startEdit(pkg) {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      price: String(pkg.price),
      tip_count: String(pkg.tip_count),
      game_count: String(pkg.game_count),
    });
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const url = editingId
        ? `/api/proxy/packages/${editingId}`
        : "/api/proxy/packages";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          price: Number(form.price),
          tip_count: Number(form.tip_count),
          game_count: Number(form.game_count),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setSuccess(editingId ? "Package updated." : "Package created.");
      setEditingId(null);
      setForm(emptyForm);
      fetchPackages();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    if (
      !confirm(
        "Deactivate this package? It will no longer be available for purchase.",
      )
    )
      return;
    try {
      const res = await fetch(`/api/proxy/packages/${id}/deactivate`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deactivate.");
      setSuccess("Package deactivated.");
      fetchPackages();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReactivate(id) {
    try {
      const res = await fetch(`/api/proxy/packages/${id}/reactivate`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reactivate.");
      setSuccess("Package reactivated.");
      fetchPackages();
    } catch (err) {
      setError(err.message);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #475569",
    borderRadius: "4px",
    fontSize: "13px",
    background: "#0f172a",
    color: "#f1f5f9",
    boxSizing: "border-box",
  };

  return (
    <>
      <TopBar title="Packages" />
      <div style={{ padding: "32px", maxWidth: "900px" }}>
        {/* Form */}
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#f1f5f9",
              marginBottom: "16px",
            }}
          >
            {editingId ? "Edit Package" : "Add New Package"}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            {[
              {
                label: "Package Name",
                key: "name",
                placeholder: "e.g. 4 Odds",
              },
              {
                label: "Price (KES)",
                key: "price",
                placeholder: "e.g. 50",
                type: "number",
              },
              {
                label: "Number of Tips",
                key: "tip_count",
                placeholder: "e.g. 4",
                type: "number",
              },
              {
                label: "Number of Games",
                key: "game_count",
                placeholder: "e.g. 5",
                type: "number",
              },
            ].map(({ label, key, placeholder, type = "text" }) => (
              <div key={key}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#94a3b8",
                    marginBottom: "4px",
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
                  style={inputStyle}
                  min={type === "number" ? 1 : undefined}
                />
              </div>
            ))}
          </div>

          {error && (
            <div
              style={{
                padding: "10px 12px",
                background: "#450a0a",
                border: "1px solid #991b1b",
                borderRadius: "4px",
                color: "#fca5a5",
                fontSize: "13px",
                marginBottom: "12px",
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              style={{
                padding: "10px 12px",
                background: "#052e16",
                border: "1px solid #166534",
                borderRadius: "4px",
                color: "#86efac",
                fontSize: "13px",
                marginBottom: "12px",
              }}
            >
              {success}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleSave}
              disabled={
                saving ||
                !form.name ||
                !form.price ||
                !form.tip_count ||
                !form.game_count
              }
              style={{
                padding: "8px 20px",
                background: saving ? "#334155" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Package"
                  : "Create Package"}
            </button>
            {editingId && (
              <button
                onClick={cancelEdit}
                style={{
                  padding: "8px 16px",
                  background: "none",
                  border: "1px solid #475569",
                  borderRadius: "4px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Packages Table */}
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
          }}
        >
          <div
            style={{ padding: "16px 20px", borderBottom: "1px solid #334155" }}
          >
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#f1f5f9" }}>
              Current Packages
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {[
                    "Name",
                    "Price (KES)",
                    "Tips",
                    "Games",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        color: "#94a3b8",
                        fontWeight: 600,
                        borderBottom: "1px solid #334155",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "32px",
                        textAlign: "center",
                        color: "#475569",
                      }}
                    >
                      Loading...
                    </td>
                  </tr>
                ) : packages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "32px",
                        textAlign: "center",
                        color: "#475569",
                      }}
                    >
                      No packages yet.
                    </td>
                  </tr>
                ) : (
                  packages.map((pkg) => (
                    <tr
                      key={pkg.id}
                      style={{
                        borderBottom: "1px solid #1e293b",
                        opacity: pkg.is_active ? 1 : 0.5,
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "#f1f5f9",
                          fontWeight: 500,
                        }}
                      >
                        {pkg.name}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "#34d399",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {Number(pkg.price).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#94a3b8" }}>
                        {pkg.tip_count}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#94a3b8" }}>
                        {pkg.game_count}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "2px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: pkg.is_active
                              ? "#052e1622"
                              : "#45091022",
                            color: pkg.is_active ? "#34d399" : "#f87171",
                            border: `1px solid ${pkg.is_active ? "#166534" : "#991b1b"}`,
                          }}
                        >
                          {pkg.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => startEdit(pkg)}
                            style={{
                              padding: "4px 12px",
                              background: "none",
                              border: "1px solid #475569",
                              borderRadius: "4px",
                              color: "#94a3b8",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            Edit
                          </button>
                          {pkg.is_active ? (
                            <button
                              onClick={() => handleDeactivate(pkg.id)}
                              style={{
                                padding: "4px 12px",
                                background: "none",
                                border: "1px solid #991b1b",
                                borderRadius: "4px",
                                color: "#f87171",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(pkg.id)}
                              style={{
                                padding: "4px 12px",
                                background: "none",
                                border: "1px solid #166534",
                                borderRadius: "4px",
                                color: "#34d399",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
