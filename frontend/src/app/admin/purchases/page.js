"use client";

import {useState, useEffect, useCallback, useRef} from "react";
import TopBar from "@/components/TopBar";
import {BG_DARK, CARD_BG, TEXT_PRIMARY, TEXT_SECONDARY, GOLD, DANGER, SUCCESS} from "@/lib/theme";

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
            const params = new URLSearchParams({page, limit: 50});
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
            <TopBar title="Purchases"/>
            <div style={{padding: "24px 32px", maxWidth: "1100px", background: BG_DARK, minHeight: "100vh"}}>
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
                            color: GOLD,
                        },
                        {
                            label: "Revenue (this page)",
                            value: `KES ${totalRevenue.toLocaleString()}`,
                            color: SUCCESS,
                        },
                        {
                            label: "Showing",
                            value: `Page ${page} of ${pages}`,
                            color: TEXT_SECONDARY,
                        },
                    ].map(({label, value, color}) => (
                        <div
                            key={label}
                            style={{
                                background: CARD_BG,
                                border: `1px solid ${GOLD}33`,
                                borderRadius: "8px",
                                padding: "16px",
                                textAlign: "center",
                            }}
                        >
                            <div style={{fontSize: "22px", fontWeight: 700, color}}>
                                {value}
                            </div>
                            <div
                                style={{fontSize: "12px", color: TEXT_SECONDARY, marginTop: "4px"}}
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
                            background: `${DANGER}20`,
                            border: `1px solid ${DANGER}66`,
                            borderRadius: "6px",
                            color: DANGER,
                            fontSize: "13px",
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Table */}
                <div
                    style={{
                        background: CARD_BG,
                        border: `1px solid ${GOLD}33`,
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
                            background: BG_DARK,
                            borderBottom: `1px solid ${GOLD}33`,
                        }}
                    >
                        {["Phone", "Package", "Amount (KES)", "M-Pesa Ref", "Date"].map(
                            (h) => (
                                <div
                                    key={h}
                                    style={{
                                        fontSize: "11px",
                                        color: TEXT_SECONDARY,
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
                            style={{padding: "40px", textAlign: "center", color: TEXT_SECONDARY}}
                        >
                            Loading...
                        </div>
                    ) : purchases.length === 0 ? (
                        <div
                            style={{padding: "40px", textAlign: "center", color: TEXT_SECONDARY}}
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
                                    borderBottom: `1px solid ${GOLD}1A`,
                                    fontSize: "13px",
                                    alignItems: "center",
                                    opacity: loading ? 0.6 : 1,
                                    transition: "opacity 0.2s",
                                }}
                            >
                                <div style={{fontFamily: "monospace", color: TEXT_SECONDARY}}>
                                    {p.phone_number}
                                </div>
                                <div style={{color: TEXT_PRIMARY}}>{p.package_name ?? "—"}</div>
                                <div style={{color: SUCCESS, fontWeight: 600}}>
                                    {Number(p.amount_paid).toLocaleString()}
                                </div>
                                <div
                                    style={{
                                        fontFamily: "monospace",
                                        color: TEXT_SECONDARY,
                                        fontSize: "12px",
                                    }}
                                >
                                    {p.mpesa_ref ?? "—"}
                                </div>
                                <div style={{color: TEXT_SECONDARY, fontSize: "12px"}}>
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
                                border: `1px solid ${GOLD}66`,
                                borderRadius: "4px",
                                background: BG_DARK,
                                color: page === 1 ? `${TEXT_SECONDARY}66` : TEXT_SECONDARY,
                                cursor: page === 1 ? "not-allowed" : "pointer",
                            }}
                        >
                            Previous
                        </button>
                        <span style={{fontSize: "13px", color: TEXT_SECONDARY}}>
              Page {page} of {pages}
            </span>
                        <button
                            onClick={() => setPage((p) => Math.min(pages, p + 1))}
                            disabled={page === pages}
                            style={{
                                padding: "5px 14px",
                                border: `1px solid ${GOLD}66`,
                                borderRadius: "4px",
                                background: BG_DARK,
                                color: page === pages ? `${TEXT_SECONDARY}66` : TEXT_SECONDARY,
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
