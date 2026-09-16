"use client";
import {useState, useEffect, useRef} from "react";
import {ChevronLeft, ChevronRight, Calendar} from "lucide-react";

// Theme constants matching your dashboard
const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";

export default function CustomDateTimePicker({value, onChange}) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const containerRef = useRef(null);

    // Internal breakdown states
    const [selectedDate, setSelectedDate] = useState(null);
    const [hour, setHour] = useState("09");
    const [minute, setMinute] = useState("00");
    const [period, setPeriod] = useState("AM");

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

    // Initialize or sync from existing ISO string value
    useEffect(() => {
        if (value) {
            const parsed = new Date(value);
            if (!isNaN(parsed)) {
                setSelectedDate(parsed);
                setViewDate(parsed);

                let h = parsed.getHours();
                const p = h >= 12 ? "PM" : "AM";
                h = h % 12;
                h = h ? h : 12; // convert 0 to 12
                setHour(String(h).padStart(2, "0"));
                setMinute(String(parsed.getMinutes()).padStart(2, "0"));
                setPeriod(p);
            }
        }
    }, [value]);

    // Construct backend compatible value format: YYYY-MM-DDTHH:mm
    const updateParentValue = (dateObj, hStr, mStr, pStr) => {
        if (!dateObj) return;
        let numericHour = parseInt(hStr, 10);
        if (pStr === "PM" && numericHour < 12) numericHour += 12;
        if (pStr === "AM" && numericHour === 12) numericHour = 0;

        const updated = new Date(dateObj);
        updated.setHours(numericHour, parseInt(mStr, 10), 0, 0);
        onChange(updated.toISOString());
    };

    // Calendar generation definitions
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const generateCalendarCells = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        const totalDays = getDaysInMonth(year, month);
        const firstDayIndex = getFirstDayOfMonth(year, month);

        const cells = [];

        // Previous Month padding items
        const prevMonthDays = getDaysInMonth(year, month - 1);
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            cells.push({
                day: prevMonthDays - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, prevMonthDays - i)
            });
        }

        // Current Month active items
        for (let d = 1; d <= totalDays; d++) {
            cells.push({day: d, isCurrentMonth: true, date: new Date(year, month, d)});
        }

        // Next Month padding items to complete clean balance grid row rows
        const remainingCells = 42 - cells.length;
        for (let n = 1; n <= remainingCells; n++) {
            cells.push({day: n, isCurrentMonth: false, date: new Date(year, month + 1, n)});
        }

        return cells;
    };

    const handleDateClick = (cellDate) => {
        setSelectedDate(cellDate);
        updateParentValue(cellDate, hour, minute, period);
    };

    const handleTimeSelect = (type, val) => {
        let nextH = hour, nextM = minute, nextP = period;
        if (type === "hour") setHour(nextH = val);
        if (type === "minute") setMinute(nextM = val);
        if (type === "period") setPeriod(nextP = val);

        if (!selectedDate) {
            const fallbackToday = new Date();
            setSelectedDate(fallbackToday);
            updateParentValue(fallbackToday, nextH, nextM, nextP);
        } else {
            updateParentValue(selectedDate, nextH, nextM, nextP);
        }
    };

    const displayInputValue = () => {
        if (!value) return "mm/dd/yyyy, --:-- --";
        const d = new Date(value);
        if (isNaN(d)) return "mm/dd/yyyy, --:-- --";
        return d.toLocaleString("en-US", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hour12: true
        });
    };

    const changeMonth = (direction) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + direction, 1));
    };

    // Arrays for generating columns
    const hoursArray = Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, "0"));
    const minutesArray = Array.from({length: 60}, (_, i) => String(i).padStart(2, "0"));

    return (
        <div ref={containerRef} style={{position: "relative", width: "100%"}}>
            {/* Input wrapper replacing the basic box field */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: "12px",
                    border: `1px solid ${GOLD}33`,
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: BG_DARK,
                    color: value ? TEXT_PRIMARY : TEXT_SECONDARY,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >
                <span>{displayInputValue()}</span>
                <Calendar size={16} color={GOLD}/>
            </div>

            {/* Modal Flyout Interface Container */}
            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    background: CARD_BG,
                    border: `1px solid ${GOLD}33`,
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    zIndex: 999,
                    display: "flex",
                    width: "480px",
                    overflow: "hidden"
                }}>

                    {/* LEFT PANEL: Calendar */}
                    <div style={{padding: "16px", flex: 1, borderRight: `1px solid ${GOLD}20`}}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px"
                        }}>
                            <span style={{color: TEXT_PRIMARY, fontWeight: 700, fontSize: "14px"}}>
                                {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                            </span>
                            <div style={{display: "flex", gap: "8px"}}>
                                <button type="button" onClick={() => changeMonth(-1)} style={pickerStyles.navBtn}>
                                    <ChevronLeft size={16}/></button>
                                <button type="button" onClick={() => changeMonth(1)} style={pickerStyles.navBtn}>
                                    <ChevronRight size={16}/></button>
                            </div>
                        </div>

                        {/* Week headers */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(7, 1fr)",
                            textAlign: "center",
                            marginBottom: "8px"
                        }}>
                            {daysOfWeek.map((day, idx) => (
                                <span key={idx}
                                      style={{color: TEXT_SECONDARY, fontSize: "11px", fontWeight: 700}}>{day}</span>
                            ))}
                        </div>

                        {/* Grid Blocks */}
                        <div style={{display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px"}}>
                            {generateCalendarCells().map((cell, idx) => {
                                const isSelected = selectedDate &&
                                    cell.date.getDate() === selectedDate.getDate() &&
                                    cell.date.getMonth() === selectedDate.getMonth() &&
                                    cell.date.getFullYear() === selectedDate.getFullYear();

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleDateClick(cell.date)}
                                        style={{
                                            ...pickerStyles.cellBtn,
                                            color: isSelected ? BG_DARK : cell.isCurrentMonth ? TEXT_PRIMARY : "#555555",
                                            background: isSelected ? GOLD : "transparent",
                                            fontWeight: isSelected ? "700" : "400"
                                        }}
                                    >
                                        {cell.day}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Action Shortcuts Footer */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: "12px",
                            paddingTop: "8px",
                            borderTop: `1px solid ${GOLD}15`
                        }}>
                            <button type="button" onClick={() => {
                                setSelectedDate(null);
                                onChange("");
                            }} style={pickerStyles.textLink}>Clear
                            </button>
                            <button type="button" onClick={() => {
                                const today = new Date();
                                setViewDate(today);
                                handleDateClick(today);
                            }} style={{...pickerStyles.textLink, color: GOLD}}>Today
                            </button>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Dual Columns for Time */}
                    <div style={{width: "160px", display: "flex", background: BG_DARK}}>

                        {/* Hours list */}
                        <div style={pickerStyles.timeColumn}>
                            {hoursArray.map((h) => (
                                <div
                                    key={h}
                                    onClick={() => handleTimeSelect("hour", h)}
                                    style={{
                                        ...pickerStyles.timeItem,
                                        background: hour === h ? "#0066cc" : "transparent",
                                        color: hour === h ? TEXT_PRIMARY : TEXT_SECONDARY
                                    }}
                                >
                                    {h}
                                </div>
                            ))}
                        </div>

                        {/* Minutes list */}
                        <div style={pickerStyles.timeColumn}>
                            {minutesArray.map((m) => (
                                <div
                                    key={m}
                                    onClick={() => handleTimeSelect("minute", m)}
                                    style={{
                                        ...pickerStyles.timeItem,
                                        background: minute === m ? "#0066cc" : "transparent",
                                        color: minute === m ? TEXT_PRIMARY : TEXT_SECONDARY
                                    }}
                                >
                                    {m}
                                </div>
                            ))}
                        </div>

                        {/* Period items AM / PM */}
                        <div style={{...pickerStyles.timeColumn, borderRight: "none"}}>
                            {["AM", "PM"].map((p) => (
                                <div
                                    key={p}
                                    onClick={() => handleTimeSelect("period", p)}
                                    style={{
                                        ...pickerStyles.timeItem,
                                        background: period === p ? "#0066cc" : "transparent",
                                        color: period === p ? TEXT_PRIMARY : TEXT_SECONDARY
                                    }}
                                >
                                    {p}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

// Scoped Sub-Styles for Picker Panel layout alignment
const pickerStyles = {
    navBtn: {background: "none", border: "none", color: GOLD, cursor: "pointer", padding: "4px"},
    cellBtn: {
        width: "100%",
        height: "28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        borderRadius: "4px",
        fontSize: "12px",
        cursor: "pointer"
    },
    textLink: {
        background: "none",
        border: "none",
        color: "#0066cc",
        fontSize: "12px",
        cursor: "pointer",
        fontWeight: "600"
    },
    timeColumn: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #262626",
        height: "240px",
        scrollbarWidth: "none"
    },
    timeItem: {padding: "8px 0", textAlign: "center", fontSize: "12px", cursor: "pointer", userSelect: "none"}
};