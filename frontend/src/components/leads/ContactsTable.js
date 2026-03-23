"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function ContactsTable({ refreshTrigger }) {
  const [data, setData] = useState({ contacts: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  const fetchContacts = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Set loading true but do NOT clear existing data — this keeps contacts visible while the refresh happens
    setLoading(true);
    setError(null);

    try {
      // Proxy route handles auth server-side — no token fetching needed in the client
      const params = new URLSearchParams({ page, limit: 20, search });
      const res = await fetch(`/api/proxy/contacts?${params}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to load contacts.");
      const json = await res.json();
      setData(json);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("ContactsTable fetch error:", err.message);
      setError(err.message);
      // Do NOT clear data on error — keep showing what was there before
    } finally {
      setLoading(false);
    }
  }, [page, search, refreshTrigger]);

  useEffect(() => {
    fetchContacts();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchContacts]);

  const tierColour = (tier) => {
    const colours = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];
    return colours[(tier - 1) % colours.length] || "#64748b";
  };

  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: "8px",
        border: "1px solid #334155",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #334155",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#f1f5f9" }}>
          Contacts{" "}
          {data.total > 0 && (
            <span style={{ color: "#64748b", fontWeight: 400 }}>
              ({data.total.toLocaleString()})
            </span>
          )}
          {loading && (
            <span
              style={{
                color: "#3b82f6",
                fontWeight: 400,
                fontSize: "12px",
                marginLeft: "8px",
              }}
            >
              refreshing...
            </span>
          )}
        </h2>
        <input
          placeholder="Search name or phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "6px 12px",
            border: "1px solid #475569",
            borderRadius: "4px",
            fontSize: "13px",
            width: "220px",
            background: "#0f172a",
            color: "#f1f5f9",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            padding: "10px 16px",
            background: "#450a0a",
            border: "1px solid #991b1b",
            color: "#fca5a5",
            fontSize: "13px",
          }}
        >
          {error} — showing last known data
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr style={{ background: "#0f172a", textAlign: "left" }}>
              {[
                "Phone Number",
                "Name",
                "Frequency",
                "Total Received (KES)",
                "Tier",
                "Added",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
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
            {data.contacts.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "#475569",
                  }}
                >
                  No contacts found.
                </td>
              </tr>
            ) : (
              data.contacts.map((c) => (
                <tr
                  key={c.phone_number}
                  style={{
                    borderBottom: "1px solid #1e293b",
                    opacity: loading ? 0.6 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <td
                    style={{
                      padding: "10px 16px",
                      fontFamily: "monospace",
                      color: "#cbd5e1",
                    }}
                  >
                    {c.phone_number}
                  </td>
                  <td style={{ padding: "10px 16px", color: "#f1f5f9" }}>
                    {c.name ?? <span style={{ color: "#475569" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 16px", color: "#94a3b8" }}>
                    {c.frequency_count}
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      color: "#34d399",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {c.total_received_amount > 0 ? (
                      Number(c.total_received_amount).toLocaleString("en-KE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    ) : (
                      <span style={{ color: "#475569" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    {c.potential_tier ? (
                      <span
                        style={{
                          padding: "2px 10px",
                          background: tierColour(c.potential_tier) + "22",
                          color: tierColour(c.potential_tier),
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                          border: `1px solid ${tierColour(c.potential_tier)}44`,
                        }}
                      >
                        Tier {c.potential_tier}
                      </span>
                    ) : (
                      <span style={{ color: "#475569" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px", color: "#64748b" }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.pages > 1 && (
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #334155",
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "4px 12px",
              border: "1px solid #475569",
              borderRadius: "4px",
              background: "#0f172a",
              color: page === 1 ? "#334155" : "#94a3b8",
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <span
            style={{ padding: "4px 8px", fontSize: "13px", color: "#64748b" }}
          >
            Page {page} of {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            style={{
              padding: "4px 12px",
              border: "1px solid #475569",
              borderRadius: "4px",
              background: "#0f172a",
              color: page === data.pages ? "#334155" : "#94a3b8",
              cursor: page === data.pages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
