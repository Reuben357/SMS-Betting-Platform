"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { BG_DARK, GOLD, TEXT_PRIMARY, TEXT_SECONDARY, CARD_BG } from "@/lib/theme";

export default function ScrollableSelect({
                                             value,
                                             onChange,
                                             options,
                                             placeholder = "Select...",
                                             forceDirection, // "up" or "down"
                                         }) {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState({});
    const buttonRef = useRef(null);
    const containerRef = useRef(null);
    const dropdownRef = useRef(null); // <-- ref for the dropdown portal container
    const VIEWPORT_MARGIN = 8;
    const MAX_DROPDOWN_HEIGHT = 300;

    // Close dropdown on scroll OUTSIDE the dropdown
    useEffect(() => {
        if (!isOpen) return;
        const handleScroll = (event) => {
            // If the scroll target is inside the dropdown, do nothing
            if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
                return;
            }
            setIsOpen(false);
        };
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", () => setIsOpen(false));
        return () => {
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", () => setIsOpen(false));
        };
    }, [isOpen]);

    // Click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target) &&
                !event.target.closest(".scrollable-dropdown-portal")
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            let upward = false;
            if (forceDirection === "up") upward = true;
            else if (forceDirection === "down") upward = false;
            else upward = spaceBelow < 320 + VIEWPORT_MARGIN && spaceAbove > spaceBelow;

            setOpenUpward(upward);

            let maxH;
            if (upward) {
                maxH = Math.min(spaceAbove - VIEWPORT_MARGIN, MAX_DROPDOWN_HEIGHT);
            } else {
                maxH = Math.min(spaceBelow - VIEWPORT_MARGIN, MAX_DROPDOWN_HEIGHT);
            }
            maxH = Math.max(120, maxH);

            const style = {
                position: "fixed",
                zIndex: 9999,
                minWidth: rect.width,
                maxWidth: rect.width,
                background: CARD_BG,
                border: `1px solid ${GOLD}33`,
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                overflowY: "auto",
                padding: "4px 0",
                overscrollBehavior: "contain",
                maxHeight: maxH,
            };

            if (upward) {
                style.bottom = window.innerHeight - rect.top + 4;
            } else {
                style.top = rect.bottom + 4;
            }
            style.left = rect.left;

            setDropdownStyle(style);
        }
        setIsOpen((prev) => !prev);
    };

    return (
        <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleToggle}
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: `1px solid ${GOLD}33`,
                    background: BG_DARK,
                    color: value ? TEXT_PRIMARY : TEXT_SECONDARY,
                    fontSize: "14px",
                    width: "100%",
                    cursor: "pointer",
                }}
            >
        <span>
          {value
              ? options.find((o) => o.value === value)?.label || placeholder
              : placeholder}
        </span>
                <ChevronDown size={16} color={GOLD} />
            </button>
            {isOpen &&
                createPortal(
                    <div
                        ref={dropdownRef} // <-- assign ref to portal container
                        className="scrollable-dropdown-portal"
                        style={dropdownStyle}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                style={{
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    color: value === opt.value ? GOLD : TEXT_PRIMARY,
                                    background: value === opt.value ? `${GOLD}20` : "transparent",
                                    borderBottom: `1px solid ${GOLD}20`,
                                    fontSize: "14px",
                                }}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    );
}