"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Check, AlertTriangle } from "lucide-react";

const FONT = "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive";
const boxShadow = (color = "#2C2C2A", x = 3, y = 3) => `${x}px ${y}px 0px ${color}`;

const FREQ = {
    daily: { days: 1 }, every2: { days: 2 }, weekly: { days: 7 },
    biweekly: { days: 14 }, monthly: { days: 30 }, quarterly: { days: 90 }, biannual: { days: 180 },
};

const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDate = (s) => { const d = new Date(s + "T00:00:00"); d.setHours(0, 0, 0, 0); return d; };

// Score a single day: returns { score: 0-1, completedChores, overdueChores, totalDue }
function scoreDay(dateStr, chores, completions) {
    const date = parseDate(dateStr);
    const dayComps = completions.filter((c) => c.completed_date === dateStr);
    const completedChoreIds = new Set(dayComps.map((c) => c.chore_id));

    // Find chores that were due on or before this date
    const dueChores = [];
    const completedChores = [];
    const overdueChores = [];

    for (const chore of chores) {
        const freqDays = FREQ[chore.freq]?.days || 7;
        const choreCreated = chore.created_at ? parseDate(chore.created_at.split("T")[0]) : null;

        // Skip if chore didn't exist yet
        if (choreCreated && choreCreated > date) continue;

        // Was this chore completed on this day?
        if (completedChoreIds.has(chore.id)) {
            // Check if it was on time, early, or late
            const lastBefore = completions
                .filter((c) => c.chore_id === chore.id && c.completed_date < dateStr)
                .sort((a, b) => b.completed_date.localeCompare(a.completed_date))[0];

            let daysSinceLast;
            if (lastBefore) {
                daysSinceLast = Math.floor((date - parseDate(lastBefore.completed_date)) / (86400000));
            } else if (choreCreated) {
                daysSinceLast = Math.floor((date - choreCreated) / (86400000));
            } else {
                daysSinceLast = freqDays; // assume due
            }

            const status = daysSinceLast <= freqDays ? "on_time" : "late";
            completedChores.push({ ...chore, status, daysSinceLast });
        }

        // Was this chore overdue on this day (not completed)?
        if (!completedChoreIds.has(chore.id)) {
            const lastComp = completions
                .filter((c) => c.chore_id === chore.id && c.completed_date <= dateStr)
                .sort((a, b) => b.completed_date.localeCompare(a.completed_date))[0];

            let baseline;
            if (lastComp) {
                baseline = parseDate(lastComp.completed_date);
            } else if (choreCreated) {
                baseline = choreCreated;
            } else {
                continue;
            }

            const daysSince = Math.floor((date - baseline) / (86400000));
            if (daysSince > freqDays) {
                overdueChores.push({ ...chore, daysOverdue: daysSince - freqDays });
            }
        }
    }

    const totalEvents = completedChores.length + overdueChores.length;
    if (totalEvents === 0) return { score: null, completedChores, overdueChores, totalDue: 0 };

    const goodPoints = completedChores.length;
    const badPoints = overdueChores.length;
    const score = goodPoints / (goodPoints + badPoints);

    return { score, completedChores, overdueChores, totalDue: totalEvents };
}

function scoreColor(score) {
    if (score === null) return { bg: "#f5f4f1", border: "#e8e8e8", text: "#b4b2a9" }; // no data
    if (score >= 0.9) return { bg: "#D1FAE5", border: "#059669", text: "#065F46" }; // great
    if (score >= 0.7) return { bg: "#ECFCCB", border: "#65A30D", text: "#3F6212" }; // good
    if (score >= 0.5) return { bg: "#FEF9C3", border: "#CA8A04", text: "#854D0E" }; // meh
    if (score >= 0.3) return { bg: "#FED7AA", border: "#EA580C", text: "#9A3412" }; // bad
    return { bg: "#FECACA", border: "#DC2626", text: "#991B1B" }; // terrible
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

export default function HeatmapView({ chores, completions, users }) {
    const [mode, setMode] = useState("days"); // days | weeks | months
    const [viewDate, setViewDate] = useState(() => {
        const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
    });
    const [selectedTile, setSelectedTile] = useState(null); // { label, completedChores, overdueChores }

    const todayStr = formatDate(new Date());

    // Navigate
    const navigate = (delta) => {
        const d = new Date(viewDate);
        if (mode === "months") {
            d.setFullYear(d.getFullYear() + delta);
        } else {
            d.setMonth(d.getMonth() + delta);
        }
        setViewDate(d);
    };

    const headerLabel = mode === "months"
        ? viewDate.getFullYear().toString()
        : viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    // Compute tiles
    const tiles = useMemo(() => {
        if (mode === "days") {
            const year = viewDate.getFullYear();
            const month = viewDate.getMonth();
            const numDays = getDaysInMonth(year, month);
            const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Monday=0
            const result = [];

            // Pad leading blanks
            for (let i = 0; i < firstDayOfWeek; i++) {
                result.push({ type: "blank" });
            }

            for (let day = 1; day <= numDays; day++) {
                const dateStr = formatDate(new Date(year, month, day));
                const isFuture = dateStr > todayStr;
                const isToday = dateStr === todayStr;
                const data = isFuture ? { score: null, completedChores: [], overdueChores: [], totalDue: 0 } : scoreDay(dateStr, chores, completions);
                result.push({
                    type: "day", label: day.toString(), dateStr, isFuture, isToday,
                    ...data,
                });
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
                let totalScore = 0;
                let scoredDays = 0;
                const allCompleted = [];
                const allOverdue = [];

                const d = new Date(week.start);
                while (d <= week.end) {
                    const dateStr = formatDate(d);
                    if (dateStr <= todayStr) {
                        const dayData = scoreDay(dateStr, chores, completions);
                        if (dayData.score !== null) {
                            totalScore += dayData.score;
                            scoredDays++;
                        }
                        allCompleted.push(...dayData.completedChores);
                        allOverdue.push(...dayData.overdueChores);
                    }
                    d.setDate(d.getDate() + 1);
                }

                const weekLabel = `${week.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${week.end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

                return {
                    type: "week",
                    label: `Wk ${i + 1}`,
                    sublabel: weekLabel,
                    score: scoredDays > 0 ? totalScore / scoredDays : null,
                    completedChores: allCompleted,
                    overdueChores: allOverdue,
                    totalDue: allCompleted.length + allOverdue.length,
                };
            });
        }

        // months mode — show 12 months of current year
        if (mode === "months") {
            const year = viewDate.getFullYear();
            const nowDate = new Date();

            return Array.from({ length: 12 }, (_, m) => {
                const isFuture = year > nowDate.getFullYear() || (year === nowDate.getFullYear() && m > nowDate.getMonth());
                if (isFuture) {
                    return {
                        type: "month", label: new Date(year, m).toLocaleDateString(undefined, { month: "short" }),
                        score: null, completedChores: [], overdueChores: [], totalDue: 0, isFuture: true,
                    };
                }

                const numDays = getDaysInMonth(year, m);
                let totalScore = 0;
                let scoredDays = 0;
                const allCompleted = [];
                const allOverdue = [];

                for (let day = 1; day <= numDays; day++) {
                    const dateStr = formatDate(new Date(year, m, day));
                    if (dateStr > todayStr) break;
                    const dayData = scoreDay(dateStr, chores, completions);
                    if (dayData.score !== null) {
                        totalScore += dayData.score;
                        scoredDays++;
                    }
                    allCompleted.push(...dayData.completedChores);
                    allOverdue.push(...dayData.overdueChores);
                }

                return {
                    type: "month",
                    label: new Date(year, m).toLocaleDateString(undefined, { month: "short" }),
                    score: scoredDays > 0 ? totalScore / scoredDays : null,
                    completedChores: allCompleted,
                    overdueChores: allOverdue,
                    totalDue: allCompleted.length + allOverdue.length,
                };
            });
        }

        return [];
    }, [mode, viewDate, chores, completions, todayStr]);

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
                            flex: 1, padding: "7px 4px", border: mode === m.id ? "2px solid #2C2C2A" : "2px solid transparent",
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

                    const colors = scoreColor(tile.score);
                    const isClickable = !tile.isFuture && tile.totalDue > 0;

                    return (
                        <div
                            key={i}
                            onClick={() => {
                                if (isClickable) {
                                    setSelectedTile({
                                        label: tile.sublabel || tile.dateStr || tile.label,
                                        completedChores: tile.completedChores,
                                        overdueChores: tile.overdueChores,
                                    });
                                }
                            }}
                            style={{
                                aspectRatio: mode === "days" ? "1" : mode === "weeks" ? "2" : "1.5",
                                borderRadius: mode === "days" ? "8px" : "12px",
                                background: tile.isFuture ? "#fafaf8" : colors.bg,
                                border: tile.isToday
                                    ? "3px solid #2C2C2A"
                                    : `2px solid ${tile.isFuture ? "#e8e8e8" : colors.border}`,
                                boxShadow: tile.isToday
                                    ? boxShadow("#7F77DD", 2, 2)
                                    : isClickable ? boxShadow(colors.border + "44", 1, 1) : "none",
                                display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                cursor: isClickable ? "pointer" : "default",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                                opacity: tile.isFuture ? 0.4 : 1,
                                fontSize: mode === "days" ? "12px" : "13px",
                                fontWeight: 700,
                                color: tile.isFuture ? "#b4b2a9" : colors.text,
                                position: "relative",
                            }}
                            title={tile.dateStr || tile.sublabel || tile.label}
                        >
                            {tile.label}
                            {mode !== "days" && tile.totalDue > 0 && (
                                <div style={{ fontSize: "10px", fontWeight: 600, opacity: 0.7, marginTop: "2px" }}>
                                    {tile.completedChores.length}✓ {tile.overdueChores.length > 0 && `${tile.overdueChores.length}✗`}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "6px", marginTop: "1rem", flexWrap: "wrap",
            }}>
                <span style={{ fontSize: "10px", color: "#888780", fontWeight: 600 }}>worse</span>
                {[0, 0.3, 0.5, 0.7, 0.9].map((s) => {
                    const c = scoreColor(s);
                    return (
                        <div key={s} style={{
                            width: "16px", height: "16px", borderRadius: "4px",
                            background: c.bg, border: `1.5px solid ${c.border}`,
                        }} />
                    );
                })}
                <span style={{ fontSize: "10px", color: "#888780", fontWeight: 600 }}>better</span>
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

    // Deduplicate completed chores by chore id (show unique chores)
    const uniqueCompleted = [];
    const seenCompleted = new Set();
    for (const c of tile.completedChores) {
        if (!seenCompleted.has(c.id)) {
            seenCompleted.add(c.id);
            uniqueCompleted.push(c);
        }
    }

    const uniqueOverdue = [];
    const seenOverdue = new Set();
    for (const c of tile.overdueChores) {
        if (!seenOverdue.has(c.id)) {
            seenOverdue.add(c.id);
            uniqueOverdue.push(c);
        }
    }

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
                    padding: "1.5rem", fontFamily: FONT,
                    border: "3px solid #2C2C2A", boxShadow: boxShadow("#2C2C2A", 4, 4),
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{tile.label}</h3>
                    <button onClick={onClose} style={{
                        background: "none", border: "none", cursor: "pointer", padding: "4px",
                        color: "#888780",
                    }}>
                        <X size={18} />
                    </button>
                </div>

                {uniqueCompleted.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                        <div style={{
                            fontSize: "12px", fontWeight: 700, color: "#065F46",
                            background: "#D1FAE5", display: "inline-block",
                            padding: "3px 10px", borderRadius: "6px", marginBottom: "8px",
                            border: "1.5px solid #059669",
                        }}>
                            ✓ completed ({uniqueCompleted.length})
                        </div>
                        {uniqueCompleted.map((c, i) => (
                            <div key={i} style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "8px 10px", marginBottom: "4px",
                                background: "#F4FBF7", borderRadius: "8px",
                                border: "1.5px solid #D1FAE5",
                            }}>
                                <Check size={14} color="#059669" strokeWidth={3} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "13px", fontWeight: 700 }}>{c.name}</div>
                                    <div style={{ fontSize: "11px", color: "#888780" }}>
                                        {c.status === "on_time" ? "on time ✨" : "late, but done"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {uniqueOverdue.length > 0 && (
                    <div>
                        <div style={{
                            fontSize: "12px", fontWeight: 700, color: "#991B1B",
                            background: "#FECACA", display: "inline-block",
                            padding: "3px 10px", borderRadius: "6px", marginBottom: "8px",
                            border: "1.5px solid #DC2626",
                        }}>
                            ✗ overdue ({uniqueOverdue.length})
                        </div>
                        {uniqueOverdue.map((c, i) => (
                            <div key={i} style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "8px 10px", marginBottom: "4px",
                                background: "#FEF2F2", borderRadius: "8px",
                                border: "1.5px solid #FECACA",
                            }}>
                                <AlertTriangle size={14} color="#DC2626" strokeWidth={2.5} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>{c.name}</div>
                                    <div style={{ fontSize: "11px", color: "#888780" }}>
                                        {c.daysOverdue}d overdue
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {uniqueCompleted.length === 0 && uniqueOverdue.length === 0 && (
                    <div style={{ textAlign: "center", padding: "1rem", color: "#888780", fontSize: "14px" }}>
                        no chore activity this day
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
