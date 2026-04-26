"use client";

const FONT = "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive";

const ENTRIES = [
    {
        date: "April 26, 2025",
        title: "Bigger Tanks, Smarter Happiness & Inventory",
        items: [
            "🔧 Tank Expansion upgrade — buy a Larger Tank in the shop to give your creatures more room to roam! The tank becomes scrollable so you can fill it with tons of decorations.",
            "📦 Inventory system — newly purchased items now go to your inventory first. Tap the Inventory button below the tank to see your items and place them with a tap.",
            "🧠 Happiness overhaul — Tank Quality now starts at 100 and drops when chores go overdue. Keep your streak alive to keep your tank happy!",
            "🌿 Cryptocoryne plant added to the shop.",
            "🦐 Shrimp now do cute little hops as they crawl around.",
            "🏖️ New pixel-art seafloor replaces the old line drawing at the bottom of the tank.",
            "📊 Stats tiles reorganized into a cleaner 3-column grid layout.",
            "🐛 Fixed a bug where purchases would fail silently.",
        ],
    },
];

export default function DevlogPage() {
    return (
        <div style={{
            maxWidth: "640px", margin: "0 auto", padding: "1.5rem",
            fontFamily: FONT, minHeight: "100vh", background: "#f8f7f4",
        }}>
            <a href="/" style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                fontSize: "13px", fontWeight: 700, color: "#888780",
                textDecoration: "none", marginBottom: "1rem",
            }}>← Back</a>

            <h1 style={{
                fontSize: "28px", fontWeight: 800, color: "#2C2C2A",
                marginBottom: "0.25rem",
            }}>Devlog 🛠️</h1>
            <p style={{ fontSize: "13px", color: "#888780", marginBottom: "2rem" }}>
                What&apos;s new in My Fishtank
            </p>

            {ENTRIES.map((entry, i) => (
                <div key={i} style={{
                    marginBottom: "2rem", padding: "1rem",
                    background: "white", border: "2px solid #2C2C2A",
                    borderRadius: "12px",
                    boxShadow: "3px 3px 0 #e8e8e8",
                }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#888780", marginBottom: "4px" }}>
                        {entry.date}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#2C2C2A", marginBottom: "10px" }}>
                        {entry.title}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "1.2rem", listStyle: "none" }}>
                        {entry.items.map((item, j) => (
                            <li key={j} style={{
                                fontSize: "13px", color: "#444441",
                                marginBottom: "6px", lineHeight: 1.5,
                            }}>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}

            <div style={{ textAlign: "center", fontSize: "11px", color: "#888780", padding: "1rem 0" }}>
                Made with 🤍
            </div>
        </div>
    );
}
