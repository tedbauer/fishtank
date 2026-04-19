"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import {
    Check,
    Calendar,
    Home,
    Sparkles,
    Clock,
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    RotateCcw,
    LogOut,
    BarChart3,
    Copy,
    Link,
    Pencil,
    Save,
    X,
    Bell,
    BellOff,
    Flame,
} from "lucide-react";
import HeatmapView from "@/components/HeatmapView";

// Frequency in days
const FREQ = {
    daily: { days: 1, label: "Daily", color: "#D4537E", bg: "#FBEAF0", text: "#72243E" },
    every2: { days: 2, label: "Every 2 days", color: "#D85A30", bg: "#FAECE7", text: "#712B13" },
    weekly: { days: 7, label: "Weekly", color: "#7F77DD", bg: "#EEEDFE", text: "#3C3489" },
    biweekly: { days: 14, label: "Every 2 weeks", color: "#378ADD", bg: "#E6F1FB", text: "#0C447C" },
    monthly: { days: 30, label: "Monthly", color: "#1D9E75", bg: "#E1F5EE", text: "#085041" },
    quarterly: { days: 90, label: "Quarterly", color: "#BA7517", bg: "#FAEEDA", text: "#633806" },
    biannual: { days: 180, label: "Twice a year", color: "#888780", bg: "#F1EFE8", text: "#444441" },
};

const USER_COLORS = ["#7F77DD", "#1D9E75", "#D4537E", "#378ADD", "#D85A30", "#BA7517"];

const FONT = "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive";

// Solid color box shadow helper
const boxShadow = (color = "#2C2C2A", x = 3, y = 3) => `${x}px ${y}px 0px ${color}`;

const today = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const daysBetween = (d1, d2) => Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
const formatDate = (d) => d.toISOString().split("T")[0];

const parseDate = (s) => {
    const d = new Date(s + "T00:00:00");
    d.setHours(0, 0, 0, 0);
    return d;
};

const friendlyDate = (d) => {
    const t = today();
    const diff = daysBetween(d, t);
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff === -1) return "tomorrow";
    if (diff > 0 && diff < 7) return `${diff} days ago`;
    if (diff < 0 && diff > -7) return `in ${-diff} days`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// =========== HAPPINESS SYSTEM ===========
const computeHappiness = (completions, choresWithStatus) => {
    let score = 70;
    const t = today();
    completions.forEach((comp) => {
        const compDate = parseDate(comp.completed_date);
        const daysAgo = daysBetween(compDate, t);
        if (daysAgo > 14 || daysAgo < 0) return;
        const weight = daysAgo <= 3 ? 1 : daysAgo <= 7 ? 0.7 : 0.4;
        score += 2.5 * weight;
    });
    choresWithStatus.forEach((c) => {
        if (c.status !== "overdue") return;
        score -= 3 + Math.min(5, Math.max(0, c.daysOverdue) * 0.25);
    });
    const recentCompletions = completions.filter((comp) => {
        const d = parseDate(comp.completed_date);
        const daysAgo = daysBetween(d, t);
        return daysAgo <= 3 && daysAgo >= 0;
    }).length;
    score += Math.min(12, recentCompletions);
    return Math.max(0, Math.min(100, Math.round(score)));
};

// =========== STREAK SYSTEM ===========
const computeStreak = (chores, completions) => {
    if (!chores.length) return 0;
    const t = today();
    const todayStr = formatDate(t);
    let streak = 0;

    // Check today first: only counts if ALL due chores are completed today
    const todayCompletedIds = new Set(
        completions.filter((c) => c.completed_date === todayStr).map((c) => c.chore_id)
    );
    let todayCounts = true;
    let anyActiveToday = false;
    for (const chore of chores) {
        const freqDays = FREQ[chore.freq]?.days || 7;
        const choreCreated = chore.created_at ? parseDate(chore.created_at.split("T")[0]) : t;
        if (t < choreCreated) continue;

        // Look at completions BEFORE today to determine if chore was due today
        const preTodayComps = completions
            .filter((c) => c.chore_id === chore.id && c.completed_date < todayStr)
            .sort((a, b) => b.completed_date.localeCompare(a.completed_date));
        const lastBeforeToday = preTodayComps[0];
        let daysSince;
        if (lastBeforeToday) {
            daysSince = daysBetween(parseDate(lastBeforeToday.completed_date), t);
        } else {
            daysSince = daysBetween(choreCreated, t);
        }

        // Was this chore due today (before any today completions)?
        if (daysSince >= freqDays) {
            anyActiveToday = true;
            if (!todayCompletedIds.has(chore.id)) {
                todayCounts = false;
                break;
            }
        }
    }
    if (anyActiveToday && todayCounts) streak++;

    // Check past days
    for (let dayOffset = 1; dayOffset < 365; dayOffset++) {
        const checkDate = new Date(t);
        checkDate.setDate(checkDate.getDate() - dayOffset);
        const checkStr = formatDate(checkDate);

        let anyOverdue = false;
        let anyActive = false;

        for (const chore of chores) {
            const freqDays = FREQ[chore.freq]?.days || 7;
            const choreCreated = chore.created_at ? parseDate(chore.created_at.split("T")[0]) : t;
            if (checkDate < choreCreated) continue;

            anyActive = true;

            const relevantComps = completions
                .filter((c) => c.chore_id === chore.id && c.completed_date <= checkStr)
                .sort((a, b) => b.completed_date.localeCompare(a.completed_date));

            const last = relevantComps[0];
            let daysSince;
            if (last) {
                daysSince = daysBetween(parseDate(last.completed_date), checkDate);
            } else {
                daysSince = daysBetween(choreCreated, checkDate);
            }

            if (daysSince > freqDays + 1) {
                anyOverdue = true;
                break;
            }
        }

        if (!anyActive || anyOverdue) break;
        streak++;
    }
    return streak;
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const moodTier = (h) => {
    if (h >= 85) return "ecstatic";
    if (h >= 70) return "happy";
    if (h >= 55) return "content";
    if (h >= 40) return "meh";
    if (h >= 20) return "sad";
    return "miserable";
};

const moodLabel = (tier) =>
    ({ ecstatic: "Is Thriving :)", happy: "Is Happy", content: "Is Vibing", meh: "Is Feeling Meh", sad: "Is Looking Blue :(", miserable: "Needs Love!!" })[tier];

// =========== REWARD TYPES PER FREQUENCY ===========
const REWARD_MAP = {
    daily: { emoji: "🐟", label: "Fish Food!", color: "#FF6B35" },
    every2: { emoji: "🫧", label: "Bubble Burst!", color: "#67E8F9" },
    weekly: { emoji: "🌿", label: "New Plant!", color: "#22C55E" },
    biweekly: { emoji: "💎", label: "Treasure!", color: "#A78BFA" },
    monthly: { emoji: "🏰", label: "Castle Piece!", color: "#F59E0B" },
    quarterly: { emoji: "⭐", label: "Starfish!", color: "#EC4899" },
    biannual: { emoji: "🌈", label: "Rainbow!", color: "#8B5CF6" },
};

// =========== MINIMAL LINE-ART FISH ===========
function LineFish({ mood, size = 32 }) {
    const c = {
        ecstatic: "#FFD93D", happy: "#FF6B9D", content: "#C084FC",
        meh: "#999", sad: "#67E8F9", miserable: "#93C5FD",
    }[mood] || "#C084FC";

    return (
        <svg width={size} height={size * 0.55} viewBox="0 0 18 10" xmlns="http://www.w3.org/2000/svg" fill="none" stroke={c} strokeWidth="1">
            {/* Body */}
            <ellipse cx="8" cy="5" rx="6" ry="4" />
            {/* Tail */}
            <polyline points="14,5 17,2 17,8 14,5" />
            {/* Eye */}
            <circle cx="5" cy="4" r="0.8" fill={c} stroke="none" />
            {/* Fin */}
            <line x1="8" y1="1" x2="10" y2="0" opacity="0.6" />
        </svg>
    );
}

// =========== LINE-ART SHRIMP ===========
function LineShrimp({ color, size = 24 }) {
    return (
        <svg width={size} height={size * 0.5} viewBox="0 0 20 10" xmlns="http://www.w3.org/2000/svg" fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round">
            <path d="M4 4 Q8 2 12 3 Q16 4 17 6" />
            <path d="M3 3 Q1 2 2 5 Q1 7 3 6" />
            <line x1="8" y1="4" x2="7" y2="7" opacity="0.5" />
            <line x1="10" y1="4" x2="9.5" y2="7" opacity="0.5" />
            <line x1="12" y1="4" x2="12" y2="7" opacity="0.5" />
            <line x1="16" y1="5" x2="19" y2="2" opacity="0.6" />
            <line x1="16" y1="5" x2="19" y2="4" opacity="0.4" />
            <circle cx="15" cy="4" r="0.6" fill={color} stroke="none" />
        </svg>
    );
}

// =========== LINE-ART SEAWEED ===========
function LineSeaweed({ color, height = 55 }) {
    return (
        <svg width="18" height={height} viewBox="0 0 18 55" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round">
            <path d="M9 55 Q6 45 9 35 Q12 25 9 15 Q6 7 9 0" />
            <path d="M9 48 Q14 44 16 46" opacity="0.75" />
            <path d="M9 38 Q4 34 2 36" opacity="0.7" />
            <path d="M9 28 Q14 24 15 26" opacity="0.65" />
            <path d="M9 18 Q4 14 3 16" opacity="0.6" />
            <path d="M9 9 Q13 5 14 8" opacity="0.55" />
        </svg>
    );
}

// =========== LINE-ART SNAIL ===========
function LineSnail({ color, size = 24 }) {
    return (
        <svg width={size} height={size * 0.55} viewBox="0 0 24 13" fill="none" stroke={color} strokeWidth="0.9" strokeLinecap="round">
            <path d="M14 11 Q10 11 8 8 Q7 5 9 3 Q12 1 15 3 Q18 5 17 8 Q15 12 12 11 Q8 10 7 7" />
            <path d="M4 11 Q8 13 16 12 Q20 11 22 10" />
            <path d="M4 11 Q2 10 3 8" />
            <line x1="3" y1="8" x2="1" y2="5" opacity="0.7" />
            <line x1="4" y1="8" x2="3" y2="5" opacity="0.7" />
            <circle cx="1" cy="4.5" r="0.5" fill={color} stroke="none" />
            <circle cx="3" cy="4.5" r="0.5" fill={color} stroke="none" />
        </svg>
    );
}

// =========== MINIMAL AQUARIUM ===========
function Aquarium({ mood, happiness, rewardAnim }) {
    const swimDuration = { ecstatic: "18s", happy: "22s", content: "28s", meh: "35s", sad: "45s", miserable: "60s" }[mood] || "28s";
    const shrimpDur = { ecstatic: "30s", happy: "35s", content: "40s", meh: "50s", sad: "60s", miserable: "80s" }[mood] || "40s";
    const schoolDur = { ecstatic: "24s", happy: "29s", content: "34s", meh: "43s", sad: "54s", miserable: "70s" }[mood] || "34s";
    const snailDur = { ecstatic: "55s", happy: "65s", content: "75s", meh: "90s", sad: "110s", miserable: "140s" }[mood] || "75s";
    const uid = `aq-${mood}`;

    const waterColor = {
        ecstatic: "#1a3a5c", happy: "#2a2a4a", content: "#1b3345",
        meh: "#2a2a2a", sad: "#1a2e3e", miserable: "#1e2530",
    }[mood] || "#1b3345";

    const lineColor = {
        ecstatic: "rgba(255,217,61,0.5)", happy: "rgba(255,107,157,0.45)", content: "rgba(192,132,252,0.45)",
        meh: "rgba(180,178,169,0.35)", sad: "rgba(103,232,249,0.4)", miserable: "rgba(147,197,253,0.4)",
    }[mood] || "rgba(192,132,252,0.45)";

    const heartColor = {
        ecstatic: "#FFD93D", happy: "#FF6B9D", content: "#C084FC",
        meh: "#999", sad: "#67E8F9", miserable: "#93C5FD",
    }[mood] || "#C084FC";

    return (
        <div style={{
            position: "relative", width: "100%", height: "160px",
            overflow: "hidden", fontFamily: FONT,
            border: "2px solid #2C2C2A",
            borderRadius: "12px",
            boxShadow: boxShadow("#2C2C2A", 3, 3),
            background: waterColor,
            transition: "background 1s ease",
        }}>
            <style>{`
        @keyframes ${uid}-swim {
          0%   { left: 20px;  top: 50px; transform: scaleX(-1); }
          15%  { left: 35%;   top: 42px; transform: scaleX(-1); }
          30%  { left: 55%;   top: 55px; transform: scaleX(-1); }
          40%  { left: 72%;   top: 48px; transform: scaleX(-1); }
          44%  { left: 72%;   top: 48px; transform: scaleX(1); }
          60%  { left: 45%;   top: 56px; transform: scaleX(1); }
          75%  { left: 20%;   top: 44px; transform: scaleX(1); }
          86%  { left: 20px;  top: 52px; transform: scaleX(1); }
          90%  { left: 20px;  top: 52px; transform: scaleX(-1); }
          100% { left: 20px;  top: 50px; transform: scaleX(-1); }
        }
        @keyframes ${uid}-shrimp {
          0%   { left: 75%; }
          50%  { left: 50%; }
          100% { left: 75%; }
        }
        @keyframes ${uid}-bub {
          0% { transform: translateY(0); opacity: 0; }
          8% { opacity: 0.5; }
          100% { transform: translateY(-140px); opacity: 0; }
        }
        @keyframes ${uid}-heart {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          15% { opacity: 0.7; transform: translateY(-5px) scale(1); }
          100% { transform: translateY(-28px) scale(0.5); opacity: 0; }
        }
        @keyframes ${uid}-sway1 {
          0%, 100% { transform: skewX(0deg); }
          50% { transform: skewX(3deg); }
        }
        @keyframes ${uid}-sway2 {
          0%, 100% { transform: skewX(0deg); }
          50% { transform: skewX(-2.5deg); }
        }
        @keyframes ${uid}-school {
          0%   { left: 78%; top: 28px; transform: scaleX(1); }
          22%  { left: 55%; top: 35px; transform: scaleX(1); }
          40%  { left: 25%; top: 26px; transform: scaleX(1); }
          44%  { left: 22%; top: 26px; transform: scaleX(-1); }
          65%  { left: 48%; top: 34px; transform: scaleX(-1); }
          82%  { left: 70%; top: 24px; transform: scaleX(-1); }
          86%  { left: 76%; top: 26px; transform: scaleX(1); }
          100% { left: 78%; top: 28px; transform: scaleX(1); }
        }
        @keyframes ${uid}-snail {
          0%   { left: 15%; }
          50%  { left: 52%; }
          100% { left: 15%; }
        }
        @keyframes reward-drop {
          0% { transform: translateY(-20px); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(100px); opacity: 0; }
        }
        @keyframes reward-flash {
          0% { opacity: 0; transform: scale(0.6); }
          25% { opacity: 1; transform: scale(1.1); }
          75% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.8); }
        }
        .${uid}-fish {
          position: absolute; top: 50px; left: 20px;
          animation: ${uid}-swim ${swimDuration} ease-in-out infinite;
        }
      `}</style>

            {/* === BACK LAYER — faint, far plants === */}
            <svg style={{ position: "absolute", bottom: 14, left: "8%", opacity: 0.18, animation: `${uid}-sway2 9s ease-in-out infinite` }} width="10" height="50" viewBox="0 0 10 50" fill="none" stroke={lineColor} strokeWidth="1" strokeLinecap="round">
                <path d="M5 50 Q2 35 5 22 Q8 10 5 0" />
            </svg>
            <svg style={{ position: "absolute", bottom: 14, left: "45%", opacity: 0.14, animation: `${uid}-sway1 10s ease-in-out infinite` }} width="8" height="40" viewBox="0 0 8 40" fill="none" stroke={lineColor} strokeWidth="1" strokeLinecap="round">
                <path d="M4 40 Q7 28 4 18 Q1 8 4 0" />
            </svg>
            <svg style={{ position: "absolute", bottom: 14, right: "15%", opacity: 0.16, animation: `${uid}-sway2 11s ease-in-out infinite` }} width="8" height="36" viewBox="0 0 8 36" fill="none" stroke={lineColor} strokeWidth="1" strokeLinecap="round">
                <path d="M4 36 Q1 24 4 14 Q7 4 4 0" />
            </svg>

            {/* === MID LAYER === */}
            <svg style={{ position: "absolute", bottom: 14, left: 20, opacity: 0.4, animation: `${uid}-sway1 6s ease-in-out infinite` }} width="16" height="48" viewBox="0 0 16 48" fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 48 Q4 34 8 22 Q12 10 8 2" />
                <path d="M12 48 Q9 38 12 28 Q15 18 12 12" opacity="0.6" />
            </svg>
            <svg style={{ position: "absolute", bottom: 14, left: "58%", opacity: 0.35, animation: `${uid}-sway2 7.5s ease-in-out infinite` }} width="14" height="38" viewBox="0 0 14 38" fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round">
                <path d="M7 38 Q3 26 7 16 Q11 6 7 0" />
                <path d="M11 38 Q8 30 11 22 Q14 14 11 8" opacity="0.5" />
            </svg>

            {/* === FOREGROUND === */}
            <svg style={{ position: "absolute", bottom: 14, right: 22, opacity: 0.5, animation: `${uid}-sway1 5s ease-in-out infinite` }} width="14" height="44" viewBox="0 0 14 44" fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round">
                <path d="M7 44 Q11 30 7 18 Q3 8 7 0" />
                <path d="M3 44 Q6 34 3 26 Q0 18 3 12" opacity="0.6" />
            </svg>

            {/* === SEAWEED === */}
            <div style={{ position: "absolute", bottom: 14, left: "30%", opacity: 0.55, animation: `${uid}-sway2 8s ease-in-out infinite` }}>
                <LineSeaweed color={lineColor} height={58} />
            </div>
            <div style={{ position: "absolute", bottom: 14, left: "65%", opacity: 0.45, animation: `${uid}-sway1 9.5s ease-in-out infinite` }}>
                <LineSeaweed color={lineColor} height={46} />
            </div>
            <div style={{ position: "absolute", bottom: 14, left: "5%", opacity: 0.38, animation: `${uid}-sway2 7s ease-in-out infinite` }}>
                <LineSeaweed color={lineColor} height={40} />
            </div>

            {/* Large Rocks */}
            <svg style={{ position: "absolute", bottom: 7, left: "4%", opacity: 0.32 }} width="90" height="24" viewBox="0 0 90 24" stroke={lineColor} strokeWidth="1" strokeLinecap="round">
                <path d="M2 22 Q8 6 20 4 Q32 2 38 9 Q44 16 40 22 Z" fill={lineColor} fillOpacity="0.1" />
                <path d="M36 22 Q44 8 58 6 Q70 5 78 12 Q84 17 80 22 Z" fill={lineColor} fillOpacity="0.08" />
            </svg>
            <svg style={{ position: "absolute", bottom: 7, right: "5%", opacity: 0.28 }} width="65" height="20" viewBox="0 0 65 20" stroke={lineColor} strokeWidth="1" strokeLinecap="round">
                <path d="M2 18 Q8 5 18 3 Q28 1 34 7 Q40 13 36 18 Z" fill={lineColor} fillOpacity="0.1" />
                <path d="M32 18 Q40 7 50 5 Q60 5 63 11 Q64 16 60 18 Z" fill={lineColor} fillOpacity="0.08" />
            </svg>

            {/* Pebbles */}
            <svg style={{ position: "absolute", bottom: 7, right: "28%", opacity: 0.18 }} width="50" height="10" viewBox="0 0 50 10" fill="none" stroke={lineColor} strokeWidth="0.8">
                <ellipse cx="12" cy="7" rx="10" ry="3" />
                <ellipse cx="35" cy="8" rx="7" ry="2.5" />
            </svg>
            <svg style={{ position: "absolute", bottom: 5, left: "32%", opacity: 0.3 }} width="30" height="10" viewBox="0 0 30 10" fill="none" stroke={lineColor} strokeWidth="1">
                <ellipse cx="8" cy="7" rx="6" ry="3" />
                <ellipse cx="22" cy="8" rx="5" ry="2" />
            </svg>

            {/* Bubbles */}
            {[18, 50, 76].map((x, i) => (
                <div key={i} style={{
                    position: "absolute", bottom: 20, left: `${x}%`,
                    width: "4px", height: "4px", borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.2)",
                    animation: `${uid}-bub ${6 + i * 2}s ease-in infinite`,
                    animationDelay: `${i * 2.5}s`,
                }} />
            ))}

            {/* Sand line */}
            <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: "14px",
                borderTop: `1px solid ${lineColor}`,
                background: "rgba(255,255,255,0.03)",
            }} />

            {/* Shrimp */}
            <div style={{
                position: "absolute", bottom: 16, left: "75%",
                animation: `${uid}-shrimp ${shrimpDur} linear infinite`,
            }}>
                <LineShrimp color={lineColor} size={20} />
            </div>

            {/* Snail */}
            <div style={{
                position: "absolute", bottom: 16, left: "15%",
                animation: `${uid}-snail ${snailDur} linear infinite`,
            }}>
                <LineSnail color={lineColor} size={22} />
            </div>

            {/* School of fish */}
            <div style={{
                position: "absolute", top: 28, left: "78%",
                animation: `${uid}-school ${schoolDur} ease-in-out infinite`,
            }}>
                {[{dx:0,dy:0},{dx:16,dy:-7},{dx:-8,dy:9},{dx:24,dy:3}].map((off, i) => (
                    <div key={i} style={{ position: "absolute", left: off.dx, top: off.dy }}>
                        <LineFish mood={mood} size={14} />
                    </div>
                ))}
            </div>

            {/* Fish + hearts */}
            <div className={`${uid}-fish`}>
                <LineFish mood={mood} size={32} />
                {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                        position: "absolute", top: -6, left: 6 + i * 7,
                        fontSize: "8px", color: heartColor, opacity: 0,
                        animation: `${uid}-heart ${3.5 + i * 0.8}s ease-out infinite`,
                        animationDelay: `${i * 1.4}s`,
                    }}>♥</div>
                ))}
            </div>

            {/* Reward Animation */}
            {rewardAnim && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                }}>
                    {["daily", "every2"].includes(rewardAnim) ? (
                        <>
                            {[20, 40, 55, 70, 85].map((x, i) => (
                                <div key={i} style={{
                                    position: "absolute", left: `${x}%`, top: 0,
                                    fontSize: "12px",
                                    animation: "reward-drop 2s ease-in forwards",
                                    animationDelay: `${i * 0.12}s`,
                                }}>
                                    {REWARD_MAP[rewardAnim].emoji}
                                </div>
                            ))}
                        </>
                    ) : (
                        <div style={{
                            fontSize: "28px",
                            animation: "reward-flash 2s ease-out forwards",
                        }}>
                            {REWARD_MAP[rewardAnim]?.emoji || "✨"}
                        </div>
                    )}
                    <div style={{
                        position: "absolute", bottom: "20px", left: 0, right: 0,
                        textAlign: "center", fontSize: "11px", fontWeight: 700,
                        color: "rgba(255,255,255,0.8)",
                        animation: "reward-flash 2s ease-out forwards",
                        animationDelay: "0.2s", opacity: 0,
                    }}>
                        {REWARD_MAP[rewardAnim]?.label || "Nice!"}
                    </div>
                </div>
            )}

            {/* Status */}
            <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 12px",
                background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 100%)",
                color: "rgba(255,255,255,0.7)", zIndex: 5,
            }}>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "2px" }}>
                    {moodLabel(mood)}
                </div>
                <div style={{ height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{
                        width: `${happiness}%`, height: "100%",
                        background: "rgba(255,255,255,0.5)",
                        borderRadius: "2px",
                        transition: "width 0.8s ease",
                    }} />
                </div>
            </div>
        </div>
    );
}
// =========== MAIN APP ===========
export default function ChoreApp({ user, profile, householdMembers }) {
    const supabase = getSupabase();
    const [chores, setChores] = useState([]);
    const [completions, setCompletions] = useState([]);
    const [view, setView] = useState("today");
    const [calMonth, setCalMonth] = useState(today());
    const [newChoreName, setNewChoreName] = useState("");
    const [newChoreFreq, setNewChoreFreq] = useState("weekly");
    const [loading, setLoading] = useState(true);
    const [inviteCode, setInviteCode] = useState(null);
    const [codeCopied, setCodeCopied] = useState(false);
    const [rewardAnim, setRewardAnim] = useState(null);
    const [newChoreDesc, setNewChoreDesc] = useState("");
    const [linkCopied, setLinkCopied] = useState(false);
    const [notifStatus, setNotifStatus] = useState("default"); // default | granted | denied | subscribing
    const [notifPrefs, setNotifPrefs] = useState({ dailySummary: true, overdueAlerts: true, streakWarnings: true });
    const [streakAnim, setStreakAnim] = useState(false);
    const prevStreakRef = useRef(null);

    const currentUser = {
        id: user.id,
        name: profile?.display_name || "You",
        color: profile?.color || USER_COLORS[0],
    };

    const users = useMemo(() => {
        return householdMembers.map((m, i) => ({
            id: m.id,
            name: m.display_name || "User",
            color: m.color || USER_COLORS[i % USER_COLORS.length],
        }));
    }, [householdMembers]);

    const partner = users.find((u) => u.id !== currentUser.id);

    // Load data
    const loadData = useCallback(async () => {
        if (!profile?.household_id) return;
        const [choresRes, compsRes] = await Promise.all([
            supabase.from("chores").select("*").eq("household_id", profile.household_id).order("created_at"),
            supabase.from("completions").select("*").in(
                "chore_id",
                (await supabase.from("chores").select("id").eq("household_id", profile.household_id)).data?.map((c) => c.id) || []
            ),
        ]);
        if (choresRes.data) setChores(choresRes.data);
        if (compsRes.data) setCompletions(compsRes.data);
        setLoading(false);
    }, [profile?.household_id, supabase]);

    useEffect(() => { loadData(); }, [loadData]);

    // Realtime
    useEffect(() => {
        if (!profile?.household_id) return;
        const channel = supabase
            .channel("completions-realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "completions" }, () => loadData())
            .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, () => loadData())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [profile?.household_id, supabase, loadData]);

    // Fetch invite code for share
    useEffect(() => {
        if (!profile?.household_id) return;
        const fetchCode = async () => {
            const { data } = await supabase
                .from("households")
                .select("invite_code")
                .eq("id", profile.household_id)
                .single();
            if (data) setInviteCode(data.invite_code);
        };
        fetchCode();
    }, [profile?.household_id, supabase, loadData]);

    // Check notification permission on mount
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            setNotifStatus(Notification.permission);
        }
    }, []);

    const subscribePush = async () => {
        if (!VAPID_PUBLIC_KEY) return;
        setNotifStatus("subscribing");
        try {
            const permission = await Notification.requestPermission();
            setNotifStatus(permission);
            if (permission !== "granted") return;

            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: VAPID_PUBLIC_KEY,
            });

            await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    user_id: user.id,
                    household_id: profile.household_id,
                    preferences: notifPrefs,
                }),
            });
        } catch (err) {
            console.error("Push subscription failed:", err);
            setNotifStatus("default");
        }
    };

    const updateNotifPrefs = async (newPrefs) => {
        setNotifPrefs(newPrefs);
        if (notifStatus === "granted") {
            try {
                const reg = await navigator.serviceWorker.ready;
                const subscription = await reg.pushManager.getSubscription();
                if (subscription) {
                    await fetch("/api/subscribe", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            subscription: subscription.toJSON(),
                            user_id: user.id,
                            household_id: profile.household_id,
                            preferences: newPrefs,
                        }),
                    });
                }
            } catch (err) {
                console.error("Failed to update prefs:", err);
            }
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    // Chore status — FIXED: daily chores due in <=1 day show as "due"
    const choreStatus = (chore) => {
        const last = completions
            .filter((c) => c.chore_id === chore.id)
            .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))[0];

        const freqDays = FREQ[chore.freq]?.days || 7;
        let baselineDate;

        if (last) {
            baselineDate = parseDate(last.completed_date);
        } else if (chore.created_at) {
            baselineDate = parseDate(chore.created_at.split("T")[0]);
        } else {
            return { status: "due", daysOverdue: 0, lastDone: null };
        }

        const daysSince = daysBetween(baselineDate, today());
        if (daysSince >= freqDays) {
            return {
                status: daysSince > freqDays + 3 ? "overdue" : "due",
                daysOverdue: daysSince - freqDays,
                lastDone: last ? { date: parseDate(last.completed_date), userId: last.user_id } : null,
            };
        }
        return {
            status: "done",
            daysUntilDue: freqDays - daysSince,
            lastDone: last ? { date: parseDate(last.completed_date), userId: last.user_id } : null,
        };
    };

    const todayStr = formatDate(today());
    const completedTodayIds = new Set(
        completions.filter((c) => c.completed_date === todayStr).map((c) => c.chore_id)
    );

    const choresWithStatus = chores.map((c) => ({
        ...c,
        ...choreStatus(c),
        completedToday: completedTodayIds.has(c.id),
    }));

    // ===== NEW TAB LOGIC =====
    // TODAY: anything due/overdue OR completed today, AND short-cycle stuff due within 1 day
    const todayList = choresWithStatus.filter((c) => {
        if (c.completedToday) return true;
        if (c.status === "due" || c.status === "overdue") return true;
        // Show short-cycle chores that are due tomorrow (1 day away) in Today
        if (c.status === "done" && c.daysUntilDue <= 1) return true;
        return false;
    });

    // THIS WEEK: due within 7 days, not already in Today
    const weekList = choresWithStatus
        .filter((c) => !todayList.includes(c))
        .filter((c) => c.status === "done" && (c.daysUntilDue || 0) <= 7)
        .sort((a, b) => (a.daysUntilDue || 0) - (b.daysUntilDue || 0));

    // THIS MONTH: due within 30 days, not in Today or Week
    const monthList = choresWithStatus
        .filter((c) => !todayList.includes(c) && !weekList.includes(c))
        .filter((c) => c.status === "done" && (c.daysUntilDue || 0) <= 30)
        .sort((a, b) => (a.daysUntilDue || 0) - (b.daysUntilDue || 0));

    // LONGTERM: everything else
    const longtermList = choresWithStatus
        .filter((c) => !todayList.includes(c) && !weekList.includes(c) && !monthList.includes(c))
        .sort((a, b) => (FREQ[a.freq]?.days || 0) - (FREQ[b.freq]?.days || 0));

    const myChores = todayList.filter((c) => c.owner_id === currentUser.id);
    const unassigned = todayList.filter((c) => !c.owner_id);
    const partnerChores = todayList.filter((c) => c.owner_id && c.owner_id !== currentUser.id);

    const myCompletionsThisWeek = completions.filter((c) => {
        const d = parseDate(c.completed_date);
        return c.user_id === currentUser.id && daysBetween(d, today()) < 7;
    }).length;

    const partnerCompletionsThisWeek = partner
        ? completions.filter((c) => {
            const d = parseDate(c.completed_date);
            return c.user_id === partner.id && daysBetween(d, today()) < 7;
        }).length
        : 0;

    const householdHappiness = computeHappiness(completions, choresWithStatus);
    const householdMood = moodTier(householdHappiness);
    const streak = useMemo(() => computeStreak(chores, completions), [chores, completions]);

    // Detect streak increase and animate
    useEffect(() => {
        if (prevStreakRef.current !== null && streak > prevStreakRef.current && streak > 0) {
            setStreakAnim(true);
            setTimeout(() => setStreakAnim(false), 1200);
        }
        prevStreakRef.current = streak;
    }, [streak]);

    // Actions
    const completeChore = async (choreId) => {
        const chore = chores.find((c) => c.id === choreId);
        const { data, error } = await supabase
            .from("completions")
            .insert({ chore_id: choreId, user_id: user.id, completed_date: todayStr })
            .select().single();
        if (!error && data) {
            setCompletions((prev) => [...prev, data]);
            // Trigger reward animation
            if (chore?.freq) {
                setRewardAnim(chore.freq);
                setTimeout(() => setRewardAnim(null), 2500);
            }
        }
    };

    const undoComplete = async (choreId) => {
        const toDelete = completions.filter((c) => c.chore_id === choreId && c.completed_date === todayStr);
        for (const comp of toDelete) {
            await supabase.from("completions").delete().eq("id", comp.id);
        }
        setCompletions((prev) => prev.filter((c) => !(c.chore_id === choreId && c.completed_date === todayStr)));
    };

    const assignOwner = async (choreId, userId) => {
        await supabase.from("chores").update({ owner_id: userId || null }).eq("id", choreId);
        setChores((prev) => prev.map((c) => (c.id === choreId ? { ...c, owner_id: userId || null } : c)));
    };

    const addChore = async () => {
        if (!newChoreName.trim() || !profile?.household_id) return;
        const { data, error } = await supabase
            .from("chores")
            .insert({ name: newChoreName.trim(), freq: newChoreFreq, description: newChoreDesc.trim() || null, household_id: profile.household_id })
            .select().single();
        if (!error && data) { setChores((prev) => [...prev, data]); setNewChoreName(""); setNewChoreDesc(""); }
    };

    const updateChore = async (choreId, updates) => {
        const { error } = await supabase.from("chores").update(updates).eq("id", choreId);
        if (!error) setChores((prev) => prev.map((c) => (c.id === choreId ? { ...c, ...updates } : c)));
    };

    const deleteChore = async (choreId) => {
        await supabase.from("completions").delete().eq("chore_id", choreId);
        await supabase.from("chores").delete().eq("id", choreId);
        setChores((prev) => prev.filter((c) => c.id !== choreId));
        setCompletions((prev) => prev.filter((c) => c.chore_id !== choreId));
    };

    if (loading) {
        return <div style={{ padding: "3rem", textAlign: "center", color: "#888780", fontFamily: FONT, fontSize: "18px" }}>Loading Chores... 🐟</div>;
    }

    return (
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "1rem", fontFamily: FONT }}>
            {/* HEADER */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                        width: "36px", height: "36px", borderRadius: "50%", background: currentUser.color,
                        color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "15px", fontWeight: 700, border: "2px solid #2C2C2A",
                        boxShadow: boxShadow(currentUser.color + "88", 2, 2),
                    }}>
                        {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontSize: "16px", fontWeight: 700 }}>Hi, {currentUser.name}!</div>
                        <div style={{ fontSize: "12px", color: "#888780" }}>
                            {today().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", background: "white", border: "2px solid #2C2C2A", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", color: "#2C2C2A", fontFamily: FONT, fontWeight: 600, boxShadow: boxShadow("#2C2C2A", 2, 2) }}
                >
                    <LogOut size={12} /> Sign Out
                </button>
            </div>

            {/* TAB NAV */}
            <div style={{
                display: "flex", overflowX: "auto", gap: "4px", marginBottom: "1.25rem",
                background: "#f5f4f1", padding: "5px", borderRadius: "12px",
                border: "2px solid #2C2C2A", boxShadow: boxShadow("#2C2C2A", 3, 3),
                WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
            }}>
                {[
                    { id: "today", label: "Today", icon: Sparkles, accent: "#D4537E" },
                    { id: "week", label: "This Week", icon: Clock, accent: "#7F77DD" },
                    { id: "month", label: "This Month", icon: Calendar, accent: "#1D9E75" },
                    { id: "longterm", label: "Long-Term", icon: RotateCcw, accent: "#BA7517" },
                    { id: "heatmap", label: "Heatmap", icon: BarChart3, accent: "#D85A30" },
                    { id: "manage", label: "Manage", icon: Home, accent: "#888780" },
                ].map((t) => {
                    const Icon = t.icon;
                    const active = view === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setView(t.id)}
                            style={{
                                flex: "1 0 auto", padding: "8px 6px", minWidth: "52px",
                                border: active ? "2px solid #2C2C2A" : "2px solid transparent",
                                background: active ? "white" : "transparent",
                                borderRadius: "8px", display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center", gap: "3px",
                                fontSize: "10px", fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                                color: active ? t.accent : "#888780",
                                boxShadow: active ? boxShadow(t.accent, 2, 2) : "none",
                                transition: "color 0.15s",
                            }}
                        >
                            <Icon size={16} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* TODAY VIEW */}
            {view === "today" && (
                <div>
                    <div style={{ marginBottom: "1.25rem" }}>
                        <Aquarium happiness={householdHappiness} mood={householdMood} rewardAnim={rewardAnim} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "1.25rem" }}>
                        <StatCard label="Left Today" value={todayList.filter((c) => !c.completedToday).length} />
                        <style>{`
                            @keyframes streak-bounce {
                                0% { transform: scale(1); }
                                20% { transform: scale(1.2); }
                                40% { transform: scale(0.95); }
                                60% { transform: scale(1.1); }
                                80% { transform: scale(0.98); }
                                100% { transform: scale(1); }
                            }
                        `}</style>
                        <div style={{
                            padding: "12px", background: streak > 0 ? "#FEF3C7" : "white",
                            borderRadius: "12px", textAlign: "center",
                            border: "2px solid #2C2C2A",
                            boxShadow: boxShadow(streak > 0 ? "#F59E0B" : "#e8e8e8", 2, 2),
                            animation: streakAnim ? "streak-bounce 0.6s ease" : "none",
                        }}>
                            <div style={{ fontSize: "22px", fontWeight: 800, color: streak > 0 ? "#B45309" : "#2C2C2A", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                {streak > 0 && <Flame size={18} color="#F59E0B" />}
                                {streak}
                            </div>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#888780", marginTop: "2px" }}>
                                {streak === 0 ? "No Streak" : streak === 1 ? "Day Streak" : "Day Streak"}
                            </div>
                        </div>
                        <StatCard label={`${currentUser.name}'s Week`} value={myCompletionsThisWeek} color={currentUser.color} />
                        <StatCard label={`${partner?.name || "Partner"}'s Week`} value={partnerCompletionsThisWeek} color={partner?.color} />
                    </div>

                    {todayList.length === 0 && (
                        <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "#E1F5EE", borderRadius: "14px", border: "2px solid #2C2C2A", boxShadow: boxShadow("#1D9E75", 3, 3) }}>
                            <div style={{ fontSize: "36px", marginBottom: "8px" }}>✨</div>
                            <div style={{ fontWeight: 700, color: "#085041", marginBottom: "4px", fontSize: "16px" }}>All Caught Up!</div>
                            <div style={{ fontSize: "13px", color: "#085041" }}>Nothing due today. Go enjoy your home!</div>
                        </div>
                    )}

                    {todayList.length > 0 && todayList.every((c) => c.completedToday) && (
                        <div style={{ textAlign: "center", padding: "1.5rem 1rem", marginBottom: "1rem", background: "#E1F5EE", borderRadius: "14px", border: "2px solid #2C2C2A", boxShadow: boxShadow("#1D9E75", 3, 3) }}>
                            <div style={{ fontSize: "28px", marginBottom: "4px" }}>🎉</div>
                            <div style={{ fontWeight: 700, color: "#085041", fontSize: "15px" }}>All Done For Today!</div>
                        </div>
                    )}

                    {myChores.length > 0 && (
                        <Section title={`Your Turn, ${currentUser.name}`} accentColor={currentUser.color}>
                            {myChores.map((c) => <ChoreRow key={c.id} chore={c} users={users} currentUser={currentUser} onComplete={completeChore} onUndo={undoComplete} onAssign={assignOwner} />)}
                        </Section>
                    )}
                    {unassigned.length > 0 && (
                        <Section title="Up For Grabs" accentColor="#888780">
                            {unassigned.map((c) => <ChoreRow key={c.id} chore={c} users={users} currentUser={currentUser} onComplete={completeChore} onUndo={undoComplete} onAssign={assignOwner} />)}
                        </Section>
                    )}
                    {partnerChores.length > 0 && partner && (
                        <Section title={`${partner.name}'s turn`} accentColor={partner.color}>
                            {partnerChores.map((c) => <ChoreRow key={c.id} chore={c} users={users} currentUser={currentUser} onComplete={completeChore} onUndo={undoComplete} onAssign={assignOwner} />)}
                        </Section>
                    )}
                </div>
            )}

            {/* THIS WEEK VIEW */}
            {view === "week" && (
                <div>
                    <div style={{ marginBottom: "1rem", fontSize: "14px", color: "#888780", fontWeight: 600 }}>Coming Up This Week</div>
                    {weekList.length === 0 && <EmptyState text="Nothing for this week! 🎈" />}
                    {weekList.map((c) => <AnimatedCheckRow key={c.id} chore={c} users={users} onComplete={completeChore} variant="week" />)}

                    {(() => {
                        const weekCompletedChores = {};
                        completions.filter((c) => {
                            const d = parseDate(c.completed_date);
                            return daysBetween(d, today()) < 7 && daysBetween(d, today()) >= 0;
                        }).forEach((c) => {
                            const chore = chores.find((ch) => ch.id === c.chore_id);
                            if (chore) {
                                weekCompletedChores[chore.name] = (weekCompletedChores[chore.name] || 0) + 1;
                            }
                        });
                        const entries = Object.entries(weekCompletedChores);
                        if (entries.length === 0) return null;
                        return (
                            <div style={{ marginTop: "1.5rem" }}>
                                <div style={{ fontSize: "13px", color: "#888780", fontWeight: 600, marginBottom: "8px" }}>Completed This Week</div>
                                {entries.map(([name, count]) => (
                                    <div key={name} style={{
                                        padding: "8px 12px", marginBottom: "4px",
                                        background: "#E1F5EE", borderRadius: "8px",
                                        fontSize: "13px", color: "#085041",
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        border: "1px solid rgba(29,158,117,0.2)",
                                    }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Check size={12} color="#1D9E75" />
                                            {name}
                                        </span>
                                        {count > 1 && <span style={{ fontWeight: 700, fontSize: "12px", color: "#1D9E75" }}>×{count}</span>}
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* THIS MONTH VIEW */}
            {view === "month" && (
                <div>
                    <div style={{ marginBottom: "1rem", fontSize: "14px", color: "#888780", fontWeight: 600 }}>Due This Month</div>
                    {monthList.length === 0 && <EmptyState text="All clear for the month! ✨" />}
                    {monthList.map((c) => <AnimatedCheckRow key={c.id} chore={c} users={users} onComplete={completeChore} variant="month" />)}

                    {(() => {
                        const monthCompletedChores = {};
                        completions.filter((c) => {
                            const d = parseDate(c.completed_date);
                            return daysBetween(d, today()) < 30 && daysBetween(d, today()) >= 0;
                        }).forEach((c) => {
                            const chore = chores.find((ch) => ch.id === c.chore_id);
                            if (chore) {
                                monthCompletedChores[chore.name] = (monthCompletedChores[chore.name] || 0) + 1;
                            }
                        });
                        const entries = Object.entries(monthCompletedChores);
                        if (entries.length === 0) return null;
                        return (
                            <div style={{ marginTop: "1.5rem" }}>
                                <div style={{ fontSize: "13px", color: "#888780", fontWeight: 600, marginBottom: "8px" }}>Completed This Month</div>
                                {entries.map(([name, count]) => (
                                    <div key={name} style={{
                                        padding: "8px 12px", marginBottom: "4px",
                                        background: "#E1F5EE", borderRadius: "8px",
                                        fontSize: "13px", color: "#085041",
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        border: "1px solid rgba(29,158,117,0.2)",
                                    }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Check size={12} color="#1D9E75" />
                                            {name}
                                        </span>
                                        {count > 1 && <span style={{ fontWeight: 700, fontSize: "12px", color: "#1D9E75" }}>×{count}</span>}
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* LONGTERM VIEW */}
            {view === "longterm" && (
                <div>
                    <div style={{ marginBottom: "1rem", fontSize: "14px", color: "#888780", fontWeight: 600 }}>The Big Stuff — Longer Cycles 🔮</div>
                    {longtermList.length === 0 && <EmptyState text="Nothing long-term pending!" />}
                    {longtermList.map((c) => <AnimatedCheckRow key={c.id} chore={c} users={users} onComplete={completeChore} variant="longterm" />)}
                </div>
            )}

            {/* HEATMAP VIEW */}
            {view === "heatmap" && (
                <div>
                    <div style={{ marginBottom: "1rem", fontSize: "14px", color: "#888780", fontWeight: 600 }}>Chore Performance Heatmap</div>
                    <HeatmapView chores={chores} completions={completions} users={users} />
                </div>
            )}

            {/* MANAGE VIEW */}
            {view === "manage" && (
                <div>
                    <Section title="Add A Chore" accentColor="#7F77DD">
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <input
                                type="text" value={newChoreName} onChange={(e) => setNewChoreName(e.target.value)}
                                placeholder="water the succulents…"
                                onKeyDown={(e) => { if (e.key === "Enter") addChore(); }}
                                style={{ flex: 1, minWidth: "200px", padding: "10px 12px", border: "2px solid #2C2C2A", borderRadius: "10px", fontSize: "14px", fontFamily: FONT, boxShadow: boxShadow("#7F77DD", 2, 2) }}
                            />
                            <select
                                value={newChoreFreq} onChange={(e) => setNewChoreFreq(e.target.value)}
                                style={{ minWidth: "120px", padding: "10px 8px", border: "2px solid #2C2C2A", borderRadius: "10px", fontSize: "13px", fontFamily: FONT, boxShadow: boxShadow("#7F77DD", 2, 2) }}
                            >
                                {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <button
                                onClick={addChore}
                                style={{ padding: "10px 16px", background: "#7F77DD", color: "white", border: "2px solid #2C2C2A", borderRadius: "10px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", fontFamily: FONT, boxShadow: boxShadow("#2C2C2A", 2, 2) }}
                            >
                                <Plus size={14} /> Add!
                            </button>
                        </div>
                        <input
                            type="text" value={newChoreDesc} onChange={(e) => setNewChoreDesc(e.target.value)}
                            placeholder="Optional description..."
                            style={{ width: "100%", padding: "8px 12px", border: "2px solid #e8e8e8", borderRadius: "10px", fontSize: "13px", fontFamily: FONT, marginTop: "8px" }}
                        />
                    </Section>

                    <Section title="Household" accentColor="#D4537E">
                        <div style={{
                            padding: "12px 16px", background: "#FBEAF0", borderRadius: "12px",
                            fontSize: "14px", color: "#72243E", marginBottom: "8px",
                            border: "2px solid #2C2C2A", boxShadow: boxShadow("#D4537E", 2, 2),
                        }}>
                            <strong>Members:</strong> {users.map((u) => u.name).join(", ")}
                        </div>
                        {inviteCode && (
                            <>
                                <div style={{
                                    padding: "12px 16px", background: "white", borderRadius: "12px",
                                    fontSize: "14px", color: "#2C2C2A",
                                    border: "2px solid #2C2C2A", boxShadow: boxShadow("#D4537E", 2, 2),
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    gap: "12px",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <Link size={14} color="#D4537E" />
                                        <div>
                                            <div style={{ fontSize: "12px", color: "#888780", fontWeight: 600 }}>Invite Code</div>
                                            <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "3px", fontFamily: "monospace" }}>{inviteCode}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(inviteCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                                        style={{
                                            padding: "6px 12px", border: "2px solid #2C2C2A", borderRadius: "8px",
                                            background: codeCopied ? "#E1F5EE" : "white", cursor: "pointer",
                                            fontFamily: FONT, fontWeight: 700, fontSize: "12px",
                                            display: "flex", alignItems: "center", gap: "4px",
                                            color: codeCopied ? "#059669" : "#2C2C2A",
                                            boxShadow: boxShadow(codeCopied ? "#059669" : "#e8e8e8", 2, 2),
                                        }}
                                    >
                                        {codeCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Code</>}
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}?join=${inviteCode}`;
                                        navigator.clipboard.writeText(url);
                                        setLinkCopied(true);
                                        setTimeout(() => setLinkCopied(false), 2000);
                                    }}
                                    style={{
                                        width: "100%", marginTop: "6px", padding: "8px 12px",
                                        border: "2px solid #2C2C2A", borderRadius: "8px",
                                        background: linkCopied ? "#E1F5EE" : "white", cursor: "pointer",
                                        fontFamily: FONT, fontWeight: 700, fontSize: "12px",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                                        color: linkCopied ? "#059669" : "#2C2C2A",
                                        boxShadow: boxShadow(linkCopied ? "#059669" : "#e8e8e8", 2, 2),
                                    }}
                                >
                                    {linkCopied ? <><Check size={12} /> Link Copied!</> : <><Link size={12} /> Copy Share Link</>}
                                </button>
                            </>
                        )}
                    </Section>

                    <Section title="Notifications" accentColor="#F59E0B">
                        <div style={{
                            padding: "12px 16px", background: "white", borderRadius: "12px",
                            fontSize: "14px", color: "#2C2C2A",
                            border: "2px solid #2C2C2A", boxShadow: boxShadow("#F59E0B", 2, 2),
                        }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: notifStatus === "granted" ? "12px" : 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    {notifStatus === "granted" ? <Bell size={16} color="#F59E0B" /> : <BellOff size={16} color="#888780" />}
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: "13px" }}>
                                            {notifStatus === "granted" ? "Notifications Enabled" : "Push Notifications"}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#888780" }}>
                                            {notifStatus === "granted"
                                                ? "Choose what to get notified about"
                                                : notifStatus === "denied"
                                                    ? "Blocked \u2014 enable in browser settings"
                                                    : "Get reminded about chores and streaks"}
                                        </div>
                                    </div>
                                </div>
                                {notifStatus !== "granted" && notifStatus !== "denied" && (
                                    <button
                                        onClick={subscribePush}
                                        disabled={notifStatus === "subscribing"}
                                        style={{
                                            padding: "6px 14px", border: "2px solid #2C2C2A", borderRadius: "8px",
                                            background: "#FEF3C7", cursor: "pointer",
                                            fontFamily: FONT, fontWeight: 700, fontSize: "12px",
                                            color: "#B45309",
                                            boxShadow: boxShadow("#F59E0B", 2, 2),
                                            opacity: notifStatus === "subscribing" ? 0.6 : 1,
                                        }}
                                    >
                                        {notifStatus === "subscribing" ? "Enabling..." : "Enable"}
                                    </button>
                                )}
                            </div>
                            {notifStatus === "granted" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #e8e8e8", paddingTop: "12px" }}>
                                    {[
                                        { key: "dailySummary", label: "Daily Summary", desc: "How many chores are due today" },
                                        { key: "overdueAlerts", label: "Overdue Alerts", desc: "When chores go past their due date" },
                                        { key: "streakWarnings", label: "Streak Warnings", desc: "When your streak is about to break" },
                                    ].map(({ key, label, desc }) => (
                                        <label key={key} style={{
                                            display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
                                            padding: "6px 0",
                                        }}>
                                            <div
                                                onClick={() => updateNotifPrefs({ ...notifPrefs, [key]: !notifPrefs[key] })}
                                                style={{
                                                    width: "20px", height: "20px", borderRadius: "5px",
                                                    border: "2px solid #2C2C2A", flexShrink: 0,
                                                    background: notifPrefs[key] ? "#F59E0B" : "white",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    boxShadow: boxShadow(notifPrefs[key] ? "#B45309" : "#e8e8e8", 1, 1),
                                                    transition: "all 0.15s ease",
                                                }}
                                            >
                                                {notifPrefs[key] && <Check size={12} color="white" strokeWidth={3} />}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "13px", fontWeight: 600 }}>{label}</div>
                                                <div style={{ fontSize: "11px", color: "#888780" }}>{desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Section>

                    <Section title="All Chores" accentColor="#888780">
                        {Object.entries(FREQ).map(([freqKey, freqInfo]) => {
                            const list = chores.filter((c) => c.freq === freqKey);
                            if (list.length === 0) return null;
                            return (
                                <div key={freqKey} style={{ marginBottom: "1rem" }}>
                                    <div style={{
                                        fontSize: "12px", fontWeight: 700, color: freqInfo.text,
                                        background: freqInfo.bg, display: "inline-block",
                                        padding: "4px 12px", borderRadius: "8px", marginBottom: "8px",
                                        border: "1.5px solid " + freqInfo.color,
                                    }}>
                                        {freqInfo.label}
                                    </div>
                                    {list.map((c) => (
                                        <ManageChoreRow key={c.id} chore={c} users={users} onUpdate={updateChore} onAssign={assignOwner} onDelete={deleteChore} />
                                    ))}
                                </div>
                            );
                        })}
                    </Section>
                </div >
            )
            }
        </div >
    );
}

// =========== SUB-COMPONENTS ===========

function EmptyState({ text }) {
    return (
        <div style={{
            textAlign: "center", padding: "2rem", color: "#888780", fontSize: "15px",
            fontFamily: FONT, fontWeight: 600,
            background: "white", borderRadius: "14px", border: "2px solid #e8e8e8",
        }}>
            {text}
        </div>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div style={{
            background: "white", borderRadius: "12px", padding: "12px 14px",
            border: "2px solid #2C2C2A", boxShadow: boxShadow(color || "#e8e8e8", 3, 3),
            fontFamily: FONT,
        }}>
            <div style={{ fontSize: "11px", color: "#888780", marginBottom: "2px", fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: color || "#2C2C2A" }}>{value}</div>
        </div>
    );
}

function Section({ title, accentColor, children }) {
    return (
        <div style={{ marginBottom: "1.5rem", fontFamily: FONT }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div style={{ width: "4px", height: "18px", background: accentColor, borderRadius: "2px", border: "1px solid #2C2C2A" }} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>{title}</h3>
            </div>
            {children}
        </div>
    );
}

function ChoreRow({ chore, users, currentUser, onComplete, onUndo, onAssign }) {
    const freqInfo = FREQ[chore.freq];
    const isOverdue = chore.status === "overdue";
    const isDone = chore.completedToday;
    const [justChecked, setJustChecked] = useState(false);

    const completedBy = isDone && chore.lastDone ? users.find((u) => u.id === chore.lastDone.userId) : null;

    const handleClick = () => {
        if (isDone) { onUndo(chore.id); }
        else { setJustChecked(true); setTimeout(() => setJustChecked(false), 600); onComplete(chore.id); }
    };

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
            marginBottom: "8px", fontFamily: FONT,
            background: isDone ? "#F4FBF7" : isOverdue ? "#FEF2F2" : "white",
            border: `2px solid ${isDone ? "#1D9E75" : isOverdue ? "#EF4444" : "#2C2C2A"}`,
            borderRadius: "12px",
            boxShadow: isDone ? boxShadow("#1D9E75", 2, 2) : isOverdue ? boxShadow("#EF4444", 3, 3) : boxShadow("#e8e8e8", 2, 2),
            transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
        }}>
            <div
                onClick={handleClick} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
                style={{
                    width: "28px", height: "28px", minWidth: "28px", minHeight: "28px",
                    boxSizing: "border-box", borderRadius: "50%",
                    border: isDone ? "2.5px solid #1D9E75" : "2.5px solid #B4B2A9",
                    background: isDone ? "#1D9E75" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0,
                    transition: "background 0.25s ease, border 0.25s ease, transform 0.2s ease",
                    transform: justChecked ? "scale(1.2)" : "scale(1)",
                }}
                title={isDone ? "Undo" : "Mark complete"}
            >
                <Check size={14} strokeWidth={3} color="white" style={{ opacity: isDone ? 1 : 0, transition: "opacity 0.25s ease" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: "14px", fontWeight: 700,
                    textDecoration: isDone ? "line-through" : "none",
                    color: isDone ? "#b4b2a9" : isOverdue ? "#DC2626" : "#2C2C2A",
                }}>
                    {chore.name}
                </div>
                {chore.description && (
                    <div style={{ fontSize: "12px", color: "#888780", marginTop: "2px", fontStyle: "italic" }}>{chore.description}</div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                    {isDone && completedBy ? (
                        <span style={{
                            fontSize: "11px", padding: "2px 8px", background: "#E1F5EE",
                            color: "#085041", borderRadius: "6px", fontWeight: 700,
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            border: "1.5px solid #1D9E75",
                        }}>
                            <Check size={10} strokeWidth={3} /> done by {completedBy.name}
                        </span>
                    ) : (
                        <>
                            {freqInfo && (
                                <span style={{
                                    fontSize: "11px", padding: "2px 8px",
                                    background: freqInfo.bg, color: freqInfo.text,
                                    borderRadius: "6px", fontWeight: 700, border: "1px solid " + freqInfo.color,
                                }}>
                                    {freqInfo.label}
                                </span>
                            )}
                            {isOverdue && <span style={{ fontSize: "12px", color: "white", fontWeight: 700, background: "#EF4444", padding: "2px 8px", borderRadius: "6px", border: "1.5px solid #DC2626", display: "inline-flex", alignItems: "center", gap: "4px" }}>🔴 {chore.daysOverdue}d overdue!</span>}
                            {!isOverdue && chore.status === "due" && <span style={{ fontSize: "11px", fontWeight: 700, color: "#B45309", background: "#FEF3C7", padding: "2px 8px", borderRadius: "6px", border: "1px solid #F59E0B" }}>due today</span>}
                            {chore.lastDone && <span style={{ fontSize: "11px", color: "#b4b2a9" }}>last: {friendlyDate(chore.lastDone.date)}</span>}
                        </>
                    )}
                </div>
            </div>
            {!isDone && (
                <select
                    value={chore.owner_id || ""} onChange={(e) => onAssign(chore.id, e.target.value || null)}
                    style={{ fontSize: "11px", padding: "4px 6px", border: "2px solid #2C2C2A", borderRadius: "6px", width: "auto", fontFamily: FONT, fontWeight: 600 }}
                    title="Assign owner"
                >
                    <option value="">—</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            )}
        </div>
    );
}

function AnimatedCheckRow({ chore, users, onComplete, variant = "week" }) {
    const freqInfo = FREQ[chore.freq];
    const owner = users.find((u) => u.id === chore.owner_id);
    const [checked, setChecked] = useState(false);
    const [removing, setRemoving] = useState(false);

    const handleClick = () => {
        if (checked) return;
        setChecked(true);
        setTimeout(() => setRemoving(true), 500);
        setTimeout(() => onComplete(chore.id), 900);
    };

    const dueText = chore.status === "done"
        ? (chore.daysUntilDue > 30
            ? `in ${Math.round(chore.daysUntilDue / 30)} months`
            : `in ${chore.daysUntilDue} ${chore.daysUntilDue === 1 ? "day" : "days"}`)
        : chore.status === "overdue"
            ? `${chore.daysOverdue}d overdue`
            : "due now!";

    const isOverdue = chore.status === "overdue" || chore.status === "due";

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px",
            marginBottom: removing ? "0px" : "8px", fontFamily: FONT,
            background: checked ? "#F4FBF7" : isOverdue ? "#FEF2F2" : "white",
            border: `2px solid ${checked ? "#1D9E75" : isOverdue ? "#EF4444" : "#2C2C2A"}`,
            borderRadius: "12px",
            boxShadow: checked ? boxShadow("#1D9E75", 2, 2) : isOverdue ? boxShadow("#EF4444", 3, 3) : boxShadow("#e8e8e8", 2, 2),
            maxHeight: removing ? "0px" : "80px",
            opacity: removing ? 0 : 1,
            paddingTop: removing ? "0px" : "12px", paddingBottom: removing ? "0px" : "12px",
            overflow: "hidden",
            transition: "all 0.4s ease",
        }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: freqInfo?.color, flexShrink: 0, border: "1.5px solid #2C2C2A" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: "14px", fontWeight: 700,
                    textDecoration: checked ? "line-through" : "none",
                    color: checked ? "#b4b2a9" : "#2C2C2A",
                }}>
                    {chore.name}
                </div>
                <div style={{ fontSize: "12px", color: "#888780", marginTop: "2px", fontWeight: 600 }}>
                    {dueText}{owner && ` · ${owner.name}`}
                </div>
            </div>
            <span style={{
                fontSize: "11px", padding: "3px 8px",
                background: freqInfo?.bg, color: freqInfo?.text,
                borderRadius: "6px", fontWeight: 700, flexShrink: 0,
                border: "1px solid " + (freqInfo?.color || "#ccc"),
            }}>
                {freqInfo?.label}
            </span>
            <div
                onClick={handleClick} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
                style={{
                    width: "28px", height: "28px", minWidth: "28px",
                    boxSizing: "border-box", borderRadius: "50%",
                    border: checked ? "2.5px solid #1D9E75" : "2.5px solid #B4B2A9",
                    background: checked ? "#1D9E75" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: checked ? "default" : "pointer", flexShrink: 0,
                    transition: "background 0.25s ease, border 0.25s ease, transform 0.2s ease",
                    transform: checked ? "scale(1.2)" : "scale(1)",
                }}
                title="mark done now"
            >
                <Check size={14} strokeWidth={3} color="white" style={{ opacity: checked ? 1 : 0, transition: "opacity 0.25s ease" }} />
            </div>
        </div>
    );
}

// =========== MANAGE CHORE ROW (EDITABLE) ===========
function ManageChoreRow({ chore, users, onUpdate, onAssign, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(chore.name);
    const [editDesc, setEditDesc] = useState(chore.description || "");
    const [editFreq, setEditFreq] = useState(chore.freq);
    const [editOwner, setEditOwner] = useState(chore.owner_id || "");

    const handleSave = () => {
        onUpdate(chore.id, {
            name: editName.trim() || chore.name,
            description: editDesc.trim() || null,
            freq: editFreq,
            owner_id: editOwner || null,
        });
        onAssign(chore.id, editOwner || null);
        setEditing(false);
    };

    const handleCancel = () => {
        setEditName(chore.name);
        setEditDesc(chore.description || "");
        setEditFreq(chore.freq);
        setEditOwner(chore.owner_id || "");
        setEditing(false);
    };

    if (editing) {
        return (
            <div style={{
                padding: "12px", marginBottom: "6px", background: "#FAFAF8",
                border: "2px solid #7F77DD", borderRadius: "10px",
                boxShadow: boxShadow("#7F77DD", 2, 2), fontFamily: FONT,
            }}>
                <input
                    value={editName} onChange={(e) => setEditName(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: "2px solid #2C2C2A", borderRadius: "8px", fontSize: "14px", fontFamily: FONT, fontWeight: 600, marginBottom: "6px", boxSizing: "border-box" }}
                />
                <input
                    value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description (optional)"
                    style={{ width: "100%", padding: "6px 10px", border: "2px solid #e8e8e8", borderRadius: "8px", fontSize: "12px", fontFamily: FONT, marginBottom: "8px", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    <select value={editFreq} onChange={(e) => setEditFreq(e.target.value)}
                        style={{ padding: "6px 8px", border: "2px solid #2C2C2A", borderRadius: "6px", fontSize: "12px", fontFamily: FONT, flex: 1, minWidth: "100px" }}>
                        {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={editOwner} onChange={(e) => setEditOwner(e.target.value)}
                        style={{ padding: "6px 8px", border: "2px solid #2C2C2A", borderRadius: "6px", fontSize: "12px", fontFamily: FONT, flex: 1, minWidth: "100px" }}>
                        <option value="">Unassigned</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button onClick={handleSave} style={{ padding: "6px 12px", background: "#1D9E75", color: "white", border: "2px solid #2C2C2A", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "12px", fontFamily: FONT, display: "flex", alignItems: "center", gap: "4px" }}>
                        <Save size={12} /> Save
                    </button>
                    <button onClick={handleCancel} style={{ padding: "6px 12px", background: "white", border: "2px solid #2C2C2A", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "12px", fontFamily: FONT, display: "flex", alignItems: "center", gap: "4px" }}>
                        <X size={12} /> Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 12px", marginBottom: "6px", background: "white",
            border: "2px solid #2C2C2A", borderRadius: "10px", boxShadow: boxShadow("#e8e8e8", 2, 2),
            fontFamily: FONT, gap: "8px", flexWrap: "wrap",
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>{chore.name}</div>
                {chore.description && <div style={{ fontSize: "11px", color: "#888780", marginTop: "2px", fontStyle: "italic" }}>{chore.description}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <button
                    onClick={() => setEditing(true)}
                    style={{ padding: "4px 8px", border: "2px solid #2C2C2A", borderRadius: "6px", background: "white", cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600 }}
                    title="Edit"
                >
                    <Pencil size={11} /> Edit
                </button>
                <button
                    onClick={() => { if (confirm(`Delete "${chore.name}"?`)) onDelete(chore.id); }}
                    style={{ padding: "4px 8px", border: "2px solid #2C2C2A", borderRadius: "6px", background: "white", cursor: "pointer", fontFamily: FONT }}
                    title="Delete"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
}
