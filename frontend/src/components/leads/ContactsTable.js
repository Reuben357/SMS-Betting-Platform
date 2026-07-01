"use client";
import {useState, useEffect, useRef, useCallback} from "react";

import {
    Search,
    FileDown,
    Eye,
    EyeOff,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    FileText,
    X,
} from "lucide-react";
import {exportToPDF} from "@/lib/pdfExport";
import {getTierColor} from "@/lib/tierColors";
import {exportToCSV} from "@/lib/exportService";
import SharedScrollableSelect from "@/components/ui/ScrollableSelect";

// Midnight Gold palette
import {
    BG_DARK,
    CARD_BG,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    GOLD,
    DANGER,
    SUCCESS,
} from "@/lib/theme";

function obfuscatePhone(phone) {
    if (!phone) return "?";
    const str = String(phone);
    if (str.length < 4) return "*".repeat(str.length);
    const first = str.slice(0, 2);
    const last = str.slice(-2);
    return `${first}******${last}`;
}

// ScrollableSelect – robustly handles both numeric tiers and {value,label} options
function ScrollableSelect({value, onChange, options, placeholder = "All Tiers", disabled = false}) {
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

    useEffect(() => {
        if (disabled) setIsOpen(false);
    }, [disabled]);

    // Determine if options are numeric tiers or generic objects
    const isNumberOptions =
        options.length === 0 ||
        !options[0] ||
        typeof options[0] !== "object" ||
        !("value" in options[0] && "label" in options[0]);

    const getDisplayValue = () => {
        if (value === null || value === undefined || value === "") return placeholder;
        if (isNumberOptions) {
            return `Tier ${value}`;
        } else {
            const opt = options.find((o) => o.value === value);
            return opt ? opt.label : placeholder;
        }
    };

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} style={{position: "relative", minWidth: "140px"}}>
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "10px 12px",
                    background: BG_DARK,
                    border: `1px solid ${disabled ? GOLD + "22" : GOLD + "33"}`,
                    borderRadius: "8px",
                    color: disabled ? TEXT_SECONDARY + "88" : value ? TEXT_PRIMARY : TEXT_SECONDARY,
                    fontSize: "14px",
                    width: "100%",
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: disabled ? 0.5 : 1,
                    transition: "opacity 0.2s",
                }}
            >
                <span>{disabled ? placeholder : getDisplayValue()}</span>
                <ChevronDown size={16} style={{color: disabled ? TEXT_SECONDARY : GOLD}}/>
            </button>
            {isOpen && !disabled && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        background: CARD_BG,
                        border: `1px solid ${GOLD}33`,
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        maxHeight: "300px", // increased for better scrolling
                        overflowY: "auto",
                        zIndex: 100,
                    }}
                >
                    {isNumberOptions ? (
                        // Numeric tier options
                        <>
                            <div
                                onClick={() => handleSelect(null)}
                                style={{
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    color: value === null ? GOLD : TEXT_SECONDARY,
                                    background: value === null ? `${GOLD}20` : "transparent",
                                    borderBottom: `1px solid ${GOLD}20`,
                                }}
                            >
                                All Tiers
                            </div>
                            {options.map((t) => (
                                <div
                                    key={t}
                                    onClick={() => handleSelect(t)}
                                    style={{
                                        padding: "8px 12px",
                                        cursor: "pointer",
                                        color: value === t ? GOLD : TEXT_PRIMARY,
                                        background: value === t ? `${GOLD}20` : "transparent",
                                        borderBottom: `1px solid ${GOLD}20`,
                                    }}
                                >
                                    Tier {t}
                                </div>
                            ))}
                        </>
                    ) : (
                        // Generic {value, label} options
                        options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                style={{
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    color: value === opt.value ? GOLD : TEXT_PRIMARY,
                                    background: value === opt.value ? `${GOLD}20` : "transparent",
                                    borderBottom: `1px solid ${GOLD}20`,
                                }}
                            >
                                {opt.label}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default function ContactsTable({
                                          refreshTrigger,
                                          selectedTier,
                                          onTierChange,
                                          tierOptions = [],
                                          isUntiered,
                                          endpoint = "/api/proxy/contacts",
                                          showTierFilters = true,
                                          jackpotMode = false,
                                          jpTierOptions = [],
                                          selectedJpTier = null,
                                          onJpTierChange = null,
                                      }) {
    const [data, setData] = useState({contacts: [], total: 0, pages: 1});
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(15);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [obfuscate, setObfuscate] = useState(false);
    const [gotoPage, setGotoPage] = useState("");

    // Modal for CSV uploads
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedPhone, setSelectedPhone] = useState("");
    const [contactUploads, setContactUploads] = useState([]);
    const [loadingUploads, setLoadingUploads] = useState(false);
    const [hideAmountInModal, setHideAmountInModal] = useState(false);

    const tableContainerRef = useRef(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const getPageNumbers = () => {
        const total = data.pages;
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

    const fetchContacts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                limit,
                search,
                tier: selectedTier !== null && selectedTier !== undefined ? String(selectedTier) : "",
            });

            // Add JP tier filter for jackpot mode
            if (jackpotMode && selectedJpTier) {
                params.set("jp_tier", selectedJpTier);
            }

            const res = await fetch(`${endpoint}?${params}`);
            const json = await res.json();
            setData({
                contacts: json.contacts || [],
                total: json.total || 0,
                pages: json.pages || 1,
            });
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, selectedTier, refreshTrigger, endpoint, jackpotMode, selectedJpTier]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    useEffect(() => {
        setPage(1);
    }, [selectedTier]);

    useEffect(() => {
        setPage(1);
    }, [limit]);

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // ===== EXPORT =====
    const handleExport = () => {
        let columns, rows;
        if (jackpotMode) {
            columns = ["Phone Number", "Name", "Frequency", "Date Added"];
            rows = data.contacts.map((c) => [
                obfuscate ? obfuscatePhone(c.phone_number) : c.phone_number,
                c.name || "?",
                c.frequency_count,
                new Date(c.created_at).toLocaleDateString("en-GB"),
            ]);
            exportToPDF("Potential Jackpot Customers", columns, rows, `jackpot_${Date.now()}`, false);
        } else {
            columns = ["Phone Number", "Name", "Frequency", "Revenue", "Tier"];
            rows = data.contacts.map((c) => [
                obfuscate ? obfuscatePhone(c.phone_number) : c.phone_number,
                c.name || "?",
                c.frequency_count,
                `KES ${Number(c.total_received_amount).toLocaleString()}`,
                c.potential_tier ? `Tier ${c.potential_tier}` : "?",
            ]);
            exportToPDF("Potential Customers", columns, rows, `leads_${Date.now()}`, false);
        }
    };

    const handleExportCSV = () => {
        let columns, rows;
        if (jackpotMode) {
            columns = ["Phone Number", "Name", "Frequency", "Date Added"];
            rows = data.contacts.map((c) => [
                obfuscate ? obfuscatePhone(c.phone_number) : c.phone_number,
                c.name || "?",
                c.frequency_count,
                new Date(c.created_at).toLocaleDateString("en-GB"),
            ]);
            exportToCSV(columns, rows, `jackpot_${Date.now()}`);
        } else {
            columns = ["Phone Number", "Name", "Frequency", "Revenue", "Tier"];
            rows = data.contacts.map((c) => [
                obfuscate ? obfuscatePhone(c.phone_number) : c.phone_number,
                c.name || "?",
                c.frequency_count,
                `KES ${Number(c.total_received_amount).toLocaleString()}`,
                c.potential_tier ? `Tier ${c.potential_tier}` : "?",
            ]);
            exportToCSV(columns, rows, `leads_${Date.now()}`);
        }
    };

    const handleGoToPage = () => {
        const pageNum = parseInt(gotoPage);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= data.pages) {
            setPage(pageNum);
            setGotoPage("");
        }
    };

    const handleUntieredClick = () => {
        onTierChange(isUntiered ? null : "untiered");
    };

    const handleTierDropdownChange = (val) => {
        onTierChange(val);
    };

    // Fetch uploads for a given phone (modal)
    const fetchContactUploads = async (phone) => {
        setLoadingUploads(true);
        setHideAmountInModal(jackpotMode);
        try {
            const url = jackpotMode
                ? `/api/proxy/contacts/${phone}/uploads?jackpot=true`
                : `/api/proxy/contacts/${phone}/uploads`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch uploads");
            const data = await res.json();
            setContactUploads(data.uploads || []);
            setSelectedPhone(phone);
            setShowUploadModal(true);
        } catch (err) {
            alert("Failed to load upload data.");
        } finally {
            setLoadingUploads(false);
        }
    };

    // Define columns dynamically based on mode
    const columns = jackpotMode
        ? ["Contact Details", "Frequency (JP)", "JP Tier", "Date Added", "CSV"]
        : ["Contact Details", "Frequency", "Amount Received", "Tier Status", "Date Added", "CSV"];

    return (
        <div style={cardStyle}>
            {/* Filter bar */}
            <div style={filterHeaderStyle}>
                <div style={{display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap"}}>
                    {/* Search */}
                    <div style={{position: "relative"}}>
                        <Search size={16} style={searchIconStyle}/>
                        <input
                            placeholder="Search leads..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            style={searchInputStyle}
                        />
                    </div>

                    {/* Standard tier filters (only when showTierFilters) */}
                    {showTierFilters && (
                        <>
                            <ScrollableSelect
                                value={isUntiered ? null : selectedTier}
                                onChange={handleTierDropdownChange}
                                options={tierOptions}
                                disabled={isUntiered}
                            />
                            <button
                                onClick={handleUntieredClick}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    border: `1px solid ${isUntiered ? GOLD : GOLD + "55"}`,
                                    background: isUntiered ? GOLD : BG_DARK,
                                    color: isUntiered ? BG_DARK : TEXT_SECONDARY,
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                {isUntiered && <span style={{fontSize: "11px"}}>✓</span>}
                                Untiered
                            </button>
                        </>
                    )}

                    {/* JP Tier dropdown (only in jackpot mode) */}
                    {jackpotMode && jpTierOptions.length > 0 && (
                        <ScrollableSelect
                            value={selectedJpTier}
                            onChange={onJpTierChange}
                            options={[
                                {value: null, label: "All JP Tiers"},
                                ...jpTierOptions.map((t) => ({
                                    value: String(t.tier_number),
                                    label: `Tier ${t.tier_number}`,
                                })),
                            ]}
                            placeholder="All JP Tiers"
                        />
                    )}

                    {/* Visibility toggle */}
                    <button onClick={() => setObfuscate(!obfuscate)} style={toggleButtonStyle(obfuscate)}>
                        {obfuscate ? <EyeOff size={14}/> : <Eye size={14}/>}
                        {obfuscate ? "Hidden" : "Visible"}
                    </button>
                </div>

                <div style={{display: "flex", justifyContent: "space-between", margin: "12px"}}>
                    <button onClick={handleExport} style={exportButtonStyle}>
                        <FileDown size={18}/> Export PDF
                    </button>
                    <button
                        onClick={handleExportCSV}
                        style={{...exportButtonStyle, borderColor: GOLD, padding: "10px"}}
                    >
                        CSV
                    </button>
                </div>
            </div>

            {/* Table */}
            <div ref={tableContainerRef} style={{overflowX: "auto"}}>
                <table style={{width: "100%", borderCollapse: "collapse"}}>
                    <thead>
                    <tr style={{background: BG_DARK, textAlign: "left"}}>
                        {columns.map((h) => (
                            <th key={h} style={thStyle}>
                                {h}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length} style={statusTdStyle}>
                                Loading contacts...
                            </td>
                        </tr>
                    ) : data.contacts.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} style={statusTdStyle}>
                                No leads found.
                            </td>
                        </tr>
                    ) : (
                        data.contacts.map((c) => {
                            const tierNum = c.potential_tier;
                            const colors = tierNum
                                ? getTierColor(tierNum)
                                : {bg: BG_DARK, text: TEXT_SECONDARY, border: `${GOLD}33`};
                            const displayPhone = obfuscate ? obfuscatePhone(c.phone_number) : c.phone_number;

                            return (
                                <tr key={c.phone_number} style={trStyle}>
                                    {/* Contact Details */}
                                    <td style={tdStyle}>
                                        <div style={{fontWeight: 700, color: TEXT_PRIMARY}}>{displayPhone}</div>
                                        <div style={{fontSize: "12px", color: TEXT_SECONDARY}}>{c.name || "?"}</div>
                                    </td>

                                    {/* Frequency */}
                                    <td style={{...tdStyle, color: TEXT_SECONDARY}}>
                                        {c.frequency_count} {!jackpotMode ? "times" : ""}
                                    </td>

                                    {/* Conditional columns */}
                                    {jackpotMode ? (
                                        // JACKPOT MODE: show JP Tier (left-aligned)
                                        <td style={{...tdStyle, textAlign: "left"}}>
                                                <span
                                                    style={{
                                                        padding: "4px 10px",
                                                        background: c.jp_tier_number ? `${GOLD}20` : BG_DARK,
                                                        color: c.jp_tier_number ? GOLD : TEXT_SECONDARY,
                                                        borderRadius: "6px",
                                                        fontSize: "11px",
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    {c.jp_tier_number ? `TIER ${c.jp_tier_number}` : "N/A"}
                                                </span>
                                        </td>
                                    ) : (
                                        // NORMAL MODE: show Amount Received and Tier Status
                                        <>
                                            <td style={{...tdStyle, color: SUCCESS, fontWeight: 700}}>
                                                KES {Number(c.total_received_amount).toLocaleString()}
                                            </td>
                                            <td style={tdStyle}>
                                                    <span
                                                        style={{
                                                            padding: "4px 10px",
                                                            background: colors.bg,
                                                            color: colors.text,
                                                            border: `1px solid ${colors.border}`,
                                                            borderRadius: "6px",
                                                            fontSize: "11px",
                                                            fontWeight: 800,
                                                        }}
                                                    >
                                                        TIER {c.potential_tier || "N/A"}
                                                    </span>
                                            </td>
                                        </>
                                    )}

                                    {/* Date Added */}
                                    <td style={{...tdStyle, color: TEXT_SECONDARY, fontSize: "12px"}}>
                                        {new Date(c.created_at).toLocaleDateString("en-GB")}
                                    </td>

                                    {/* CSV column – button that opens modal */}
                                    <td style={{...tdStyle, textAlign: "center"}}>
                                        <button
                                            onClick={() => fetchContactUploads(c.phone_number)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                cursor: "pointer",
                                                color: GOLD,
                                                padding: "4px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                            title="View CSV uploads for this contact"
                                        >
                                            <FileText size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
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
                                …
                            </span>
                        ) : (
                            <button
                                key={item}
                                onClick={() => setPage(item)}
                                style={{
                                    ...paginationButton,
                                    background: page === item ? GOLD : "transparent",
                                    color: page === item ? BG_DARK : TEXT_PRIMARY,
                                    borderColor: page === item ? GOLD : `${GOLD}33`,
                                }}
                            >
                                {item}
                            </button>
                        )
                    )}
                    <button
                        onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                        disabled={page === data.pages}
                        style={paginationButton}
                    >
                        Next <ChevronRight size={16}/>
                    </button>
                </div>

                <div style={paginationSide}>
                    <div style={{display: "flex", alignItems: "center", gap: "6px", width: "120px"}}>
                        <SharedScrollableSelect
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
                            max={data.pages}
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

            {/* CSV Uploads Modal – Amount column hidden when jackpotMode = true */}
            {showUploadModal && (
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
                    onClick={() => setShowUploadModal(false)}
                >
                    <div
                        style={{
                            background: CARD_BG,
                            borderRadius: "16px",
                            border: `1px solid ${GOLD}`,
                            padding: "24px",
                            maxWidth: "600px",
                            width: "90%",
                            maxHeight: "80vh",
                            overflow: "auto",
                            boxShadow: "0 20px 25px rgba(0,0,0,0.5)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{display: "flex", justifyContent: "space-between", marginBottom: "16px"}}>
                            <h3 style={{color: GOLD, margin: 0}}>
                                CSV Uploads for {selectedPhone}
                            </h3>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                style={{background: "none", border: "none", cursor: "pointer", color: TEXT_SECONDARY}}
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        {loadingUploads ? (
                            <p style={{color: TEXT_SECONDARY}}>Loading uploads...</p>
                        ) : contactUploads.length === 0 ? (
                            <p style={{color: TEXT_SECONDARY}}>No upload records found for this contact.</p>
                        ) : (
                            <table style={{width: "100%", borderCollapse: "collapse"}}>
                                <thead>
                                <tr style={{borderBottom: `1px solid ${GOLD}33`}}>
                                    <th style={{
                                        textAlign: "left",
                                        padding: "8px",
                                        color: TEXT_SECONDARY,
                                        fontSize: "11px"
                                    }}>
                                        Filename
                                    </th>
                                    {!hideAmountInModal && (
                                        <th style={{
                                            textAlign: "right",
                                            padding: "8px",
                                            color: TEXT_SECONDARY,
                                            fontSize: "11px"
                                        }}>
                                            Amount
                                        </th>
                                    )}
                                    <th style={{
                                        textAlign: "right",
                                        padding: "8px",
                                        color: TEXT_SECONDARY,
                                        fontSize: "11px"
                                    }}>
                                        Event Date
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {contactUploads.map((row, idx) => (
                                    <tr key={idx} style={{borderBottom: `1px solid ${GOLD}20`}}>
                                        <td style={{padding: "8px", color: TEXT_PRIMARY, fontSize: "13px"}}>
                                            {row.filename}
                                        </td>
                                        {!hideAmountInModal && (
                                            <td style={{
                                                padding: "8px",
                                                textAlign: "right",
                                                color: GOLD,
                                                fontWeight: 700
                                            }}>
                                                KES {Number(row.amount).toLocaleString()}
                                            </td>
                                        )}
                                        <td style={{
                                            padding: "8px",
                                            textAlign: "right",
                                            color: TEXT_SECONDARY,
                                            fontSize: "12px"
                                        }}>
                                            {new Date(row.date_created).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                        <div style={{marginTop: "16px", fontSize: "12px", color: TEXT_SECONDARY}}>
                            Total uploads: {contactUploads.length}
                        </div>
                    </div>
                </div>
            )}
            {/* END MODAL */}

            {/* Scroll to Top Button */}
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

// Styles (unchanged)
const cardStyle = {
    background: CARD_BG,
    borderRadius: "16px",
    border: `1px solid ${GOLD}33`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
};
const filterHeaderStyle = {
    padding: "20px 24px",
    borderBottom: `1px solid ${GOLD}33`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
};
const searchInputStyle = {
    padding: "10px 12px 10px 36px",
    border: `1px solid ${GOLD}33`,
    borderRadius: "8px",
    fontSize: "14px",
    width: "240px",
    color: TEXT_PRIMARY,
    background: BG_DARK,
};
const searchIconStyle = {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: TEXT_SECONDARY,
};
const toggleButtonStyle = (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "8px",
    border: `1px solid ${GOLD}33`,
    background: active ? GOLD : BG_DARK,
    color: active ? BG_DARK : TEXT_SECONDARY,
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
});
const exportButtonStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: GOLD,
    fontWeight: 700,
    fontSize: "14px",
    background: BG_DARK,
    padding: "10px 16px",
    margin: "0 12px",
    borderRadius: "8px",
    border: `1px solid ${GOLD}`,
    cursor: "pointer",
};
const thStyle = {
    padding: "16px 24px",
    color: TEXT_SECONDARY,
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${GOLD}33`,
};
const tdStyle = {padding: "16px 24px", borderBottom: `1px solid ${GOLD}20`, fontSize: "14px"};
const trStyle = {transition: "background 0.2s"};
const statusTdStyle = {padding: "60px", textAlign: "center", color: TEXT_SECONDARY, fontSize: "14px"};
const paginationContainer = {
    padding: "16px 24px",
    borderTop: `1px solid ${GOLD}33`,
    background: BG_DARK,
    borderBottomLeftRadius: "16px",
    borderBottomRightRadius: "16px",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
};
const paginationControls = {display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap"};
const paginationButton = {
    padding: "6px 12px",
    border: `1px solid ${GOLD}33`,
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
const paginationEllipsis = {padding: "6px 8px", color: TEXT_SECONDARY, fontSize: "14px"};
const paginationSide = {display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap"};
const gotoInput = {
    width: "80px",
    padding: "6px 8px",
    borderRadius: "6px",
    border: `1px solid ${GOLD}`,
    background: BG_DARK,
    color: TEXT_PRIMARY,
    fontSize: "12px",
    textAlign: "center",
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