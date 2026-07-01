"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BG_DARK, CARD_BG, TEXT_PRIMARY, TEXT_SECONDARY, GOLD, SUCCESS } from "../../lib/theme";
import ScrollableSelect from "../../components/ui/ScrollableSelect";

export default function Pagination({
                                       page,
                                       setPage,
                                       totalPages,
                                       limit,
                                       setLimit,
                                       gotoPage,
                                       setGotoPage,
                                       limitOptions = [10, 15, 20, 50, 100, 250, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000],
                                   }) {
    const getPageNumbers = () => {
        const current = page;
        const total = totalPages;
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

    if (totalPages <= 1) return null;

    return (
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
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                        padding: "6px 12px",
                        border: `1px solid ${GOLD}33`,
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
                {getPageNumbers().map((item, idx) =>
                    item === "..." ? (
                        <span key={`ellipsis-${idx}`} style={{ padding: "6px 8px", color: TEXT_SECONDARY }}>…</span>
                    ) : (
                        <button
                            key={item}
                            onClick={() => setPage(item)}
                            style={{
                                padding: "6px 12px",
                                border: `1px solid ${GOLD}33`,
                                borderRadius: "6px",
                                background: page === item ? GOLD : "transparent",
                                color: page === item ? BG_DARK : TEXT_PRIMARY,
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
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                        padding: "6px 12px",
                        border: `1px solid ${GOLD}33`,
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
                        options={limitOptions.map(num => ({ value: String(num), label: `${num} / page` }))}
                    />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                            textAlign: "center",
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
    );
}