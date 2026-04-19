"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { Home, Copy, Check } from "lucide-react";

export default function HouseholdSetup({ user, profile, onComplete }) {
    const [mode, setMode] = useState(null); // null | 'create' | 'join'
    const [inviteCode, setInviteCode] = useState("");
    const [createdCode, setCreatedCode] = useState(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const supabase = getSupabase();

    // Auto-fill from ?join=CODE share link
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get("join");
        if (joinCode) {
            setInviteCode(joinCode);
            setMode("join");
        }
    }, []);

    const handleCreate = async () => {
        setLoading(true);
        setError(null);
        try {
            // Create household
            const { data: household, error: hErr } = await supabase
                .from("households")
                .insert({})
                .select()
                .single();
            if (hErr) throw hErr;

            // Update profile with household_id
            const { error: pErr } = await supabase
                .from("profiles")
                .update({ household_id: household.id })
                .eq("id", user.id);
            if (pErr) throw pErr;

            // Seed default chores
            const DEFAULT_CHORES = [
                { name: "Wipe kitchen counters", freq: "daily" },
                { name: "Dishes / dishwasher", freq: "daily" },
                { name: "Tidy up common areas", freq: "daily" },
                { name: "Take out trash & recycling", freq: "every2" },
                { name: "Quick sweep high-traffic areas", freq: "every2" },
                { name: "Wipe the stovetop", freq: "every2" },
                { name: "Full vacuum all rooms", freq: "weekly" },
                { name: "Mop kitchen & bathroom floors", freq: "weekly" },
                { name: "Clean the toilet", freq: "weekly" },
                { name: "Scrub bathroom sink & mirror", freq: "weekly" },
                { name: "Change towels", freq: "weekly" },
                { name: "Wipe kitchen appliances", freq: "weekly" },
                { name: "Water plants", freq: "weekly" },
                { name: "Laundry", freq: "weekly" },
                { name: "Change bed sheets", freq: "biweekly" },
                { name: "Clean shower / tub", freq: "biweekly" },
                { name: "Dust surfaces & shelves", freq: "biweekly" },
                { name: "Clean out the fridge", freq: "biweekly" },
                { name: "Deep clean bathroom", freq: "monthly" },
                { name: "Wipe kitchen cabinet fronts", freq: "monthly" },
                { name: "Vacuum under furniture", freq: "monthly" },
                { name: "Clean inside microwave", freq: "monthly" },
                { name: "Wash windows (inside)", freq: "quarterly" },
                { name: "Clean the oven", freq: "quarterly" },
                { name: "Descale coffee maker / kettle", freq: "quarterly" },
                { name: "Replace HVAC filter", freq: "quarterly" },
                { name: "Rotate / flip mattress", freq: "quarterly" },
                { name: "Deep clean fridge & freezer", freq: "biannual" },
                { name: "Clean light fixtures & fans", freq: "biannual" },
                { name: "Reorganize closets", freq: "biannual" },
            ];

            const { error: cErr } = await supabase
                .from("chores")
                .insert(DEFAULT_CHORES.map((c) => ({ ...c, household_id: household.id })));
            if (cErr) throw cErr;

            setCreatedCode(household.invite_code);
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    const handleJoin = async () => {
        setLoading(true);
        setError(null);
        try {
            const code = inviteCode.trim().toLowerCase();
            if (!code) throw new Error("Please enter an invite code");

            // Find household by invite code
            const { data: household, error: hErr } = await supabase
                .from("households")
                .select("id")
                .eq("invite_code", code)
                .single();
            if (hErr || !household) throw new Error("Invalid invite code. Check with your partner.");

            // Join household
            const { error: pErr } = await supabase
                .from("profiles")
                .update({ household_id: household.id })
                .eq("id", user.id);
            if (pErr) throw pErr;

            onComplete();
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(createdCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Successfully created — show invite code
    if (createdCode) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏠</div>
                    <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>Household created!</h2>
                    <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 1.5rem" }}>
                        Share this code with your partner so they can join:
                    </p>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "12px",
                            padding: "16px 20px",
                            background: "#f8f7f4",
                            borderRadius: "12px",
                            marginBottom: "1.5rem",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "28px",
                                fontWeight: 600,
                                letterSpacing: "4px",
                                fontFamily: "monospace",
                                color: "#2C2C2A",
                            }}
                        >
                            {createdCode}
                        </span>
                        <button
                            onClick={copyCode}
                            style={{
                                padding: "8px",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                color: copied ? "#1D9E75" : "#888780",
                            }}
                        >
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                        </button>
                    </div>

                    <button onClick={onComplete} style={primaryButtonStyle}>
                        Continue to app →
                    </button>
                </div>
            </div>
        );
    }

    // Mode selection
    if (!mode) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div
                        style={{
                            display: "inline-flex",
                            padding: "14px",
                            background: "#FBEAF0",
                            borderRadius: "50%",
                            marginBottom: "14px",
                        }}
                    >
                        <Home size={26} color="#D4537E" />
                    </div>
                    <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>
                        Welcome, {profile?.display_name || "there"}!
                    </h2>
                    <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 1.5rem" }}>
                        Set up your shared household
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <button onClick={() => setMode("create")} style={choiceButtonStyle}>
                            <span style={{ fontSize: "20px" }}>🏠</span>
                            <div style={{ textAlign: "left" }}>
                                <div style={{ fontWeight: 500, fontSize: "15px" }}>Create a household</div>
                                <div style={{ fontSize: "12px", color: "#888780" }}>
                                    Start fresh and invite your partner
                                </div>
                            </div>
                        </button>

                        <button onClick={() => setMode("join")} style={choiceButtonStyle}>
                            <span style={{ fontSize: "20px" }}>🔗</span>
                            <div style={{ textAlign: "left" }}>
                                <div style={{ fontWeight: 500, fontSize: "15px" }}>Join a household</div>
                                <div style={{ fontSize: "12px", color: "#888780" }}>
                                    Enter an invite code from your partner
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Create mode
    if (mode === "create") {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>Create your household</h2>
                    <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 1.5rem" }}>
                        We'll set up default chores and give you an invite code.
                    </p>

                    {error && <p style={errorStyle}>{error}</p>}

                    <button onClick={handleCreate} disabled={loading} style={primaryButtonStyle}>
                        {loading ? "Creating…" : "Create household"}
                    </button>

                    <button onClick={() => setMode(null)} style={backButtonStyle}>
                        ← Back
                    </button>
                </div>
            </div>
        );
    }

    // Join mode
    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>Join a household</h2>
                <p style={{ fontSize: "14px", color: "#888780", margin: "0 0 1.5rem" }}>
                    Enter the 6-character invite code from your partner.
                </p>

                <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.slice(0, 6))}
                    placeholder="abc123"
                    maxLength={6}
                    style={{
                        width: "100%",
                        padding: "14px",
                        fontSize: "20px",
                        textAlign: "center",
                        letterSpacing: "6px",
                        fontFamily: "monospace",
                        border: "1px solid #dadada",
                        borderRadius: "12px",
                        marginBottom: "1rem",
                        boxSizing: "border-box",
                    }}
                />

                {error && <p style={errorStyle}>{error}</p>}

                <button
                    onClick={handleJoin}
                    disabled={loading || inviteCode.trim().length < 6}
                    style={{
                        ...primaryButtonStyle,
                        opacity: loading || inviteCode.trim().length < 6 ? 0.5 : 1,
                    }}
                >
                    {loading ? "Joining…" : "Join household"}
                </button>

                <button onClick={() => setMode(null)} style={backButtonStyle}>
                    ← Back
                </button>
            </div>
        </div>
    );
}

const containerStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f8f7f4 0%, #eeedfe 50%, #fbeaf0 100%)",
    padding: "1rem",
};

const cardStyle = {
    maxWidth: "420px",
    width: "100%",
    background: "white",
    borderRadius: "20px",
    padding: "2.5rem 2rem",
    textAlign: "center",
    boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
};

const primaryButtonStyle = {
    width: "100%",
    padding: "14px",
    background: "#D4537E",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 500,
    cursor: "pointer",
};

const choiceButtonStyle = {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px",
    border: "1px solid #e8e8e8",
    borderRadius: "14px",
    background: "white",
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s ease",
};

const backButtonStyle = {
    marginTop: "1rem",
    background: "none",
    border: "none",
    color: "#888780",
    fontSize: "13px",
    cursor: "pointer",
};

const errorStyle = {
    fontSize: "13px",
    color: "#D4537E",
    marginBottom: "1rem",
};
