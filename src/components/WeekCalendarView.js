"use client";

import { useMemo, useState } from "react";
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
    const created = chore.created_at ? parseDate(chore.created_at.split("T")[0]) : today();
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
        return chore.deadline.split("T")[0] === formatDate(date);
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

// Horizontal 7-day strip + selected-day panel. Each day cell shows
// a tiny progress ring instead of a dot pile so the user can see
// where they're tracking at a glance — past days that completed
// everything fill green, today shows partial fill, future days show
// an empty ring with the count.
export default function WeekCalendarView({ chores, completions, lang = "en" }) {
    const t0 = today();
    const [anchor, setAnchor] = useState(t0);
    const [selectedDate, setSelectedDate] = useState(t0);

    const weekStart = useMemo(() => {
        const d = new Date(anchor);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d;
    }, [anchor]);

    const days = useMemo(() => {
        const out = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            out.push(d);
        }
        return out;
    }, [weekStart]);

    const choresForDay = (date) => chores.filter((c) => isScheduledForDay(c, date));
    const isCompleted = (choreId, dateStr) =>
        completions.some((c) => c.chore_id === choreId && c.completed_date === dateStr);

    const selectedStr = formatDate(selectedDate);
    const selectedChores = choresForDay(selectedDate);
    const selectedDone = selectedChores.filter((c) => isCompleted(c.id, selectedStr));
    const selectedRemaining = selectedChores.filter((c) => !isCompleted(c.id, selectedStr));
    const selectedRemainingTime = selectedRemaining.reduce(
        (s, c) => s + (c.estimated_minutes || 0), 0
    );
    const selectedIsToday = selectedStr === formatDate(t0);
    const selectedIsPast = selectedDate < t0 && !selectedIsToday;

    const weekLabel = `${weekStart.toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, { month: "short", day: "numeric" })}`;

    // Aggregate: total chores + total time scheduled this week.
    const weekTotals = useMemo(() => {
        let count = 0; let time = 0; let done = 0;
        for (const d of days) {
            const dStr = formatDate(d);
            for (const c of choresForDay(d)) {
                count++;
                if (c.estimated_minutes != null) time += c.estimated_minutes;
                if (isCompleted(c.id, dStr)) done++;
            }
        }
        return { count, time, done };
    }, [days, chores, completions]);

    return (
        <div style={{ fontFamily: FONT }}>
            {/* Week nav header */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: "10px",
            }}>
                <button
                    onClick={() => {
                        const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d);
                    }}
                    style={{
                        background: "white", border: "2px solid #2C2C2A", borderRadius: "8px",
                        padding: "6px 8px", cursor: "pointer", fontFamily: FONT,
                        boxShadow: boxShadow("#2C2C2A", 2, 2),
                    }}
                    aria-label="Previous week"
                >
                    <ChevronLeft size={14} />
                </button>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#2C2C2A" }}>{weekLabel}</div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#085041", display: "flex", alignItems: "center", gap: "5px" }}>
                        <Clock size={11} strokeWidth={2.5} />
                        {weekTotals.time > 0
                            ? t("weekTimeTotal", lang, { time: formatMinutesShort(weekTotals.time, lang), n: weekTotals.count })
                            : t("weekTimeCount", lang, { n: weekTotals.count })}
                    </div>
                </div>
                <button
                    onClick={() => {
                        const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d);
                    }}
                    style={{
                        background: "white", border: "2px solid #2C2C2A", borderRadius: "8px",
                        padding: "6px 8px", cursor: "pointer", fontFamily: FONT,
                        boxShadow: boxShadow("#2C2C2A", 2, 2),
                    }}
                    aria-label="Next week"
                >
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* 7-day strip with progress rings */}
            <div style={{
                display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px",
                marginBottom: "14px",
            }}>
                {days.map((d) => {
                    const dStr = formatDate(d);
                    const isToday = dStr === formatDate(t0);
                    const isSelected = dStr === selectedStr;
                    const dayChores = choresForDay(d);
                    const doneCount = dayChores.filter((c) => isCompleted(c.id, dStr)).length;
                    const total = dayChores.length;
                    const pct = total === 0 ? 0 : doneCount / total;
                    const allDone = total > 0 && doneCount === total;
                    return (
                        <button
                            key={dStr}
                            onClick={() => setSelectedDate(d)}
                            style={{
                                padding: "6px 2px",
                                background: isSelected ? "#FEF3C7" : isToday ? "#FFFBEB" : "white",
                                border: `2px solid ${isSelected ? "#F59E0B" : isToday ? "#F59E0B" : "#2C2C2A"}`,
                                borderRadius: "10px",
                                boxShadow: boxShadow(
                                    isSelected ? "#F59E0B" : isToday ? "#F59E0B" : "#e8e8e8",
                                    2, 2
                                ),
                                cursor: "pointer", fontFamily: FONT,
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                            }}
                        >
                            <div style={{ fontSize: "9px", fontWeight: 700, color: isToday ? "#7C2D12" : "#888780", textTransform: "uppercase" }}>
                                {d.toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, { weekday: "short" }).slice(0, 3)}
                            </div>
                            <div style={{ fontSize: "14px", fontWeight: 800, color: isToday ? "#7C2D12" : "#2C2C2A" }}>
                                {d.getDate()}
                            </div>
                            {/* Progress ring */}
                            <ProgressRing pct={pct} total={total} done={doneCount} allDone={allDone} />
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

// Mini progress ring inside a day cell. SVG circle with stroke-dash
// for the filled portion. When everything's done we drop a tiny fish
// 🐟 in the middle as a small reward.
function ProgressRing({ pct, total, done, allDone }) {
    const size = 22;
    const stroke = 2.5;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = c * pct;
    if (total === 0) {
        return <div style={{ width: size, height: size }} />;
    }
    return (
        <div style={{ position: "relative", width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke="#e8e8e8" strokeWidth={stroke}
                />
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none"
                    stroke={allDone ? "#1D9E75" : pct >= 0.5 ? "#22C55E" : "#7F77DD"}
                    strokeWidth={stroke}
                    strokeDasharray={`${dash} ${c}`}
                    strokeLinecap="round"
                />
            </svg>
            <div style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: allDone ? "10px" : "8px", fontWeight: 800,
                color: allDone ? "#1D9E75" : "#2C2C2A",
            }}>
                {allDone ? "🐟" : `${done}/${total}`}
            </div>
        </div>
    );
}
