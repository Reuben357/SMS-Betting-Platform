"use client";
import {useState, useEffect, useCallback} from "react";
import TopBar from "@/components/TopBar";
import {Users, TrendingUp, Search, AlertTriangle, ChevronLeft, ChevronRight} from "lucide-react";
import {exportToCSV} from "@/lib/exportService";
import {exportToPDF} from "@/lib/pdfExport";
import ScrollableSelect from "@/components/ui/ScrollableSelect";
import {SUCCESS} from "@/lib/theme";

// Midnight Gold palette
const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";
const GOLD_LIGHT = "#D4AF6A";
const DANGER = "#EF4444";

// Generate a distinct color for any tier string (e.g., "A1", "B2")
function getTierColorFromString(tierCode) {
    let hash = 0;
    for (let i = 0; i < tierCode.length; i++) {
        hash = (hash << 5) - hash + tierCode.charCodeAt(i);
        hash |= 0;
    }
    const hue = Math.abs(hash % 360);
    const saturation = 55;
    const bgLightness = 22;
    const textLightness = 78;
    const borderLightness = 45;
    return {
        bg: `hsl(${hue}, ${saturation}%, ${bgLightness}%)`,
        text: `hsl(${hue}, ${saturation}%, ${textLightness}%)`,
        border: `hsl(${hue}, ${saturation}%, ${borderLightness}%)`,
    };
}

function TabButton({active, onClick, children}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "8px 24px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "bold",
                transition: "all 0.2s",
                background: active ? GOLD : "transparent",
                color: active ? BG_DARK : TEXT_SECONDARY,
                border: "none",
                cursor: "pointer",
            }}
        >
            {children}
        </button>
    );
}

// Component: Scrollable table for sub‑tier distribution
function SubTierTable({distribution, loading}) {
    if (loading) {
        return (
            <div
                style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: TEXT_SECONDARY,
                }}
            >
                Loading distribution…
            </div>
        );
    }
    if (!distribution.length) {
        return (
            <div
                style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    color: TEXT_SECONDARY,
                    textAlign: "center",
                }}
            >
                <AlertTriangle size={32}/>
                <p>No tier data available.</p>
                <p style={{fontSize: "12px"}}>
                    Ensure customers have assigned tiers (A1, B2, etc.)
                </p>
            </div>
        );
    }

    const sorted = [...distribution].sort((a, b) => a.name.localeCompare(b.name));
    const total = sorted.reduce((sum, t) => sum + t.count, 0);

    return (
        <div style={{height: "100%", overflowY: "auto", paddingRight: "8px"}}>
            <table style={{width: "100%", borderCollapse: "collapse"}}>
                <thead style={{position: "sticky", top: 0, background: CARD_BG, zIndex: 1}}>
                <tr>
                    <th style={{
                        textAlign: "left",
                        padding: "8px 0",
                        color: TEXT_SECONDARY,
                        fontSize: "11px",
                        fontWeight: 600
                    }}>
                        Tier
                    </th>
                    <th style={{
                        textAlign: "right",
                        padding: "8px 0",
                        color: TEXT_SECONDARY,
                        fontSize: "11px",
                        fontWeight: 600
                    }}>
                        Customers
                    </th>
                    <th style={{
                        textAlign: "right",
                        padding: "8px 0",
                        color: TEXT_SECONDARY,
                        fontSize: "11px",
                        fontWeight: 600
                    }}>
                        Share
                    </th>
                </tr>
                </thead>
                <tbody>
                {sorted.map((item) => {
                    const colors = getTierColorFromString(item.name);
                    const percent = total ? ((item.count / total) * 100).toFixed(1) : 0;
                    return (
                        <tr key={item.name} style={{borderBottom: `1px solid ${GOLD}20`}}>
                            <td style={{padding: "8px 0"}}>
                  <span
                      style={{
                          display: "inline-block",
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "16px",
                          padding: "2px 12px",
                          fontSize: "12px",
                          fontWeight: 700,
                      }}
                  >
                    {item.name}
                  </span>
                            </td>
                            <td style={{textAlign: "right", fontWeight: 600, color: TEXT_PRIMARY}}>
                                {item.count.toLocaleString()}
                            </td>
                            <td style={{textAlign: "right", color: TEXT_SECONDARY, fontSize: "12px"}}>
                                {percent}%
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}

export default function ActiveCustomersPage() {
    const [tab, setTab] = useState("list");
    const [customers, setCustomers] = useState([]);
    const [tierDistribution, setTierDistribution] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [gotoPage, setGotoPage] = useState("");

    // Helper: page numbers with ellipsis
    const getPageNumbers = () => {
        const total = totalPages;
        const current = page;
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
    };

    const handleGoToPage = () => {
        const pageNum = parseInt(gotoPage);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setPage(pageNum);
            setGotoPage("");
        }
    };

    // Export handlers
    const handleExportPDF = () => {
        const columns = ["Phone Number", "Tier", "Purchases", "Lifetime Spend (KES)"];
        const rows = customers.map(c => [
            c.phone_number,
            c.tier_letter && c.tier_sub_number ? `${c.tier_letter}${c.tier_sub_number}` : "–",
            c.total_purchases || 0,
            `KES ${Number(c.total_spent || 0).toLocaleString()}`
        ]);
        exportToPDF("Active Customers", columns, rows, `active_customers_${Date.now()}`, false);
    };

    const handleExportCSV = () => {
        const columns = ["Phone Number", "Tier", "Purchases", "Lifetime Spend (KES)"];
        const rows = customers.map(c => [
            c.phone_number,
            c.tier_letter && c.tier_sub_number ? `${c.tier_letter}${c.tier_sub_number}` : "–",
            c.total_purchases || 0,
            `KES ${Number(c.total_spent || 0).toLocaleString()}`
        ]);
        exportToCSV(columns, rows, `active_customers_${Date.now()}`);
    };

    const handleTierPDF = () => {
        const columns = ["Tier", "Customers", "Share (%)"];
        const sorted = [...tierDistribution].sort((a, b) => a.name.localeCompare(b.name));
        const total = sorted.reduce((sum, t) => sum + t.count, 0);
        const rows = sorted.map(item => [
            item.name,
            item.count,
            total ? ((item.count / total) * 100).toFixed(1) : "0.0"
        ]);
        exportToPDF("Active Customer Tier Distribution", columns, rows, `tier_distribution_${Date.now()}`, false);
    };

    const handleTierCSV = () => {
        const columns = ["Tier", "Customers", "Share (%)"];
        const sorted = [...tierDistribution].sort((a, b) => a.name.localeCompare(b.name));
        const total = sorted.reduce((sum, t) => sum + t.count, 0);
        const rows = sorted.map(item => [
            item.name,
            item.count,
            total ? ((item.count / total) * 100).toFixed(1) : "0.0"
        ]);
        exportToCSV(columns, rows, `tier_distribution_${Date.now()}`);
    };

    // Fetch paginated customers + stats
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const customersUrl = `/api/proxy/customers?page=${page}&limit=${limit}&search=${encodeURIComponent(searchTerm)}`;
            const customersRes = await fetch(customersUrl);
            if (!customersRes.ok) throw new Error("Failed to fetch customers");
            const customersData = await customersRes.json();
            setCustomers(customersData.customers || []);
            setTotalPages(customersData.pages || 1);

            const statsRes = await fetch("/api/proxy/customers/stats");
            let statsData = {subTierDistribution: []};
            if (statsRes.ok) {
                statsData = await statsRes.json();
            } else {
                console.warn("Customer stats endpoint failed, using empty distribution");
            }

            const dist = (statsData.subTierDistribution || [])
                .filter(
                    (item) =>
                        item.tier_letter &&
                        item.tier_sub_number !== null &&
                        item.tier_sub_number !== undefined,
                )
                .map((item) => ({
                    name: `${item.tier_letter}${item.tier_sub_number}`,
                    count: parseInt(item.count) || 0,
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

            setTierDistribution(dist);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [page, limit, searchTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setPage(1);
    }, [limit, searchTerm]);

    if (error) {
        return (
            <div style={{background: BG_DARK, minHeight: "100vh"}}>
                <TopBar title="Active Customers"/>
                <div style={{padding: "40px", textAlign: "center", color: DANGER}}>
                    <AlertTriangle size={32}/>
                    <p>{error}</p>
                    <button
                        onClick={() => fetchData()}
                        style={{
                            marginTop: "16px",
                            background: GOLD,
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            color: BG_DARK,
                            cursor: "pointer",
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{background: BG_DARK, minHeight: "100vh"}}>
            <TopBar title="Active Customers"/>
            <div style={{maxWidth: "1200px", margin: "0 auto", padding: "32px"}}>
                {/* Tab navigation */}
                <div
                    style={{
                        display: "flex",
                        gap: "8px",
                        background: CARD_BG,
                        padding: "6px",
                        borderRadius: "12px",
                        width: "fit-content",
                        marginBottom: "24px",
                    }}
                >
                    <TabButton active={tab === "list"} onClick={() => setTab("list")}>
                        <Users size={14} style={{marginRight: "6px"}}/> Customer List
                    </TabButton>
                    <TabButton active={tab === "chart"} onClick={() => setTab("chart")}>
                        <TrendingUp size={14} style={{marginRight: "6px"}}/> Tier Distribution
                    </TabButton>
                </div>

                {/* Tab 1: Customer List */}
                {tab === "list" && (
                    <div style={{
                        background: CARD_BG,
                        borderRadius: "16px",
                        border: `1px solid ${GOLD}33`,
                        overflow: "hidden"
                    }}>
                        {/* Search bar + Export buttons */}
                        <div style={{
                            padding: "16px 24px",
                            borderBottom: `1px solid ${GOLD}33`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap"
                        }}>
                            <div style={{position: "relative", maxWidth: "300px", flex: 1}}>
                                <Search size={16} style={{
                                    position: "absolute",
                                    left: "12px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: TEXT_SECONDARY
                                }}/>
                                <input
                                    type="text"
                                    placeholder="Search by phone or tier (A1, B2…)"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px 10px 36px",
                                        background: BG_DARK,
                                        border: `1px solid ${GOLD}33`,
                                        borderRadius: "8px",
                                        color: TEXT_PRIMARY,
                                        fontSize: "13px",
                                        outline: "none",
                                    }}
                                />
                            </div>

                            <div style={{display: "flex", gap: "8px"}}>
                                <button onClick={handleExportPDF} style={{
                                    background: "transparent",
                                    border: `1px solid ${GOLD}`,
                                    color: GOLD,
                                    padding: "6px 16px",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                }}>Export PDF
                                </button>
                                <button onClick={handleExportCSV} style={{
                                    background: "transparent",
                                    border: `1px solid ${GOLD}`,
                                    color: GOLD,
                                    padding: "6px 16px",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                }}>CSV
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{overflowX: "auto"}}>
                            <table style={{width: "100%", borderCollapse: "collapse"}}>
                                <thead>
                                <tr style={{borderBottom: `1px solid ${GOLD}33`}}>
                                    <th style={{
                                        textAlign: "left",
                                        padding: "16px 24px",
                                        color: TEXT_SECONDARY,
                                        fontSize: "11px",
                                        fontWeight: "bold"
                                    }}>
                                        Phone Number
                                    </th>
                                    <th style={{
                                        textAlign: "left",
                                        padding: "16px 24px",
                                        color: TEXT_SECONDARY,
                                        fontSize: "11px",
                                        fontWeight: "bold"
                                    }}>
                                        Tier
                                    </th>
                                    <th style={{
                                        textAlign: "center",
                                        padding: "16px 24px",
                                        color: TEXT_SECONDARY,
                                        fontSize: "11px",
                                        fontWeight: "bold"
                                    }}>
                                        Purchases
                                    </th>
                                    <th style={{
                                        textAlign: "right",
                                        padding: "16px 24px",
                                        color: TEXT_SECONDARY,
                                        fontSize: "11px",
                                        fontWeight: "bold"
                                    }}>
                                        Lifetime Spend (KES)
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {customers.map((cust, idx) => {
                                    const tierCode =
                                        cust.tier_letter && cust.tier_sub_number
                                            ? `${cust.tier_letter}${cust.tier_sub_number}`
                                            : "–";
                                    return (
                                        <tr key={idx} style={{borderBottom: `1px solid ${GOLD}20`}}>
                                            <td style={{padding: "16px 24px", fontWeight: "600", color: TEXT_PRIMARY}}>
                                                {cust.phone_number}
                                            </td>
                                            <td style={{padding: "16px 24px"}}>
                                                {tierCode !== "–" ? (
                                                    <span
                                                        style={{
                                                            background: `${GOLD}20`,
                                                            color: GOLD,
                                                            padding: "4px 12px",
                                                            borderRadius: "20px",
                                                            fontSize: "12px",
                                                            fontWeight: "bold",
                                                        }}
                                                    >
                              {tierCode}
                            </span>
                                                ) : (
                                                    <span style={{color: TEXT_SECONDARY}}>–</span>
                                                )}
                                            </td>
                                            <td style={{
                                                padding: "16px 24px",
                                                textAlign: "center",
                                                fontWeight: "bold",
                                                color: TEXT_PRIMARY
                                            }}>
                                                {cust.total_purchases || 0}
                                            </td>
                                            <td style={{
                                                padding: "16px 24px",
                                                textAlign: "right",
                                                fontWeight: "bold",
                                                color: GOLD
                                            }}>
                                                KES {Number(cust.total_spent || 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {customers.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="4"
                                            style={{textAlign: "center", padding: "48px", color: TEXT_SECONDARY}}>
                                            No customers found.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Custom Pagination (replacing <Pagination />) */}
                        {!loading && totalPages > 1 && (
                            <div style={{
                                padding: "16px 24px",
                                borderTop: `1px solid ${GOLD}33`,
                                background: BG_DARK,
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "16px",
                            }}>
                                <div style={{display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap"}}>
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
                                        <ChevronLeft size={16}/> Prev
                                    </button>
                                    {getPageNumbers().map((item, idx) =>
                                        item === "..." ? (
                                            <span key={`ellipsis-${idx}`}
                                                  style={{padding: "6px 8px", color: TEXT_SECONDARY}}>…</span>
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
                                        Next <ChevronRight size={16}/>
                                    </button>
                                </div>

                                <div style={{display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap"}}>
                                    <div style={{width: "120px"}}>
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
                                    <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                                        <span style={{fontSize: "18px", color: SUCCESS}}>Go to</span>
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

                        {loading &&
                            <div style={{padding: "32px", textAlign: "center", color: GOLD}}>Loading customers…</div>}
                    </div>
                )}

                {/* Tab 2: Tier Distribution */}
                {tab === "chart" && (
                    <div style={{
                        background: CARD_BG,
                        borderRadius: "16px",
                        border: `1px solid ${GOLD}33`,
                        padding: "24px",
                        display: "flex",
                        flexDirection: "column"
                    }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "16px"
                        }}>
                            <h3 style={{color: GOLD, fontSize: "14px", fontWeight: "bold", margin: 0}}>Active Customer
                                Tier Distribution</h3>
                            <div style={{display: "flex", gap: "8px"}}>
                                <button onClick={handleTierPDF} style={{
                                    background: "transparent",
                                    border: `1px solid ${GOLD}`,
                                    color: GOLD,
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    cursor: "pointer"
                                }}>Export PDF
                                </button>
                                <button onClick={handleTierCSV} style={{
                                    background: "transparent",
                                    border: `1px solid ${GOLD}`,
                                    color: GOLD,
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    cursor: "pointer"
                                }}>CSV
                                </button>
                            </div>
                        </div>
                        <div style={{height: "400px", width: "100%"}}>
                            <SubTierTable distribution={tierDistribution} loading={loading}/>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}