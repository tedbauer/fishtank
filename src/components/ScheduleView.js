"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Check } from "lucide-react";
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
const FREQ_BG = {
    daily: "#FBEAF0", every2: "#FAECE7", weekly: "#EEEDFE", biweekly: "#E6F1FB",
    monthly: "#E1F5EE", quarterly: "#FAEEDA", biannual: "#F1EFE8",
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

const formatMinutesShort = (m, lang = "en") => {
    if (m == null) return "";
    if (m < 60) return `${m} ${t("min_short", lang)}`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (rem === 0) return `${h}${t("hour_short", lang)}`;
    return `${h}${t("hour_short", lang)} ${rem}${t("min_short_compact", lang)}`;
};

// Month grid. Each cell shows date + tiny progress indicator (ring
// for past / today, freq dots + total for future). Tap a cell to see
// its full chore list below. Today gets the cute amber halo, the
// selected day a thicker border so you don't lose your place.
export default function ScheduleView({ chores, completions, lang = "en" }) {
    const t0 = today();
    const [cursor, setCursor] = useState(() => new Date(t0.getFullYear(), t0.getMonth(), 1));
    const [selectedDate, setSelectedDate] = useState(t0);

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

    const isCompleted = (choreId, dateStr) =>
        completions.some((c) => c.chore_id === choreId && c.completed_date === dateStr);

    const monthLabel = cursor.toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, {
        month: "long", year: "numeric",
    });

    const selectedStr = formatDate(selectedDate);
    const selectedChores = choresForDay(selectedDate);
    const selectedDoneCount = selectedChores.filter((c) => isCompleted(c.id, selectedStr)).length;
    const selectedRemaining = selectedChores.filter((c) => !isCompleted(c.id, selectedStr));
    const selectedRemainingTime = selectedRemaining.reduce(
        (s, c) => s + (c.estimated_minutes || 0), 0
    );
    const selectedIsToday = selectedStr === formatDate(t0);
    const selectedIsPast = selectedDate < t0 && !selectedIsToday;

    const dayNames = useMemo(() => {
        const ref = new Date(2024, 0, 7);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(ref);
            d.setDate(d.getDate() + i);
            return d.toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, { weekday: "short" }).slice(0, 2);
        });
    }, [lang]);

    // Aggregate for the visible month.
    const monthTotals = useMemo(() => {
        let count = 0; let time = 0;
        const monthIdx = cursor.getMonth();
        const yr = cursor.getFullYear();
        const dim = daysInMonth(yr, monthIdx);
        for (let dy = 1; dy <= dim; dy++) {
            const d = new Date(yr, monthIdx, dy);
            for (const c of choresForDay(d)) {
                count++;
                if (c.estimated_minutes != null) time += c.estimated_minutes;
            }
        }
        return { count, time };
    }, [cursor, chores]);

    return (
        <div style={{ fontFamily: FONT }}>
            {/* Month nav header with totals */}
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
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#2C2C2A" }}>{monthLabel}</div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#085041", display: "flex", alignItems: "center", gap: "5px" }}>
                        <Clock size={11} strokeWidth={2.5} />
                        {monthTotals.time > 0
                            ? t("monthTimeTotal", lang, { time: formatMinutesShort(monthTotals.time, lang), n: monthTotals.count })
                            : t("monthTimeCount", lang, { n: monthTotals.count })}
                    </div>
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
                display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px",
                marginBottom: "4px",
            }}>
                {dayNames.map((n, i) => (
                    <div key={i} style={{
                        fontSize: "10px", fontWeight: 700, color: "#888780",
                        textAlign: "center", padding: "4px 0", textTransform: "uppercase",
                    }}>
                        {n}
                    </div>
                ))}
            </div>

            {/* Month grid */}
            <div style={{
                display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px",
                marginBottom: "1.25rem",
            }}>
                {monthGrid.map((d, i) => {
                    const dStr = formatDate(d);
                    const inMonth = d.getMonth() === cursor.getMonth();
                    const isToday = dStr === formatDate(t0);
                    const isSelected = dStr === selectedStr;
                    const isPast = d < t0 && !isToday;
                    const dayChores = choresForDay(d);
                    const total = dayChores.length;
                    const doneCount = dayChores.filter((c) => isCompleted(c.id, dStr)).length;
                    const allDone = total > 0 && doneCount === total;
                    const dayMin = dayChores.reduce((s, c) => s + (c.estimated_minutes || 0), 0);

                    return (
                        <button
                            key={i}
                            onClick={() => setSelectedDate(d)}
                            style={{
                                aspectRatio: "1 / 1.05",
                                padding: "4px 3px",
                                background: isSelected ? "#FEF3C7" : isToday ? "#FFFBEB" : (allDone && isPast ? "#F4FBF7" : "white"),
                                border: `2px solid ${isSelected ? "#F59E0B" : isToday ? "#F59E0B" : (allDone && isPast ? "#1D9E75" : "#2C2C2A")}`,
                                borderRadius: "8px",
                                boxShadow: boxShadow(
                                    isSelected ? "#F59E0B" : isToday ? "#F59E0B" : (allDone && isPast ? "#1D9E75" : "#e8e8e8"),
                                    1.5, 1.5
                                ),
                                fontFamily: FONT, cursor: "pointer",
                                display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "space-between",
                                opacity: inMonth ? 1 : 0.32,
                                gap: "1px",
                            }}
                        >
                            <div style={{
                                fontSize: "12px", fontWeight: 800,
                                color: isToday ? "#7C2D12" : (allDone && isPast ? "#1D9E75" : (inMonth ? "#2C2C2A" : "#888780")),
                                lineHeight: 1,
                            }}>
                                {d.getDate()}
                            </div>
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                gap: "2px", height: "10px",
                            }}>
                                {total === 0 ? null : total <= 4 ? (
                                    dayChores.slice(0, 4).map((c, j) => {
                                        const done = isCompleted(c.id, dStr);
                                        return (
                                            <div key={j} style={{
                                                width: "5px", height: "5px", borderRadius: "50%",
                                                background: done ? "#1D9E75" : (FREQ_COLOR[c.freq] || "#888780"),
                                                opacity: done ? 0.5 : 1,
                                            }} />
                                        );
                                    })
                                ) : (
                                    <span style={{
                                        fontSize: "8px", fontWeight: 800,
                                        color: allDone ? "#1D9E75" : "#7F77DD",
                                    }}>
                                        {allDone ? "✓ all" : `${total}`}
                                    </span>
                                )}
                            </div>
                            {dayMin > 0 ? (
                                <div style={{
                                    fontSize: "8px", fontWeight: 700, color: "#888780", lineHeight: 1,
                                }}>
                                    {dayMin < 60 ? `${dayMin}m` : `${Math.round(dayMin / 60 * 10) / 10}h`}
                                </div>
                            ) : (
                                <div style={{ height: "8px" }} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Selected day panel */}
            <div style={{
                background: selectedIsToday ? "#FEF3C7" : "white",
                border: `2px solid ${selectedIsToday ? "#F59E0B" : "#2C2C2A"}`,
                borderRadius: "14px",
                boxShadow: boxShadow(selectedIsToday ? "#F59E0B" : "#e8e8e8", 2, 2),
                padding: "14px",
            }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "10px", gap: "8px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                        <div style={{ fontSize: "15px", fontWeight: 800, color: "#2C2C2A" }}>
                            {selectedDate.toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, { weekday: "long", month: "short", day: "numeric" })}
                        </div>
                        {selectedIsToday && (
                            <span style={{
                                fontSize: "10px", fontWeight: 700, color: "#7C2D12",
                                background: "white", padding: "1px 7px", borderRadius: "5px",
                                border: "1.5px solid #F59E0B",
                            }}>
                                {t("date_today", lang)}
                            </span>
                        )}
                    </div>
                    {selectedRemaining.length > 0 && (
                        <span style={{
                            fontSize: "11px", fontWeight: 700, color: "#085041",
                            background: "#E1F5EE", padding: "2px 8px",
                            borderRadius: "6px", border: "1px solid #1D9E75",
                            display: "inline-flex", alignItems: "center", gap: "4px",
                        }}>
                            <Clock size={10} strokeWidth={2.5} />
                            {selectedRemainingTime > 0
                                ? t("dayRemainingTime", lang, { time: formatMinutesShort(selectedRemainingTime, lang), n: selectedRemaining.length })
                                : t("dayRemainingCount", lang, { n: selectedRemaining.length })}
                        </span>
                    )}
                </div>

                {selectedChores.length === 0 ? (
                    <div style={{ fontSize: "12px", color: "#888780", fontStyle: "italic", padding: "8px 0" }}>
                        {t("schedule_emptyDay", lang)}
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {selectedChores.map((c) => {
                            const done = isCompleted(c.id, selectedStr);
                            return (
                                <div key={c.id} style={{
                                    display: "flex", alignItems: "center", gap: "10px",
                                    padding: "8px 10px",
                                    background: done ? "#F4FBF7" : (FREQ_BG[c.freq] || "#FAFAF8"),
                                    border: `1.5px solid ${done ? "#1D9E75" : (FREQ_COLOR[c.freq] || "#e8e8e8")}`,
                                    borderRadius: "10px",
                                    opacity: selectedIsPast && !done ? 0.55 : 1,
                                }}>
                                    <div style={{
                                        width: "10px", height: "10px", minWidth: "10px",
                                        borderRadius: "50%",
                                        background: FREQ_COLOR[c.freq] || "#888780",
                                        border: "1.5px solid #2C2C2A",
                                    }} />
                                    <div style={{
                                        flex: 1, fontSize: "13px", fontWeight: 700,
                                        color: done ? "#888780" : "#2C2C2A",
                                        textDecoration: done ? "line-through" : "none",
                                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                    }}>
                                        {c.name}
                                    </div>
                                    {c.estimated_minutes != null && (
                                        <span style={{
                                            fontSize: "10px", fontWeight: 700, color: "#085041",
                                            flexShrink: 0,
                                        }}>
                                            {formatMinutesShort(c.estimated_minutes, lang)}
                                        </span>
                                    )}
                                    {done && (
                                        <Check size={14} strokeWidth={3} color="#1D9E75" style={{ flexShrink: 0 }} />
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
