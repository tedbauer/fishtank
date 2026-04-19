"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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

const moodTier = (h) => {
    if (h >= 85) return "ecstatic";
    if (h >= 70) return "happy";
    if (h >= 55) return "content";
    if (h >= 40) return "meh";
    if (h >= 20) return "sad";
    return "miserable";
};

const moodLabel = (tier) =>
    ({ ecstatic: "Is Thriving! ✨", happy: "Is Happy ~", content: "Is Vibing", meh: "Is Feeling Meh", sad: "Is Looking Blue :(", miserable: "Needs Love!!" })[tier];

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

// =========== RETRO PIXEL FISH ===========
function PixelFish({ mood, size = 80 }) {
    const palette = {
        ecstatic: { body: "#FFD93D", fin: "#FF6B35", belly: "#FFF3B0", eye: "#2C2C2A", highlight: "#FFFBE6" },
        happy: { body: "#FF6B9D", fin: "#FF2D87", belly: "#FFD6E7", eye: "#2C2C2A", highlight: "#FFF0F5" },
        content: { body: "#C084FC", fin: "#8B5CF6", belly: "#E9D5FF", eye: "#2C2C2A", highlight: "#F5F0FF" },
        meh: { body: "#B4B2A9", fin: "#888780", belly: "#D3D1C7", eye: "#2C2C2A", highlight: "#E8E8E8" },
        sad: { body: "#67E8F9", fin: "#06B6D4", belly: "#A5F3FC", eye: "#2C2C2A", highlight: "#E0FAFE" },
        miserable: { body: "#93C5FD", fin: "#3B82F6", belly: "#BFDBFE", eye: "#2C2C2A", highlight: "#DBEAFE" },
    }[mood] || { body: "#C084FC", fin: "#8B5CF6", belly: "#E9D5FF", eye: "#2C2C2A", highlight: "#F5F0FF" };

    const p = 2; // pixel unit
    return (
        <svg width={size} height={size * 0.7} viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible", imageRendering: "pixelated" }}>
            {/* Tail */}
            <rect x={48} y={10} width={p * 3} height={p} fill={palette.fin} />
            <rect x={50} y={8} width={p * 3} height={p} fill={palette.fin} />
            <rect x={52} y={6} width={p * 2} height={p} fill={palette.fin} />
            <rect x={48} y={28} width={p * 3} height={p} fill={palette.fin} />
            <rect x={50} y={30} width={p * 3} height={p} fill={palette.fin} />
            <rect x={52} y={32} width={p * 2} height={p} fill={palette.fin} />
            <rect x={48} y={12} width={p * 2} height={p * 8} fill={palette.fin} />
            {/* Body */}
            <rect x={10} y={10} width={p * 19} height={p * 10} fill={palette.body} rx={2} />
            {/* Belly stripe */}
            <rect x={10} y={20} width={p * 19} height={p * 3} fill={palette.belly} rx={1} />
            {/* Head bump */}
            <rect x={4} y={12} width={p * 4} height={p * 8} fill={palette.body} rx={1} />
            {/* Top fin */}
            <rect x={18} y={4} width={p * 2} height={p * 3} fill={palette.fin} />
            <rect x={22} y={2} width={p * 2} height={p * 4} fill={palette.fin} />
            <rect x={26} y={4} width={p * 2} height={p * 3} fill={palette.fin} />
            {/* Side fin */}
            <rect x={30} y={28} width={p * 3} height={p * 2} fill={palette.fin} opacity={0.8} />
            <rect x={32} y={30} width={p * 2} height={p * 2} fill={palette.fin} opacity={0.6} />
            {/* Eye */}
            <rect x={8} y={14} width={p * 2} height={p * 2} fill="white" />
            <rect x={8} y={14} width={p} height={p} fill={palette.eye} />
            {/* Highlight pixel */}
            <rect x={10} y={14} width={p} height={p} fill={palette.highlight} opacity={0.8} />
            {/* Mouth */}
            {mood === "ecstatic" || mood === "happy" ? (
                <rect x={4} y={22} width={p * 2} height={p} fill={palette.eye} opacity={0.6} />
            ) : mood === "sad" || mood === "miserable" ? (
                <rect x={6} y={24} width={p * 2} height={p} fill={palette.eye} opacity={0.5} />
            ) : (
                <rect x={4} y={22} width={p} height={p} fill={palette.eye} opacity={0.4} />
            )}
            {/* Blush for happy moods */}
            {(mood === "ecstatic" || mood === "happy") && (
                <rect x={6} y={20} width={p * 2} height={p} fill="#FF6B9D" opacity={0.4} />
            )}
            {/* Tear for sad moods */}
            {(mood === "sad" || mood === "miserable") && (
                <rect x={10} y={20} width={p} height={p * 2} fill="#67E8F9" opacity={0.7} />
            )}
        </svg>
    );
}

// =========== RETRO AQUARIUM ===========
function Aquarium({ mood, happiness, rewardAnim }) {
    const waterColors = {
        ecstatic: ["#1A5276", "#2980B9"], happy: ["#6C2D5A", "#C084FC"], content: ["#1B4332", "#2D6A4F"],
        meh: ["#3D3D3D", "#5F5F5F"], sad: ["#1A3C4F", "#2471A3"], miserable: ["#2C3E50", "#5D6D7E"],
    }[mood] || ["#1A5276", "#2980B9"];

    const swimDuration = { ecstatic: "5s", happy: "7s", content: "10s", meh: "14s", sad: "20s", miserable: "26s" }[mood] || "10s";
    const uid = `retro-${mood}`;

    return (
        <div style={{
            position: "relative", width: "100%", height: "200px",
            overflow: "hidden", fontFamily: FONT,
            border: "4px solid #2C2C2A",
            borderRadius: "4px",
            boxShadow: `${boxShadow("#2C2C2A", 4, 4)}, inset 0 0 30px rgba(0,200,255,0.08)`,
            background: `linear-gradient(180deg, ${waterColors[0]} 0%, ${waterColors[1]} 100%)`,
            transition: "background 1s ease",
            imageRendering: "auto",
        }}>
            {/* CRT Bezel */}
            <div style={{
                position: "absolute", inset: 0,
                border: "3px solid #1a1a1a",
                borderRadius: "2px",
                boxShadow: "inset 0 0 0 1px #444",
                pointerEvents: "none", zIndex: 10,
            }} />

            <style>{`
        @keyframes ${uid}-swim {
          0% { transform: translateX(0) translateY(0) scaleX(1); }
          42% { transform: translateX(calc(100% - 90px)) translateY(6px) scaleX(1); }
          50% { transform: translateX(calc(100% - 90px)) translateY(6px) scaleX(-1); }
          92% { transform: translateX(0) translateY(-4px) scaleX(-1); }
          100% { transform: translateX(0) translateY(0) scaleX(1); }
        }
        @keyframes ${uid}-bub1 {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 0.8; } 90% { opacity: 0.6; }
          100% { transform: translateY(-180px); opacity: 0; }
        }
        @keyframes ${uid}-bub2 {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          100% { transform: translateY(-180px) translateX(-6px); opacity: 0; }
        }
        @keyframes reward-drop {
          0% { transform: translateY(-30px); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(120px); opacity: 0; }
        }
        @keyframes reward-flash {
          0% { opacity: 0; transform: scale(0.5); }
          30% { opacity: 1; transform: scale(1.2); }
          70% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.8); }
        }
        @keyframes scanline-move {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .${uid}-fish {
          position: absolute; top: 40px; left: 10px;
          animation: ${uid}-swim ${swimDuration} ease-in-out infinite;
          transform-origin: center;
        }
        .${uid}-bubble {
          position: absolute; bottom: 30px;
          width: 6px; height: 6px; border-radius: 50%;
          background: rgba(255,255,255,0.4);
          border: 1px solid rgba(255,255,255,0.6);
        }
      `}</style>

            {/* Scanlines overlay */}
            <div style={{
                position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none",
                background: "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
                mixBlendMode: "multiply",
            }} />

            {/* Moving scanline bar */}
            <div style={{
                position: "absolute", left: 0, right: 0, height: "40px", zIndex: 9,
                background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
                animation: "scanline-move 4s linear infinite",
                pointerEvents: "none",
            }} />

            {/* Pixel sand */}
            <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: "24px",
                background: "#C4903D",
                borderTop: "3px solid #A67424",
                imageRendering: "pixelated",
            }} />
            {/* Sand texture dots */}
            {[15, 40, 70, 110, 150, 190, 230, 270, 310].map((x, i) => (
                <div key={`sand-${i}`} style={{
                    position: "absolute", bottom: 6 + (i % 3) * 4, left: `${x % 100}%`,
                    width: "3px", height: "3px", background: "#B8860B", opacity: 0.4,
                }} />
            ))}

            {/* Pixel coral - left */}
            <svg style={{ position: "absolute", bottom: 20, left: 16, imageRendering: "pixelated" }} width="24" height="36" viewBox="0 0 12 18">
                <rect x={4} y={0} width={2} height={2} fill="#FF6B9D" />
                <rect x={2} y={2} width={2} height={2} fill="#FF6B9D" />
                <rect x={6} y={2} width={2} height={2} fill="#FF6B9D" />
                <rect x={4} y={4} width={2} height={2} fill="#E11D48" />
                <rect x={4} y={6} width={2} height={4} fill="#E11D48" />
                <rect x={2} y={8} width={2} height={4} fill="#FF6B9D" />
                <rect x={6} y={6} width={2} height={6} fill="#FF6B9D" />
                <rect x={4} y={10} width={2} height={8} fill="#BE123C" />
                <rect x={0} y={4} width={2} height={2} fill="#FF6B9D" />
                <rect x={8} y={4} width={2} height={2} fill="#E11D48" />
            </svg>

            {/* Pixel coral - right */}
            <svg style={{ position: "absolute", bottom: 20, right: 24, imageRendering: "pixelated" }} width="20" height="30" viewBox="0 0 10 15">
                <rect x={4} y={0} width={2} height={2} fill="#22C55E" />
                <rect x={2} y={2} width={2} height={2} fill="#22C55E" />
                <rect x={6} y={2} width={2} height={2} fill="#16A34A" />
                <rect x={4} y={4} width={2} height={11} fill="#15803D" />
                <rect x={2} y={6} width={2} height={4} fill="#22C55E" opacity={0.7} />
                <rect x={6} y={5} width={2} height={5} fill="#16A34A" opacity={0.7} />
            </svg>

            {/* Pixel rocks */}
            <div style={{ position: "absolute", bottom: 20, right: 60, width: "18px", height: "10px", background: "#57534E", borderRadius: "2px", border: "2px solid #44403C", imageRendering: "pixelated" }} />
            <div style={{ position: "absolute", bottom: 20, right: 80, width: "12px", height: "8px", background: "#78716C", borderRadius: "2px", border: "2px solid #57534E", imageRendering: "pixelated" }} />

            {/* Pixel bubbles */}
            <div className={`${uid}-bubble`} style={{ left: "20%", animation: `${uid}-bub1 4.5s ease-in infinite` }} />
            <div className={`${uid}-bubble`} style={{ left: "24%", width: "4px", height: "4px", animation: `${uid}-bub2 5.5s ease-in infinite`, animationDelay: "1.5s" }} />
            <div className={`${uid}-bubble`} style={{ right: "38%", animation: `${uid}-bub1 6s ease-in infinite`, animationDelay: "2s" }} />
            <div className={`${uid}-bubble`} style={{ right: "34%", width: "4px", height: "4px", animation: `${uid}-bub2 5s ease-in infinite`, animationDelay: "3.5s" }} />

            {/* Fish */}
            <div className={`${uid}-fish`}>
                <PixelFish mood={mood} size={80} />
            </div>

            {/* Reward Animation Overlay */}
            {rewardAnim && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                }}>
                    {/* Falling items for food-type rewards */}
                    {["daily", "every2"].includes(rewardAnim) && (
                        <>
                            {[15, 30, 50, 65, 80].map((x, i) => (
                                <div key={i} style={{
                                    position: "absolute", left: `${x}%`, top: 0,
                                    fontSize: rewardAnim === "daily" ? "16px" : "12px",
                                    animation: `reward-drop 2s ease-in forwards`,
                                    animationDelay: `${i * 0.15}s`,
                                }}>
                                    {REWARD_MAP[rewardAnim].emoji}
                                </div>
                            ))}
                        </>
                    )}
                    {/* Center flash for other rewards */}
                    {!["daily", "every2"].includes(rewardAnim) && (
                        <div style={{
                            fontSize: "40px",
                            animation: "reward-flash 2s ease-out forwards",
                            textShadow: `0 0 20px ${REWARD_MAP[rewardAnim]?.color || "#fff"}`,
                        }}>
                            {REWARD_MAP[rewardAnim]?.emoji || "✨"}
                        </div>
                    )}
                    {/* Label */}
                    <div style={{
                        position: "absolute", bottom: "36px", left: 0, right: 0,
                        textAlign: "center", fontSize: "13px", fontWeight: 700,
                        color: "white", textShadow: "1px 1px 0 #000, 2px 2px 0 rgba(0,0,0,0.3)",
                        animation: "reward-flash 2s ease-out forwards",
                        animationDelay: "0.3s", opacity: 0,
                    }}>
                        {REWARD_MAP[rewardAnim]?.label || "Nice!"}
                    </div>
                </div>
            )}

            {/* Status bar */}
            <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 12px",
                background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 100%)", color: "white",
                zIndex: 5,
            }}>
                <div style={{
                    fontSize: "12px", fontWeight: 700, marginBottom: "3px",
                    textShadow: "1px 1px 0px #000",
                    fontFamily: "'Courier New', monospace",
                    letterSpacing: "0.5px",
                }}>
                    FISH {moodLabel(mood).toUpperCase()}
                </div>
                <div style={{ height: "6px", background: "rgba(0,0,0,0.4)", borderRadius: "1px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <div style={{
                        width: `${happiness}%`, height: "100%",
                        background: happiness > 60 ? "#22C55E" : happiness > 30 ? "#F59E0B" : "#EF4444",
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
                display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "1.25rem",
                background: "#f5f4f1", padding: "5px", borderRadius: "12px",
                border: "2px solid #2C2C2A", boxShadow: boxShadow("#2C2C2A", 3, 3),
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
                                flex: 1, padding: "8px 4px", minWidth: "60px", minHeight: "auto",
                                border: active ? "2px solid #2C2C2A" : "2px solid transparent",
                                background: active ? "white" : "transparent",
                                borderRadius: "8px", display: "flex", alignItems: "center",
                                justifyContent: "center", gap: "4px", fontSize: "11px", fontWeight: 700,
                                cursor: "pointer", fontFamily: FONT,
                                color: active ? "#2C2C2A" : "#888780",
                                boxShadow: active ? boxShadow(t.accent, 2, 2) : "none",
                            }}
                        >
                            <Icon size={12} /> {t.label}
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "1.25rem" }}>
                        <StatCard label="Left Today" value={todayList.filter((c) => !c.completedToday).length} />
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
                </div>
            )}

            {/* THIS MONTH VIEW */}
            {view === "month" && (
                <div>
                    <div style={{ marginBottom: "1rem", fontSize: "14px", color: "#888780", fontWeight: 600 }}>Due This Month</div>
                    {monthList.length === 0 && <EmptyState text="All clear for the month! ✨" />}
                    {monthList.map((c) => <AnimatedCheckRow key={c.id} chore={c} users={users} onComplete={completeChore} variant="month" />)}
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
                                    {codeCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                                </button>
                            </div>
                        )}
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
                </div>
            )}
        </div>
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
