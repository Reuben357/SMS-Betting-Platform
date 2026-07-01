"use client";

import {useState, useEffect, useCallback} from "react";
import TopBar from "@/components/TopBar";
import ScrollableSelect from "@/components/ui/ScrollableSelect";
import {
    Plus,
    Edit2,
    Power,
    PowerOff,
    CheckCircle,
    AlertTriangle,
    Layers,
    Eye,
    X,
    Calendar,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

// Midnight Gold color palette
import {BG_DARK, CARD_BG, TEXT_PRIMARY, TEXT_SECONDARY, GOLD, GOLD_DARK, DANGER, SUCCESS} from "@/lib/theme";

const emptyForm = {name: "", price: "", game_count: ""};

export default function PackagesPage() {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [selectedPackage, setSelectedPackage] = useState(null);
    const [packageTips, setPackageTips] = useState([]);
    const [loadingTips, setLoadingTips] = useState(false);

    // NEW client-side pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(8);          // items per page
    const [gotoPage, setGotoPage] = useState("");

    // Fetch all packages from backend
    const fetchPackages = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/proxy/packages");
            const data = await res.json();
            setPackages(data.packages ?? []);
        } catch (err) {
            setError("Failed to load packages.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    useEffect(() => {
        if (error) {
            const t = setTimeout(() => setError(null), 4000);
            return () => clearTimeout(t);
        }
        if (success) {
            const t = setTimeout(() => setSuccess(null), 4000);
            return () => clearTimeout(t);
        }
    }, [error, success]);

    const handleViewTips = async (pkg) => {
        setSelectedPackage(pkg);
        setLoadingTips(true);
        try {
            const res = await fetch(`/api/proxy/tips?package_id=${pkg.id}`);
            const data = await res.json();
            // Only show pending tips in the modal
            const pendingTips = (data.tips || [])
                .filter(tip => tip.status === 'pending')
                .slice(0, pkg.game_count);
            setPackageTips(pendingTips);
        } catch (err) {
            console.error("Error fetching tips", err);
        } finally {
            setLoadingTips(false);
        }
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            setError("Package name is required.");
            return;
        }
        const priceNum = Number(form.price);
        const gameCountNum = Number(form.game_count);
        if (isNaN(priceNum) || priceNum <= 0) {
            setError("Price must be a positive number.");
            return;
        }
        if (isNaN(gameCountNum) || gameCountNum <= 0) {
            setError("Game count must be a positive number.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const url = editingId ? `/api/proxy/packages/${editingId}` : "/api/proxy/packages";
            const method = editingId ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    name: form.name.trim(),
                    price: priceNum,
                    game_count: gameCountNum,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 409) throw new Error(data.error || "A package with this price already exists.");
                throw new Error(data.error || "Save failed.");
            }
            setSuccess(editingId ? "Package updated." : "Package created.");
            setEditingId(null);
            setForm(emptyForm);
            fetchPackages();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (e, pkg) => {
        e.stopPropagation();
        const action = pkg.is_active ? "deactivate" : "reactivate";
        try {
            const res = await fetch(`/api/proxy/packages/${pkg.id}/${action}`, {method: "PUT"});
            if (!res.ok) throw new Error("Status update failed.");
            fetchPackages();
        } catch (err) {
            setError(err.message);
        }
    };

    // NEW pagination helpers
    const totalPages = Math.ceil(packages.length / limit);
    const start = (page - 1) * limit;
    const currentPackages = packages.slice(start, start + limit);

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

    // Reset page when limit changes
    useEffect(() => {
        setPage(1);
    }, [limit]);

    return (
        <div style={{background: BG_DARK, minHeight: "100vh"}}>
            <TopBar title="Packages"/>

            <div style={{maxWidth: "1200px", margin: "0 auto", padding: "32px"}}>
                <div style={{marginBottom: "24px"}}>
                    <h1 style={{fontSize: "20px", fontWeight: 800, color: GOLD, margin: 0}}>Packages</h1>
                    <p style={{fontSize: "13px", color: TEXT_SECONDARY}}>Manage pricing and view associated tips.</p>
                </div>

                {error && <div style={styles.alertError}><AlertTriangle size={14}/> {error}</div>}
                {success && <div style={styles.alertSuccess}><CheckCircle size={14}/> {success}</div>}

                {/* Create / Edit Form - unchanged */}
                <div style={styles.card}>
                    <div style={styles.formGrid}>
                        <div><label style={styles.label}>NAME</label><input style={styles.input}
                                                                            placeholder="e.g., Daily Double"
                                                                            value={form.name} onChange={(e) => setForm({
                            ...form,
                            name: e.target.value
                        })}/></div>
                        <div><label style={styles.label}>PRICE (KES)</label><input type="number" min="0" step="1"
                                                                                   style={styles.input}
                                                                                   value={form.price} onChange={(e) => {
                            let val = e.target.value;
                            if (val === "") val = ""; else if (parseFloat(val) < 0) val = "0";
                            setForm({...form, price: val});
                        }}/></div>
                        <div><label style={styles.label}>GAMES</label><input type="number" min="0" step="1"
                                                                             style={styles.input}
                                                                             value={form.game_count} onChange={(e) => {
                            let val = e.target.value;
                            if (val === "") val = ""; else if (parseInt(val) < 0) val = "0";
                            setForm({...form, game_count: val});
                        }}/></div>
                        <button style={styles.primaryBtn} onClick={handleSave}
                                disabled={saving}>{editingId ? "Update" : <><Plus size={16}/> Create</>}</button>
                    </div>
                </div>

                {loading ? (
                    <div style={{textAlign: "center", padding: "40px", color: TEXT_SECONDARY}}>Loading packages...</div>
                ) : (
                    <>
                        <div style={styles.grid}>
                            {currentPackages.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    style={{
                                        ...styles.pkgCard,
                                        borderTop: `4px solid ${pkg.is_active ? SUCCESS : DANGER}`
                                    }}
                                    onClick={() => handleViewTips(pkg)}
                                >
                                    <div style={styles.cardHeaderRow}>
                    <span style={pkg.is_active ? styles.statusActive : styles.statusInactive}>
                      {pkg.is_active ? "Active" : "Inactive"}
                    </span>
                                        <div style={{display: "flex", gap: "4px"}}>
                                            <button style={styles.cardActionBtn} onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingId(pkg.id);
                                                setForm({name: pkg.name, price: pkg.price, game_count: pkg.game_count});
                                                window.scrollTo(0, 0);
                                            }}><Edit2 size={12}/></button>
                                            <button
                                                style={{...styles.cardActionBtn, color: pkg.is_active ? DANGER : GOLD}}
                                                onClick={(e) => toggleStatus(e, pkg)}>{pkg.is_active ?
                                                <PowerOff size={12}/> : <Power size={12}/>}</button>
                                        </div>
                                    </div>
                                    <h3 style={styles.pkgName}>{pkg.name}</h3>
                                    <div style={styles.pkgPrice}>KES {Number(pkg.price).toLocaleString()}</div>
                                    <div style={styles.pkgMeta}><Layers
                                        size={12}/> {pkg.game_count} Game{pkg.game_count !== 1 ? "s" : ""}</div>
                                    <div style={styles.viewPrompt}><Eye size={12}/> Click to view tips</div>
                                </div>
                            ))}
                        </div>

                        {/* NEW enhanced pagination (replaces old simple buttons) */}
                        {totalPages > 1 && (
                            <div style={paginationContainer}>
                                <div style={paginationControls}>
                                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                            style={paginationButton}>
                                        <ChevronLeft size={16}/> Prev
                                    </button>
                                    {getPageNumbers().map((item, idx) =>
                                        item === "..." ? (
                                            <span key={`ellipsis-${idx}`} style={paginationEllipsis}>…</span>
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
                                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages} style={paginationButton}>
                                        Next <ChevronRight size={16}/>
                                    </button>
                                </div>

                                <div style={paginationSide}>
                                    <div style={{width: "120px"}}>
                                        <ScrollableSelect
                                            value={String(limit)}
                                            onChange={(val) => setLimit(Number(val))}
                                            placeholder={`${limit} / page`}
                                            options={[10, 15, 20, 50, 100, 250, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000].map((num) => ({
                                                value: String(num),
                                                label: `${num} / page`
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
                                            style={gotoInput}
                                        />
                                        <button onClick={handleGoToPage} style={gotoButton}>Page</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Tips Modal - unchanged */}
            {selectedPackage && (
                <div style={styles.modalOverlay} onClick={() => setSelectedPackage(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div><h2 style={{margin: 0, color: GOLD, fontSize: "18px"}}>{selectedPackage.name}</h2><span
                                style={{fontSize: "11px", color: TEXT_SECONDARY}}>Current Games in Package</span></div>
                            <button style={styles.closeBtn} onClick={() => setSelectedPackage(null)}><X size={20}/>
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            {loadingTips ? <p style={{fontSize: "13px", color: TEXT_SECONDARY}}>Fetching
                                games...</p> : packageTips.length > 0 ? (
                                <div style={styles.tipsList}>
                                    {packageTips.map((tip, idx) => (
                                        <div key={idx} style={styles.tipItem}>
                                            <div style={styles.tipHeader}>
                                                <div style={{
                                                    fontWeight: 700,
                                                    color: TEXT_PRIMARY,
                                                    fontSize: "14px"
                                                }}>{tip.game_name}</div>
                                                <div style={{
                                                    fontSize: "11px",
                                                    color: TEXT_SECONDARY,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px"
                                                }}><Calendar
                                                    size={10}/> {new Date(tip.match_datetime).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div style={styles.tipFooter}>
                                                <div style={{
                                                    fontSize: "13px",
                                                    color: GOLD,
                                                    fontWeight: 600
                                                }}>Pick: {tip.prediction}</div>
                                                <span style={{
                                                    fontSize: "10px",
                                                    fontWeight: 800,
                                                    textTransform: "uppercase",
                                                    color: tip.status === "won" ? SUCCESS : tip.status === "lost" ? DANGER : TEXT_SECONDARY
                                                }}>{tip.status}</span></div>
                                        </div>
                                    ))}
                                </div>
                            ) : <div style={{textAlign: "center", padding: "30px", color: TEXT_SECONDARY}}><p
                                style={{fontSize: "13px"}}>No active tips found for this package.</p></div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Midnight Gold Styles (unchanged, but with new pagination styles added at end) ---
const styles = {
    alertError: {
        background: `${DANGER}20`,
        borderLeft: `4px solid ${DANGER}`,
        color: DANGER,
        padding: "12px",
        borderRadius: "10px",
        marginBottom: "20px",
        fontSize: "13px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        gap: "8px"
    },
    alertSuccess: {
        background: `${SUCCESS}20`,
        borderLeft: `4px solid ${SUCCESS}`,
        color: SUCCESS,
        padding: "12px",
        borderRadius: "10px",
        marginBottom: "20px",
        fontSize: "13px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        gap: "8px"
    },
    card: {
        background: CARD_BG,
        padding: "20px",
        borderRadius: "16px",
        border: `1px solid ${GOLD}33`,
        marginBottom: "24px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
    },
    formGrid: {display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto", gap: "16px", alignItems: "flex-end"},
    label: {
        display: "block",
        fontSize: "10px",
        fontWeight: 800,
        color: TEXT_SECONDARY,
        marginBottom: "4px",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
    },
    input: {
        width: "100%",
        padding: "10px",
        borderRadius: "8px",
        border: `1px solid ${GOLD}33`,
        background: BG_DARK,
        color: TEXT_PRIMARY,
        fontSize: "13px",
        outline: "none"
    },
    primaryBtn: {
        background: GOLD,
        color: BG_DARK,
        border: "none",
        padding: "10px 20px",
        borderRadius: "8px",
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "13px",
        transition: "opacity 0.2s"
    },
    grid: {display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px"},
    pkgCard: {
        background: CARD_BG,
        padding: "16px",
        borderRadius: "12px",
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.4)",
        cursor: "pointer",
        transition: "transform 0.1s ease, box-shadow 0.2s",
        border: `1px solid ${GOLD}33`
    },
    cardHeaderRow: {display: "flex", justifyContent: "space-between", marginBottom: "12px"},
    statusActive: {
        fontSize: "9px",
        fontWeight: 900,
        background: `${SUCCESS}20`,
        color: SUCCESS,
        padding: "2px 6px",
        borderRadius: "10px",
        textTransform: "uppercase"
    },
    statusInactive: {
        fontSize: "9px",
        fontWeight: 900,
        background: `${DANGER}20`,
        color: DANGER,
        padding: "2px 6px",
        borderRadius: "10px",
        textTransform: "uppercase"
    },
    cardActionBtn: {
        background: BG_DARK,
        border: `1px solid ${GOLD}33`,
        padding: "5px",
        borderRadius: "6px",
        cursor: "pointer",
        color: TEXT_SECONDARY,
        transition: "0.2s"
    },
    pkgName: {margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: TEXT_PRIMARY},
    pkgPrice: {fontSize: "20px", fontWeight: 900, color: GOLD, marginBottom: "8px"},
    pkgMeta: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "12px",
        color: TEXT_SECONDARY,
        marginBottom: "12px"
    },
    viewPrompt: {
        fontSize: "11px",
        color: GOLD,
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontWeight: 600,
        borderTop: `1px solid ${GOLD}33`,
        paddingTop: "10px",
        marginTop: "4px"
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
    },
    modalContent: {
        background: CARD_BG,
        width: "90%",
        maxWidth: "500px",
        borderRadius: "20px",
        overflow: "hidden",
        border: `1px solid ${GOLD}`,
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)"
    },
    modalHeader: {
        padding: "20px",
        borderBottom: `1px solid ${GOLD}33`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: BG_DARK
    },
    modalBody: {padding: "20px", maxHeight: "60vh", overflowY: "auto"},
    closeBtn: {background: "none", border: "none", cursor: "pointer", color: TEXT_SECONDARY},
    tipsList: {display: "flex", flexDirection: "column", gap: "12px"},
    tipItem: {padding: "12px", background: BG_DARK, borderRadius: "10px", border: `1px solid ${GOLD}33`},
    tipHeader: {display: "flex", justifyContent: "space-between", marginBottom: "8px"},
    tipFooter: {display: "flex", justifyContent: "space-between", alignItems: "center"},
};

// NEW pagination styles (added after styles object)
const paginationContainer = {
    marginTop: "32px",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "16px 0",
    borderTop: `1px solid ${GOLD}33`,
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

const limitSelect = {
    padding: "6px 10px",
    borderRadius: "6px",
    border: `1px solid ${GOLD}`,
    background: BG_DARK,
    color: TEXT_PRIMARY,
    fontSize: "12px",
    cursor: "pointer",
    outline: "none",
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