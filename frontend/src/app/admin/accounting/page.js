"use client";

import {useState, useEffect, useCallback} from "react";
import TopBar from "@/components/TopBar";
import {exportToPDF} from "@/lib/pdfExport";
import {exportToCSV} from "@/lib/exportService";
import {ChevronLeft, ChevronRight, ChevronUp, Pencil, Trash2, X, AlertTriangle} from "lucide-react";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import ScrollableSelect from "@/components/ui/ScrollableSelect";
import {formatDateTime, formatDate} from "@/lib/formatDateTime";

// Midnight Gold color palette
import {BG_DARK, CARD_BG, TEXT_PRIMARY, TEXT_SECONDARY, GOLD, GOLD_LIGHT, DANGER, SUCCESS} from "@/lib/theme";

// Icons for StatCards
const IconInflow = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m7 7 10 10M17 7v10H7"/>
    </svg>
);
const IconOutflow = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 17 7 7M7 17V7h10"/>
    </svg>
);
const IconNet = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="2" x2="12" y2="22"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
);
const IconFlag = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);

// STATUS BADGE 
const IconCheck = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
         strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5"/>
    </svg>
);
const IconAlert = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
         strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);
const IconClock = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
    </svg>
);

const STATUS_CONFIG = {
    matched: {
        label: "Matched",
        color: "#10B981",
        bg: "#1A3A2A",
        border: "#10B98140",
        icon: <IconCheck/>,
    },
    flagged_overpayment: {
        label: "Overpayment",
        color: "#F9A8D4",
        bg: "#3A1E2A",
        border: "#F9A8D440",
        icon: <IconAlert/>,
    },
    flagged_underpayment: {
        label: "Underpayment",
        color: "#EF4444",
        bg: "#3A1A1A",
        border: "#EF444440",
        icon: <IconAlert/>,
    },
    flagged_no_match: {
        label: "No Match",
        color: "#60A5FA",
        bg: "#1A2A3A",
        border: "#60A5FA40",
        icon: <IconAlert/>,
    },
    flagged_incomplete_package: {
        label: "Incomplete Pkg",
        color: "#C47A3A",
        bg: "#271E14",
        border: "#3A2C1A",
        icon: <IconAlert/>,
    },
    processing: {
        label: "Processing",
        color: "#6EB3D4",
        bg: "#182028",
        border: "#243040",
        icon: <IconClock/>,
    },
    failed: {
        label: "Failed",
        color: "#E07070",
        bg: "#2A1C1C",
        border: "#3D2020",
        icon: <IconAlert/>,
    },
};

function StatusBadge({status}) {
    const cfg = STATUS_CONFIG[status] ?? {
        label: status,
        color: "#888",
        bg: "#242424",
        border: "#333",
        icon: <IconClock/>,
    };
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "700",
                color: cfg.color,
                backgroundColor: cfg.bg,
                border: `1px solid ${cfg.border}`,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
            }}
        >
      {cfg.icon} {cfg.label}
    </span>
    );
}


export default function AccountingPage() {
    const [tab, setTab] = useState("inflow");
    const [obfuscate, setObfuscate] = useState(false);
    const [summary, setSummary] = useState({
        inflow: 0,
        outflow: 0,
        net_profit: 0,
        flagged: {unresolved_count: 0},
    });
    const [rawListData, setRawListData] = useState([]);
    const [filteredListData, setFilteredListData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [outflowForm, setOutflowForm] = useState({
        description: "",
        category: "VPS",
        amount: "",
    });

    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(15);
    const [pages, setPages] = useState(1);
    const [gotoPage, setGotoPage] = useState("");

    // Search/filter state
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [searchPhone, setSearchPhone] = useState("");

    //  Package filter for inflow tab 
    const [packageFilter, setPackageFilter] = useState("all");

    //  Scroll-to-top state 
    const [showScrollTop, setShowScrollTop] = useState(false);

    //  EDIT / DELETE STATES 
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);

    //  TOAST STATE 
    const [toast, setToast] = useState({visible: false, message: "", type: ""});

    //  DELETE CONFIRMATION MODAL STATE 
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    // Helper: show toast (auto-dismiss after 4s)
    const showToast = (message, type = "success") => {
        setToast({visible: true, message, type});
        setTimeout(() => {
            setToast({visible: false, message: "", type: ""});
        }, 4000);
    };

    // Helper to generate page numbers
    const getPageNumbers = () => {
        const total = pages;
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

    //  Fetch accounting summary and list data with server-side filtering for inflow 
    const fetchAccountingData = useCallback(
        async (newPage = page, newLimit = limit) => {
            setLoading(true);
            try {
                const sumRes = await fetch("/api/proxy/accounting/summary");
                const sumData = await sumRes.json();
                setSummary(sumData);

                let endpoint = `/api/proxy/accounting/purchases?page=${newPage}&limit=${newLimit}`;

                // For inflow, pass filters as query parameters to the backend
                if (tab === 'inflow') {
                    const params = new URLSearchParams();
                    if (searchPhone.trim()) params.append('phone', searchPhone.trim());
                    if (dateFrom) params.append('dateFrom', dateFrom);
                    if (dateTo) params.append('dateTo', dateTo);
                    if (packageFilter && packageFilter !== 'all') params.append('packageType', packageFilter);
                    const queryString = params.toString();
                    if (queryString) endpoint += `&${queryString}`;
                }

                if (tab === "outflow") {
                    endpoint = `/api/proxy/outflows?page=${newPage}&limit=${newLimit}`;
                }

                if (tab === "flagged") {
                    endpoint = `/api/proxy/accounting/flagged?page=${newPage}&limit=${newLimit}`;
                }

                const listRes = await fetch(endpoint);
                const data = await listRes.json();

                let items = [];
                if (tab === "outflow") items = data.outflow || [];
                else if (tab === "flagged") items = data.payments || [];
                else items = data.purchases || [];

                setRawListData(items);
                // Inflow, the data is already filtered by the server, so we set filteredListData directly.
                setFilteredListData(items);
                setPages(data.pages || 1);
            } catch (err) {
                console.error("Fetch error:", err);
                showToast("Failed to fetch accounting data.", "error");
            } finally {
                setLoading(false);
            }
        },
        [tab, page, limit, searchPhone, dateFrom, dateTo, packageFilter], // Re-fetch when any filter changes
    );

    useEffect(() => {
        fetchAccountingData();
    }, [fetchAccountingData, page, limit]);

    //  Client-side filtering for outflow and flagged tabs only 
    // For inflow, filtering is already done server-side, so we skip client-side filtering.
    useEffect(() => {
        // Only apply client-side filtering for tabs that do NOT use server-side filtering
        if (tab === "outflow" || tab === "flagged") {
            let filtered = [...rawListData];

            if (tab !== "outflow") {
                if (searchPhone.trim()) {
                    const phone = searchPhone.trim().toLowerCase();
                    filtered = filtered.filter((item) =>
                        item.phone_number?.toLowerCase().includes(phone)
                    );
                }
            }

            // Date filters
            if (dateFrom) {
                const from = new Date(dateFrom);
                filtered = filtered.filter((item) => new Date(item.created_at) >= from);
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                filtered = filtered.filter((item) => new Date(item.created_at) <= to);
            }

            setFilteredListData(filtered);
        } else {
            // For inflow, we already have the filtered data from the server, so just set it.
            setFilteredListData(rawListData);
        }
    }, [rawListData, searchPhone, dateFrom, dateTo, tab]);

    //  Reset page to 1 whenever filters change 
    useEffect(() => {
        setPage(1);
    }, [searchPhone, dateFrom, dateTo, packageFilter]);

    //  Reset page when tab or limit changes 
    useEffect(() => {
        setPage(1);
    }, [tab, limit]);

    //  Scroll listener for scroll-to-top 
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ADD OUTFLOW 
    const handleAddOutflow = async () => {
        if (!outflowForm.amount || !outflowForm.description) {
            showToast("Please fill all fields.", "error");
            return;
        }
        const amountNum = parseFloat(outflowForm.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            showToast("Amount must be a positive number.", "error");
            return;
        }
        try {
            const res = await fetch("/api/proxy/outflows", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({...outflowForm, amount: amountNum}),
            });
            if (res.ok) {
                setOutflowForm({description: "", category: "VPS", amount: ""});
                fetchAccountingData();
                showToast("Expense added successfully.", "success");
            } else {
                showToast("Failed to record expense.", "error");
            }
        } catch (err) {
            showToast("Error recording expense.", "error");
        }
    };

    // DELETE OUTFLOW 
    const handleDeleteClick = (id) => {
        setDeleteTargetId(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            const res = await fetch(`/api/proxy/outflows/${deleteTargetId}`, {method: "DELETE"});
            if (!res.ok) throw new Error("Delete failed");
            fetchAccountingData();
            showToast("Expense deleted successfully.", "success");
        } catch (err) {
            showToast("Failed to delete expense.", "error");
        } finally {
            setDeleteModalOpen(false);
            setDeleteTargetId(null);
        }
    };

    const cancelDelete = () => {
        setDeleteModalOpen(false);
        setDeleteTargetId(null);
    };

    //  EDIT OUTFLOW 
    const handleEdit = (item) => {
        setEditingItem({
            id: item.id,
            description: item.description,
            category: item.category,
            amount: item.amount,
        });
        setEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        const {id, amount, description, category} = editingItem;
        if (!amount || !description || !category) {
            showToast("All fields are required.", "error");
            return;
        }
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            showToast("Amount must be a positive number.", "error");
            return;
        }
        setSavingEdit(true);
        try {
            const res = await fetch(`/api/proxy/outflows/${id}`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({amount: amountNum, description, category}),
            });
            if (!res.ok) throw new Error("Update failed");
            fetchAccountingData();
            setEditModalOpen(false);
            setEditingItem(null);
            showToast("Expense updated successfully.", "success");
        } catch (err) {
            showToast("Failed to update expense.", "error");
        } finally {
            setSavingEdit(false);
        }
    };

    //  GO TO PAGE 
    const handleGoToPage = () => {
        const pageNum = parseInt(gotoPage);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pages) {
            setPage(pageNum);
            setGotoPage("");
        }
    };

    //  OBFUSCATION 
    const maskPhone = (val) => {
        if (!val || !obfuscate) return val;
        const str = String(val);
        if (str.length < 4) return "*".repeat(str.length);
        const first = str.slice(0, 2);
        const last = str.slice(-2);
        return `${first}******${last}`;
    };

    const maskRef = (val) =>
        val && obfuscate ? `${val.slice(0, 3)}***${val.slice(-1)}` : val;

    //  EXPORT 
    const handleExport = () => {
        let columns, rows;
        if (tab === "outflow") {
            columns = ["Description", "Category", "Amount", "By", "Date"];
            rows = filteredListData.map((item) => [
                item.description,
                item.category,
                item.amount,
                item.entered_by_email,
                formatDateTime(item.created_at),
            ]);
        } else if (tab === "flagged") {
            columns = ["Phone", "Reason", "Amount", "Reference", "Date"];
            rows = filteredListData.map((item) => [
                maskPhone(item.phone_number),
                item.status,
                item.amount,
                maskRef(item.mpesa_ref),
                formatDateTime(item.created_at),
            ]);
        } else { // inflow
            columns = ["Phone", "Package", "Amount", "Reference", "Date"];
            rows = filteredListData.map((item) => [
                maskPhone(item.phone_number),
                item.package_name,
                item.amount || item.amount_paid,
                maskRef(item.mpesa_ref),
                formatDateTime(item.created_at),
            ]);
        }

        exportToPDF(`${tab.toUpperCase()} Report`, columns, rows, `${tab}_report_${Date.now()}`, obfuscate);
    };

    const handleExportCSV = () => {
        let columns, rows;
        if (tab === "outflow") {
            columns = ["Description", "Category", "Amount", "By", "Date"];
            rows = filteredListData.map((item) => [
                item.description,
                item.category,
                item.amount,
                item.entered_by_email,
                formatDateTime(item.created_at),
            ]);
        } else if (tab === "flagged") {
            columns = ["Phone", "Reason", "Amount", "Reference", "Date"];
            rows = filteredListData.map((item) => [
                maskPhone(item.phone_number),
                item.status,
                item.amount,
                maskRef(item.mpesa_ref),
                formatDateTime(item.created_at),
            ]);
        } else {
            columns = ["Phone", "Package", "Amount", "Reference", "Date"];
            rows = filteredListData.map((item) => [
                maskPhone(item.phone_number),
                item.package_name,
                item.amount || item.amount_paid,
                maskRef(item.mpesa_ref),
                formatDateTime(item.created_at),
            ]);
        }

        exportToCSV(columns, rows, `${tab}_report`);
    };

    // Determine column headers based on tab
    const getFirstColumnLabel = () => {
        if (tab === "outflow") return "Description";
        return "Phone Number";
    };

    const getSecondColumnLabel = () => {
        if (tab === "outflow") return "Category";
        if (tab === "flagged") return "Reason";
        return "Package";
    };

    const showActions = tab === "outflow";

    return (
        <div style={{background: BG_DARK, minHeight: "100vh", color: TEXT_PRIMARY}}>
            <TopBar title="Accounting & Finance"/>

            {/*  TOAST  */}
            {toast.visible && (
                <div
                    style={{
                        position: "fixed",
                        top: "20px",
                        right: "20px",
                        background: toast.type === "error" ? `${DANGER}20` : `${SUCCESS}20`,
                        border: `1px solid ${toast.type === "error" ? DANGER : SUCCESS}`,
                        borderRadius: "12px",
                        padding: "14px 20px",
                        color: TEXT_PRIMARY,
                        fontSize: "14px",
                        fontWeight: 600,
                        boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
                        zIndex: 3000,
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        maxWidth: "400px",
                        backdropFilter: "blur(4px)",
                    }}
                >
          <span style={{color: toast.type === "error" ? DANGER : SUCCESS}}>
            {toast.type === "error" ? "?" : "?"}
          </span>
                    {toast.message}
                </div>
            )}

            <div style={{maxWidth: "1200px", margin: "0 auto", padding: "32px"}}>
                {/* Metric Cards */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "20px",
                        marginBottom: "32px",
                    }}
                >
                    <StatCard label="Inflow" value={summary.inflow} color={GOLD} icon={<IconInflow/>}/>
                    <StatCard label="Outflow" value={summary.outflow} color={DANGER} icon={<IconOutflow/>}/>
                    <StatCard label="Net Profit" value={summary.net_profit} color={SUCCESS} icon={<IconNet/>}/>
                    <StatCard
                        label="Flagged (unresolved)"
                        value={summary.flagged?.unresolved_count || 0}
                        color={DANGER}
                        icon={<IconFlag/>}
                        isCount
                    />
                </div>

                {/* Tab Navigation & Controls */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "24px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            background: CARD_BG,
                            borderRadius: "12px",
                            padding: "4px",
                            border: `1px solid ${GOLD}33`,
                        }}
                    >
                        {["inflow", "outflow", "flagged"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                style={{
                                    padding: "8px 24px",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    transition: "all 0.2s",
                                    background: tab === t ? GOLD : "transparent",
                                    color: tab === t ? BG_DARK : TEXT_SECONDARY,
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                {t.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div style={{display: "flex", gap: "16px", alignItems: "center"}}>
                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                            }}
                        >
              <span style={{fontSize: "11px", fontWeight: "bold", color: TEXT_SECONDARY}}>
                Hide
              </span>
                            <div
                                onClick={() => setObfuscate(!obfuscate)}
                                style={{
                                    width: "40px",
                                    height: "20px",
                                    borderRadius: "10px",
                                    background: obfuscate ? GOLD : "#444",
                                    position: "relative",
                                    transition: "0.2s",
                                    cursor: "pointer",
                                }}
                            >
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "2px",
                                        left: obfuscate ? "22px" : "2px",
                                        width: "16px",
                                        height: "16px",
                                        background: "#FFF",
                                        borderRadius: "50%",
                                        transition: "0.2s",
                                    }}
                                />
                            </div>
                        </label>
                        <button
                            onClick={handleExport}
                            style={{
                                background: "transparent",
                                border: `1px solid ${GOLD}`,
                                color: GOLD,
                                padding: "6px 16px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: "bold",
                                cursor: "pointer",
                            }}
                        >
                            Export PDF
                        </button>
                        <button
                            onClick={handleExportCSV}
                            style={{
                                background: "transparent",
                                border: `1px solid ${GOLD}`,
                                color: GOLD,
                                padding: "6px 16px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: "bold",
                                cursor: "pointer",
                            }}
                        >
                            CSV
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div
                    style={{
                        background: CARD_BG,
                        borderRadius: "12px",
                        padding: "16px",
                        marginBottom: "24px",
                        border: `1px solid ${GOLD}33`,
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "16px",
                        }}
                    >
                        {tab !== "outflow" && (
                            <input
                                type="text"
                                placeholder="Search by phone number..."
                                value={searchPhone}
                                onChange={(e) => setSearchPhone(e.target.value)}
                                style={{
                                    background: BG_DARK,
                                    border: `1px solid ${GOLD}33`,
                                    borderRadius: "8px",
                                    padding: "8px 12px",
                                    color: TEXT_PRIMARY,
                                    fontSize: "13px",
                                }}
                            />
                        )}
                        <CustomDatePicker
                            value={dateFrom}
                            onChange={(val) => setDateFrom(val)}
                            placeholder="From date"
                        />
                        <CustomDatePicker
                            value={dateTo}
                            onChange={(val) => setDateTo(val)}
                            placeholder="To date"
                        />
                        {/* Package filter dropdown (only for inflow) */}
                        {tab === "inflow" && (
                            <div style={{minWidth: "140px"}}>
                                <ScrollableSelect
                                    value={packageFilter}
                                    onChange={setPackageFilter}
                                    placeholder="Package Type"
                                    options={[
                                        {value: "all", label: "All Packages"},
                                        {value: "jackpot", label: "Jackpot"},
                                        {value: "normal", label: "Normal"},
                                    ]}
                                />
                            </div>
                        )}
                        <button
                            onClick={() => {
                                setSearchPhone("");
                                setDateFrom("");
                                setDateTo("");
                                setPackageFilter("all");
                            }}
                            style={{
                                background: `${GOLD}20`,
                                border: `1px solid ${GOLD}`,
                                borderRadius: "8px",
                                padding: "8px 12px",
                                color: GOLD,
                                fontSize: "12px",
                                fontWeight: "bold",
                                cursor: "pointer",
                            }}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div
                    style={{
                        background: CARD_BG,
                        borderRadius: "16px",
                        border: `1px solid ${GOLD}33`,
                        overflow: "hidden",
                    }}
                >
                    {/* Outflow form */}
                    {tab === "outflow" && (
                        <div
                            style={{
                                padding: "20px",
                                borderBottom: `1px solid ${GOLD}33`,
                                background: `${GOLD}10`,
                            }}
                        >
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "2fr 1fr 1fr auto",
                                    gap: "12px",
                                    alignItems: "end",
                                }}
                            >
                                <Input
                                    label="Description"
                                    value={outflowForm.description}
                                    onChange={(v) => setOutflowForm({...outflowForm, description: v})}
                                />
                                <Select
                                    label="Category"
                                    value={outflowForm.category}
                                    options={["Domain", "VPS", "SMS Gateway", "Marketing", "Salaries", "Infrastructure", "Malipo", "Other"]}
                                    onChange={(v) => setOutflowForm({...outflowForm, category: v})}
                                />
                                <Input
                                    label="Amount (KES)"
                                    type="number"
                                    value={outflowForm.amount}
                                    onChange={(v) => setOutflowForm({...outflowForm, amount: v})}
                                    min="0"
                                    step="1"
                                />
                                <button
                                    onClick={handleAddOutflow}
                                    style={{
                                        background: GOLD,
                                        color: BG_DARK,
                                        border: "none",
                                        padding: "10px 20px",
                                        borderRadius: "8px",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        height: "42px",
                                    }}
                                >
                                    Add Expense
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div style={{overflowX: "auto"}}>
                        <table style={{width: "100%", borderCollapse: "collapse"}}>
                            <thead
                                style={{
                                    background: `${GOLD}10`,
                                    borderBottom: `1px solid ${GOLD}33`,
                                }}
                            >
                            <tr
                                style={{
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    color: TEXT_SECONDARY,
                                    textTransform: "uppercase",
                                }}
                            >
                                <th style={{padding: "16px", textAlign: "left"}}>{getFirstColumnLabel()}</th>
                                <th style={{padding: "16px", textAlign: "left"}}>{getSecondColumnLabel()}</th>
                                <th style={{padding: "16px", textAlign: "left"}}>Amount</th>
                                <th style={{padding: "16px", textAlign: "left"}}>
                                    {tab === "outflow" ? "Email" : "Reference"}
                                </th>
                                <th style={{padding: "16px", textAlign: "right"}}>Date</th>
                                {showActions && (
                                    <th style={{padding: "16px", textAlign: "center", width: "80px"}}>
                                        Actions
                                    </th>
                                )}
                            </tr>
                            </thead>
                            <tbody>
                            {filteredListData.map((item, idx) => (
                                <tr key={idx} style={{borderBottom: `1px solid ${GOLD}20`}}>
                                    <td style={{padding: "16px", fontWeight: "bold"}}>
                                        {tab === "outflow" ? item.description : maskPhone(item.phone_number)}
                                    </td>
                                    <td style={{padding: "16px"}}>
                                        {tab === "flagged" ? (
                                            <StatusBadge status={item.status}/>
                                        ) : tab === "outflow" ? (
                                            <span
                                                style={{
                                                    background: `${GOLD}20`,
                                                    padding: "4px 8px",
                                                    borderRadius: "20px",
                                                    fontSize: "10px",
                                                    fontWeight: "bold",
                                                    color: GOLD,
                                                }}
                                            >
                          {item.category}
                        </span>
                                        ) : (
                                            <span
                                                style={{
                                                    background: item.package_name?.includes("Jackpot")
                                                        ? "#8B5CF8"
                                                        : `${GOLD}20`,
                                                    padding: "4px 8px",
                                                    borderRadius: "20px",
                                                    fontSize: "10px",
                                                    fontWeight: "bold",
                                                    color: item.package_name?.includes("Jackpot") ? "white" : GOLD,
                                                }}
                                            >
                          {item.package_name}
                        </span>
                                        )}
                                    </td>
                                    <td
                                        style={{
                                            padding: "16px",
                                            fontWeight: "bold",
                                            color: GOLD,
                                        }}
                                    >
                                        KES {(item.amount || item.amount_paid).toLocaleString()}
                                    </td>
                                    <td
                                        style={{
                                            padding: "16px",
                                            fontSize: "12px",
                                            color: TEXT_SECONDARY,
                                        }}
                                    >
                                        {tab === "outflow"
                                            ? item.entered_by_email
                                            : maskRef(item.mpesa_ref)}
                                    </td>
                                    <td
                                        style={{
                                            padding: "16px",
                                            textAlign: "right",
                                            fontSize: "12px",
                                            color: TEXT_SECONDARY,
                                        }}
                                    >
                                        {formatDateTime(item.created_at)}
                                    </td>
                                    {showActions && (
                                        <td style={{padding: "16px", textAlign: "center"}}>
                                            <div style={{display: "flex", gap: "8px", justifyContent: "center"}}>
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        color: GOLD,
                                                        padding: "4px",
                                                    }}
                                                    title="Edit"
                                                >
                                                    <Pencil size={16}/>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(item.id)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        color: DANGER,
                                                        padding: "4px",
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {filteredListData.length === 0 && !loading && (
                                <tr>
                                    <td
                                        colSpan={showActions ? 6 : 5}
                                        style={{
                                            textAlign: "center",
                                            padding: "48px",
                                            color: TEXT_SECONDARY,
                                        }}
                                    >
                                        No records match the filters.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div style={paginationContainer}>
                        <div style={paginationControls}>
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                style={paginationButton}
                            >
                                <ChevronLeft size={16}/> Prev
                            </button>
                            {getPageNumbers().map((item, idx) =>
                                    item === "..." ? (
                                        <span key={`ellipsis-${idx}`} style={paginationEllipsis}>
                    ?
                  </span>
                                    ) : (
                                        <button
                                            key={item}
                                            onClick={() => setPage(item)}
                                            style={{
                                                ...paginationButton,
                                                background: page === item ? GOLD : "transparent",
                                                color: page === item ? BG_DARK : GOLD,
                                                borderColor: GOLD,
                                            }}
                                        >
                                            {item}
                                        </button>
                                    )
                            )}
                            <button
                                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                                disabled={page === pages}
                                style={paginationButton}
                            >
                                Next <ChevronRight size={16}/>
                            </button>
                        </div>

                        <div style={paginationSide}>
                            <div style={{display: "flex", alignItems: "center", gap: "6px", width: "120px"}}>
                                <ScrollableSelect
                                    value={String(limit)}
                                    onChange={(val) => setLimit(Number(val))}
                                    placeholder={`${limit} / page`}
                                    options={[
                                        10, 15, 20, 50, 100, 250, 500, 1000, 1500, 2000, 2500, 3000,
                                        3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000,
                                        8500, 9000, 9500, 10000,
                                    ].map((num) => ({
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
                                    max={pages}
                                    value={gotoPage}
                                    onChange={(e) => setGotoPage(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleGoToPage()}
                                    style={gotoInput}
                                />
                                <button onClick={handleGoToPage} style={gotoButton}>
                                    Page
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading && (
                        <div
                            style={{
                                padding: "32px",
                                textAlign: "center",
                                color: GOLD,
                                fontWeight: "bold",
                            }}
                        >
                            Syncing Records...
                        </div>
                    )}
                </div>
            </div>

            {/*  EDIT MODAL  */}
            {editModalOpen && editingItem && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2000,
                    }}
                    onClick={() => setEditModalOpen(false)}
                >
                    <div
                        style={{
                            background: CARD_BG,
                            borderRadius: "16px",
                            border: `1px solid ${GOLD}`,
                            padding: "24px",
                            maxWidth: "500px",
                            width: "90%",
                            boxShadow: "0 20px 25px rgba(0,0,0,0.5)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "16px",
                            }}
                        >
                            <h3 style={{color: GOLD, margin: 0}}>Edit Expense</h3>
                            <button
                                onClick={() => setEditModalOpen(false)}
                                style={{background: "none", border: "none", cursor: "pointer", color: TEXT_SECONDARY}}
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        <div style={{marginBottom: "12px"}}>
                            <label
                                style={{
                                    fontSize: "11px",
                                    fontWeight: "bold",
                                    color: TEXT_SECONDARY,
                                    display: "block",
                                    marginBottom: "4px",
                                }}
                            >
                                Description
                            </label>
                            <input
                                type="text"
                                value={editingItem.description}
                                onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: `1px solid ${GOLD}33`,
                                    background: BG_DARK,
                                    color: TEXT_PRIMARY,
                                    fontSize: "14px",
                                    outline: "none",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>

                        <div style={{marginBottom: "12px"}}>
                            <label
                                style={{
                                    fontSize: "11px",
                                    fontWeight: "bold",
                                    color: TEXT_SECONDARY,
                                    display: "block",
                                    marginBottom: "4px",
                                }}
                            >
                                Category
                            </label>
                            <ScrollableSelect
                                value={editingItem.category}
                                onChange={(v) => setEditingItem({...editingItem, category: v})}
                                options={[
                                    "Domain",
                                    "VPS",
                                    "SMS Gateway",
                                    "Marketing",
                                    "Salaries",
                                    "Infrastructure",
                                    "Malipo",
                                    "Other",
                                ].map((opt) => ({value: opt, label: opt}))}
                            />
                        </div>

                        <div style={{marginBottom: "16px"}}>
                            <label
                                style={{
                                    fontSize: "11px",
                                    fontWeight: "bold",
                                    color: TEXT_SECONDARY,
                                    display: "block",
                                    marginBottom: "4px",
                                }}
                            >
                                Amount (KES)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={editingItem.amount}
                                onChange={(e) => setEditingItem({...editingItem, amount: e.target.value})}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: `1px solid ${GOLD}33`,
                                    background: BG_DARK,
                                    color: TEXT_PRIMARY,
                                    fontSize: "14px",
                                    outline: "none",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>

                        <div style={{display: "flex", justifyContent: "flex-end", gap: "12px"}}>
                            <button
                                onClick={() => setEditModalOpen(false)}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: "8px",
                                    border: `1px solid ${GOLD}33`,
                                    background: "transparent",
                                    color: TEXT_SECONDARY,
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                style={{
                                    padding: "10px 24px",
                                    borderRadius: "8px",
                                    border: "none",
                                    background: GOLD,
                                    color: BG_DARK,
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    cursor: savingEdit ? "not-allowed" : "pointer",
                                    opacity: savingEdit ? 0.6 : 1,
                                }}
                            >
                                {savingEdit ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/*  DELETE CONFIRMATION MODAL */}
            {deleteModalOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2001,
                    }}
                    onClick={cancelDelete}
                >
                    <div
                        style={{
                            background: CARD_BG,
                            borderRadius: "16px",
                            border: `1px solid ${DANGER}`,
                            padding: "24px",
                            maxWidth: "420px",
                            width: "90%",
                            boxShadow: "0 20px 25px rgba(0,0,0,0.5)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px"}}>
                            <AlertTriangle size={24} color={DANGER}/>
                            <h3 style={{color: DANGER, margin: 0}}>Confirm Delete</h3>
                        </div>
                        <p style={{color: TEXT_SECONDARY, marginBottom: "20px", fontSize: "14px"}}>
                            Are you sure you want to delete this expense? This action cannot be undone.
                        </p>
                        <div style={{display: "flex", justifyContent: "flex-end", gap: "12px"}}>
                            <button
                                onClick={cancelDelete}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: "8px",
                                    border: `1px solid ${GOLD}33`,
                                    background: "transparent",
                                    color: TEXT_SECONDARY,
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                style={{
                                    padding: "10px 24px",
                                    borderRadius: "8px",
                                    border: "none",
                                    background: DANGER,
                                    color: TEXT_PRIMARY,
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/*  SCROLL TO TOP BUTTON */}
            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({top: 0, behavior: "smooth"})}
                    style={{
                        position: "fixed",
                        bottom: "30px",
                        right: "30px",
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: GOLD,
                        color: BG_DARK,
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        transition: "opacity 0.2s",
                    }}
                    title="Scroll to top"
                >
                    <ChevronUp size={24}/>
                </button>
            )}
        </div>
    );
}

//  REUSABLE STAT CARD
function StatCard({label, value, color, icon, isCount}) {
    return (
        <div
            style={{
                background: CARD_BG,
                padding: "20px",
                borderRadius: "16px",
                border: `1px solid ${GOLD}33`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
            }}
        >
            <div>
                <div
                    style={{
                        fontSize: "10px",
                        fontWeight: "bold",
                        color: TEXT_SECONDARY,
                        marginBottom: "4px",
                    }}
                >
                    {label}
                </div>
                <div style={{fontSize: "28px", fontWeight: "bold", color}}>
                    {isCount ? value : `KES ${Number(value || 0).toLocaleString()}`}
                </div>
            </div>
            <div style={{color, background: `${GOLD}10`, padding: "8px", borderRadius: "10px"}}>
                {icon}
            </div>
        </div>
    );
}

// INPUT COMPONENT
function Input({label, type = "text", value, onChange, min = "0", step = "1", ...props}) {
    const handleChange = (e) => {
        let val = e.target.value;
        if (type === "number") {
            if (val === "") val = "";
            else if (parseFloat(val) < 0) val = "0";
        }
        onChange(val);
    };
    return (
        <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
            <label style={{fontSize: "10px", fontWeight: "bold", color: TEXT_SECONDARY}}>{label}</label>
            <input
                type={type}
                value={value}
                onChange={handleChange}
                min={min}
                step={step}
                style={{
                    background: BG_DARK,
                    border: `1px solid ${GOLD}33`,
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: TEXT_PRIMARY,
                    fontSize: "13px",
                    outline: "none",
                }}
                {...props}
            />
        </div>
    );
}

// SELECT COMPONENT
function Select({label, options, value, onChange}) {
    return (
        <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
            <label style={{fontSize: "10px", fontWeight: "bold", color: TEXT_SECONDARY}}>{label}</label>
            <ScrollableSelect
                value={value}
                onChange={onChange}
                options={options.map((opt) => ({value: opt, label: opt}))}
            />
        </div>
    );
}

//  PAGINATION STYLES
const paginationContainer = {
    padding: "16px 24px",
    borderTop: `1px solid ${GOLD}33`,
    background: BG_DARK,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
};

const paginationControls = {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
};

const paginationButton = {
    padding: "6px 12px",
    border: `1px solid ${GOLD}`,
    borderRadius: "6px",
    background: "transparent",
    color: GOLD,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    transition: "all 0.2s",
};

const paginationEllipsis = {
    padding: "6px 8px",
    color: TEXT_SECONDARY,
    fontSize: "14px",
};

const paginationSide = {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    flexWrap: "wrap",
};

const gotoInput = {
    width: "60px",
    padding: "6px 8px",
    borderRadius: "6px",
    border: `1px solid ${GOLD}`,
    background: BG_DARK,
    color: TEXT_PRIMARY,
    fontSize: "12px",
    textAlign: "center",
    outline: "none",
};

const gotoButton = {
    padding: "6px 12px",
    borderRadius: "6px",
    border: `1px solid ${GOLD}`,
    background: "transparent",
    color: GOLD,
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
};
