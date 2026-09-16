"use client";
import {useState, useEffect, useCallback, useRef} from "react";
import TopBar from "@/components/TopBar";
import CustomDateTimePicker from "@/components/ui/DatePicker";
import ScrollableSelect from "@/components/ui/ScrollableSelect";
import {SUCCESS} from "@/lib/theme";
import {
    Trash2, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Lock,
    ChevronLeft, ChevronRight,
} from "lucide-react";
import {formatDateTime} from "@/lib/formatDateTime";

// Midnight Gold color palette
const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";
const GOLD_LIGHT = "#D4AF6A";
const DANGER = "#EF4444";
const WARNING = "#F59E0B";

// Custom scrollable dropdown component
function ScrollablePackageSelect({packages, packageCapacity, value, onChange, isFull}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedPackage = packages.find(p => p.id === value);

    return (
        <div ref={containerRef} style={{position: "relative", width: "100%"}}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    ...styles.input,
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderColor: isFull ? DANGER : `${GOLD}33`,
                    cursor: "pointer",
                }}
            >
        <span style={{color: selectedPackage ? TEXT_PRIMARY : TEXT_SECONDARY}}>
          {selectedPackage ? `${selectedPackage.name} (${packageCapacity[selectedPackage.id] ?? 0}/${selectedPackage.game_count} tips)` : "Select Package"}
        </span>
                <ChevronDown size={16} color={GOLD}/>
            </button>
            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        background: CARD_BG,
                        border: `1px solid ${GOLD}33`,
                        borderRadius: "8px",
                        maxHeight: "250px",
                        overflowY: "auto",
                        zIndex: 10,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    }}
                >
                    {packages.length === 0 ? (
                        <div style={{padding: "12px", color: TEXT_SECONDARY, fontSize: "13px"}}>
                            No active packages
                        </div>
                    ) : (
                        packages.map((pkg) => {
                            const count = packageCapacity[pkg.id] ?? 0;
                            const full = count >= pkg.game_count;
                            return (
                                <div
                                    key={pkg.id}
                                    onClick={() => {
                                        onChange(pkg.id);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        padding: "10px 12px",
                                        cursor: "pointer",
                                        borderBottom: `1px solid ${GOLD}20`,
                                        color: value === pkg.id ? GOLD : TEXT_PRIMARY,
                                        background: value === pkg.id ? `${GOLD}10` : "transparent",
                                        fontSize: "13px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <span>{pkg.name}</span>
                                    <span style={{fontSize: "11px", color: full ? DANGER : GOLD}}>
                    {count}/{pkg.game_count} {full ? "FULL" : ""}
                  </span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

function ConfirmModal({isOpen, onClose, onConfirm, tipName}) {
    if (!isOpen) return null;
    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <div style={modalHeaderStyle}>
                    <AlertTriangle size={20} color={DANGER}/>
                    <span style={modalTitleStyle}>Delete Tip</span>
                </div>
                <div style={modalBodyStyle}>
                    Delete tip <strong>{tipName}</strong>? This cannot be undone.
                </div>
                <div style={modalFooterStyle}>
                    <button style={modalCancelBtn} onClick={onClose}>Cancel</button>
                    <button style={modalConfirmBtn} onClick={onConfirm}>OK, Delete</button>
                </div>
            </div>
        </div>
    );
}

// Modal styles
const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
};
const modalContentStyle = {
    background: CARD_BG,
    borderRadius: "16px",
    border: `1px solid ${GOLD}33`,
    boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
    width: "360px",
    maxWidth: "90%",
    overflow: "hidden",
};
const modalHeaderStyle = {
    padding: "16px 20px",
    background: `${DANGER}10`,
    borderBottom: `1px solid ${DANGER}40`,
    display: "flex",
    alignItems: "center",
    gap: "10px",
};
const modalTitleStyle = {fontSize: "16px", fontWeight: 800, color: DANGER, letterSpacing: "0.02em"};
const modalBodyStyle = {
    padding: "24px 20px",
    fontSize: "14px",
    color: TEXT_PRIMARY,
    lineHeight: 1.5,
    borderBottom: `1px solid ${GOLD}33`,
};
const modalFooterStyle = {
    padding: "16px 20px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    background: BG_DARK,
};
const modalCancelBtn = {
    background: "transparent",
    border: `1px solid ${GOLD}33`,
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 700,
    color: TEXT_SECONDARY,
    cursor: "pointer",
};
const modalConfirmBtn = {
    background: DANGER,
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 700,
    color: TEXT_PRIMARY,
    cursor: "pointer",
};


export default function TipsPage() {
    const [tips, setTips] = useState([]);
    const [packages, setPackages] = useState([]);
    const [form, setForm] = useState({
        game_name: "",
        prediction: "",
        match_datetime: "",
        package_id: "",
    });
    const [expanded, setExpanded] = useState({});
    const [notification, setNotification] = useState(null);
    const [loading, setLoading] = useState(false);
    const [packageCapacity, setPackageCapacity] = useState({});

    // Dashboard stats
    const [dashboardStats, setDashboardStats] = useState({winRate: 0, won: 0, lost: 0});

    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(5);
    const [gotoPage, setGotoPage] = useState("");
    const [totalPages, setTotalPages] = useState(1);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [tipToDelete, setTipToDelete] = useState(null);

    // Auto-hide notification
    useEffect(() => {
        if (notification) {
            const t = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(t);
        }
    }, [notification]);

    // Fetch dashboard stats
    useEffect(() => {
        fetch("/api/proxy/dashboard")
            .then(r => r.json())
            .then(data => {
                setDashboardStats({
                    winRate: data.tips?.win_rate || 0,
                    won: data.tips?.won || 0,
                    lost: data.tips?.lost || 0,
                });
            })
            .catch(err => console.error("Failed to fetch dashboard stats:", err));
    }, []);

    const fetchTips = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/proxy/tips");
            const data = await res.json();
            const fetchedTips = data.tips ?? [];
            setTips(fetchedTips);

            const capacity = {};
            fetchedTips.forEach((tip) => {
                if (!capacity[tip.package_id]) capacity[tip.package_id] = 0;
                capacity[tip.package_id]++;
            });
            setPackageCapacity(capacity);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch("/api/proxy/packages")
            .then((r) => r.json())
            .then((d) => setPackages((d.packages ?? []).filter((p) => p.is_active)));
        fetchTips();
    }, [fetchTips]);

    const selectedPkg = packages.find((p) => p.id === form.package_id);
    const currentCount = packageCapacity[form.package_id] ?? 0;
    const maxCount = selectedPkg?.game_count ?? 0;
    const isFull = form.package_id && maxCount > 0 && currentCount >= maxCount;
    const isNearFull = form.package_id && maxCount > 0 && currentCount === maxCount - 1;

    // Group tips by package name
    const grouped = tips.reduce((acc, tip) => {
        const key = tip.package_name || "Uncategorized";
        if (!acc[key]) acc[key] = {tips: [], package_id: tip.package_id};
        acc[key].tips.push(tip);
        return acc;
    }, {});

    const packageEntries = Object.entries(grouped);
    const totalPackages = packageEntries.length;

    useEffect(() => {
        setTotalPages(Math.ceil(totalPackages / limit));
    }, [totalPackages, limit]);

    const start = (page - 1) * limit;
    const paginatedEntries = packageEntries.slice(start, start + limit);

    useEffect(() => {
        setPage(1);
    }, [tips, limit]);

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

    async function handleCreate() {
        if (!form.game_name || !form.prediction || !form.match_datetime || !form.package_id) {
            setNotification({type: "error", text: "All fields are required before adding a tip."});
            return;
        }
        if (isFull) {
            setNotification({
                type: "error",
                text: `"${selectedPkg?.name}" is full (${currentCount}/${maxCount} tips). Remove a tip or increase the game count first.`,
            });
            return;
        }
        try {
            const res = await fetch("/api/proxy/tips", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                setNotification({type: "error", text: data.error || "Failed to add tip."});
                return;
            }
            setNotification({type: "success", text: "Tip added to package successfully."});
            setForm({...form, game_name: "", prediction: "", match_datetime: ""});
            fetchTips();
        } catch {
            setNotification({type: "error", text: "Network error. Please try again."});
        }
    }

    async function handleOutcome(id, status) {
        try {
            const res = await fetch(`/api/proxy/tips/${id}/outcome`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({status}),
            });
            const data = await res.json();
            if (!res.ok) throw new Error();

            if (data.softDeleted) {
                setNotification({
                    type: "warning",
                    text: `"${data.packageName}" and its tips were automatically soft‑deleted (all tips resolved).`,
                });
            } else {
                setNotification({type: "success", text: "Tip outcome updated."});
            }
            fetchTips();
        } catch {
            setNotification({type: "error", text: "Failed to update outcome."});
        }
    }

    const openDeleteModal = (id, gameName) => {
        setTipToDelete({id, gameName});
        setModalOpen(true);
    };
    const confirmDelete = async () => {
        if (!tipToDelete) return;
        const {id, gameName} = tipToDelete;
        try {
            await fetch(`/api/proxy/tips/${id}`, {method: "DELETE"});
            setNotification({type: "success", text: `Tip "${gameName}" removed.`});
            fetchTips();
        } catch {
            setNotification({type: "error", text: "Failed to delete tip."});
        } finally {
            setModalOpen(false);
            setTipToDelete(null);
        }
    };
    const cancelDelete = () => {
        setModalOpen(false);
        setTipToDelete(null);
    };

    const toggle = (key) => setExpanded((prev) => ({...prev, [key]: !prev[key]}));

    return (
        <div style={styles.pageWrapper}>
            <TopBar title="Tips Management"/>
            <div style={styles.content}>
                {/* Stats row */}
                <div style={styles.statsRow}>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>WIN RATE</span>
                        <div style={{...styles.statValue, color: TEXT_PRIMARY}}>{dashboardStats.winRate}%</div>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>SETTLED (W / L)</span>
                        <div style={styles.statValue}>
                            {dashboardStats.won} <span style={{color: TEXT_SECONDARY}}>/</span> {dashboardStats.lost}
                        </div>
                    </div>
                </div>

                {/* Add Tip Form */}
                <div style={styles.formContainer}>
                    <h3 style={styles.formTitle}>Add New Tip</h3>
                    <div style={styles.grid}>
                        <input
                            style={styles.input}
                            placeholder="Game / Match name"
                            value={form.game_name}
                            onChange={(e) => setForm({...form, game_name: e.target.value})}
                        />
                        <input
                            style={styles.input}
                            placeholder="Prediction (e.g. Home Win)"
                            value={form.prediction}
                            onChange={(e) => setForm({...form, prediction: e.target.value})}
                        />

                        <CustomDateTimePicker
                            value={form.match_datetime}
                            onChange={(val) => setForm({...form, match_datetime: val})}
                        />

                        <ScrollablePackageSelect
                            packages={packages}
                            packageCapacity={packageCapacity}
                            value={form.package_id}
                            onChange={(val) => setForm({...form, package_id: val})}
                            isFull={isFull}
                        />
                    </div>

                    {form.package_id && maxCount > 0 && (
                        <div
                            style={{
                                marginTop: "12px",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                background: isFull ? `${DANGER}20` : isNearFull ? `${WARNING}20` : `${SUCCESS}20`,
                                color: isFull ? DANGER : isNearFull ? WARNING : SUCCESS,
                                border: `1px solid ${isFull ? DANGER : isNearFull ? WARNING : SUCCESS}40`,
                            }}
                        >
                            {isFull ? <Lock size={13}/> : <AlertTriangle size={13}/>}
                            {isFull
                                ? `Package is full (${currentCount}/${maxCount}). Cannot add more tips.`
                                : isNearFull
                                    ? `Almost full – 1 slot remaining (${currentCount}/${maxCount}).`
                                    : `${maxCount - currentCount} slot${maxCount - currentCount !== 1 ? "s" : ""} available (${currentCount}/${maxCount}).`}
                        </div>
                    )}

                    <button
                        style={{
                            ...styles.addBtn,
                            opacity: isFull ? 0.5 : 1,
                            cursor: isFull ? "not-allowed" : "pointer",
                        }}
                        onClick={handleCreate}
                        disabled={isFull}
                    >
                        {isFull ? "Package Full" : "Add Tip to Package"}
                    </button>

                    {notification && (
                        <div
                            style={{
                                ...styles.toast,
                                background:
                                    notification.type === "success"
                                        ? SUCCESS
                                        : notification.type === "warning"
                                            ? WARNING
                                            : DANGER,
                                color:
                                    notification.type === "success" || notification.type === "warning"
                                        ? BG_DARK
                                        : TEXT_PRIMARY,
                            }}
                        >
                            {notification.type === "success" ? <CheckCircle size={15}/> : <AlertTriangle size={15}/>}
                            {notification.text}
                        </div>
                    )}
                </div>

                {/* Tips List */}
                <div style={styles.archiveContainer}>
                    {paginatedEntries.map(([name, group]) => {
                        const pkgObj = packages.find((p) => p.id === group.package_id);
                        const count = group.tips.length;
                        const max = pkgObj?.game_count ?? "?";
                        const full = pkgObj && count >= pkgObj.game_count;
                        return (
                            <div key={name} style={styles.bundleCard}>
                                <div style={styles.bundleHeader} onClick={() => toggle(name)}>
                                    <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                        <span style={styles.bundleTitle}>{name}</span>
                                        <span
                                            style={{
                                                fontSize: "10px",
                                                fontWeight: 800,
                                                padding: "2px 8px",
                                                borderRadius: "10px",
                                                background: full ? `${DANGER}20` : `${GOLD}20`,
                                                color: full ? DANGER : GOLD,
                                            }}
                                        >
                      {count}/{max} {full ? "FULL" : "tips"}
                    </span>
                                    </div>
                                    {expanded[name] ? <ChevronUp color={GOLD} size={18}/> :
                                        <ChevronDown color={GOLD} size={18}/>}
                                </div>
                                {expanded[name] &&
                                    group.tips.map((tip) => (
                                        <div key={tip.id} style={styles.tipRow}>
                                            <div style={{flex: 2}}>
                                                <div style={styles.gameTitle}>{tip.game_name}</div>
                                                <div
                                                    style={styles.subText}>{formatDateTime(tip.match_datetime)}</div>
                                            </div>
                                            <div style={{flex: 1, color: GOLD, fontWeight: 600, fontSize: "13px"}}>
                                                {tip.prediction}
                                            </div>
                                            <div style={{flex: 1, textAlign: "center"}}>
                                                <span style={statusBadge(tip.status)}>{tip.status.toUpperCase()}</span>
                                            </div>
                                            <div style={styles.actionGroup}>
                                                <button
                                                    onClick={() => handleOutcome(tip.id, "won")}
                                                    style={outcomeBtn("won")}
                                                    title="Mark Won"
                                                >
                                                    W
                                                </button>
                                                <button
                                                    onClick={() => handleOutcome(tip.id, "lost")}
                                                    style={outcomeBtn("lost")}
                                                    title="Mark Lost"
                                                >
                                                    L
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(tip.id, tip.game_name)}
                                                    style={styles.delBtn}
                                                    title="Delete tip"
                                                >
                                                    <Trash2 size={13}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        );
                    })}

                    {totalPackages === 0 && !loading && (
                        <div style={{textAlign: "center", padding: "60px", color: TEXT_SECONDARY, fontSize: "14px"}}>
                            No active tips. Add a tip above to get started.
                        </div>
                    )}

                    {/* Custom Pagination (replacing <Pagination />) */}
                    {totalPages > 1 && (
                        <div style={{
                            padding: "16px 24px",
                            borderTop: `1px solid ${GOLD}33`,
                            background: BG_DARK,
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "16px",
                            marginTop: "16px",
                            borderRadius: "0 0 12px 12px",
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
                </div>
            </div>

            <ConfirmModal
                isOpen={modalOpen}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                tipName={tipToDelete?.gameName || ""}
            />
        </div>
    );
}

const styles = {
    pageWrapper: {background: BG_DARK, minHeight: "100vh"},
    content: {padding: "30px", maxWidth: "1200px", margin: "0 auto"},
    statsRow: {display: "flex", gap: "20px", marginBottom: "30px"},
    statCard: {
        background: CARD_BG,
        padding: "20px",
        borderRadius: "12px",
        flex: 1,
        border: `1px solid ${GOLD}33`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    },
    statLabel: {fontSize: "11px", fontWeight: 800, color: TEXT_SECONDARY, letterSpacing: "0.05em"},
    statValue: {fontSize: "24px", fontWeight: 700, color: TEXT_PRIMARY, marginTop: "4px"},
    formContainer: {
        background: CARD_BG,
        padding: "24px",
        borderRadius: "16px",
        border: `1px solid ${GOLD}33`,
        marginBottom: "30px",
        position: "relative",
    },
    formTitle: {fontSize: "16px", fontWeight: 700, color: GOLD, marginBottom: "20px"},
    grid: {display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px"},
    input: {
        padding: "12px",
        border: `1px solid ${GOLD}33`,
        borderRadius: "8px",
        fontSize: "14px",
        background: BG_DARK,
        color: TEXT_PRIMARY,
        width: "100%",
        boxSizing: "border-box",
    },
    dateTimeWrapper: {
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "center",
    },
    dateTimeInput: {
        padding: "12px",
        paddingRight: "40px",
        border: `1px solid ${GOLD}33`,
        borderRadius: "8px",
        fontSize: "14px",
        background: BG_DARK,
        color: TEXT_PRIMARY,
        width: "100%",
        boxSizing: "border-box",
        outline: "none",
    },
    dateTimeIconBtn: {
        position: "absolute",
        right: "12px",
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
    },
    addBtn: {
        marginTop: "16px",
        background: GOLD,
        color: BG_DARK,
        border: "none",
        padding: "12px 24px",
        borderRadius: "8px",
        fontWeight: 700,
        fontSize: "14px",
    },
    archiveContainer: {maxWidth: "900px"},
    bundleCard: {
        background: CARD_BG,
        borderRadius: "12px",
        border: `1px solid ${GOLD}33`,
        marginBottom: "16px",
        overflow: "hidden",
    },
    bundleHeader: {
        padding: "16px 20px",
        background: `${GOLD}10`,
        display: "flex",
        justifyContent: "space-between",
        cursor: "pointer",
        borderBottom: `1px solid ${GOLD}33`,
        alignItems: "center",
    },
    bundleTitle: {fontWeight: 700, color: GOLD, fontSize: "14px"},
    tipRow: {
        display: "flex",
        padding: "16px 20px",
        borderBottom: `1px solid ${GOLD}20`,
        alignItems: "center",
        fontSize: "14px",
    },
    gameTitle: {fontWeight: 700, color: TEXT_PRIMARY},
    subText: {fontSize: "12px", color: TEXT_SECONDARY, marginTop: "2px"},
    actionGroup: {display: "flex", gap: "8px", flex: 1, justifyContent: "flex-end"},
    delBtn: {
        background: "none",
        border: `1px solid ${GOLD}33`,
        color: TEXT_SECONDARY,
        padding: "6px",
        borderRadius: "6px",
        cursor: "pointer",
    },
    toast: {
        position: "absolute",
        bottom: "-18px",
        right: "24px",
        padding: "8px 16px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    },
};

const outcomeBtn = (type) => ({
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    fontWeight: 800,
    fontSize: "11px",
    cursor: "pointer",
    background: type === "won" ? `${SUCCESS}20` : `${DANGER}20`,
    color: type === "won" ? SUCCESS : DANGER,
});

const statusBadge = (s) => ({
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 800,
    background: s === "won" ? `${SUCCESS}20` : s === "lost" ? `${DANGER}20` : `${TEXT_SECONDARY}20`,
    color: s === "won" ? SUCCESS : s === "lost" ? DANGER : TEXT_SECONDARY,
});