"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";

export default function SettingsPage() {
  const [potentialTiers, setPotentialTiers] = useState([]);
  const [activeTiers, setActiveTiers] = useState([]);
  const [activeSubTiers, setActiveSubTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/proxy/tiers");
      if (!res.ok) throw new Error("Failed to load tier configuration.");
      const data = await res.json();
      setPotentialTiers(data.potential ?? []);
      setActiveTiers(data.active ?? []);
      setActiveSubTiers(data.active_sub ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  async function updatePotentialTier(id, field, value) {
    setPotentialTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  }

  async function updateActiveTier(id, field, value) {
    setActiveTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  }

  async function updateSubTier(id, field, value) {
    setActiveSubTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  }

  async function saveTiers() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/proxy/tiers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          potential: potentialTiers,
          active: activeTiers,
          active_sub: activeSubTiers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setSuccess("Tier thresholds updated. All contacts have been re-tiered.");
      fetchTiers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "80px",
    padding: "6px 8px",
    border: "1px solid #475569",
    borderRadius: "4px",
    fontSize: "13px",
    background: "#0f172a",
    color: "#f1f5f9",
    textAlign: "center",
  };

  const sectionStyle = {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "24px",
    marginBottom: "20px",
  };

  return (
    <>
      <TopBar title="Settings — Tier Configuration" />
      <div style={{ padding: "32px", maxWidth: "800px" }}>
        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "#450a0a",
              border: "1px solid #991b1b",
              borderRadius: "6px",
              color: "#fca5a5",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              padding: "12px 16px",
              background: "#052e16",
              border: "1px solid #166534",
              borderRadius: "6px",
              color: "#86efac",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {success}
          </div>
        )}

        {loading ? (
          <div style={{ color: "#475569", padding: "32px" }}>
            Loading tier configuration...
          </div>
        ) : (
          <>
            {/* Potential Customer Tiers */}
            <div style={sectionStyle}>
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#f1f5f9",
                  marginBottom: "4px",
                }}
              >
                Potential Customer Tiers
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  marginBottom: "20px",
                }}
              >
                Based on how many times a contact appears across uploaded CSV
                files. Tier numbers (1, 2, 3...) are assigned automatically.
              </p>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr>
                    {["Tier", "Min Appearances", "Max Appearances"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          color: "#64748b",
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
                  {potentialTiers.map((t) => (
                    <tr
                      key={t.id}
                      style={{ borderBottom: "1px solid #1e293b" }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          color: "#3b82f6",
                          fontWeight: 700,
                        }}
                      >
                        Tier {t.tier_number}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <input
                          type="number"
                          value={t.min_frequency}
                          onChange={(e) =>
                            updatePotentialTier(
                              t.id,
                              "min_frequency",
                              Number(e.target.value),
                            )
                          }
                          style={inputStyle}
                          min={1}
                        />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <input
                          type="number"
                          value={t.max_frequency}
                          onChange={(e) =>
                            updatePotentialTier(
                              t.id,
                              "max_frequency",
                              Number(e.target.value),
                            )
                          }
                          style={inputStyle}
                          min={1}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Active Customer Tiers */}
            <div style={sectionStyle}>
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#f1f5f9",
                  marginBottom: "4px",
                }}
              >
                Active Customer Tiers — Letter
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  marginBottom: "20px",
                }}
              >
                Based on total number of purchases made. Letters (A, B, C...)
                assigned automatically.
              </p>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr>
                    {["Tier", "Min Purchases", "Max Purchases"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          color: "#64748b",
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
                  {activeTiers.map((t) => (
                    <tr
                      key={t.id}
                      style={{ borderBottom: "1px solid #1e293b" }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          color: "#8b5cf6",
                          fontWeight: 700,
                        }}
                      >
                        Tier {t.tier_letter}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <input
                          type="number"
                          value={t.min_purchases}
                          onChange={(e) =>
                            updateActiveTier(
                              t.id,
                              "min_purchases",
                              Number(e.target.value),
                            )
                          }
                          style={inputStyle}
                          min={1}
                        />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <input
                          type="number"
                          value={t.max_purchases}
                          onChange={(e) =>
                            updateActiveTier(
                              t.id,
                              "max_purchases",
                              Number(e.target.value),
                            )
                          }
                          style={inputStyle}
                          min={1}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Active Sub-Tiers */}
            <div style={sectionStyle}>
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#f1f5f9",
                  marginBottom: "4px",
                }}
              >
                Active Customer Tiers — Spend Sub-Tier
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  marginBottom: "20px",
                }}
              >
                Based on the spend range where a customer makes most of their
                purchases. Add new sub-tiers when new packages are added above
                the current highest boundary.
              </p>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr>
                    {["Sub-Tier", "Min Spend (KES)", "Max Spend (KES)"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            color: "#64748b",
                            fontWeight: 600,
                            borderBottom: "1px solid #334155",
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeSubTiers.map((t) => (
                    <tr
                      key={t.id}
                      style={{ borderBottom: "1px solid #1e293b" }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          color: "#f59e0b",
                          fontWeight: 700,
                        }}
                      >
                        Sub-Tier {t.sub_number}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <input
                          type="number"
                          value={t.min_spend}
                          onChange={(e) =>
                            updateSubTier(
                              t.id,
                              "min_spend",
                              Number(e.target.value),
                            )
                          }
                          style={inputStyle}
                          min={1}
                        />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <input
                          type="number"
                          value={t.max_spend}
                          onChange={(e) =>
                            updateSubTier(
                              t.id,
                              "max_spend",
                              Number(e.target.value),
                            )
                          }
                          style={inputStyle}
                          min={1}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={saveTiers}
              disabled={saving}
              style={{
                padding: "10px 28px",
                background: saving ? "#334155" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {saving ? "Saving..." : "Save Tier Configuration"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
