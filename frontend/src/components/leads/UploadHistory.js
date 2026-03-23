"use client";

import { useState, useEffect, useRef } from "react";

const COL = "2fr 1.5fr 70px 70px 80px 70px 1.6fr 100px";

function HeaderRow() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COL,
        gap: "8px",
        padding: "10px 16px",
        background: "#0f172a",
        borderBottom: "1px solid #334155",
      }}
    >
      {[
        "Filename",
        "Uploaded By",
        "Total",
        "New",
        "Updated",
        "Errors",
        "Date",
        "",
      ].map((h, i) => (
        <div
          key={i}
          style={{
            fontSize: "11px",
            color: "#475569",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            textAlign: i >= 2 && i <= 5 ? "center" : "left",
          }}
        >
          {h}
        </div>
      ))}
    </div>
  );
}

export default function UploadHistory({ refreshTrigger }) {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/proxy/contacts/uploads", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load upload history.");
        const data = await res.json();
        setUploads(data.uploads ?? []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
    return () => {
      controller.abort();
    };
  }, [open, refreshTrigger]);

  function parseErrors(errorLog) {
    if (!errorLog) return [];
    try {
      const parsed =
        typeof errorLog === "string" ? JSON.parse(errorLog) : errorLog;
      return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      return [String(errorLog)];
    }
  }

  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: "8px",
        border: "1px solid #334155",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "14px 20px",
          background: "none",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
          color: "#f1f5f9",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Upload History</span>
        <span style={{ color: "#64748b" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #334155" }}>
          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "#450a0a",
                color: "#fca5a5",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {/* Headers always at the top */}
          {!loading && uploads.length > 0 && <HeaderRow />}

          {loading ? (
            <div
              style={{ padding: "24px", textAlign: "center", color: "#475569" }}
            >
              Loading...
            </div>
          ) : uploads.length === 0 ? (
            <div
              style={{ padding: "24px", textAlign: "center", color: "#475569" }}
            >
              No uploads yet.
            </div>
          ) : (
            uploads.map((u) => {
              const errors = parseErrors(u.error_log);
              const hasErrors = u.error_rows > 0 && errors.length > 0;
              const isExpanded = expandedId === u.id;

              return (
                <div key={u.id} style={{ borderBottom: "1px solid #1e293b" }}>
                  {/* Data row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: COL,
                      gap: "8px",
                      padding: "11px 16px",
                      alignItems: "center",
                      fontSize: "13px",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "#94a3b8",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {u.filename}
                    </div>

                    <div style={{ color: "#64748b", fontSize: "12px" }}>
                      {u.uploaded_by || "—"}
                    </div>

                    <div style={{ color: "#94a3b8", textAlign: "center" }}>
                      {u.total_rows}
                    </div>

                    <div
                      style={{
                        color: "#34d399",
                        textAlign: "center",
                        fontWeight: u.new_contacts > 0 ? 600 : 400,
                      }}
                    >
                      {u.new_contacts}
                    </div>

                    <div
                      style={{
                        color: "#3b82f6",
                        textAlign: "center",
                        fontWeight: u.updated_contacts > 0 ? 600 : 400,
                      }}
                    >
                      {u.updated_contacts}
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        color: u.error_rows > 0 ? "#f87171" : "#475569",
                        fontWeight: u.error_rows > 0 ? 700 : 400,
                      }}
                    >
                      {u.error_rows}
                    </div>

                    <div style={{ color: "#475569", fontSize: "12px" }}>
                      {new Date(u.created_at).toLocaleString()}
                    </div>

                    <div>
                      {hasErrors && (
                        <button
                          onClick={() =>
                            setExpandedId((id) => (id === u.id ? null : u.id))
                          }
                          style={{
                            padding: "3px 10px",
                            background: "none",
                            border: `1px solid ${isExpanded ? "#475569" : "#991b1b"}`,
                            borderRadius: "4px",
                            color: isExpanded ? "#64748b" : "#f87171",
                            cursor: "pointer",
                            fontSize: "11px",
                          }}
                        >
                          {isExpanded
                            ? "Hide"
                            : `View ${u.error_rows} error${u.error_rows !== 1 ? "s" : ""}`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable error detail */}
                  {hasErrors && isExpanded && (
                    <div
                      style={{
                        margin: "0 16px 12px",
                        background: "#0f172a",
                        border: "1px solid #991b1b",
                        borderRadius: "6px",
                        padding: "12px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#f87171",
                          marginBottom: "8px",
                        }}
                      >
                        {errors.length} row{errors.length !== 1 ? "s" : ""}{" "}
                        skipped — invalid or unrecognised phone numbers:
                      </p>
                      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {errors.map((msg, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: "12px",
                              color: "#94a3b8",
                              padding: "4px 0",
                              borderBottom:
                                i < errors.length - 1
                                  ? "1px solid #1e293b"
                                  : "none",
                              fontFamily: "monospace",
                            }}
                          >
                            {msg}
                          </div>
                        ))}
                      </div>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#475569",
                          marginTop: "8px",
                        }}
                      >
                        All valid rows from this file were saved successfully.
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// TODO: Add page limiter rather than scrolling down