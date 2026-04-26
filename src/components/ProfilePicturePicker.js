"use client";

import { useRef, useState } from "react";
import { Check, X, Upload, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { t } from "@/lib/i18n";

const FONT = "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive";
const boxShadow = (color = "#2C2C2A", x = 3, y = 3) => `${x}px ${y}px 0px ${color}`;

export const PROFILE_CRITTERS = [
    { id: "fish", labelKey: "profile_critter_fish" },
    { id: "snail", labelKey: "profile_critter_snail" },
    { id: "shrimp_cherry", labelKey: "profile_critter_shrimp_cherry" },
    { id: "shrimp_sunkissed", labelKey: "profile_critter_shrimp_sunkissed" },
    { id: "shrimp_jelly", labelKey: "profile_critter_shrimp_jelly" },
    { id: "shrimp_jade", labelKey: "profile_critter_shrimp_jade" },
];

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Render the user's profile picture, falling back to an initial.
// `profile` shape: { profile_critter, avatar_url, color, display_name }
export function Avatar({ profile, size = 36, borderColor = "#2C2C2A" }) {
    const initial = (profile?.display_name || "?").charAt(0).toUpperCase();
    const bg = profile?.color || "#7F77DD";
    const showCritter = !!profile?.profile_critter;
    const showImage = !showCritter && !!profile?.avatar_url;
    return (
        <div style={{
            width: `${size}px`, height: `${size}px`, flexShrink: 0,
            borderRadius: "50%", background: showImage ? "#fff" : bg,
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: `${Math.round(size * 0.42)}px`, fontWeight: 700,
            border: `2px solid ${borderColor}`,
            boxShadow: boxShadow(bg + "88", 2, 2),
            overflow: "hidden", fontFamily: FONT,
        }}>
            {showCritter ? (
                <img
                    src={`/tank/${profile.profile_critter}.png`}
                    alt=""
                    draggable={false}
                    style={{ width: "82%", height: "82%", objectFit: "contain" }}
                />
            ) : showImage ? (
                <img
                    src={profile.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            ) : initial}
        </div>
    );
}

export default function ProfilePicturePicker({ user, profile, lang, onClose, onSaved }) {
    const supabase = getSupabase();
    const fileInputRef = useRef(null);

    const [critter, setCritter] = useState(profile?.profile_critter || null);
    const [uploadedUrl, setUploadedUrl] = useState(
        profile?.profile_critter ? null : profile?.avatar_url || null
    );
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const previewProfile = {
        ...profile,
        profile_critter: critter,
        avatar_url: critter ? null : uploadedUrl,
    };

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES) {
            setError(t("profile_fileTooBig", lang));
            return;
        }
        setError(null);
        setUploading(true);
        try {
            const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
            const path = `${user.id}/avatar-${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from("avatars")
                .upload(path, file, { contentType: file.type || "image/png", upsert: true });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from("avatars").getPublicUrl(path);
            // Cache-bust so the new picture shows immediately.
            const url = `${data.publicUrl}?v=${Date.now()}`;
            setUploadedUrl(url);
            setCritter(null);
        } catch (err) {
            console.error(err);
            setError(t("profile_uploadError", lang));
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const updates = critter
            ? { profile_critter: critter, avatar_url: null }
            : { profile_critter: null, avatar_url: uploadedUrl || null };
        const { error: updErr } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", user.id);
        setSaving(false);
        if (updErr) {
            setError(updErr.message);
            return;
        }
        onSaved?.({ ...profile, ...updates });
        onClose?.();
    };

    const handleRemove = () => {
        setCritter(null);
        setUploadedUrl(null);
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, background: "rgba(44,44,42,0.55)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "16px", zIndex: 1000, fontFamily: FONT,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#f8f7f4", borderRadius: "16px",
                    border: "2px solid #2C2C2A", boxShadow: boxShadow("#2C2C2A", 4, 4),
                    width: "100%", maxWidth: "420px", maxHeight: "90vh", overflowY: "auto",
                    padding: "18px",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{t("profile_pickerTitle", lang)}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: "white", border: "2px solid #2C2C2A", borderRadius: "8px",
                            padding: "4px 6px", cursor: "pointer", boxShadow: boxShadow("#2C2C2A", 2, 2),
                        }}
                        aria-label={t("profile_cancel", lang)}
                    >
                        <X size={14} />
                    </button>
                </div>

                <div style={{
                    display: "flex", justifyContent: "center", marginBottom: "16px",
                }}>
                    <Avatar profile={previewProfile} size={88} />
                </div>

                {/* Critter picker */}
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#888780", marginBottom: "8px" }}>
                    {t("profile_pickCritter", lang)}
                </div>
                <div style={{
                    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px",
                    marginBottom: "16px",
                }}>
                    {PROFILE_CRITTERS.map((c) => {
                        const selected = critter === c.id;
                        return (
                            <button
                                key={c.id}
                                onClick={() => { setCritter(c.id); setError(null); }}
                                style={{
                                    background: selected ? "#EEEDFE" : "white",
                                    border: "2px solid #2C2C2A", borderRadius: "12px",
                                    padding: "10px 6px", cursor: "pointer", fontFamily: FONT,
                                    boxShadow: boxShadow(selected ? "#7F77DD" : "#e8e8e8", 2, 2),
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                                    position: "relative",
                                }}
                            >
                                {selected && (
                                    <div style={{
                                        position: "absolute", top: "4px", right: "4px",
                                        background: "#7F77DD", color: "white", borderRadius: "50%",
                                        width: "18px", height: "18px",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        border: "1.5px solid #2C2C2A",
                                    }}>
                                        <Check size={10} strokeWidth={3} />
                                    </div>
                                )}
                                <img
                                    src={`/tank/${c.id}.png`}
                                    alt=""
                                    draggable={false}
                                    style={{ width: "44px", height: "44px", objectFit: "contain" }}
                                />
                                <div style={{ fontSize: "10px", fontWeight: 700, color: "#2C2C2A", textAlign: "center" }}>
                                    {t(c.labelKey, lang)}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Upload */}
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#888780", marginBottom: "8px" }}>
                    {t("profile_uploadOwn", lang)}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    style={{ display: "none" }}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                        width: "100%", padding: "10px 12px",
                        background: uploadedUrl && !critter ? "#E1F5EE" : "white",
                        border: "2px solid #2C2C2A", borderRadius: "10px",
                        cursor: uploading ? "wait" : "pointer", fontFamily: FONT, fontWeight: 700,
                        fontSize: "13px", color: "#2C2C2A",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        boxShadow: boxShadow(uploadedUrl && !critter ? "#1D9E75" : "#e8e8e8", 2, 2),
                        marginBottom: "8px",
                        opacity: uploading ? 0.6 : 1,
                    }}
                >
                    <Upload size={14} />
                    {uploading ? t("profile_uploading", lang) : t("profile_uploadButton", lang)}
                </button>

                {error && (
                    <div style={{
                        padding: "8px 12px", background: "#FBEAF0", color: "#72243E",
                        borderRadius: "8px", border: "2px solid #D4537E",
                        fontSize: "12px", fontWeight: 600, marginBottom: "8px",
                    }}>
                        {error}
                    </div>
                )}

                {(critter || uploadedUrl) && (
                    <button
                        onClick={handleRemove}
                        style={{
                            width: "100%", padding: "8px 12px", background: "white",
                            border: "2px solid #2C2C2A", borderRadius: "10px",
                            cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: "12px",
                            color: "#72243E",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                            boxShadow: boxShadow("#e8e8e8", 2, 2),
                            marginBottom: "12px",
                        }}
                    >
                        <Trash2 size={12} /> {t("profile_remove", lang)}
                    </button>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1, padding: "10px 12px", background: "white",
                            border: "2px solid #2C2C2A", borderRadius: "10px",
                            cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: "13px",
                            color: "#2C2C2A", boxShadow: boxShadow("#e8e8e8", 2, 2),
                        }}
                    >
                        {t("profile_cancel", lang)}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading}
                        style={{
                            flex: 1, padding: "10px 12px", background: "#7F77DD",
                            border: "2px solid #2C2C2A", borderRadius: "10px",
                            cursor: saving ? "wait" : "pointer", fontFamily: FONT, fontWeight: 700, fontSize: "13px",
                            color: "white", boxShadow: boxShadow("#2C2C2A", 2, 2),
                            opacity: saving || uploading ? 0.6 : 1,
                        }}
                    >
                        {t("profile_save", lang)}
                    </button>
                </div>
            </div>
        </div>
    );
}
