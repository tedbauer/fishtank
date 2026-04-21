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
    RefreshCw,
    BarChart3,
    Copy,
    Link,
    Pencil,
    Save,
    X,
    Bell,
    BellOff,
    Flame,
    ShoppingBag,
    Coins,
    AlarmClock,
    X as XIcon,
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
        if (chore.one_time) continue;
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
            if (chore.one_time) continue;
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

// =========== STORE PLANTS (owned items) ===========
function PlantFrond({ size = 1 }) {
    return (
        <svg width={28 * size} height={64 * size} viewBox="0 0 28 64" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 64 Q13 48 14 32 Q15 18 14 6" stroke="#15803D" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <ellipse cx="7" cy="50" rx="7" ry="3.5" fill="#22C55E" stroke="#15803D" strokeWidth="1.2" transform="rotate(-28 7 50)" />
            <ellipse cx="21" cy="42" rx="7" ry="3.5" fill="#22C55E" stroke="#15803D" strokeWidth="1.2" transform="rotate(28 21 42)" />
            <ellipse cx="6" cy="32" rx="6" ry="3" fill="#34D57B" stroke="#15803D" strokeWidth="1.2" transform="rotate(-26 6 32)" />
            <ellipse cx="22" cy="24" rx="6" ry="3" fill="#34D57B" stroke="#15803D" strokeWidth="1.2" transform="rotate(26 22 24)" />
            <ellipse cx="14" cy="10" rx="5" ry="3" fill="#4ADE80" stroke="#15803D" strokeWidth="1.2" />
        </svg>
    );
}

function PlantBush({ size = 1 }) {
    return (
        <svg width={38 * size} height={48 * size} viewBox="0 0 38 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 48 Q19 38 19 28" stroke="#15803D" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <circle cx="10" cy="28" r="8" fill="#16A34A" stroke="#15803D" strokeWidth="1.3" />
            <circle cx="28" cy="24" r="9" fill="#16A34A" stroke="#15803D" strokeWidth="1.3" />
            <circle cx="19" cy="14" r="8" fill="#22C55E" stroke="#15803D" strokeWidth="1.3" />
            <circle cx="13" cy="34" r="5.5" fill="#22C55E" stroke="#15803D" strokeWidth="1.3" />
            <circle cx="26" cy="36" r="5.5" fill="#22C55E" stroke="#15803D" strokeWidth="1.3" />
        </svg>
    );
}

function FishCave({ size = 1 }) {
    return (
        <svg width={56 * size} height={40 * size} viewBox="0 0 56 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 40 Q4 18 16 10 Q28 2 40 10 Q52 18 52 40" fill="#78716C" stroke="#57534E" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 40 Q16 28 28 24 Q40 28 40 40" fill="#292524" stroke="#57534E" strokeWidth="1.5" />
            <ellipse cx="28" cy="40" rx="12" ry="3" fill="#1C1917" opacity="0.3" />
            <circle cx="12" cy="22" r="2" fill="#A8A29E" opacity="0.5" />
            <circle cx="44" cy="18" r="1.5" fill="#A8A29E" opacity="0.4" />
            <circle cx="34" cy="8" r="1" fill="#A8A29E" opacity="0.3" />
        </svg>
    );
}

function Driftwood({ size = 1 }) {
    return (
        <svg width={52 * size} height={28 * size} viewBox="0 0 52 28" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 24 Q10 22 20 18 Q30 14 42 16 Q48 17 50 20" stroke="#92400E" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M20 18 Q16 12 12 6" stroke="#A16207" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M34 15 Q38 8 42 4" stroke="#A16207" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M26 16 Q24 10 26 6" stroke="#A16207" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
    );
}

function MossClump({ size = 1 }) {
    return (
        <svg width={32 * size} height={22 * size} viewBox="0 0 32 22" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="10" cy="16" rx="9" ry="6" fill="#166534" stroke="#14532D" strokeWidth="1.2" />
            <ellipse cx="22" cy="14" rx="9" ry="7" fill="#15803D" stroke="#14532D" strokeWidth="1.2" />
            <ellipse cx="16" cy="10" rx="7" ry="5" fill="#22C55E" stroke="#15803D" strokeWidth="1.2" />
            <circle cx="8" cy="12" r="2.5" fill="#4ADE80" opacity="0.6" />
            <circle cx="24" cy="10" r="2" fill="#4ADE80" opacity="0.5" />
        </svg>
    );
}

function FernPlant({ size = 1 }) {
    return (
        <svg width={30 * size} height={56 * size} viewBox="0 0 30 56" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 56 Q15 44 15 32 Q15 20 15 8" stroke="#15803D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M15 44 Q8 40 3 36" stroke="#22C55E" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <path d="M15 44 Q22 40 27 36" stroke="#22C55E" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <path d="M15 36 Q7 32 2 28" stroke="#34D57B" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M15 36 Q23 32 28 28" stroke="#34D57B" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M15 28 Q9 24 4 20" stroke="#4ADE80" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            <path d="M15 28 Q21 24 26 20" stroke="#4ADE80" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            <path d="M15 20 Q10 16 6 12" stroke="#4ADE80" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M15 20 Q20 16 24 12" stroke="#4ADE80" strokeWidth="1" fill="none" strokeLinecap="round" />
            <ellipse cx="15" cy="6" rx="4" ry="3" fill="#4ADE80" stroke="#22C55E" strokeWidth="1" />
        </svg>
    );
}

function AnubiaPlant({ size = 1 }) {
    return (
        <svg width={44 * size} height={50 * size} viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 50 Q22 44 22 38" stroke="#15803D" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M22 48 Q10 42 4 34 Q10 28 18 36 Q20 42 22 48" fill="#15803D" stroke="#14532D" strokeWidth="1" />
            <path d="M22 42 Q34 36 40 28 Q34 22 26 30 Q22 36 22 42" fill="#22C55E" stroke="#15803D" strokeWidth="1" />
            <path d="M22 36 Q10 30 4 22 Q10 16 18 24 Q20 30 22 36" fill="#16A34A" stroke="#15803D" strokeWidth="1" />
            <path d="M22 28 Q34 22 40 14 Q34 8 26 16 Q22 22 22 28" fill="#22C55E" stroke="#15803D" strokeWidth="1" />
            <ellipse cx="22" cy="13" rx="6" ry="9" fill="#4ADE80" stroke="#22C55E" strokeWidth="1" />
        </svg>
    );
}

function AmazonSword({ size = 1 }) {
    return (
        <svg width={34 * size} height={72 * size} viewBox="0 0 34 72" xmlns="http://www.w3.org/2000/svg">
            <line x1="17" y1="72" x2="17" y2="4" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M17 62 Q5 54 1 44 Q7 42 15 52 Z" fill="#22C55E" stroke="#15803D" strokeWidth="1" />
            <path d="M17 50 Q3 42 0 30 Q8 28 15 40 Z" fill="#16A34A" stroke="#15803D" strokeWidth="1" />
            <path d="M17 38 Q4 30 3 18 Q10 16 15 28 Z" fill="#22C55E" stroke="#15803D" strokeWidth="1" />
            <path d="M17 57 Q29 49 33 39 Q27 37 19 47 Z" fill="#22C55E" stroke="#15803D" strokeWidth="1" />
            <path d="M17 45 Q31 37 34 25 Q26 23 19 35 Z" fill="#16A34A" stroke="#15803D" strokeWidth="1" />
            <path d="M17 33 Q29 24 30 12 Q22 10 18 22 Z" fill="#22C55E" stroke="#15803D" strokeWidth="1" />
        </svg>
    );
}

function BambooStalks({ size = 1 }) {
    return (
        <svg width={38 * size} height={66 * size} viewBox="0 0 38 66" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="10" width="6" height="56" rx="3" fill="#84CC16" stroke="#4D7C0F" strokeWidth="1.2" />
            {[22, 34, 46, 58].map((y) => <line key={y} x1="7" y1={y} x2="15" y2={y} stroke="#4D7C0F" strokeWidth="1.5" />)}
            <rect x="24" y="18" width="6" height="48" rx="3" fill="#65A30D" stroke="#4D7C0F" strokeWidth="1.2" />
            {[30, 42, 54].map((y) => <line key={y} x1="23" y1={y} x2="31" y2={y} stroke="#4D7C0F" strokeWidth="1.5" />)}
            <path d="M11 10 Q6 4 2 1" stroke="#86EFAC" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M11 22 Q18 16 22 14" stroke="#86EFAC" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M27 18 Q32 12 36 9" stroke="#86EFAC" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M27 30 Q20 24 16 22" stroke="#86EFAC" strokeWidth="1" fill="none" strokeLinecap="round" />
        </svg>
    );
}

function PebbleCluster({ size = 1 }) {
    return (
        <svg width={50 * size} height={26 * size} viewBox="0 0 50 26" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="10" cy="20" rx="9" ry="6" fill="#D6D3D1" stroke="#A8A29E" strokeWidth="1.2" />
            <ellipse cx="26" cy="22" rx="11" ry="5" fill="#E7E5E4" stroke="#A8A29E" strokeWidth="1.2" />
            <ellipse cx="41" cy="20" rx="8" ry="5.5" fill="#D6D3D1" stroke="#A8A29E" strokeWidth="1.2" />
            <ellipse cx="18" cy="14" rx="7" ry="5" fill="#F5F5F4" stroke="#C7C3BE" strokeWidth="1.2" />
            <ellipse cx="34" cy="13" rx="8" ry="5" fill="#E7E5E4" stroke="#C7C3BE" strokeWidth="1.2" />
        </svg>
    );
}

function SlateStack({ size = 1 }) {
    return (
        <svg width={52 * size} height={30 * size} viewBox="0 0 52 30" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 28 L8 22 L50 23 L46 28 Z" fill="#78716C" stroke="#57534E" strokeWidth="1.2" />
            <path d="M6 22 L14 16 L48 17 L42 22 Z" fill="#A8A29E" stroke="#78716C" strokeWidth="1.2" />
            <path d="M12 16 L20 10 L44 11 L38 16 Z" fill="#C7C3BE" stroke="#A8A29E" strokeWidth="1.2" />
            <path d="M20 10 L26 4 L38 5 L34 10 Z" fill="#E7E5E4" stroke="#A8A29E" strokeWidth="1" />
        </svg>
    );
}

function BigBoulder({ size = 1 }) {
    return (
        <svg width={58 * size} height={44 * size} viewBox="0 0 58 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 40 Q2 30 4 18 Q8 4 24 2 Q40 0 48 10 Q56 18 54 30 Q52 42 38 44 Q20 46 6 40 Z" fill="#A8A29E" stroke="#78716C" strokeWidth="1.5" />
            <path d="M16 10 Q26 6 36 8" stroke="#78716C" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
            <path d="M10 22 Q8 28 10 36" stroke="#78716C" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4" />
            <circle cx="38" cy="20" r="3.5" fill="#C7C3BE" opacity="0.6" />
            <circle cx="22" cy="28" r="2.5" fill="#C7C3BE" opacity="0.5" />
        </svg>
    );
}

function CeramicPot({ size = 1 }) {
    return (
        <svg width={40 * size} height={54 * size} viewBox="0 0 40 54" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 52 Q4 42 6 28 Q10 14 20 12 Q30 14 34 28 Q36 42 32 52 Z" fill="#C2A671" stroke="#92400E" strokeWidth="1.5" />
            <path d="M14 12 Q14 7 20 5 Q26 7 26 12" fill="#D4B896" stroke="#92400E" strokeWidth="1.2" />
            <ellipse cx="20" cy="5" rx="7" ry="3" fill="#E7D5B8" stroke="#92400E" strokeWidth="1.2" />
            <ellipse cx="20" cy="5" rx="4.5" ry="2" fill="#78350F" opacity="0.4" />
            <path d="M8 32 Q2 30 2 36 Q2 42 8 40" fill="none" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M32 32 Q38 30 38 36 Q38 42 32 40" fill="none" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 28 Q20 32 32 28" stroke="#92400E" strokeWidth="0.8" fill="none" />
            <path d="M8 36 Q20 40 32 36" stroke="#92400E" strokeWidth="0.8" fill="none" />
        </svg>
    );
}

function AncientRuins({ size = 1 }) {
    return (
        <svg width={62 * size} height={54 * size} viewBox="0 0 62 54" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="46" width="58" height="8" rx="2" fill="#A8A29E" stroke="#78716C" strokeWidth="1.2" />
            <rect x="6" y="18" width="12" height="28" fill="#D6D3D1" stroke="#A8A29E" strokeWidth="1.2" />
            <rect x="4" y="14" width="16" height="6" fill="#E7E5E4" stroke="#A8A29E" strokeWidth="1.2" />
            <path d="M6 14 L10 6 L14 4 L18 14" fill="#E7E5E4" stroke="#A8A29E" strokeWidth="1" />
            <rect x="26" y="28" width="10" height="18" fill="#C7C3BE" stroke="#A8A29E" strokeWidth="1.2" />
            <rect x="24" y="24" width="14" height="6" fill="#E7E5E4" stroke="#A8A29E" strokeWidth="1.2" />
            <rect x="44" y="22" width="12" height="24" fill="#D6D3D1" stroke="#A8A29E" strokeWidth="1.2" />
            <rect x="42" y="18" width="16" height="6" fill="#E7E5E4" stroke="#A8A29E" strokeWidth="1.2" />
            <path d="M44 18 L48 8 L52 6 L56 18" fill="#E7E5E4" stroke="#A8A29E" strokeWidth="1" />
            <rect x="14" y="42" width="22" height="6" rx="2" fill="#A8A29E" stroke="#78716C" strokeWidth="1" transform="rotate(-4 25 45)" />
        </svg>
    );
}

function Starfish({ size = 1 }) {
    return (
        <svg width={42 * size} height={42 * size} viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 3 L24 17 L37 8 L26 19 L40 21 L26 23 L37 34 L24 25 L21 39 L18 25 L5 34 L16 23 L2 21 L16 19 L5 8 L18 17 Z" fill="#FB923C" stroke="#EA580C" strokeWidth="1.2" />
            <circle cx="21" cy="21" r="4" fill="#FED7AA" stroke="#EA580C" strokeWidth="1" />
            <circle cx="21" cy="10" r="1.5" fill="#FDBA74" />
            <circle cx="32" cy="21" r="1.5" fill="#FDBA74" />
            <circle cx="10" cy="21" r="1.5" fill="#FDBA74" />
        </svg>
    );
}

function SeaUrchin({ size = 1 }) {
    return (
        <svg width={38 * size} height={38 * size} viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
            <circle cx="19" cy="19" r="11" fill="#7C3AED" stroke="#5B21B6" strokeWidth="1.3" />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                const r = (deg * Math.PI) / 180;
                return <line key={deg} x1={19 + 11 * Math.cos(r)} y1={19 + 11 * Math.sin(r)} x2={19 + 18 * Math.cos(r)} y2={19 + 18 * Math.sin(r)} stroke="#8B5CF6" strokeWidth="1.3" strokeLinecap="round" />;
            })}
            <circle cx="19" cy="19" r="4" fill="#A78BFA" />
        </svg>
    );
}

function DecorCrab({ size = 1 }) {
    return (
        <svg width={46 * size} height={32 * size} viewBox="0 0 46 32" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="23" cy="20" rx="13" ry="10" fill="#EF4444" stroke="#DC2626" strokeWidth="1.2" />
            <path d="M10 18 Q4 14 2 9 Q2 5 6 7 Q8 10 6 14 Q8 16 10 18" fill="#F87171" stroke="#DC2626" strokeWidth="1" />
            <path d="M36 18 Q42 14 44 9 Q44 5 40 7 Q38 10 40 14 Q38 16 36 18" fill="#F87171" stroke="#DC2626" strokeWidth="1" />
            <path d="M14 24 Q10 28 8 31" stroke="#DC2626" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M17 26 Q14 30 12 32" stroke="#DC2626" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M32 24 Q36 28 38 31" stroke="#DC2626" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M29 26 Q32 30 34 32" stroke="#DC2626" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <circle cx="17" cy="14" r="2.5" fill="white" stroke="#DC2626" strokeWidth="0.8" />
            <circle cx="29" cy="14" r="2.5" fill="white" stroke="#DC2626" strokeWidth="0.8" />
            <circle cx="17" cy="14" r="1" fill="#1C1917" />
            <circle cx="29" cy="14" r="1" fill="#1C1917" />
        </svg>
    );
}

function TreasureChest({ size = 1 }) {
    return (
        <svg width={52 * size} height={42 * size} viewBox="0 0 52 42" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="22" width="44" height="20" rx="3" fill="#92400E" stroke="#78350F" strokeWidth="1.5" />
            <path d="M4 22 Q4 10 26 8 Q48 10 48 22 Z" fill="#B45309" stroke="#78350F" strokeWidth="1.5" />
            <line x1="4" y1="22" x2="48" y2="22" stroke="#78350F" strokeWidth="1.5" />
            <rect x="20" y="19" width="12" height="8" rx="2" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
            <circle cx="26" cy="23" r="2.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="0.8" />
            <circle cx="10" cy="38" r="3" fill="#FCD34D" stroke="#D97706" strokeWidth="0.8" />
            <circle cx="19" cy="40" r="3.5" fill="#F59E0B" stroke="#D97706" strokeWidth="0.8" />
            <circle cx="28" cy="39" r="2.5" fill="#FCD34D" stroke="#D97706" strokeWidth="0.8" />
            <circle cx="37" cy="38" r="3" fill="#F59E0B" stroke="#D97706" strokeWidth="0.8" />
            <rect x="4" y="22" width="6" height="20" rx="3" fill="#78350F" opacity="0.35" />
            <rect x="42" y="22" width="6" height="20" rx="3" fill="#78350F" opacity="0.35" />
        </svg>
    );
}

function GoldenCastle({ size = 1 }) {
    return (
        <svg width={56 * size} height={64 * size} viewBox="0 0 56 64" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="30" width="36" height="34" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" />
            <rect x="2" y="26" width="16" height="38" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
            <rect x="38" y="26" width="16" height="38" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
            {[2, 7, 12].map((x) => <rect key={x} x={x} y={18} width={5} height={10} rx="1" fill="#FCD34D" stroke="#D97706" strokeWidth="1" />)}
            {[39, 44, 49].map((x) => <rect key={x} x={x} y={18} width={5} height={10} rx="1" fill="#FCD34D" stroke="#D97706" strokeWidth="1" />)}
            {[14, 21, 28, 35].map((x) => <rect key={x} x={x} y={22} width={5} height={10} rx="1" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />)}
            <path d="M20 64 L20 46 Q28 40 36 46 L36 64" fill="#78350F" stroke="#D97706" strokeWidth="1.2" />
            <rect x="4" y="30" width="7" height="9" rx="3" fill="#FFFBEB" stroke="#D97706" strokeWidth="1" />
            <rect x="45" y="30" width="7" height="9" rx="3" fill="#FFFBEB" stroke="#D97706" strokeWidth="1" />
            <polygon points="10,18 10,10 18,10 18,18" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
            <polygon points="38,18 38,10 46,10 46,18" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
            <polygon points="10,10 14,4 18,10" fill="#EF4444" stroke="#DC2626" strokeWidth="0.8" />
            <polygon points="38,10 42,4 46,10" fill="#EF4444" stroke="#DC2626" strokeWidth="0.8" />
        </svg>
    );
}

const STORE_ITEMS = [
    { id: "plant_frond", name: "Leafy Frond", price: 20, category: "plants", render: (size) => <PlantFrond size={size} /> },
    { id: "plant_bush", name: "Bushy Clover", price: 35, category: "plants", render: (size) => <PlantBush size={size} /> },
    { id: "moss_clump", name: "Moss Ball", price: 25, category: "plants", render: (size) => <MossClump size={size} /> },
    { id: "fern_plant", name: "Java Fern", price: 30, category: "plants", render: (size) => <FernPlant size={size} /> },
    { id: "anubias", name: "Anubias", price: 40, category: "plants", render: (size) => <AnubiaPlant size={size} /> },
    { id: "amazon_sword", name: "Amazon Sword", price: 50, category: "plants", render: (size) => <AmazonSword size={size} /> },
    { id: "bamboo_stalks", name: "Bamboo", price: 45, category: "plants", render: (size) => <BambooStalks size={size} /> },
    { id: "pebble_cluster", name: "Pebbles", price: 30, category: "rocks", render: (size) => <PebbleCluster size={size} /> },
    { id: "slate_stack", name: "Slate Stack", price: 45, category: "rocks", render: (size) => <SlateStack size={size} /> },
    { id: "big_boulder", name: "Big Boulder", price: 60, category: "rocks", render: (size) => <BigBoulder size={size} /> },
    { id: "driftwood", name: "Driftwood", price: 45, category: "decor", render: (size) => <Driftwood size={size} /> },
    { id: "fish_cave", name: "Fish Cave", price: 80, category: "decor", render: (size) => <FishCave size={size} /> },
    { id: "ceramic_pot", name: "Ceramic Pot", price: 55, category: "decor", render: (size) => <CeramicPot size={size} /> },
    { id: "ancient_ruins", name: "Ancient Ruins", price: 90, category: "decor", render: (size) => <AncientRuins size={size} /> },
    { id: "starfish", name: "Starfish", price: 50, category: "critters", render: (size) => <Starfish size={size} /> },
    { id: "sea_urchin", name: "Sea Urchin", price: 60, category: "critters", render: (size) => <SeaUrchin size={size} /> },
    { id: "decor_crab", name: "Crab", price: 70, category: "critters", render: (size) => <DecorCrab size={size} /> },
    { id: "treasure_chest", name: "Treasure Chest", price: 150, category: "rare", render: (size) => <TreasureChest size={size} /> },
    { id: "golden_castle", name: "Golden Castle", price: 250, category: "rare", render: (size) => <GoldenCastle size={size} /> },
];

const STORE_CATEGORIES = [
    { id: "plants", label: "Plants 🌿", accent: "#22C55E", previewBg: "#F4FBF7" },
    { id: "rocks", label: "Rocks 🪨", accent: "#A8A29E", previewBg: "#FAF9F6" },
    { id: "decor", label: "Decor", accent: "#78716C", previewBg: "#FAF9F6" },
    { id: "critters", label: "Critters 🦀", accent: "#FB923C", previewBg: "#FFF7ED" },
    { id: "rare", label: "Rare ✨", accent: "#F59E0B", previewBg: "#FFFBEB" },
];

const STORE_ITEM_MAP = Object.fromEntries(STORE_ITEMS.map((i) => [i.id, i]));

// =========== DRAGGABLE PURCHASE ===========
function DraggablePurchase({ purchase, tankRef, onMoveEnd, onRemove, onDragChange, onOutsideChange, children }) {
    const [pos, setPos] = useState({ x: purchase.x ?? 50, y: purchase.y ?? 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [isOutside, setIsOutside] = useState(false);
    const dragState = useRef(null);

    useEffect(() => {
        if (!dragState.current) setPos({ x: purchase.x ?? 50, y: purchase.y ?? 20 });
    }, [purchase.x, purchase.y]);

    const calcPos = (rect, clientX, clientY, startX, startY, origX, origY) => ({
        x: Math.max(2, Math.min(98, origX + ((clientX - startX) / rect.width) * 100)),
        y: Math.max(0, Math.min(85, origY + (-(clientY - startY) / rect.height) * 100)),
    });

    const checkOutside = (clientX, clientY, rect) =>
        clientX < rect.left || clientX > rect.right ||
        clientY < rect.top || clientY > rect.bottom;

    const handlePointerDown = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX, startY = e.clientY;
        const origX = pos.x, origY = pos.y;
        const pointerId = e.pointerId;
        dragState.current = { pointerId };
        setIsDragging(true);
        onDragChange?.(true);
        document.body.style.userSelect = "none";
        document.body.style.webkitUserSelect = "none";

        const onMove = (ev) => {
            if (!dragState.current || ev.pointerId !== pointerId || !tankRef.current) return;
            const rect = tankRef.current.getBoundingClientRect();
            const outside = checkOutside(ev.clientX, ev.clientY, rect);
            setIsOutside(outside);
            onOutsideChange?.(outside);
            if (!outside) {
                setPos(calcPos(rect, ev.clientX, ev.clientY, startX, startY, origX, origY));
            }
        };

        const onUp = (ev) => {
            if (!dragState.current || ev.pointerId !== pointerId) return;
            cleanup();
            dragState.current = null;
            setIsDragging(false);
            setIsOutside(false);
            onDragChange?.(false);
            onOutsideChange?.(false);
            if (!tankRef.current) return;
            const rect = tankRef.current.getBoundingClientRect();
            const outside = checkOutside(ev.clientX, ev.clientY, rect);
            if (outside) {
                setPos({ x: purchase.x ?? 50, y: purchase.y ?? 20 });
                onRemove(purchase.id);
            } else {
                const final = calcPos(rect, ev.clientX, ev.clientY, startX, startY, origX, origY);
                setPos(final);
                onMoveEnd(purchase.id, Math.round(final.x), Math.round(final.y));
            }
        };

        const onCancel = (ev) => {
            if (!dragState.current || ev.pointerId !== pointerId) return;
            cleanup();
            dragState.current = null;
            setIsDragging(false);
            setIsOutside(false);
            onDragChange?.(false);
            onOutsideChange?.(false);
            setPos({ x: purchase.x ?? 50, y: purchase.y ?? 20 });
        };

        const cleanup = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onCancel);
            document.body.style.userSelect = "";
            document.body.style.webkitUserSelect = "";
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onCancel);
    };

    return (
        <div
            onPointerDown={handlePointerDown}
            style={{
                position: "absolute",
                left: `${pos.x}%`,
                bottom: `${pos.y}%`,
                padding: "12px",
                transform: isDragging ? "translateX(-50%) scale(1.4)" : "translateX(-50%)",
                cursor: isDragging ? "grabbing" : "grab",
                zIndex: isDragging ? 20 : 4,
                touchAction: "none",
                userSelect: "none",
                filter: isOutside
                    ? "drop-shadow(0 6px 12px rgba(220,38,38,0.8)) sepia(1) saturate(3) hue-rotate(300deg)"
                    : isDragging
                        ? "drop-shadow(0 8px 16px rgba(0,0,0,0.5))"
                        : "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
                opacity: isOutside ? 0.75 : 1,
                transition: isDragging ? "none" : "transform 0.15s ease, filter 0.15s ease, opacity 0.15s ease, background 0.15s ease",
            }}
        >
            {children}
        </div>
    );
}

// =========== MINIMAL AQUARIUM ===========
function Aquarium({ mood, happiness, rewardAnim, purchases = [], onMovePurchase, onRemovePurchase }) {
    const tankRef = useRef(null);
    const [anyDragging, setAnyDragging] = useState(false);
    const [dragOutside, setDragOutside] = useState(false);
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
        <div ref={tankRef} style={{
            position: "relative", width: "100%", height: "160px",
            overflow: "hidden", fontFamily: FONT,
            border: "2px solid #2C2C2A",
            userSelect: "none", WebkitUserSelect: "none",
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
                {[{ dx: 0, dy: 0 }, { dx: 16, dy: -7 }, { dx: -8, dy: 9 }, { dx: 24, dy: 3 }].map((off, i) => (
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

            {/* Purchased items (draggable, placed only) */}
            {purchases.filter((p) => p.x != null).map((p) => {
                const item = STORE_ITEM_MAP[p.item_id];
                if (!item) return null;
                return (
                    <DraggablePurchase
                        key={p.id}
                        purchase={p}
                        tankRef={tankRef}
                        onMoveEnd={onMovePurchase}
                        onRemove={onRemovePurchase}
                        onDragChange={setAnyDragging}
                        onOutsideChange={setDragOutside}
                    >
                        {item.render(0.75)}
                    </DraggablePurchase>
                );
            })}

            {/* Drag-outside-to-remove overlay */}
            {dragOutside && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 25,
                    background: "rgba(220,38,38,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                    borderRadius: "10px",
                }}>
                    <div style={{
                        background: "rgba(220,38,38,0.9)", color: "white",
                        padding: "6px 14px", borderRadius: "20px",
                        fontSize: "13px", fontWeight: 700, fontFamily: FONT,
                    }}>
                        🗑️ release to remove
                    </div>
                </div>
            )}

            {/* Drag hint — only shown while dragging inside tank */}
            {anyDragging && !dragOutside && (
                <div style={{
                    position: "absolute", top: "6px", right: "8px", zIndex: 6,
                    fontSize: "9px", fontWeight: 600, color: "rgba(255,255,255,0.45)",
                    pointerEvents: "none", fontFamily: FONT,
                }}>
                    drag out to remove
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
    const [purchases, setPurchases] = useState([]);
    const [view, setView] = useState("today");
    const [calMonth, setCalMonth] = useState(today());
    const [newChoreName, setNewChoreName] = useState("");
    const [newChoreFreq, setNewChoreFreq] = useState("weekly");
    const [loading, setLoading] = useState(true);
    const [inviteCode, setInviteCode] = useState(null);
    const [codeCopied, setCodeCopied] = useState(false);
    const [rewardAnim, setRewardAnim] = useState(null);
    const [newChoreDesc, setNewChoreDesc] = useState("");
    const [newChoreOneTime, setNewChoreOneTime] = useState(false);
    const [newChoreDeadline, setNewChoreDeadline] = useState("");
    const [linkCopied, setLinkCopied] = useState(false);
    const [notifStatus, setNotifStatus] = useState("default"); // default | granted | denied | subscribing
    const [notifPrefs, setNotifPrefs] = useState({ dailySummary: true, overdueAlerts: true, streakWarnings: true, choreDoneAlerts: true });
    const [streakAnim, setStreakAnim] = useState(false);
    const [pullDelta, setPullDelta] = useState(0);
    const prevStreakRef = useRef(null);
    const pullRef = useRef({ active: false, startY: 0, delta: 0 });

    useEffect(() => {
        const THRESHOLD = 64;
        const onTouchStart = (e) => {
            if (window.scrollY === 0) {
                pullRef.current = { active: true, startY: e.touches[0].clientY, delta: 0 };
            }
        };
        const onTouchMove = (e) => {
            if (!pullRef.current.active) return;
            const dy = e.touches[0].clientY - pullRef.current.startY;
            if (dy > 0) {
                pullRef.current.delta = Math.min(dy, THRESHOLD + 20);
                setPullDelta(pullRef.current.delta);
            } else {
                pullRef.current.active = false;
                setPullDelta(0);
            }
        };
        const onTouchEnd = () => {
            if (pullRef.current.active && pullRef.current.delta >= THRESHOLD) {
                window.location.reload();
            }
            pullRef.current.active = false;
            pullRef.current.delta = 0;
            setPullDelta(0);
        };
        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchmove", onTouchMove, { passive: true });
        document.addEventListener("touchend", onTouchEnd);
        return () => {
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
        };
    }, []);

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
        const choreIdsRes = await supabase.from("chores").select("id").eq("household_id", profile.household_id);
        const choreIds = choreIdsRes.data?.map((c) => c.id) || [];
        const [choresRes, compsRes, purchasesRes] = await Promise.all([
            supabase.from("chores").select("*").eq("household_id", profile.household_id).order("created_at"),
            supabase.from("completions").select("*").in("chore_id", choreIds),
            supabase.from("purchases").select("*").eq("household_id", profile.household_id).order("created_at"),
        ]);
        if (choresRes.data) setChores(choresRes.data);
        if (compsRes.data) setCompletions(compsRes.data);
        if (purchasesRes.data) setPurchases(purchasesRes.data);
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
            .on("postgres_changes", { event: "*", schema: "public", table: "purchases" }, () => loadData())
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
        if (chore.snoozed_until && chore.snoozed_until > todayStr) {
            return { status: "snoozed", snoozeUntil: parseDate(chore.snoozed_until), lastDone: null };
        }

        if (chore.one_time) {
            const anyComp = completions.find((c) => c.chore_id === chore.id);
            if (anyComp) return { status: "done", one_time_completed: true, lastDone: { date: parseDate(anyComp.completed_date), userId: anyComp.user_id } };
            if (chore.deadline) {
                const daysLeft = daysBetween(today(), parseDate(chore.deadline));
                if (daysLeft < 0) return { status: "overdue", daysOverdue: -daysLeft, lastDone: null };
                if (daysLeft === 0) return { status: "due", daysOverdue: 0, lastDone: null };
                return { status: "done", daysUntilDue: daysLeft, lastDone: null };
            }
            return { status: "due", daysOverdue: 0, lastDone: null };
        }

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

    const choresWithStatus = chores.map((c) => {
        const todayComps = completions.filter((comp) => comp.chore_id === c.id && comp.completed_date === todayStr);
        return {
            ...c,
            ...choreStatus(c),
            completedToday: completedTodayIds.has(c.id),
            doneTogetherToday: todayComps.length > 1,
        };
    });

    const snoozedList = choresWithStatus.filter((c) => c.status === "snoozed");

    // ===== NEW TAB LOGIC =====
    // TODAY: anything due/overdue OR completed today, AND short-cycle stuff due within 1 day
    const todayList = choresWithStatus.filter((c) => {
        if (c.status === "snoozed") return false;
        if (c.one_time_completed && !c.completedToday) return false;
        if (c.completedToday) return true;
        if (c.status === "due" || c.status === "overdue") return true;
        // Show short-cycle chores that are due tomorrow (1 day away) in Today
        if (!c.one_time && c.status === "done" && c.daysUntilDue <= 1) return true;
        return false;
    });

    // THIS WEEK: due within 7 days, not already in Today
    const weekList = choresWithStatus
        .filter((c) => !todayList.includes(c))
        .filter((c) => !c.one_time_completed)
        .filter((c) => c.status === "done" && (c.daysUntilDue || 0) <= 7)
        .sort((a, b) => (a.daysUntilDue || 0) - (b.daysUntilDue || 0));

    // THIS MONTH: due within 30 days, not in Today or Week
    const monthList = choresWithStatus
        .filter((c) => !todayList.includes(c) && !weekList.includes(c))
        .filter((c) => !c.one_time_completed)
        .filter((c) => c.status === "done" && (c.daysUntilDue || 0) <= 30)
        .sort((a, b) => (a.daysUntilDue || 0) - (b.daysUntilDue || 0));

    // LONGTERM: everything else
    const longtermList = choresWithStatus
        .filter((c) => !todayList.includes(c) && !weekList.includes(c) && !monthList.includes(c))
        .filter((c) => !c.one_time_completed)
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

    // Fire-and-forget push to other household members
    const notifyChoreComplete = (choreName, together = false) => {
        if (!profile?.household_id || !VAPID_PUBLIC_KEY) return;
        fetch("/api/notify-chore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                householdId: profile.household_id,
                choreName,
                completedByName: currentUser.name,
                excludeUserId: user.id,
                together,
            }),
        }).catch(() => {});
    };

    const notifyPurchase = (itemName) => {
        if (!profile?.household_id || !VAPID_PUBLIC_KEY) return;
        fetch("/api/notify-purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                householdId: profile.household_id,
                itemName,
                buyerName: currentUser.name,
                excludeUserId: user.id,
            }),
        }).catch(() => {});
    };

    // Actions
    const completeChore = async (choreId) => {
        const chore = chores.find((c) => c.id === choreId);
        const { data, error } = await supabase
            .from("completions")
            .insert({ chore_id: choreId, user_id: user.id, completed_date: todayStr })
            .select().single();
        if (!error && data) {
            setCompletions((prev) => [...prev, data]);
            if (chore?.freq) {
                setRewardAnim(chore.freq);
                setTimeout(() => setRewardAnim(null), 2500);
            }
            notifyChoreComplete(chore?.name || "a chore");
        }
    };

    const completeChoreTogether = async (choreId) => {
        const chore = chores.find((c) => c.id === choreId);
        const inserts = users.map((u) => ({ chore_id: choreId, user_id: u.id, completed_date: todayStr }));
        const { data, error } = await supabase.from("completions").insert(inserts).select();
        if (!error && data) {
            setCompletions((prev) => [...prev, ...data]);
            if (chore?.freq) {
                setRewardAnim(chore.freq);
                setTimeout(() => setRewardAnim(null), 2500);
            }
            notifyChoreComplete(chore?.name || "a chore", true);
        }
    };

    const choreRewardMap = useMemo(() => {
        const map = {};
        for (const c of chores) map[c.id] = c.reward ?? 5;
        return map;
    }, [chores]);

    const coinsEarned = useMemo(
        () => completions.reduce((sum, c) => sum + (choreRewardMap[c.chore_id] ?? 5), 0),
        [completions, choreRewardMap]
    );

    const coinsSpent = useMemo(
        () => purchases.reduce((sum, p) => sum + (STORE_ITEM_MAP[p.item_id]?.price ?? 0), 0),
        [purchases]
    );

    const coinBalance = coinsEarned - coinsSpent;

    const purchaseItem = async (itemId) => {
        const item = STORE_ITEM_MAP[itemId];
        if (!item || !profile?.household_id) return;
        if (coinBalance < item.price) return;
        const { data, error } = await supabase
            .from("purchases")
            .insert({ household_id: profile.household_id, item_id: itemId, x: 50, y: 20 })
            .select().single();
        if (!error && data) {
            setPurchases((prev) => [...prev, data]);
            notifyPurchase(item.name);
        }
    };

    const movePurchase = async (purchaseId, x, y) => {
        setPurchases((prev) => prev.map((p) => (p.id === purchaseId ? { ...p, x, y } : p)));
        await supabase.from("purchases").update({ x, y }).eq("id", purchaseId);
    };

    const unplacePurchase = async (purchaseId) => {
        setPurchases((prev) => prev.map((p) => (p.id === purchaseId ? { ...p, x: null, y: null } : p)));
        await supabase.from("purchases").update({ x: null, y: null }).eq("id", purchaseId);
    };

    const placePurchase = async (purchaseId) => {
        const x = 50, y = 20;
        setPurchases((prev) => prev.map((p) => (p.id === purchaseId ? { ...p, x, y } : p)));
        await supabase.from("purchases").update({ x, y }).eq("id", purchaseId);
    };

    const snoozeChore = async (choreId, days) => {
        const d = today();
        d.setDate(d.getDate() + days);
        const snoozedUntil = formatDate(d);
        await supabase.from("chores").update({ snoozed_until: snoozedUntil }).eq("id", choreId);
        setChores((prev) => prev.map((c) => c.id === choreId ? { ...c, snoozed_until: snoozedUntil } : c));
    };

    const unsnoozeChore = async (choreId) => {
        await supabase.from("chores").update({ snoozed_until: null }).eq("id", choreId);
        setChores((prev) => prev.map((c) => c.id === choreId ? { ...c, snoozed_until: null } : c));
    };

    const sellPurchase = async (purchaseId) => {
        setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
        await supabase.from("purchases").delete().eq("id", purchaseId);
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
        const payload = {
            name: newChoreName.trim(),
            freq: newChoreOneTime ? "weekly" : newChoreFreq,
            description: newChoreDesc.trim() || null,
            household_id: profile.household_id,
            ...(newChoreOneTime && { one_time: true }),
            ...(newChoreOneTime && newChoreDeadline && { deadline: newChoreDeadline }),
        };
        const { data, error } = await supabase.from("chores").insert(payload).select().single();
        if (error) { alert("Couldn't add chore: " + error.message); return; }
        if (data) {
            setChores((prev) => [...prev, data]);
            setNewChoreName(""); setNewChoreDesc("");
            setNewChoreOneTime(false); setNewChoreDeadline("");
        }
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

    const PULL_THRESHOLD = 64;

    return (
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "1rem", fontFamily: FONT }}>
            {/* PULL-TO-REFRESH INDICATOR */}
            {pullDelta > 0 && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
                    display: "flex", justifyContent: "center",
                    pointerEvents: "none",
                }}>
                    <div style={{
                        marginTop: `${Math.min(pullDelta * 0.5, 28)}px`,
                        background: pullDelta >= PULL_THRESHOLD ? "#1D9E75" : "white",
                        color: pullDelta >= PULL_THRESHOLD ? "white" : "#2C2C2A",
                        border: "2px solid #2C2C2A",
                        borderRadius: "20px",
                        padding: "5px 14px",
                        fontSize: "12px", fontWeight: 700, fontFamily: FONT,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        transition: "background 0.15s, color 0.15s",
                    }}>
                        {pullDelta >= PULL_THRESHOLD ? "↑ release to refresh" : "↓ pull to refresh"}
                    </div>
                </div>
            )}
            {/* BUBBLE TITLE */}
            <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
                <span style={{
                    fontSize: "26px", fontWeight: 900, letterSpacing: "0.5px",
                    color: "white",
                    WebkitTextStroke: "2.5px #2C2C2A",
                    textShadow: "3px 3px 0 #2C2C2A, -1px -1px 0 #2C2C2A, 1px -1px 0 #2C2C2A, -1px 1px 0 #2C2C2A",
                    fontFamily: "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive",
                }}>
                    🐟 My Fishtank
                </span>
            </div>

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
                <div style={{ display: "flex", gap: "6px" }}>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", background: "white", border: "2px solid #2C2C2A", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", color: "#2C2C2A", fontFamily: FONT, fontWeight: 600, boxShadow: boxShadow("#2C2C2A", 2, 2) }}
                        title="Refresh"
                    >
                        <RefreshCw size={13} />
                    </button>
                    <button
                        onClick={handleSignOut}
                        style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", background: "white", border: "2px solid #2C2C2A", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", color: "#2C2C2A", fontFamily: FONT, fontWeight: 600, boxShadow: boxShadow("#2C2C2A", 2, 2) }}
                    >
                        <LogOut size={12} /> Sign Out
                    </button>
                </div>
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
                    { id: "store", label: "Store", icon: ShoppingBag, accent: "#F59E0B" },
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
                        <Aquarium
                            happiness={householdHappiness}
                            mood={householdMood}
                            rewardAnim={rewardAnim}
                            purchases={purchases}
                            onMovePurchase={movePurchase}
                            onRemovePurchase={unplacePurchase}
                        />
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
                        <div
                            onClick={() => setView("store")}
                            style={{
                                padding: "12px", background: "#FEF3C7", borderRadius: "12px", textAlign: "center",
                                border: "2px solid #2C2C2A", boxShadow: boxShadow("#F59E0B", 2, 2),
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
                                cursor: "pointer",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "22px", fontWeight: 800, color: "#2C2C2A" }}>
                                <Coins size={18} strokeWidth={2.5} color="#B45309" /> {coinBalance}
                            </div>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#888780" }}>Coins</div>
                            <div style={{ fontSize: "10px", fontWeight: 600, color: "#B45309", marginTop: "1px" }}>spend at the store →</div>
                        </div>
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
                            {myChores.map((c) => <ChoreRow key={c.id} chore={c} users={users} currentUser={currentUser} onComplete={completeChore} onCompleteTogether={completeChoreTogether} onUndo={undoComplete} onAssign={assignOwner} onSnooze={snoozeChore} />)}
                        </Section>
                    )}
                    {unassigned.length > 0 && (
                        <Section title="Up For Grabs" accentColor="#888780">
                            {unassigned.map((c) => <ChoreRow key={c.id} chore={c} users={users} currentUser={currentUser} onComplete={completeChore} onCompleteTogether={completeChoreTogether} onUndo={undoComplete} onAssign={assignOwner} onSnooze={snoozeChore} />)}
                        </Section>
                    )}
                    {partnerChores.length > 0 && partner && (
                        <Section title={`${partner.name}'s turn`} accentColor={partner.color}>
                            {partnerChores.map((c) => <ChoreRow key={c.id} chore={c} users={users} currentUser={currentUser} onComplete={completeChore} onCompleteTogether={completeChoreTogether} onUndo={undoComplete} onAssign={assignOwner} onSnooze={snoozeChore} />)}
                        </Section>
                    )}

                    {snoozedList.length > 0 && (
                        <Section title={`Snoozed (${snoozedList.length})`} accentColor="#888780">
                            {snoozedList.map((c) => (
                                <div key={c.id} style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "10px 14px", marginBottom: "8px",
                                    background: "#F9F9F7", border: "2px solid #B4B2A9",
                                    borderRadius: "12px", fontFamily: FONT, gap: "10px",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                                        <AlarmClock size={15} color="#888780" />
                                        <div>
                                            <div style={{ fontSize: "14px", fontWeight: 700, color: "#888780" }}>{c.name}</div>
                                            <div style={{ fontSize: "11px", color: "#B4B2A9" }}>
                                                back {friendlyDate(c.snoozeUntil)}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => unsnoozeChore(c.id)}
                                        title="Wake up now"
                                        style={{
                                            padding: "5px 10px", border: "2px solid #2C2C2A", borderRadius: "8px",
                                            background: "white", cursor: "pointer", fontFamily: FONT,
                                            fontSize: "11px", fontWeight: 700, color: "#2C2C2A", whiteSpace: "nowrap",
                                            display: "flex", alignItems: "center", gap: "4px",
                                        }}
                                    >
                                        <XIcon size={11} /> Un-snooze
                                    </button>
                                </div>
                            ))}
                        </Section>
                    )}
                </div>
            )}

            {/* THIS WEEK VIEW */}
            {view === "week" && (
                <div>
                    <div style={{ marginBottom: "1rem", fontSize: "14px", color: "#888780", fontWeight: 600 }}>Coming Up This Week</div>
                    {weekList.length === 0 && <EmptyState text="Nothing for this week! 🎈" />}
                    {weekList.map((c) => <AnimatedCheckRow key={c.id} chore={c} users={users} onComplete={completeChore} onAssign={assignOwner} variant="week" />)}

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
                                        <span style={{ fontWeight: 700, fontSize: "12px", color: "#1D9E75" }}>×{count}</span>
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
                    {monthList.map((c) => <AnimatedCheckRow key={c.id} chore={c} users={users} onComplete={completeChore} onAssign={assignOwner} variant="month" />)}

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
                                        <span style={{ fontWeight: 700, fontSize: "12px", color: "#1D9E75" }}>×{count}</span>
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
                    {longtermList.map((c) => <AnimatedCheckRow key={c.id} chore={c} users={users} onComplete={completeChore} onAssign={assignOwner} variant="longterm" />)}
                </div>
            )}

            {/* HEATMAP VIEW */}
            {view === "heatmap" && (
                <div>
                    <div style={{ marginBottom: "1rem", fontSize: "14px", color: "#888780", fontWeight: 600 }}>Chore Performance Heatmap</div>
                    <HeatmapView chores={chores} completions={completions} users={users} />
                </div>
            )}

            {/* STORE VIEW */}
            {view === "store" && (
                <div>
                    <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 18px", marginBottom: "1.25rem",
                        background: "#FEF3C7", border: "2px solid #2C2C2A", borderRadius: "12px",
                        boxShadow: boxShadow("#F59E0B", 3, 3),
                    }}>
                        <div style={{ fontSize: "13px", color: "#78350F", fontWeight: 600 }}>Your Balance</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "20px", fontWeight: 800, color: "#2C2C2A" }}>
                            <Coins size={20} strokeWidth={2.5} /> {coinBalance}
                        </div>
                    </div>

                    {STORE_CATEGORIES.map((cat) => {
                        const catItems = STORE_ITEMS.filter((i) => i.category === cat.id);
                        if (catItems.length === 0) return null;
                        return (
                            <Section key={cat.id} title={cat.label} accentColor={cat.accent}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    {catItems.map((item) => {
                                        const canAfford = coinBalance >= item.price;
                                        return (
                                            <div key={item.id} style={{
                                                padding: "12px", background: "white",
                                                border: "2px solid #2C2C2A", borderRadius: "12px",
                                                boxShadow: boxShadow(cat.accent, 2, 2),
                                                display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                                            }}>
                                                <div style={{
                                                    width: "100%", height: "90px", display: "flex",
                                                    alignItems: "flex-end", justifyContent: "center",
                                                    background: cat.previewBg, borderRadius: "8px",
                                                    border: "1.5px solid #e8e8e8", padding: "6px 0",
                                                }}>
                                                    {item.render(1)}
                                                </div>
                                                <div style={{ fontSize: "13px", fontWeight: 700, color: "#2C2C2A" }}>{item.name}</div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 700, color: "#78350F" }}>
                                                    <Coins size={13} strokeWidth={2.5} /> {item.price}
                                                </div>
                                                <button
                                                    onClick={() => purchaseItem(item.id)}
                                                    disabled={!canAfford}
                                                    style={{
                                                        width: "100%", padding: "8px 10px",
                                                        background: canAfford ? cat.accent : "#e8e8e8",
                                                        color: canAfford ? "white" : "#888780",
                                                        border: "2px solid #2C2C2A", borderRadius: "8px",
                                                        fontFamily: FONT, fontSize: "12px", fontWeight: 700,
                                                        cursor: canAfford ? "pointer" : "not-allowed",
                                                        boxShadow: canAfford ? boxShadow("#2C2C2A", 2, 2) : "none",
                                                    }}
                                                >
                                                    {canAfford ? "Buy" : "Not enough"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Section>
                        );
                    })}

                    {purchases.length > 0 && (
                        <Section title="Your Items" accentColor="#7F77DD">
                            <div style={{ fontSize: "12px", color: "#888780", marginBottom: "10px" }}>
                                Items in tank: drag to reposition or drag outside to return to inventory. Items in inventory: tap Place to add to tank.
                            </div>
                            {purchases.map((p) => {
                                const item = STORE_ITEM_MAP[p.item_id];
                                if (!item) return null;
                                const inTank = p.x != null;
                                return (
                                    <div key={p.id} style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "8px 12px", marginBottom: "6px",
                                        background: "white", border: "2px solid #2C2C2A",
                                        borderRadius: "10px", boxShadow: boxShadow("#e8e8e8", 2, 2),
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <div style={{ width: "28px", display: "flex", justifyContent: "center" }}>
                                                {item.render(0.4)}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "13px", fontWeight: 600 }}>{item.name}</div>
                                                <div style={{ fontSize: "11px", color: inTank ? "#22C55E" : "#888780" }}>
                                                    {inTank ? "in tank 🐟" : "in inventory"}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "6px" }}>
                                            {!inTank && (
                                                <button
                                                    onClick={() => placePurchase(p.id)}
                                                    style={{
                                                        padding: "4px 10px", background: "#7F77DD", color: "white",
                                                        border: "2px solid #2C2C2A", borderRadius: "6px",
                                                        cursor: "pointer", fontFamily: FONT, fontSize: "12px", fontWeight: 600,
                                                    }}
                                                >
                                                    Place
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { if (confirm("Sell this item?")) sellPurchase(p.id); }}
                                                style={{
                                                    padding: "4px 8px", background: "white",
                                                    border: "2px solid #2C2C2A", borderRadius: "6px",
                                                    cursor: "pointer", fontFamily: FONT,
                                                }}
                                                title="Sell"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </Section>
                    )}
                </div>
            )}

            {/* MANAGE VIEW */}
            {view === "manage" && (
                <div>
                    <Section title="Add A Chore" accentColor="#7F77DD">
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <input
                                type="text" value={newChoreName} onChange={(e) => setNewChoreName(e.target.value)}
                                placeholder={newChoreOneTime ? "pick up dry cleaning…" : "water the succulents…"}
                                onKeyDown={(e) => { if (e.key === "Enter") addChore(); }}
                                style={{ flex: 1, minWidth: "200px", padding: "10px 12px", border: "2px solid #2C2C2A", borderRadius: "10px", fontSize: "14px", fontFamily: FONT, boxShadow: boxShadow("#7F77DD", 2, 2) }}
                            />
                            {newChoreOneTime ? (
                                <input
                                    type="date" value={newChoreDeadline}
                                    onChange={(e) => setNewChoreDeadline(e.target.value)}
                                    placeholder="Deadline (optional)"
                                    style={{ padding: "10px 8px", border: "2px solid #2C2C2A", borderRadius: "10px", fontSize: "13px", fontFamily: FONT, boxShadow: boxShadow("#7F77DD", 2, 2) }}
                                />
                            ) : (
                                <select
                                    value={newChoreFreq} onChange={(e) => setNewChoreFreq(e.target.value)}
                                    style={{ minWidth: "120px", padding: "10px 8px", border: "2px solid #2C2C2A", borderRadius: "10px", fontSize: "13px", fontFamily: FONT, boxShadow: boxShadow("#7F77DD", 2, 2) }}
                                >
                                    {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            )}
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
                        <div
                            onClick={() => setNewChoreOneTime((v) => !v)}
                            style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: newChoreOneTime ? "#7F77DD" : "#888780", userSelect: "none" }}
                        >
                            <div style={{
                                width: "20px", height: "20px", borderRadius: "5px",
                                border: "2px solid #2C2C2A", flexShrink: 0,
                                background: newChoreOneTime ? "#7F77DD" : "white",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: boxShadow(newChoreOneTime ? "#5B51E0" : "#e8e8e8", 1, 1),
                            }}>
                                {newChoreOneTime && <Check size={12} color="white" strokeWidth={3} />}
                            </div>
                            One-time task {newChoreOneTime && <span style={{ fontSize: "11px", color: "#888780", fontWeight: 400 }}>(won't repeat)</span>}
                        </div>
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
                                        { key: "choreDoneAlerts", label: "Partner Activity", desc: "When your partner completes a chore" },
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

const SNOOZE_OPTIONS = [
    { label: "1 day", days: 1 },
    { label: "3 days", days: 3 },
    { label: "1 week", days: 7 },
    { label: "2 weeks", days: 14 },
];

function ChoreRow({ chore, users, currentUser, onComplete, onCompleteTogether, onUndo, onAssign, onSnooze }) {
    const freqInfo = FREQ[chore.freq];
    const isOverdue = chore.status === "overdue";
    const isDone = chore.completedToday;
    const [justChecked, setJustChecked] = useState(false);
    const [completeAs, setCompleteAs] = useState(chore.owner_id || "");
    const [snoozeOpen, setSnoozeOpen] = useState(false);

    const completedBy = isDone && !chore.doneTogetherToday && chore.lastDone
        ? users.find((u) => u.id === chore.lastDone.userId)
        : null;

    const handleClick = () => {
        if (isDone) { onUndo(chore.id); }
        else {
            setJustChecked(true);
            setTimeout(() => setJustChecked(false), 600);
            if (completeAs === "together") { onCompleteTogether(chore.id); }
            else { onComplete(chore.id); }
        }
    };

    const handleDropdownChange = (e) => {
        const val = e.target.value;
        setCompleteAs(val);
        if (val !== "together") onAssign(chore.id, val || null);
    };

    return (
        <div style={{
            display: "flex", flexDirection: "column", padding: "12px 14px",
            marginBottom: "8px", fontFamily: FONT,
            background: isDone ? "#F4FBF7" : isOverdue ? "#FEF2F2" : "white",
            border: `2px solid ${isDone ? "#1D9E75" : isOverdue ? "#EF4444" : "#2C2C2A"}`,
            borderRadius: "12px",
            boxShadow: isDone ? boxShadow("#1D9E75", 2, 2) : isOverdue ? boxShadow("#EF4444", 3, 3) : boxShadow("#e8e8e8", 2, 2),
            transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                    title={isDone ? "Undo" : completeAs === "together" ? "Mark done together" : "Mark complete"}
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
                        {isDone && chore.doneTogetherToday ? (
                            <span style={{
                                fontSize: "11px", padding: "2px 8px", background: "#E1F5EE",
                                color: "#085041", borderRadius: "6px", fontWeight: 700,
                                display: "inline-flex", alignItems: "center", gap: "4px",
                                border: "1.5px solid #1D9E75",
                            }}>
                                🤝 done together
                            </span>
                        ) : isDone && completedBy ? (
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
                                {chore.one_time ? (
                                    <span style={{ fontSize: "11px", padding: "2px 8px", background: "#EDE9FE", color: "#5B21B6", borderRadius: "6px", fontWeight: 700, border: "1px solid #7C3AED" }}>
                                        one-time
                                    </span>
                                ) : freqInfo && (
                                    <span style={{
                                        fontSize: "11px", padding: "2px 8px",
                                        background: freqInfo.bg, color: freqInfo.text,
                                        borderRadius: "6px", fontWeight: 700, border: "1px solid " + freqInfo.color,
                                    }}>
                                        {freqInfo.label}
                                    </span>
                                )}
                                {isOverdue && <span style={{ fontSize: "12px", color: "white", fontWeight: 700, background: "#EF4444", padding: "2px 8px", borderRadius: "6px", border: "1.5px solid #DC2626", display: "inline-flex", alignItems: "center", gap: "4px" }}>🔴 {chore.daysOverdue}d overdue!</span>}
                                {!isOverdue && chore.status === "due" && (
                                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#B45309", background: "#FEF3C7", padding: "2px 8px", borderRadius: "6px", border: "1px solid #F59E0B" }}>
                                        {chore.one_time && chore.deadline ? `due ${friendlyDate(parseDate(chore.deadline))}` : "due today"}
                                    </span>
                                )}
                                {!chore.one_time && chore.lastDone && <span style={{ fontSize: "11px", color: "#b4b2a9" }}>last: {friendlyDate(chore.lastDone.date)}</span>}
                            </>
                        )}
                    </div>
                </div>
                {!isDone && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                        <button
                            onClick={() => setSnoozeOpen((s) => !s)}
                            title="Snooze"
                            style={{
                                padding: "5px 7px", border: "2px solid #2C2C2A", borderRadius: "8px",
                                background: snoozeOpen ? "#E0E7FF" : "white", cursor: "pointer",
                                display: "flex", alignItems: "center",
                            }}
                        >
                            <AlarmClock size={14} strokeWidth={2} color={snoozeOpen ? "#4338CA" : "#888780"} />
                        </button>
                        <select
                            value={completeAs}
                            onChange={handleDropdownChange}
                            style={{ fontSize: "11px", padding: "4px 6px", border: "2px solid #2C2C2A", borderRadius: "6px", width: "auto", fontFamily: FONT, fontWeight: 600 }}
                            title="Who did it?"
                        >
                            <option value="">—</option>
                            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            {users.length > 1 && <option value="together">Together 🤝</option>}
                        </select>
                    </div>
                )}
            </div>
            {snoozeOpen && !isDone && (
                <div style={{
                    marginTop: "10px", paddingTop: "10px",
                    borderTop: "1.5px solid #e8e8e8",
                    display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap",
                }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#888780", display: "flex", alignItems: "center", gap: "4px" }}>
                        <AlarmClock size={11} /> Snooze for:
                    </span>
                    {SNOOZE_OPTIONS.map((opt) => (
                        <button
                            key={opt.days}
                            onClick={() => { onSnooze(chore.id, opt.days); setSnoozeOpen(false); }}
                            style={{
                                padding: "5px 10px", border: "2px solid #2C2C2A", borderRadius: "8px",
                                background: "white", cursor: "pointer", fontFamily: FONT,
                                fontSize: "12px", fontWeight: 700, color: "#2C2C2A",
                                boxShadow: boxShadow("#2C2C2A", 1, 1),
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setSnoozeOpen(false)}
                        style={{
                            padding: "5px 8px", border: "2px solid #e8e8e8", borderRadius: "8px",
                            background: "white", cursor: "pointer", fontFamily: FONT,
                            fontSize: "11px", color: "#888780",
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}

function AnimatedCheckRow({ chore, users, onComplete, onAssign, variant = "week" }) {
    const freqInfo = chore.one_time ? null : FREQ[chore.freq];
    const [checked, setChecked] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [assignedTo, setAssignedTo] = useState(chore.owner_id || "");

    const handleClick = () => {
        if (checked) return;
        setChecked(true);
        setTimeout(() => setRemoving(true), 500);
        setTimeout(() => onComplete(chore.id), 900);
    };

    const handleAssign = (e) => {
        const val = e.target.value;
        setAssignedTo(val);
        onAssign?.(chore.id, val || null);
    };

    const dueText = chore.one_time && chore.deadline
        ? `due ${friendlyDate(parseDate(chore.deadline))}`
        : chore.status === "done"
            ? (chore.daysUntilDue > 30
                ? `in ${Math.round(chore.daysUntilDue / 30)} months`
                : `in ${chore.daysUntilDue} ${chore.daysUntilDue === 1 ? "day" : "days"}`)
            : chore.status === "overdue"
                ? `${chore.daysOverdue}d overdue`
                : "due now!";

    const isOverdue = chore.status === "overdue" || chore.status === "due";

    return (
        <div style={{
            padding: "10px 14px",
            marginBottom: removing ? "0px" : "8px", fontFamily: FONT,
            background: checked ? "#F4FBF7" : isOverdue ? "#FEF2F2" : "white",
            border: `2px solid ${checked ? "#1D9E75" : isOverdue ? "#EF4444" : "#2C2C2A"}`,
            borderRadius: "12px",
            boxShadow: checked ? boxShadow("#1D9E75", 2, 2) : isOverdue ? boxShadow("#EF4444", 3, 3) : boxShadow("#e8e8e8", 2, 2),
            maxHeight: removing ? "0px" : "120px",
            opacity: removing ? 0 : 1,
            paddingTop: removing ? "0px" : "10px", paddingBottom: removing ? "0px" : "10px",
            overflow: "hidden",
            transition: "all 0.4s ease",
        }}>
            {/* Row 1: dot + name + checkbox */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: freqInfo?.color, flexShrink: 0, border: "1.5px solid #2C2C2A" }} />
                <div style={{
                    flex: 1, minWidth: 0,
                    fontSize: "14px", fontWeight: 700,
                    textDecoration: checked ? "line-through" : "none",
                    color: checked ? "#b4b2a9" : "#2C2C2A",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                    {chore.name}
                </div>
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
            {/* Row 2: due text + assign select + freq badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", paddingLeft: "18px" }}>
                <span style={{ fontSize: "11px", color: "#888780", fontWeight: 600, flex: 1 }}>{dueText}</span>
                <select
                    value={assignedTo}
                    onChange={handleAssign}
                    style={{ fontSize: "11px", padding: "3px 5px", border: "2px solid #2C2C2A", borderRadius: "6px", fontFamily: FONT, fontWeight: 600, flexShrink: 0 }}
                    title="Assign to"
                >
                    <option value="">—</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name.split(" ")[0]}</option>)}
                </select>
                <span style={{
                    fontSize: "11px", padding: "3px 8px",
                    background: chore.one_time ? "#EDE9FE" : (freqInfo?.bg || "#f5f4f1"),
                    color: chore.one_time ? "#5B21B6" : (freqInfo?.text || "#888780"),
                    borderRadius: "6px", fontWeight: 700, flexShrink: 0,
                    border: "1px solid " + (chore.one_time ? "#7C3AED" : (freqInfo?.color || "#ccc")),
                }}>
                    {chore.one_time ? "one-time" : freqInfo?.label}
                </span>
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
    const [editReward, setEditReward] = useState(String(chore.reward ?? 5));
    const [editOneTime, setEditOneTime] = useState(chore.one_time || false);
    const [editDeadline, setEditDeadline] = useState(chore.deadline || "");

    const handleSave = () => {
        const rewardNum = Math.max(0, parseInt(editReward, 10) || 0);
        onUpdate(chore.id, {
            name: editName.trim() || chore.name,
            description: editDesc.trim() || null,
            freq: editOneTime ? "weekly" : editFreq,
            owner_id: editOwner || null,
            reward: rewardNum,
            one_time: editOneTime,
            deadline: editOneTime && editDeadline ? editDeadline : null,
        });
        onAssign(chore.id, editOwner || null);
        setEditing(false);
    };

    const handleCancel = () => {
        setEditName(chore.name);
        setEditDesc(chore.description || "");
        setEditFreq(chore.freq);
        setEditOwner(chore.owner_id || "");
        setEditReward(String(chore.reward ?? 5));
        setEditOneTime(chore.one_time || false);
        setEditDeadline(chore.deadline || "");
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
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginBottom: "6px" }}>
                    {editOneTime ? (
                        <input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)}
                            placeholder="Deadline (optional)"
                            style={{ padding: "6px 8px", border: "2px solid #2C2C2A", borderRadius: "6px", fontSize: "12px", fontFamily: FONT, flex: 1 }} />
                    ) : (
                        <select value={editFreq} onChange={(e) => setEditFreq(e.target.value)}
                            style={{ padding: "6px 8px", border: "2px solid #2C2C2A", borderRadius: "6px", fontSize: "12px", fontFamily: FONT, flex: 1, minWidth: "100px" }}>
                            {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    )}
                    <select value={editOwner} onChange={(e) => setEditOwner(e.target.value)}
                        style={{ padding: "6px 8px", border: "2px solid #2C2C2A", borderRadius: "6px", fontSize: "12px", fontFamily: FONT, flex: 1, minWidth: "100px" }}>
                        <option value="">Unassigned</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div onClick={() => setEditOneTime((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: editOneTime ? "#5B21B6" : "#888780", userSelect: "none" }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "4px", border: "2px solid #2C2C2A", flexShrink: 0, background: editOneTime ? "#7C3AED" : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {editOneTime && <Check size={11} color="white" strokeWidth={3} />}
                    </div>
                    One-time task
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#78350F", background: "#FEF3C7", padding: "6px 10px", border: "2px solid #2C2C2A", borderRadius: "6px", flex: 1, minWidth: "140px" }}>
                        <Coins size={12} strokeWidth={2.5} /> Reward
                        <input
                            type="number" min="0" value={editReward}
                            onChange={(e) => setEditReward(e.target.value)}
                            style={{ width: "56px", padding: "3px 6px", border: "1.5px solid #2C2C2A", borderRadius: "4px", fontSize: "12px", fontFamily: FONT, fontWeight: 700, marginLeft: "auto" }}
                        />
                    </label>
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
                {chore.one_time && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "3px" }}>
                        <span style={{ fontSize: "10px", padding: "1px 6px", background: "#EDE9FE", color: "#5B21B6", borderRadius: "4px", fontWeight: 700, border: "1px solid #7C3AED" }}>one-time</span>
                        {chore.deadline && <span style={{ fontSize: "10px", color: "#888780" }}>due {friendlyDate(parseDate(chore.deadline))}</span>}
                    </div>
                )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#78350F", background: "#FEF3C7", padding: "3px 7px", borderRadius: "6px", border: "1.5px solid #F59E0B", flexShrink: 0 }}>
                <Coins size={11} strokeWidth={2.5} /> {chore.reward ?? 5}
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
