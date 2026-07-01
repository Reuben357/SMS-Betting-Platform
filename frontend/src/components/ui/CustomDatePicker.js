"use client";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";

export default function CustomDatePicker({ value, onChange, placeholder = "dd/mm/yyyy" }) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const containerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync from external value (YYYY-MM-DD string)
    useEffect(() => {
        if (value) {
            const parsed = new Date(value + "T00:00:00"); // avoid timezone shift
            if (!isNaN(parsed)) {
                setSelectedDate(parsed);
                setViewDate(parsed);
            }
        } else {
            setSelectedDate(null);
        }
    }, [value]);

    const months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ];
    const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const generateCalendarCells = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const totalDays = getDaysInMonth(year, month);
        const firstDayIndex = getFirstDayOfMonth(year, month);
        const cells = [];

        const prevMonthDays = getDaysInMonth(year, month - 1);
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            cells.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
        }
        for (let d = 1; d <= totalDays; d++) {
            cells.push({ day: d, isCurrentMonth: true, date: new Date(year, month, d) });
        }
        const remaining = 42 - cells.length;
        for (let n = 1; n <= remaining; n++) {
            cells.push({ day: n, isCurrentMonth: false, date: new Date(year, month + 1, n) });
        }
        return cells;
    };

    const handleDateClick = (cellDate) => {
        setSelectedDate(cellDate);
        // Emit as YYYY-MM-DD (what <input type="date"> uses, compatible with accounting filters)
        const year = cellDate.getFullYear();
        const month = String(cellDate.getMonth() + 1).padStart(2, "0");
        const day = String(cellDate.getDate()).padStart(2, "0");
        onChange(`${year}-${month}-${day}`);
        setIsOpen(false);
    };

    const handleClear = () => {
        setSelectedDate(null);
        onChange("");
        setIsOpen(false);
    };

    const handleToday = () => {
        const today = new Date();
        setViewDate(today);
        handleDateClick(today);
    };

    const changeMonth = (direction) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + direction, 1));
    };

    const displayValue = () => {
        if (!selectedDate) return placeholder;
        return selectedDate.toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric"
        });
    };

    const today = new Date();

    return (
        <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
            {/* Trigger input */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: BG_DARK,
                    border: `1px solid ${GOLD}33`,
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: selectedDate ? TEXT_PRIMARY : TEXT_SECONDARY,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    userSelect: "none",
                }}
            >
                <span>{displayValue()}</span>
                <Calendar size={14} color={GOLD} />
            </div>

            {/* Dropdown calendar */}
            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    background: CARD_BG,
                    border: `1px solid ${GOLD}33`,
                    borderRadius: "10px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    zIndex: 999,
                    width: "260px",
                    padding: "14px",
                }}>
                    {/* Month/Year navigation */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <button type="button" onClick={() => changeMonth(-1)} style={pickerStyles.navBtn}>
                            <ChevronLeft size={15} />
                        </button>
                        <span style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: "13px" }}>
                            {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </span>
                        <button type="button" onClick={() => changeMonth(1)} style={pickerStyles.navBtn}>
                            <ChevronRight size={15} />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: "6px" }}>
                        {daysOfWeek.map((d, i) => (
                            <span key={i} style={{ fontSize: "10px", fontWeight: 700, color: TEXT_SECONDARY }}>{d}</span>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
                        {generateCalendarCells().map((cell, idx) => {
                            const isSelected = selectedDate &&
                                cell.date.getDate() === selectedDate.getDate() &&
                                cell.date.getMonth() === selectedDate.getMonth() &&
                                cell.date.getFullYear() === selectedDate.getFullYear();

                            const isToday =
                                cell.date.getDate() === today.getDate() &&
                                cell.date.getMonth() === today.getMonth() &&
                                cell.date.getFullYear() === today.getFullYear();

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleDateClick(cell.date)}
                                    style={{
                                        width: "100%",
                                        aspectRatio: "1",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: isToday && !isSelected ? `1px solid ${GOLD}66` : "none",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        background: isSelected ? GOLD : "transparent",
                                        color: isSelected ? BG_DARK : cell.isCurrentMonth ? TEXT_PRIMARY : "#555",
                                        fontWeight: isSelected ? 700 : isToday ? 700 : 400,
                                        transition: "background 0.15s",
                                    }}
                                >
                                    {cell.day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer shortcuts */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "10px",
                        paddingTop: "8px",
                        borderTop: `1px solid ${GOLD}20`,
                    }}>
                        <button type="button" onClick={handleClear} style={pickerStyles.textLink}>Clear</button>
                        <button type="button" onClick={handleToday} style={{ ...pickerStyles.textLink, color: GOLD }}>Today</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const pickerStyles = {
    navBtn: {
        background: "none",
        border: "none",
        color: GOLD,
        cursor: "pointer",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        borderRadius: "4px",
    },
    textLink: {
        background: "none",
        border: "none",
        color: TEXT_SECONDARY,
        fontSize: "12px",
        cursor: "pointer",
        fontWeight: 600,
    },
};