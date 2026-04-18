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
} from "lucide-react";

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
    ({ ecstatic: "is thriving! ✨", happy: "is happy ~", content: "is vibin", meh: "is feeling meh", sad: "is looking blue :(", miserable: "needs love!!" })[tier];

// =========== FUNKY FISH SVG ===========
function Fish({ mood, size = 80 }) {
    const bodyColor = {
        ecstatic: "#FFD93D", happy: "#FF6B9D", content: "#C084FC",
        meh: "#D3D1C7", sad: "#67E8F9", miserable: "#93C5FD",
    }[mood];

    const finColor = {
        ecstatic: "#FF6B35", happy: "#FF2D87", content: "#8B5CF6",
        meh: "#888780", sad: "#06B6D4", miserable: "#3B82F6",
    }[mood];

    const stripeColor = {
        ecstatic: "#FF6B35", happy: "#FFB7D5", content: "#E9D5FF",
        meh: "#B4B2A9", sad: "#A5F3FC", miserable: "#BFDBFE",
    }[mood];

    const mouth = (() => {
        if (mood === "ecstatic") return <path d="M 16 50 Q 22 58 28 50" stroke="#2C2C2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
        if (mood === "happy") return <path d="M 18 50 Q 22 55 26 50" stroke="#2C2C2A" strokeWidth="2" fill="none" strokeLinecap="round" />;
        if (mood === "content") return <circle cx="22" cy="50" r="2" fill="#2C2C2A" />;
        if (mood === "meh") return <line x1="18" y1="50" x2="26" y2="50" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round" />;
        if (mood === "sad") return <path d="M 18 52 Q 22 47 26 52" stroke="#2C2C2A" strokeWidth="2" fill="none" strokeLinecap="round" />;
        return <path d="M 16 54 Q 22 46 28 54" stroke="#2C2C2A" strokeWidth="2" fill="none" strokeLinecap="round" />;
    })();

    // Big sparkly eyes
    const eyes = (() => {
        if (mood === "ecstatic") return (
            <g>
                <path d="M 30 38 Q 34 32 38 38" stroke="#2C2C2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M 42 38 Q 46 32 50 38" stroke="#2C2C2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </g>
        );
        if (mood === "miserable") return (
            <g>
                <circle cx="34" cy="38" r="4" fill="white" /><circle cx="34" cy="39" r="2.5" fill="#2C2C2A" />
                <circle cx="46" cy="38" r="4" fill="white" /><circle cx="46" cy="39" r="2.5" fill="#2C2C2A" />
                <line x1="30" y1="32" x2="36" y2="34" stroke="#2C2C2A" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="50" y1="32" x2="44" y2="34" stroke="#2C2C2A" strokeWidth="1.5" strokeLinecap="round" />
            </g>
        );
        return (
            <g>
                <circle cx="34" cy="38" r="5" fill="white" /><circle cx="34" cy="38" r="3" fill="#2C2C2A" /><circle cx="35.5" cy="36.5" r="1.2" fill="white" />
                <circle cx="46" cy="38" r="5" fill="white" /><circle cx="46" cy="38" r="3" fill="#2C2C2A" /><circle cx="47.5" cy="36.5" r="1.2" fill="white" />
            </g>
        );
    })();

    const tear = (mood === "sad" || mood === "miserable") ? (
        <g>
            <ellipse cx="32" cy="46" rx="1.5" ry="2.5" fill="#67E8F9" opacity="0.9" />
            <ellipse cx="48" cy="46" rx="1.5" ry="2.5" fill="#67E8F9" opacity="0.9" />
        </g>
    ) : null;

    const blush = (mood === "ecstatic" || mood === "happy") ? (
        <g>
            <ellipse cx="26" cy="46" rx="4" ry="2.5" fill="#FF6B9D" opacity="0.35" />
            <ellipse cx="54" cy="46" rx="4" ry="2.5" fill="#FF6B9D" opacity="0.35" />
        </g>
    ) : null;

    // Sparkles for happy moods
    const sparkles = (mood === "ecstatic" || mood === "happy") ? (
        <g>
            <text x="62" y="22" fontSize="8" fill="#FFD93D">✦</text>
            <text x="12" y="18" fontSize="6" fill="#FF6B9D">✦</text>
            <text x="70" y="45" fontSize="7" fill="#C084FC">✦</text>
        </g>
    ) : null;

    return (
        <svg width={size} height={size * 0.8} viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible" }}>
            {sparkles}
            {/* Tail — rounder, more playful */}
            <ellipse cx="82" cy="25" rx="10" ry="7" fill={finColor} transform="rotate(-20, 82, 25)" />
            <ellipse cx="82" cy="50" rx="10" ry="7" fill={finColor} transform="rotate(20, 82, 50)" />
            {/* Body — rounder, chubbier */}
            <ellipse cx="45" cy="40" rx="32" ry="22" fill={bodyColor} />
            {/* Stripes */}
            <ellipse cx="50" cy="40" rx="8" ry="18" fill={stripeColor} opacity="0.4" />
            <ellipse cx="60" cy="40" rx="5" ry="15" fill={stripeColor} opacity="0.3" />
            {/* Top fin — spiky and fun */}
            <path d="M 30 19 Q 35 8 40 14 Q 45 6 50 14 Q 55 10 55 19" fill={finColor} />
            {/* Little side fin */}
            <ellipse cx="58" cy="52" rx="8" ry="4" fill={finColor} opacity="0.8" transform="rotate(-15, 58, 52)" />
            {blush}
            {eyes}
            {tear}
            {mouth}
        </svg>
    );
}

// =========== AQUARIUM ===========
function Aquarium({ mood, happiness }) {
    const waterTop = { ecstatic: "#E0F2FE", happy: "#FCE7F3", content: "#F3E8FF", meh: "#F1EFE8", sad: "#CFFAFE", miserable: "#DBEAFE" }[mood] || "#E0F2FE";
    const waterBottom = { ecstatic: "#0EA5E9", happy: "#EC4899", content: "#8B5CF6", meh: "#888780", sad: "#06B6D4", miserable: "#3B82F6" }[mood] || "#0EA5E9";
    const swimDuration = { ecstatic: "6s", happy: "8s", content: "12s", meh: "16s", sad: "22s", miserable: "28s" }[mood] || "12s";

    const animName = `fish-swim-${mood}`;
    const bubble1Name = `bubble-${mood}-1`;
    const bubble2Name = `bubble-${mood}-2`;

    return (
        <div style={{
            position: "relative", width: "100%", height: "180px",
            borderRadius: "16px", overflow: "hidden", border: "3px solid #2C2C2A",
            boxShadow: boxShadow("#2C2C2A", 4, 4),
            background: `linear-gradient(180deg, ${waterTop} 0%, ${waterBottom} 100%)`,
            transition: "background 1s ease", fontFamily: FONT,
        }}>
            <style>{`
        @keyframes ${animName} {
          0% { transform: translateX(0) translateY(0) scaleX(1); }
          45% { transform: translateX(calc(100% - 100px)) translateY(8px) scaleX(1); }
          50% { transform: translateX(calc(100% - 100px)) translateY(8px) scaleX(-1); }
          95% { transform: translateX(0) translateY(-6px) scaleX(-1); }
          100% { transform: translateX(0) translateY(0) scaleX(1); }
        }
        @keyframes ${bubble1Name} {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          10% { opacity: 0.7; } 90% { opacity: 0.7; }
          100% { transform: translateY(-160px) scale(1.1); opacity: 0; }
        }
        @keyframes ${bubble2Name} {
          0% { transform: translateY(0) translateX(0) scale(0.6); opacity: 0; }
          10% { opacity: 0.6; }
          100% { transform: translateY(-170px) translateX(-4px) scale(1); opacity: 0; }
        }
        .fish-container-${mood} {
          position: absolute; top: 30px; left: 10px;
          animation: ${animName} ${swimDuration} ease-in-out infinite;
          transform-origin: center;
        }
        .bubble-${mood} {
          position: absolute; border-radius: 50%;
          background: rgba(255,255,255,0.5); border: 2px solid rgba(255,255,255,0.7);
          bottom: 10px;
        }
      `}</style>

            {/* Sand */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "28px", background: "#FAC775", borderTop: "2px solid #E5A83A" }} />

            {/* Seaweed */}
            <svg style={{ position: "absolute", bottom: 14, left: 20 }} width="30" height="70" viewBox="0 0 30 70">
                <path d="M 15 70 Q 8 50 15 30 Q 22 15 15 0" stroke="#22C55E" strokeWidth="5" fill="none" strokeLinecap="round" />
                <path d="M 8 70 Q 2 55 8 40 Q 14 25 8 15" stroke="#4ADE80" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
            </svg>
            <svg style={{ position: "absolute", bottom: 14, right: 30 }} width="30" height="55" viewBox="0 0 30 55">
                <path d="M 15 55 Q 22 40 15 25 Q 8 12 15 2" stroke="#22C55E" strokeWidth="5" fill="none" strokeLinecap="round" />
            </svg>

            {/* Rocks */}
            <div style={{ position: "absolute", bottom: 22, right: 65, width: "35px", height: "16px", background: "#78716C", borderRadius: "50%", border: "2px solid #57534E" }} />
            <div style={{ position: "absolute", bottom: 22, right: 90, width: "22px", height: "12px", background: "#A8A29E", borderRadius: "50%", border: "2px solid #78716C" }} />

            {/* Bubbles */}
            <div className={`bubble-${mood}`} style={{ left: "18%", width: "10px", height: "10px", animation: `${bubble1Name} 5s ease-in infinite` }} />
            <div className={`bubble-${mood}`} style={{ left: "22%", width: "7px", height: "7px", animation: `${bubble2Name} 6s ease-in infinite`, animationDelay: "1.5s" }} />
            <div className={`bubble-${mood}`} style={{ right: "35%", width: "9px", height: "9px", animation: `${bubble1Name} 6.5s ease-in infinite`, animationDelay: "2s" }} />
            <div className={`bubble-${mood}`} style={{ right: "32%", width: "6px", height: "6px", animation: `${bubble2Name} 5.5s ease-in infinite`, animationDelay: "4s" }} />

            {/* Fish */}
            <div className={`fish-container-${mood}`}>
                <Fish mood={mood} size={90} />
            </div>

            {/* Status */}
            <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 14px",
                background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)", color: "white",
            }}>
                <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px", textShadow: "1px 1px 0px rgba(0,0,0,0.4)" }}>
                    ur fish {moodLabel(mood)}
                </div>
                <div style={{ height: "8px", background: "rgba(255,255,255,0.3)", borderRadius: "99px", overflow: "hidden", border: "1.5px solid rgba(255,255,255,0.5)" }}>
                    <div style={{ width: `${happiness}%`, height: "100%", background: "white", borderRadius: "99px", transition: "width 0.8s ease" }} />
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
        const { data, error } = await supabase
            .from("completions")
            .insert({ chore_id: choreId, user_id: user.id, completed_date: todayStr })
            .select().single();
        if (!error && data) setCompletions((prev) => [...prev, data]);
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
            .insert({ name: newChoreName.trim(), freq: newChoreFreq, household_id: profile.household_id })
            .select().single();
        if (!error && data) { setChores((prev) => [...prev, data]); setNewChoreName(""); }
    };

    const deleteChore = async (choreId) => {
        await supabase.from("completions").delete().eq("chore_id", choreId);
        await supabase.from("chores").delete().eq("id", choreId);
        setChores((prev) => prev.filter((c) => c.id !== choreId));
        setCompletions((prev) => prev.filter((c) => c.chore_id !== choreId));
    };

    if (loading) {
        return <div style={{ padding: "3rem", textAlign: "center", color: "#888780", fontFamily: FONT, fontSize: "18px" }}>loading ur chores... 🐟</div>;
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
                        <div style={{ fontSize: "16px", fontWeight: 700 }}>hi {currentUser.name}!</div>
                        <div style={{ fontSize: "12px", color: "#888780" }}>
                            {today().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", background: "white", border: "2px solid #2C2C2A", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", color: "#2C2C2A", fontFamily: FONT, fontWeight: 600, boxShadow: boxShadow("#2C2C2A", 2, 2) }}
                >
                    <LogOut size={12} /> bye!
                </button>
            </div>

            {/* TAB NAV */}
            <div style={{
                display: "flex", gap: "6px", marginBottom: "1.25rem",
                background: "#f5f4f1", padding: "5px", borderRadius: "12px",
                border: "2px solid #2C2C2A", boxShadow: boxShadow("#2C2C2A", 3, 3),
            }}>
                {[
                    { id: "today", label: "today", icon: Sparkles, accent: "#D4537E" },
                    { id: "week", label: "this week", icon: Clock, accent: "#7F77DD" },
                    { id: "month", label: "this month", icon: Calendar, accent: "#1D9E75" },
                    { id: "longterm", label: "longterm", icon: RotateCcw, accent: "#BA7517" },
                    { id: "manage", label: "manage", icon: Home, accent: "#888780" },
                ].map((t) => {
                    const Icon = t.icon;
                    const active = view === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setView(t.id)}
                            style={{
                                flex: 1, padding: "8px 4px", minHeight: "auto",
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
                        <Aquarium happiness={householdHappiness} mood={householdMood} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "1.25rem" }}>
                        <StatCard label="left today" value={todayList.filter((c) => !c.completedToday).length} />
                        <StatCard label={`${currentUser.name}'s week`} value={myCompletionsThisWeek} color={currentUser.color} />
                        <StatCard label={`${partner?.name || "partner"}'s week`} value={partnerCompletionsThisWeek} color={partner?.color} />
                    </div>

                    {todayList.length === 0 && (
                        <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "#E1F5EE", borderRadius: "14px", border: "2px solid #2C2C2A", boxShadow: boxShadow("#1D9E75", 3, 3) }}>
                            <div style={{ fontSize: "36px", marginBottom: "8px" }}>✨</div>
                            <div style={{ fontWeight: 700, color: "#085041", marginBottom: "4px", fontSize: "16px" }}>all caught up!</div>
                            <div style={{ fontSize: "13px", color: "#085041" }}>nothing due today. go enjoy ur home~</div>
                        </div>
                    )}

                    {todayList.length > 0 && todayList.every((c) => c.completedToday) && (
                        <div style={{ textAlign: "center", padding: "1.5rem 1rem", marginBottom: "1rem", background: "#E1F5EE", borderRadius: "14px", border: "2px solid #2C2C2A", boxShadow: boxShadow("#1D9E75", 3, 3) }}>
                            <div style={{ fontSize: "28px", marginBottom: "4px" }}>🎉</div>
                            <div style={{ fontWeight: 700, color: "#085041", fontSize: "15px" }}>all done for today!!</div>
                        </div>
                    )}

                    {myChores.length > 0 && (
                        <Section title={`ur turn, ${currentUser.name}`} accentColor={currentUser.color}>
                            {myChores.map((c) => <ChoreRow key={c.id} chore={c} users={users} currentUser={currentUser} onComplete={completeChore} onUndo={undoComplete} onAssign={assignOwner} />)}
                        </Section>
                    )}
                    {unassigned.length > 0 && (
                        <Section title="up for grabs" accentColor="#888780">
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
                    <div style={{ marginBottom: "1rem", fontSize: "14px", color: "#888780", fontWeight: 600 }}>coming up this week ~</div>
                    {weekList.length === 0 && <EmptyState text="nothing for this week! 🎈" />}
                    {weekList.map((c) => <AnimatedCheckRow key={c.id} chore={c} users={users} onComplete={completeChore} variant="week" />)}
                </div>
            )}

            {/* THIS MONTH VIEW */}
            {view === "month" && (
                <div>
                    <div style={{ marginBottom: "1rem", fontSize: "14px", color: "#888780", fontWeight: 600 }}>due this month</div>
                    {monthList.length === 0 && <EmptyState text="all clear for the month! ✨" />}
                    {monthList.map((c) => <AnimatedCheckRow key={c.id} chore={c} users={users} onComplete={completeChore} variant="month" />)}
                </div>
            )}

            {/* LONGTERM VIEW */}
            {view === "longterm" && (
                <div>
                    <div style={{ marginBottom: "1rem", fontSize: "14px", color: "#888780", fontWeight: 600 }}>the big stuff — longer cycles 🔮</div>
                    {longtermList.length === 0 && <EmptyState text="nothing long-term pending~" />}
                    {longtermList.map((c) => <AnimatedCheckRow key={c.id} chore={c} users={users} onComplete={completeChore} variant="longterm" />)}
                </div>
            )}

            {/* MANAGE VIEW */}
            {view === "manage" && (
                <div>
                    <Section title="add a chore" accentColor="#7F77DD">
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
                                <Plus size={14} /> add!
                            </button>
                        </div>
                    </Section>

                    <Section title="household" accentColor="#D4537E">
                        <div style={{
                            padding: "12px 16px", background: "#FBEAF0", borderRadius: "12px",
                            fontSize: "14px", color: "#72243E", marginBottom: "8px",
                            border: "2px solid #2C2C2A", boxShadow: boxShadow("#D4537E", 2, 2),
                        }}>
                            <strong>members:</strong> {users.map((u) => u.name).join(", ")}
                        </div>
                    </Section>

                    <Section title="all chores" accentColor="#888780">
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
                                        <div key={c.id} style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            padding: "10px 12px", marginBottom: "6px", background: "white",
                                            border: "2px solid #2C2C2A", borderRadius: "10px", boxShadow: boxShadow("#e8e8e8", 2, 2),
                                        }}>
                                            <div style={{ fontSize: "14px", fontWeight: 600 }}>{c.name}</div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <select
                                                    value={c.owner_id || ""} onChange={(e) => assignOwner(c.id, e.target.value || null)}
                                                    style={{ fontSize: "12px", padding: "4px 6px", border: "2px solid #2C2C2A", borderRadius: "6px", fontFamily: FONT }}
                                                >
                                                    <option value="">unassigned</option>
                                                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                </select>
                                                <button
                                                    onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteChore(c.id); }}
                                                    style={{ padding: "4px 8px", border: "2px solid #2C2C2A", borderRadius: "6px", background: "white", cursor: "pointer", fontFamily: FONT }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
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
            background: isDone ? "#F4FBF7" : "white",
            border: `2px solid ${isDone ? "#1D9E75" : isOverdue ? "#EF4444" : "#2C2C2A"}`,
            borderRadius: "12px",
            boxShadow: isDone ? boxShadow("#1D9E75", 2, 2) : isOverdue ? boxShadow("#EF4444", 2, 2) : boxShadow("#e8e8e8", 2, 2),
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
                    color: isDone ? "#b4b2a9" : "#2C2C2A",
                }}>
                    {chore.name}
                </div>
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
                            {isOverdue && <span style={{ fontSize: "11px", color: "#EF4444", fontWeight: 700 }}>⚠ {chore.daysOverdue}d overdue</span>}
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

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px",
            marginBottom: removing ? "0px" : "8px", fontFamily: FONT,
            background: checked ? "#F4FBF7" : "white",
            border: `2px solid ${checked ? "#1D9E75" : "#2C2C2A"}`,
            borderRadius: "12px",
            boxShadow: checked ? boxShadow("#1D9E75", 2, 2) : boxShadow("#e8e8e8", 2, 2),
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
