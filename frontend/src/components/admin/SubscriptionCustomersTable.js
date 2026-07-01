"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Search, Eye, EyeOff, FileDown } from "lucide-react";
import { exportToPDF } from "@/lib/pdfExport";
import { exportToCSV } from "@/lib/exportService";
import ScrollableSelect from "@/components/ui/ScrollableSelect";
import { BG_DARK, CARD_BG, TEXT_PRIMARY, TEXT_SECONDARY, GOLD, SUCCESS } from "@/lib/theme";

// Helper to obfuscate phone number
function obfuscatePhone(phone) {
    if (!phone) return "?";
    const str = String(phone);
    if (str.length < 4) return "*".repeat(str.length);
    const first = str.slice(0, 2);
    const last = str.slice(-2);
    return `${first}******${last}`;
}

// Pagination helper
function getPageNumbers(current, total) {
    const delta = 2;
    let range = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
        range.push(i);
    }
    if (current - delta > 2) range.unshift("...");
    if (current + delta < total - 1) range.push("...");
    range.unshift(1);
    if (total !== 1) range.push(total);
    return [...new Set(range)];
}

export default function SubscriptionCustomersTable() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(15);
    const [search, setSearch] = useState("");
    const [gotoPage, setGotoPage] = useState("");
    const [obfuscate, setObfuscate] = useState(false);

    // Total amount collected from subscriptions
    const [totalAmount, setTotalAmount] = useState(0);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/proxy/customers/subscriptions");
            const data = await res.json();
            const customersData = data.customers || [];
            setCustomers(customersData);

            // Compute total amount
            const total = customersData.reduce((sum, c) => sum + (c.total_subscription_amount || 0), 0);
            setTotalAmount(total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    // Filter by phone number (client-side)
    const filtered = customers.filter((c) =>
        c.phone_number.includes(search.trim())
    );
    const totalPages = Math.ceil(filtered.length / limit);
    const start = (page - 1) * limit;
    const currentCustomers = filtered.slice(start, start + limit);

    const handleGoToPage = () => {
        const pageNum = parseInt(gotoPage);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setPage(pageNum);
            setGotoPage("");
        }
    };

    // Reset page when limit or search changes
    useEffect(() => {
        setPage(1);
    }, [limit, search]);

    const pageNumbers = getPageNumbers(page, totalPages);

    // Export handlers
    const handleExportPDF = () => {
        const columns = ["Phone Number", "Total Subscriptions", "Total Amount (KES)", "Last Subscription Date"];
        const rows = currentCustomers.map((cust) => [
            obfuscate ? obfuscatePhone(cust.phone_number) : cust.phone_number,
            cust.total_subscriptions,
            `KES ${Number(cust.total_subscription_amount).toLocaleString()}`,
            new Date(cust.last_subscription_date).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
        ]);
        exportToPDF("Jackpot Customers", columns, rows, `subscriptions_${Date.now()}`, obfuscate);
    };

    const handleExportCSV = () => {
        const columns = ["Phone Number", "Total Subscriptions", "Total Amount (KES)", "Last Subscription Date"];
        const rows = currentCustomers.map((cust) => [
            obfuscate ? obfuscatePhone(cust.phone_number) : cust.phone_number,
            cust.total_subscriptions,
            `KES ${Number(cust.total_subscription_amount).toLocaleString()}`,
            new Date(cust.last_subscription_date).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
        ]);
        exportToCSV(columns, rows, `subscriptions_${Date.now()}`);
    };

    return (
        <div
            style={{
                background: CARD_BG,
                borderRadius: "16px",
                border: `1px solid ${GOLD}33`,
                overflow: "hidden",
            }}
        >
            {/* ===== NEW: Total Amount Card ===== */}
            <div
                style={{
                    padding: "20px 24px",
                    borderBottom: `1px solid ${GOLD}33`,
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    background: BG_DARK,
                }}
            >
                <div
                    style={{
                        background: `${GOLD}10`,
                        border: `1px solid ${GOLD}33`,
                        borderRadius: "12px",
                        padding: "12px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                    }}
                >
          <span style={{ fontSize: "11px", fontWeight: 700, color: TEXT_SECONDARY, textTransform: "uppercase" }}>
            Total Subscription Revenue
          </span>
                    <span style={{ fontSize: "24px", fontWeight: 800, color: SUCCESS }}>
            KES {loading ? "…" : totalAmount.toLocaleString()}
          </span>
                </div>
                <span style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
          Combined total from all subscription customers
        </span>
            </div>

            {/* Action Bar: Search + Obfuscate + Export */}
            <div
                style={{
                    padding: "16px 24px",
                    borderBottom: `1px solid ${GOLD}33`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                }}
            >
                <div style={{ position: "relative", maxWidth: "300px", flex: 1 }}>
                    <Search
                        size={16}
                        style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: TEXT_SECONDARY,
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search by phone number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 12px 10px 36px",
                            background: BG_DARK,
                            border: `1px solid ${GOLD}33`,
                            borderRadius: "8px",
                            color: TEXT_PRIMARY,
                            fontSize: "13px",
                        }}
                    />
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    {/* Obfuscate toggle */}
                    <button
                        onClick={() => setObfuscate(!obfuscate)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: `1px solid ${GOLD}33`,
                            background: obfuscate ? GOLD : BG_DARK,
                            color: obfuscate ? BG_DARK : TEXT_SECONDARY,
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        {obfuscate ? <EyeOff size={14} /> : <Eye size={14} />}
                        {obfuscate ? "Hidden" : "Visible"}
                    </button>

                    <button onClick={handleExportPDF} style={{
                        background: "transparent",
                        border: `1px solid ${GOLD}`,
                        color: GOLD,
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}>Export PDF</button>
                    <button onClick={handleExportCSV} style={{
                        background: "transparent",
                        border: `1px solid ${GOLD}`,
                        color: GOLD,
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}>CSV</button>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                    <tr style={{ borderBottom: `1px solid ${GOLD}33` }}>
                        <th style={{ textAlign: "left", padding: "16px 24px", color: TEXT_SECONDARY, fontSize: "11px", fontWeight: 600 }}>Phone Number</th>
                        <th style={{ textAlign: "center", padding: "16px 24px", color: TEXT_SECONDARY, fontSize: "11px", fontWeight: 600 }}>Total Subscriptions</th>
                        <th style={{ textAlign: "right", padding: "16px 24px", color: TEXT_SECONDARY, fontSize: "11px", fontWeight: 600 }}>Total Amount (KES)</th>
                        <th style={{ textAlign: "right", padding: "16px 24px", color: TEXT_SECONDARY, fontSize: "11px", fontWeight: 600 }}>Last Subscription</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan="4" style={{ textAlign: "center", padding: "40px", color: TEXT_SECONDARY }}>Loading...</td></tr>
                    ) : currentCustomers.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: "center", padding: "40px", color: TEXT_SECONDARY }}>No subscription customers found.</td></tr>
                    ) : (
                        currentCustomers.map((cust) => (
                            <tr key={cust.phone_number} style={{ borderBottom: `1px solid ${GOLD}20` }}>
                                <td style={{ padding: "16px 24px", fontWeight: 600, color: TEXT_PRIMARY }}>
                                    {obfuscate ? obfuscatePhone(cust.phone_number) : cust.phone_number}
                                </td>
                                <td style={{ textAlign: "center", padding: "16px 24px", color: TEXT_PRIMARY }}>
                                    {cust.total_subscriptions}
                                </td>
                                <td style={{ textAlign: "right", padding: "16px 24px", fontWeight: 700, color: GOLD }}>
                                    KES {Number(cust.total_subscription_amount).toLocaleString()}
                                </td>
                                <td style={{ textAlign: "right", padding: "16px 24px", color: TEXT_SECONDARY, fontSize: "12px" }}>
                                    {new Date(cust.last_subscription_date).toLocaleDateString()}
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {/* Custom Pagination */}
            {totalPages > 1 && (
                <div
                    style={{
                        padding: "16px 24px",
                        borderTop: `1px solid ${GOLD}33`,
                        background: BG_DARK,
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "16px",
                    }}
                >
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            style={{
                                padding: "6px 12px",
                                border: `1px solid ${GOLD}`,
                                borderRadius: "6px",
                                background: "transparent",
                                color: GOLD,
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: page === 1 ? "not-allowed" : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                            }}
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>
                        {pageNumbers.map((item, idx) =>
                            item === "..." ? (
                                <span key={`ellipsis-${idx}`} style={{ padding: "6px 8px", color: TEXT_SECONDARY }}>…</span>
                            ) : (
                                <button
                                    key={item}
                                    onClick={() => setPage(item)}
                                    style={{
                                        padding: "6px 12px",
                                        border: `1px solid ${GOLD}`,
                                        borderRadius: "6px",
                                        background: page === item ? GOLD : "transparent",
                                        color: page === item ? BG_DARK : GOLD,
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    {item}
                                </button>
                            )
                        )}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            style={{
                                padding: "6px 12px",
                                border: `1px solid ${GOLD}`,
                                borderRadius: "6px",
                                background: "transparent",
                                color: GOLD,
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: page === totalPages ? "not-allowed" : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                            }}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>

                    <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ width: "120px" }}>
                            <ScrollableSelect
                                value={String(limit)}
                                onChange={(val) => setLimit(Number(val))}
                                placeholder={`${limit} / page`}
                                options={[10, 15, 20, 50, 100, 250, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000].map((num) => ({
                                    value: String(num),
                                    label: `${num} / page`,
                                }))}
                            />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "18px", color: SUCCESS }}>Go to</span>
                            <input
                                type="number"
                                min="1"
                                max={totalPages}
                                value={gotoPage}
                                onChange={(e) => setGotoPage(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleGoToPage()}
                                style={{
                                    width: "60px",
                                    padding: "6px 8px",
                                    borderRadius: "6px",
                                    border: `1px solid ${GOLD}`,
                                    background: BG_DARK,
                                    color: TEXT_PRIMARY,
                                    fontSize: "12px",
                                    textAlign: "center",
                                    outline: "none",
                                }}
                            />
                            <button
                                onClick={handleGoToPage}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    border: `1px solid ${GOLD}`,
                                    background: "transparent",
                                    color: GOLD,
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Page
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}