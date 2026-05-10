"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Check } from "lucide-react";

const FONT = "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive";
const boxShadow = (color = "#2C2C2A", x = 3, y = 3) => `${x}px ${y}px 0px ${color}`;

const formatDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDate = (s) => { const d = new Date(s + "T00:00:00"); d.setHours(0, 0, 0, 0); return d; };

// What counts as "showed up" vs "shiny" vs "super shiny" depends on
// the period: per-day a single completion is plenty, per-week or
// -month the bar scales with the longer window.
const TIER_THRESHOLDS = {
    day:   { ok: 1, shiny: 3, super: 5 },
    week:  { ok: 1, shiny: 10, super: 20 },
    month: { ok: 1, shiny: 30, super: 80 },
};

function countTier(count, period) {
    if (count === 0) return "none";
    const t = TIER_THRESHOLDS[period] || TIER_THRESHOLDS.day;
    if (count >= t.super) return "super";
    if (count >= t.shiny) return "shiny";
    if (count >= t.ok) return "ok";
    return "none";
}

const TIER_STYLE = {
    nodata:  { bg: "#f5f4f1",                 border: "#e8e8e8", text: "#b4b2a9" },
    none:    { bg: "#FEE2E2",                 border: "#EF4444", text: "#991B1B" },
    ok:      { bg: "#DCFCE7",                 border: "#22C55E", text: "#166534" },
    shiny:   { bg: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
               border: "#F59E0B", text: "#78350F" },
    super:   { bg: "linear-gradient(135deg, #FEF3C7 0%, #FBBF24 50%, #FDE68A 100%)",
               border: "#D97706", text: "#7C2D12" },
};

const TIER_BADGE = {
    super: "✨",
    shiny: "⭐",
    ok: null,
    none: null,
    nodata: null,
};

// Earliest date the household could have completed anything — used to
// distinguish "you missed this day" from "you didn't exist yet."
function earliestChoreDate(chores) {
    let earliest = null;
    for (const c of chores) {
        if (!c.created_at) continue;
        const d = parseDate(c.created_at.split("T")[0]);
        if (!earliest || d < earliest) earliest = d;
    }
    return earliest;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getWeeksInRange(startDate, endDate) {
    const weeks = [];
    const d = new Date(startDate);
    // Move to Monday
    const day = d.getDay();
    d.setDate(d.getDate() - ((day + 6) % 7));

    while (d <= endDate) {
        const weekStart = new Date(d);
        const weekEnd = new Date(d);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weeks.push({ start: new Date(weekStart), end: new Date(Math.min(weekEnd, endDate)) });
        d.setDate(d.getDate() + 7);
    }
    return weeks;
}

// Per-day stats: just the chores actually completed on that day. No
// "overdue" concept — missing a day costs you the coins for that day,
// and that's it.
function dayStats(dateStr, chores, completions) {
    const dayComps = completions.filter((c) => c.completed_date === dateStr);
    const completedById = new Map();
    for (const c of dayComps) {
        const chore = chores.find((ch) => ch.id === c.chore_id);
        if (!chore) continue;
        if (!completedById.has(chore.id)) completedById.set(chore.id, { ...chore, userIds: [] });
        completedById.get(chore.id).userIds.push(c.user_id);
    }
    return { count: dayComps.length, completed: [...completedById.values()] };
}

export default function HeatmapView({ chores, completions, users }) {
    const [mode, setMode] = useState("days");
    const [viewDate, setViewDate] = useState(() => {
        const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
    });
    const [selectedTile, setSelectedTile] = useState(null);

    const todayStr = formatDate(new Date());
    const startDate = useMemo(() => earliestChoreDate(chores), [chores]);

    const navigate = (delta) => {
        const d = new Date(viewDate);
        if (mode === "months") d.setFullYear(d.getFullYear() + delta);
        else d.setMonth(d.getMonth() + delta);
        setViewDate(d);
    };

    const headerLabel = mode === "months"
        ? viewDate.getFullYear().toString()
        : viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    const tiles = useMemo(() => {
        if (mode === "days") {
            const year = viewDate.getFullYear();
            const month = viewDate.getMonth();
            const numDays = getDaysInMonth(year, month);
            const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
            const result = [];
            for (let i = 0; i < firstDayOfWeek; i++) result.push({ type: "blank" });

            for (let day = 1; day <= numDays; day++) {
                const d = new Date(year, month, day);
                const dateStr = formatDate(d);
                const isFuture = dateStr > todayStr;
                const isToday = dateStr === todayStr;
                const beforeStart = startDate && d < startDate;
                if (isFuture || beforeStart) {
                    result.push({ type: "day", label: day.toString(), dateStr, isFuture, beforeStart, isToday, count: 0, completed: [], tier: "nodata" });
                    continue;
                }
                const stats = dayStats(dateStr, chores, completions);
                const tier = countTier(stats.count, "day");
                result.push({ type: "day", label: day.toString(), dateStr, isFuture, isToday, count: stats.count, completed: stats.completed, tier });
            }
            return result;
        }

        if (mode === "weeks") {
            const year = viewDate.getFullYear();
            const month = viewDate.getMonth();
            const monthStart = new Date(year, month, 1);
            const monthEnd = new Date(year, month + 1, 0);
            const weeks = getWeeksInRange(monthStart, monthEnd);

            return weeks.map((week, i) => {
                let count = 0;
                const allCompleted = new Map();
                const d = new Date(week.start);
                while (d <= week.end) {
                    const dateStr = formatDate(d);
                    if (dateStr <= todayStr && (!startDate || d >= startDate)) {
                        const s = dayStats(dateStr, chores, completions);
                        count += s.count;
                        for (const c of s.completed) {
                            if (!allCompleted.has(c.id)) allCompleted.set(c.id, { ...c, times: 0 });
                            allCompleted.get(c.id).times += 1;
                        }
                    }
                    d.setDate(d.getDate() + 1);
                }
                const tier = countTier(count, "week");
                const weekLabel = `${week.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${week.end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
                return {
                    type: "week", label: `Wk ${i + 1}`, sublabel: weekLabel,
                    count, completed: [...allCompleted.values()], tier,
                };
            });
        }

        if (mode === "months") {
            const year = viewDate.getFullYear();
            const nowDate = new Date();
            return Array.from({ length: 12 }, (_, m) => {
                const isFuture = year > nowDate.getFullYear() || (year === nowDate.getFullYear() && m > nowDate.getMonth());
                const monthLabel = new Date(year, m).toLocaleDateString(undefined, { month: "short" });
                if (isFuture) {
                    return { type: "month", label: monthLabel, isFuture: true, count: 0, completed: [], tier: "nodata" };
                }
                const numDays = getDaysInMonth(year, m);
                let count = 0;
                const allCompleted = new Map();
                for (let day = 1; day <= numDays; day++) {
                    const d = new Date(year, m, day);
                    const dateStr = formatDate(d);
                    if (dateStr > todayStr) break;
                    if (startDate && d < startDate) continue;
                    const s = dayStats(dateStr, chores, completions);
                    count += s.count;
                    for (const c of s.completed) {
                        if (!allCompleted.has(c.id)) allCompleted.set(c.id, { ...c, times: 0 });
                        allCompleted.get(c.id).times += 1;
                    }
                }
                const tier = countTier(count, "month");
                return { type: "month", label: monthLabel, count, completed: [...allCompleted.values()], tier };
            });
        }

        return [];
    }, [mode, viewDate, chores, completions, todayStr, startDate]);

    const gridCols = mode === "days" ? 7 : mode === "weeks" ? 3 : 4;

    return (
        <div style={{ fontFamily: FONT }}>
            {/* Mode picker */}
            <div style={{
                display: "flex", gap: "6px", marginBottom: "1rem",
                background: "#f5f4f1", padding: "4px", borderRadius: "10px",
                border: "2px solid #2C2C2A", boxShadow: boxShadow("#2C2C2A", 2, 2),
            }}>
                {[
                    { id: "days", label: "days" },
                    { id: "weeks", label: "weeks" },
                    { id: "months", label: "months" },
                ].map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        style={{
                            flex: 1, padding: "7px 4px",
                            border: mode === m.id ? "2px solid #2C2C2A" : "2px solid transparent",
                            background: mode === m.id ? "white" : "transparent", borderRadius: "7px",
                            fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                            color: mode === m.id ? "#2C2C2A" : "#888780",
                            boxShadow: mode === m.id ? boxShadow("#7F77DD", 2, 2) : "none",
                        }}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Navigation */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: "1rem",
            }}>
                <button onClick={() => navigate(-1)} style={navBtnStyle}>
                    <ChevronLeft size={16} />
                </button>
                <div style={{ fontSize: "15px", fontWeight: 700 }}>{headerLabel}</div>
                <button onClick={() => navigate(1)} style={navBtnStyle}>
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Day labels for day mode */}
            {mode === "days" && (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(7, 1fr)`, gap: "4px", marginBottom: "4px" }}>
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                        <div key={i} style={{
                            textAlign: "center", fontSize: "10px", fontWeight: 700,
                            color: "#b4b2a9", padding: "2px 0",
                        }}>{d}</div>
                    ))}
                </div>
            )}

            {/* Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gap: mode === "days" ? "4px" : "8px",
            }}>
                {tiles.map((tile, i) => {
                    if (tile.type === "blank") {
                        return <div key={`blank-${i}`} />;
                    }
                    const isNeutral = tile.isFuture || tile.beforeStart;
                    const style = isNeutral ? TIER_STYLE.nodata : TIER_STYLE[tile.tier];
                    const isClickable = !isNeutral && tile.count > 0;
                    const badge = !isNeutral ? TIER_BADGE[tile.tier] : null;
                    return (
                        <div
                            key={i}
                            onClick={() => {
                                if (!isNeutral) {
                                    setSelectedTile({
                                        label: tile.sublabel || tile.dateStr || tile.label,
                                        completed: tile.completed,
                                        count: tile.count,
                                        tier: tile.tier,
                                    });
                                }
                            }}
                            style={{
                                aspectRatio: mode === "days" ? "1" : mode === "weeks" ? "2" : "1.5",
                                borderRadius: mode === "days" ? "8px" : "12px",
                                background: style.bg,
                                border: tile.isToday ? "3px solid #2C2C2A" : `2px solid ${style.border}`,
                                boxShadow: tile.isToday
                                    ? boxShadow("#7F77DD", 2, 2)
                                    : (tile.tier === "super"
                                        ? boxShadow("#F59E0B", 2, 2)
                                        : isClickable ? boxShadow(style.border + "44", 1, 1) : "none"),
                                display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                cursor: isNeutral ? "default" : "pointer",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                                opacity: isNeutral ? 0.5 : 1,
                                fontSize: mode === "days" ? "12px" : "13px",
                                fontWeight: 700, color: style.text,
                                position: "relative",
                            }}
                            title={tile.dateStr || tile.sublabel || tile.label}
                        >
                            {badge && (
                                <span style={{
                                    position: "absolute", top: "1px", right: "3px",
                                    fontSize: mode === "days" ? "9px" : "11px",
                                }}>
                                    {badge}
                                </span>
                            )}
                            <div>{tile.label}</div>
                            {mode !== "days" && tile.count > 0 && (
                                <div style={{ fontSize: "10px", fontWeight: 600, opacity: 0.75, marginTop: "2px" }}>
                                    {tile.count}✓
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "10px", marginTop: "14px", flexWrap: "wrap",
            }}>
                {[
                    { tier: "none", label: "0" },
                    { tier: "ok", label: "1+" },
                    { tier: "shiny", label: "★ shiny" },
                    { tier: "super", label: "✨ super" },
                ].map((t) => {
                    const s = TIER_STYLE[t.tier];
                    return (
                        <div key={t.tier} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <div style={{
                                width: "14px", height: "14px", borderRadius: "4px",
                                background: s.bg, border: `1.5px solid ${s.border}`,
                            }} />
                            <span style={{ fontSize: "10px", color: "#666", fontWeight: 600 }}>{t.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            {selectedTile && (
                <DetailModal
                    tile={selectedTile}
                    users={users}
                    onClose={() => setSelectedTile(null)}
                />
            )}
        </div>
    );
}

function DetailModal({ tile, users, onClose }) {
    const findUser = (id) => users.find((u) => u.id === id);
    const completed = tile.completed || [];
    const tierMessage = tile.tier === "super"
        ? "✨ super day"
        : tile.tier === "shiny"
            ? "⭐ shiny day"
            : tile.tier === "ok"
                ? "🌱 showed up"
                : "🪨 no chores this day";

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(0,0,0,0.4)", display: "flex",
                alignItems: "center", justifyContent: "center",
                zIndex: 1000, padding: "1rem",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: "400px", width: "100%", maxHeight: "80vh",
                    overflow: "auto", background: "white", borderRadius: "16px",
                    padding: "1.25rem", fontFamily: FONT,
                    border: "3px solid #2C2C2A", boxShadow: boxShadow("#2C2C2A", 4, 4),
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>{tile.label}</h3>
                    <button onClick={onClose} style={{
                        background: "none", border: "none", cursor: "pointer", padding: "4px",
                        color: "#888780",
                    }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{
                    fontSize: "12px", fontWeight: 700,
                    background: TIER_STYLE[tile.tier].bg,
                    color: TIER_STYLE[tile.tier].text,
                    display: "inline-block", padding: "4px 12px", borderRadius: "8px",
                    border: `1.5px solid ${TIER_STYLE[tile.tier].border}`,
                    marginBottom: "12px",
                }}>
                    {tierMessage} · {tile.count} chore{tile.count === 1 ? "" : "s"}
                </div>

                {completed.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "1rem 0.5rem", color: "#888780", fontSize: "13px" }}>
                        nothing got checked off — no biggie, fresh day tomorrow
                    </div>
                ) : (
                    <div>
                        {completed.map((c, i) => (
                            <div key={i} style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "8px 10px", marginBottom: "4px",
                                background: "#F4FBF7", borderRadius: "8px",
                                border: "1.5px solid #D1FAE5",
                            }}>
                                <Check size={14} color="#1D9E75" strokeWidth={3} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "13px", fontWeight: 700 }}>{c.name}</div>
                                    {c.times > 1 && (
                                        <div style={{ fontSize: "11px", color: "#888780" }}>
                                            done {c.times} time{c.times === 1 ? "" : "s"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const navBtnStyle = {
    background: "white", border: "2px solid #2C2C2A", borderRadius: "8px",
    padding: "6px 10px", cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center",
    fontFamily: FONT, boxShadow: boxShadow("#e8e8e8", 2, 2),
};
