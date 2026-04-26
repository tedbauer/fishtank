"use client";

import { useState } from "react";
import { Languages, Check } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { LANGUAGES } from "@/lib/i18n";

export default function LanguagePicker({ user, profile, onComplete }) {
    const [selected, setSelected] = useState(profile?.language || "en");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const supabase = getSupabase();

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        const { error: pErr } = await supabase
            .from("profiles")
            .update({ language: selected })
            .eq("id", user.id);
        if (pErr) {
            setError(pErr.message);
            setSaving(false);
            return;
        }
        onComplete(selected);
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <div
                    style={{
                        display: "inline-flex",
                        padding: "14px",
                        background: "#EEEDFE",
                        borderRadius: "50%",
                        marginBottom: "14px",
                    }}
                >
                    <Languages size={26} color="#7F77DD" />
                </div>
                <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>
                    Choose your language / Chọn ngôn ngữ
                </h2>
                <p style={{ fontSize: "13px", color: "#888780", margin: "0 0 1.5rem" }}>
                    You can change this anytime in Manage.
                    <br />
                    Bạn có thể thay đổi bất cứ lúc nào trong mục Quản lý.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.25rem" }}>
                    {LANGUAGES.map((lang) => {
                        const active = selected === lang.code;
                        return (
                            <button
                                key={lang.code}
                                onClick={() => setSelected(lang.code)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "14px",
                                    padding: "14px 16px",
                                    border: active ? "2px solid #7F77DD" : "1px solid #e8e8e8",
                                    borderRadius: "14px",
                                    background: active ? "#EEEDFE" : "white",
                                    cursor: "pointer",
                                    width: "100%",
                                    textAlign: "left",
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "15px", color: "#2C2C2A" }}>
                                        {lang.native}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#888780" }}>
                                        {lang.label}
                                    </div>
                                </div>
                                {active && <Check size={18} color="#7F77DD" />}
                            </button>
                        );
                    })}
                </div>

                {error && <p style={errorStyle}>{error}</p>}

                <button onClick={handleSave} disabled={saving} style={primaryButtonStyle}>
                    {saving ? "…" : "Continue / Tiếp tục"}
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
    background: "#7F77DD",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 500,
    cursor: "pointer",
};

const errorStyle = {
    fontSize: "13px",
    color: "#D4537E",
    marginBottom: "1rem",
};
