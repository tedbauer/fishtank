"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

const FONT = "'Nunito', 'Quicksand', 'Comic Sans MS', sans-serif";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        const supabase = getSupabase();
        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get("join");
        const redirectUrl = joinCode
            ? `${window.location.origin}/auth/callback?join=${joinCode}`
            : `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: redirectUrl },
        });
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8f7f4",
            padding: "1rem",
            fontFamily: FONT,
        }}>
            {/* Same header as main app */}
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
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

            <div style={{
                maxWidth: "360px",
                width: "100%",
                background: "white",
                borderRadius: "16px",
                padding: "2rem",
                textAlign: "center",
                border: "2px solid #2C2C2A",
                boxShadow: "4px 4px 0 #2C2C2A",
            }}>
                <p style={{ margin: "0 0 1.5rem", fontSize: "14px", color: "#888780", fontWeight: 600 }}>
                    Keep your home tidy, together.
                </p>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: "12px 20px",
                        border: "2px solid #2C2C2A",
                        borderRadius: "10px",
                        background: "white",
                        cursor: loading ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        fontSize: "14px",
                        fontWeight: 700,
                        fontFamily: FONT,
                        color: "#2C2C2A",
                        boxShadow: "3px 3px 0 #2C2C2A",
                        opacity: loading ? 0.6 : 1,
                        transition: "opacity 0.2s",
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    {loading ? "Redirecting…" : "Sign in with Google"}
                </button>

                {error && (
                    <p style={{ marginTop: "1rem", fontSize: "13px", color: "#EF4444" }}>{error}</p>
                )}

                <p style={{ marginTop: "1.5rem", fontSize: "12px", color: "#b4b2a9", lineHeight: 1.6 }}>
                    Sign in to start tracking chores with your household.
                    <br />Your partner can join with an invite code.
                </p>
            </div>
        </div>
    );
}
