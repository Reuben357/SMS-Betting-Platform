"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TopBar from "@/components/TopBar";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchPurchases = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      const res = await fetch(`/api/proxy/purchases?${params}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to load purchases.");
      const data = await res.json();
      setPurchases(data.purchases ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPurchases();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchPurchases]);

  const totalRevenue = purchases.reduce((s, p) => s + Number(p.amount_paid), 0);

  return (
    <>
      <TopBar title="Purchases" />
      <div style={{ padding: "24px 32px", maxWidth: "1100px" }}>
        {/* Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {[
            {
              label: "Total Purchases",
              value: total.toLocaleString(),
              color: "#3b82f6",
            },
            {
              label: "Revenue (this page)",
              value: `KES ${totalRevenue.toLocaleString()}`,
              color: "#34d399",
            },
            {
              label: "Showing",
              value: `Page ${page} of ${pages}`,
              color: "#64748b",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "22px", fontWeight: 700, color }}>
                {value}
              </div>
              <div
                style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              marginBottom: "16px",
              background: "#450a0a",
              border: "1px solid #991b1b",
              borderRadius: "6px",
              color: "#fca5a5",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {/* Table */}
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            overflowX: "auto",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 100px 1.6fr 160px",
              gap: "8px",
              padding: "10px 16px",
              background: "#0f172a",
              borderBottom: "1px solid #334155",
            }}
          >
            {["Phone", "Package", "Amount (KES)", "M-Pesa Ref", "Date"].map(
              (h) => (
                <div
                  key={h}
                  style={{
                    fontSize: "11px",
                    color: "#475569",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </div>
              ),
            )}
          </div>

          {loading && purchases.length === 0 ? (
            <div
              style={{ padding: "40px", textAlign: "center", color: "#475569" }}
            >
              Loading...
            </div>
          ) : purchases.length === 0 ? (
            <div
              style={{ padding: "40px", textAlign: "center", color: "#475569" }}
            >
              No purchases yet.
            </div>
          ) : (
            purchases.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 100px 1.6fr 160px",
                  gap: "8px",
                  padding: "11px 16px",
                  borderBottom: "1px solid #0f172a",
                  fontSize: "13px",
                  alignItems: "center",
                  opacity: loading ? 0.6 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <div style={{ fontFamily: "monospace", color: "#94a3b8" }}>
                  {p.phone_number}
                </div>
                <div style={{ color: "#f1f5f9" }}>{p.package_name ?? "—"}</div>
                <div style={{ color: "#34d399", fontWeight: 600 }}>
                  {Number(p.amount_paid).toLocaleString()}
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    color: "#64748b",
                    fontSize: "12px",
                  }}
                >
                  {p.mpesa_ref ?? "—"}
                </div>
                <div style={{ color: "#475569", fontSize: "12px" }}>
                  {new Date(p.created_at).toLocaleString("en-KE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              justifyContent: "flex-end",
              alignItems: "center",
              marginTop: "12px",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "5px 14px",
                border: "1px solid #475569",
                borderRadius: "4px",
                background: "#0f172a",
                color: page === 1 ? "#334155" : "#94a3b8",
                cursor: page === 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              style={{
                padding: "5px 14px",
                border: "1px solid #475569",
                borderRadius: "4px",
                background: "#0f172a",
                color: page === pages ? "#334155" : "#94a3b8",
                cursor: page === pages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
