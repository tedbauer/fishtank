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

// 7-day list (one row per day) showing scheduled chores. Days are
// rendered top-to-bottom because phones are tall and a horizontal
// 7-column grid gets cramped fast on small chores. Today is
// highlighted; past days dim their not-completed entries instead of
// flagging them red — missed chores quietly drop.
export default function WeekCalendarView({ chores, completions, lang = "en" }) {
    const t0 = today();
    // Anchor of the visible week. Default = today; arrow buttons shift
    // by 7 days. We render 7 days starting from this anchor's Sunday.
    const [anchor, setAnchor] = useState(t0);

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

    const weekTotal = useMemo(() => {
        let total = 0;
        let count = 0;
        for (const d of days) {
            for (const c of choresForDay(d)) {
                count++;
                if (c.estimated_minutes != null) total += c.estimated_minutes;
            }
        }
        return { total, count };
    }, [days, chores]);

    const weekLabel = `${weekStart.toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, { month: "short", day: "numeric" })}`;

    return (
        <div style={{ fontFamily: FONT }}>
            {/* Week header + nav */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: "12px",
            }}>
                <button
                    onClick={() => {
                        const d = new Date(anchor);
                        d.setDate(d.getDate() - 7);
                        setAnchor(d);
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
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#2C2C2A" }}>{weekLabel}</div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#085041", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={11} strokeWidth={2.5} />
                        {weekTotal.total > 0
                            ? t("weekTimeTotal", lang, { time: formatMinutesShort(weekTotal.total, lang), n: weekTotal.count })
                            : t("weekTimeCount", lang, { n: weekTotal.count })}
                    </div>
                </div>
                <button
                    onClick={() => {
                        const d = new Date(anchor);
                        d.setDate(d.getDate() + 7);
                        setAnchor(d);
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

            {/* Day rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {days.map((d) => {
                    const dayStr = formatDate(d);
                    const isToday = dayStr === formatDate(t0);
                    const isPast = d < t0;
                    const dayChores = choresForDay(d);
                    const dayMin = dayChores.reduce(
                        (s, c) => s + (c.estimated_minutes || 0),
                        0
                    );
                    return (
                        <div key={dayStr} style={{
                            background: isToday ? "#FEF3C7" : "white",
                            border: `2px solid ${isToday ? "#F59E0B" : "#2C2C2A"}`,
                            borderRadius: "12px",
                            boxShadow: boxShadow(isToday ? "#F59E0B" : "#e8e8e8", 2, 2),
                            padding: "10px 12px",
                            opacity: isPast ? 0.7 : 1,
                        }}>
                            <div style={{
                                display: "flex", alignItems: "baseline", justifyContent: "space-between",
                                marginBottom: dayChores.length > 0 ? "8px" : 0,
                            }}>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                                    <span style={{
                                        fontSize: "13px", fontWeight: 800,
                                        color: isToday ? "#7C2D12" : "#2C2C2A",
                                    }}>
                                        {d.toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, { weekday: "short" })}
                                    </span>
                                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#888780" }}>
                                        {d.toLocaleDateString(lang === "vi" ? "vi-VN" : undefined, { month: "short", day: "numeric" })}
                                    </span>
                                    {isToday && (
                                        <span style={{
                                            fontSize: "10px", fontWeight: 700, color: "#7C2D12",
                                            background: "white", padding: "1px 6px", borderRadius: "4px",
                                            border: "1.5px solid #F59E0B",
                                        }}>
                                            {t("date_today", lang)}
                                        </span>
                                    )}
                                </div>
                                {dayMin > 0 && (
                                    <span style={{
                                        fontSize: "11px", fontWeight: 700, color: "#085041",
                                        background: "#E1F5EE", padding: "2px 8px",
                                        borderRadius: "6px", border: "1px solid #1D9E75",
                                        display: "inline-flex", alignItems: "center", gap: "3px",
                                    }}>
                                        <Clock size={10} strokeWidth={2.5} />
                                        {formatMinutesShort(dayMin, lang)}
                                    </span>
                                )}
                            </div>
                            {dayChores.length === 0 ? (
                                <div style={{ fontSize: "11px", color: "#888780", fontStyle: "italic" }}>
                                    {t("schedule_emptyDay", lang)}
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    {dayChores.map((c) => {
                                        const done = isCompleted(c.id, dayStr);
                                        return (
                                            <div key={c.id} style={{
                                                display: "flex", alignItems: "center", gap: "8px",
                                                fontSize: "12px",
                                            }}>
                                                <div style={{
                                                    width: "8px", height: "8px", borderRadius: "50%",
                                                    background: FREQ_COLOR[c.freq] || "#888780",
                                                    flexShrink: 0,
                                                }} />
                                                <div style={{
                                                    flex: 1, fontWeight: 600,
                                                    color: done ? "#888780" : "#2C2C2A",
                                                    textDecoration: done ? "line-through" : "none",
                                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                                }}>
                                                    {c.name}
                                                </div>
                                                {c.estimated_minutes != null && (
                                                    <span style={{ fontSize: "10px", color: "#888780", fontWeight: 600 }}>
                                                        {formatMinutesShort(c.estimated_minutes, lang)}
                                                    </span>
                                                )}
                                                {done && <Check size={11} strokeWidth={3} color="#1D9E75" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
