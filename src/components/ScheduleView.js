"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@/lib/i18n";

const FONT = "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive";
const boxShadow = (color = "#2C2C2A", x = 3, y = 3) => `${x}px ${y}px 0px ${color}`;

const FREQ_DAYS = {
    daily: 1, every2: 2, weekly: 7, biweekly: 14,
    monthly: 30, quarterly: 90, biannual: 180,
};
const FREQ_COLOR = {
    daily: "#D4537E", every2: "#D85A30", weekly: "#7F77DD", biweekly: "#378ADD",
    monthly: "#1D9E75", quarterly: "#BA7517", biannual: "#888780",
};

const formatDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDate = (s) => {
    const d = new Date(s + "T00:00:00");
    d.setHours(0, 0, 0, 0);
    return d;
};
const today = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};
const daysBetween = (d1, d2) =>
    Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
const dayOfWeek = (d) => d.getDay();
const weekParityOf = (d) => {
    const refMs = Date.UTC(1970, 0, 4);
    const weeks = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - refMs) / (7 * 86400000));
    return ((weeks % 2) + 2) % 2;
};
const daysInMonth = (year, monthIndex) =>
    new Date(year, monthIndex + 1, 0).getDate();

const choreSchedule = (chore) => {
    const created = chore.created_at
        ? parseDate(chore.created_at.split("T")[0])
        : today();
    return {
        dow: chore.schedule_dow ?? dayOfWeek(created),
        weekParity: chore.schedule_week_parity ?? weekParityOf(created),
        dom: chore.schedule_dom ?? created.getDate(),
        created,
    };
};

const isScheduledForDay = (chore, date) => {
    if (chore.one_time) {
        if (!chore.deadline) return false;
        return formatDate(date) === chore.deadline.split("T")[0];
    }
    const sched = choreSchedule(chore);
    if (date < sched.created) return false;
    const freq = chore.freq;
    if (freq === "daily") return true;
    if (freq === "every2") return daysBetween(sched.created, date) % 2 === 0;
    if (freq === "weekly") return dayOfWeek(date) === sched.dow;
    if (freq === "biweekly") {
        return dayOfWeek(date) === sched.dow && weekParityOf(date) === sched.weekParity;
    }
    if (freq === "monthly") {
        const dim = daysInMonth(date.getFullYear(), date.getMonth());
        return date.getDate() === Math.min(sched.dom, dim);
    }
    const fd = FREQ_DAYS[freq] || 7;
    return daysBetween(sched.created, date) % fd === 0;
};

export default function ScheduleView({ chores, completions, lang = "en" }) {
    const t0 = today();
    const [cursor, setCursor] = useState(() => new Date(t0.getFullYear(), t0.getMonth(), 1));
    const [selectedDate, setSelectedDate] = useState(t0);

    // Build the month grid (6 rows x 7 cols, padded with neighboring months).
    const monthGrid = useMemo(() => {
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const startDow = first.getDay();
        const start = new Date(first);
        start.setDate(start.getDate() - startDow);
        const days = [];
        for (let i = 0; i < 42; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    }, [cursor]);

    const choresForDay = (date) =>
        chores.filter((c) => isScheduledForDay(c, date));

    const completedKey = (choreId, dateStr) =>
        completions.some((c) => c.chore_id === choreId && c.completed_date === dateStr);

    const monthLabel = cursor.toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, {
        month: "long",
        year: "numeric",
    });

    const selectedStr = formatDate(selectedDate);
    const selectedChores = choresForDay(selectedDate);

    const dayNames = useMemo(() => {
        // Sun..Sat header row.
        const ref = new Date(2024, 0, 7); // a Sunday
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(ref);
            d.setDate(d.getDate() + i);
            return d
                .toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, { weekday: "short" })
                .slice(0, 3);
        });
    }, [lang]);

    return (
        <div style={{ fontFamily: FONT }}>
            {/* Month nav */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: "12px",
            }}>
                <button
                    onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                    style={{
                        background: "white", border: "2px solid #2C2C2A", borderRadius: "8px",
                        padding: "6px 8px", cursor: "pointer", fontFamily: FONT,
                        boxShadow: boxShadow("#2C2C2A", 2, 2),
                    }}
                    aria-label="Previous month"
                >
                    <ChevronLeft size={14} />
                </button>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#2C2C2A" }}>
                    {monthLabel}
                </div>
                <button
                    onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                    style={{
                        background: "white", border: "2px solid #2C2C2A", borderRadius: "8px",
                        padding: "6px 8px", cursor: "pointer", fontFamily: FONT,
                        boxShadow: boxShadow("#2C2C2A", 2, 2),
                    }}
                    aria-label="Next month"
                >
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Day-of-week header */}
            <div style={{
                display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px",
                marginBottom: "4px",
            }}>
                {dayNames.map((n, i) => (
                    <div key={i} style={{
                        fontSize: "10px", fontWeight: 700, color: "#888780",
                        textAlign: "center", padding: "4px 0",
                    }}>
                        {n}
                    </div>
                ))}
            </div>

            {/* Month grid */}
            <div style={{
                display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px",
                marginBottom: "1.25rem",
            }}>
                {monthGrid.map((d, i) => {
                    const inMonth = d.getMonth() === cursor.getMonth();
                    const isToday = formatDate(d) === formatDate(t0);
                    const isSelected = formatDate(d) === selectedStr;
                    const dayChores = choresForDay(d);
                    const dotCount = Math.min(dayChores.length, 4);
                    return (
                        <button
                            key={i}
                            onClick={() => setSelectedDate(d)}
                            style={{
                                aspectRatio: "1 / 1", padding: "4px 2px",
                                background: isSelected ? "#FEF3C7" : isToday ? "#E1F5EE" : "white",
                                border: `2px solid ${isSelected ? "#F59E0B" : isToday ? "#1D9E75" : "#2C2C2A"}`,
                                borderRadius: "8px",
                                boxShadow: boxShadow(
                                    isSelected ? "#F59E0B" : isToday ? "#1D9E75" : "#e8e8e8",
                                    2,
                                    2
                                ),
                                fontFamily: FONT, cursor: "pointer",
                                display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                gap: "2px", opacity: inMonth ? 1 : 0.35,
                            }}
                        >
                            <div style={{
                                fontSize: "13px", fontWeight: 700,
                                color: inMonth ? "#2C2C2A" : "#888780",
                            }}>
                                {d.getDate()}
                            </div>
                            <div style={{ display: "flex", gap: "2px", height: "5px" }}>
                                {dayChores.slice(0, dotCount).map((c, j) => (
                                    <div key={j} style={{
                                        width: "4px", height: "4px", borderRadius: "50%",
                                        background: FREQ_COLOR[c.freq] || "#888780",
                                    }} />
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Selected day detail */}
            <div style={{
                background: "white", border: "2px solid #2C2C2A", borderRadius: "12px",
                boxShadow: boxShadow("#e8e8e8", 2, 2), padding: "12px 14px",
            }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#2C2C2A", marginBottom: "8px" }}>
                    {selectedDate.toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, {
                        weekday: "long", month: "short", day: "numeric",
                    })}
                </div>
                {selectedChores.length === 0 ? (
                    <div style={{ fontSize: "12px", color: "#888780", fontStyle: "italic" }}>
                        {t("schedule_emptyDay", lang)}
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {selectedChores.map((c) => {
                            const done = completedKey(c.id, selectedStr);
                            return (
                                <div key={c.id} style={{
                                    display: "flex", alignItems: "center", gap: "8px",
                                    padding: "8px 10px",
                                    background: done ? "#F4FBF7" : "#FAFAF8",
                                    border: `1.5px solid ${done ? "#1D9E75" : "#e8e8e8"}`,
                                    borderRadius: "8px",
                                }}>
                                    <div style={{
                                        width: "8px", height: "8px", borderRadius: "50%",
                                        background: FREQ_COLOR[c.freq] || "#888780",
                                        flexShrink: 0,
                                    }} />
                                    <div style={{
                                        flex: 1, fontSize: "13px", fontWeight: 600,
                                        textDecoration: done ? "line-through" : "none",
                                        color: done ? "#888780" : "#2C2C2A",
                                    }}>
                                        {c.name}
                                    </div>
                                    {done && (
                                        <span style={{
                                            fontSize: "10px", fontWeight: 700, color: "#085041",
                                            background: "#E1F5EE", padding: "2px 6px",
                                            borderRadius: "4px", border: "1px solid #1D9E75",
                                        }}>
                                            ✓ {t("doneShort", lang)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
