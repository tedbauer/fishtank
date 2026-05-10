"use client";

const FONT = "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive";

const ENTRIES = [
    {
        date: "May 10, 2026 (afternoon)",
        title: "Time Estimates, Calendar Tabs, Less Stressful List",
        items: [
            "⏱️ Each chore can now have a time estimate. Set it on Add Chore (the new minutes input) or in Manage. The Today tab shows a header like 'About 30 min today · 5 left' so you can plan.",
            "📅 This Week became a 7-day calendar. Each day card shows the day's scheduled chores with their time estimate, today highlighted, with a per-day and per-week total.",
            "📆 This Month became a month calendar grid (the same layout the Schedule tab used). Tap a day to see what's scheduled, with checkmarks for what was completed.",
            "🐟 Schedule tab is gone — its functionality moved into This Week and This Month so each tab tells you when things happen at its own zoom level.",
            "🌿 Today rows got lighter: the redundant 'due today' chip is gone (the section heading already says it), and the 'last: X days ago' subtitle is gone (it was emotional baggage). What's left: a checkbox, the chore name, the cadence chip, the time pill if set, and the assign dropdown.",
            "⚠️ DB migration: run supabase_migration_07_time_estimate.sql before deploying. Adds a nullable estimated_minutes smallint column with a 1–600 range check.",
        ],
    },
    {
        date: "May 10, 2026",
        title: "Schedule, Calendar, and No More Overdue",
        items: [
            "🗓️ Each chore now has a schedule. Daily chores fire every day, weekly/biweekly chores land on a specific day-of-week, monthly chores on a specific day-of-month. Skipping a day no longer stacks up as 'overdue' — you just don't earn the coins for that occurrence and the chore reappears on its next scheduled day.",
            "📅 New Schedule tab — a month calendar with colored dots showing which chores land on which day. Tap a day to see the full list. Find it next to Heatmap.",
            "✏️ Edit a chore's schedule from the Manage tab — pick the day of week (and Week A vs B for biweekly) or day of month for monthly. New chores default to the day of week / day of month they were created on.",
            "🐟 Today list dropped from 'all due + everything past due' down to 'just what's actually scheduled today'. The wall of red overdue stamps is gone; chores get a calmer 'due today' chip and that's it.",
            "🔕 Push notifications switched to the same model — daily summary lists only what's on the schedule for today, not what was missed.",
            "⚠️ DB migration: run supabase_migration_06_schedule.sql to add the schedule_dow / schedule_week_parity / schedule_dom columns. Existing chores keep working with NULL overrides (defaults derive from created_at).",
        ],
    },
    {
        date: "May 9, 2026",
        title: "Tank Quality, Simplified",
        items: [
            "🐟 Tank Quality is gone. Your tank now has three states tied to behavior: Recovering when you've fallen behind, Healthy when your streak is alive, and Thriving once you've started decorating with shop items. No more 0–100 score doing the talking.",
            "🔥 Streak got friendlier — completing any one chore on a day now keeps your streak going, even if you have a pile of overdue stuff.",
        ],
    },
    {
        date: "April 26, 2025",
        title: "Bigger Tanks & Inventory",
        items: [
            "🔧 Tank Expansion upgrade — buy a Larger Tank in the shop to give your creatures more room to roam! The tank becomes scrollable so you can fill it with tons of decorations.",
            "📦 Inventory system — newly purchased items now go to your inventory first. Tap the Inventory button below the tank to see your items and place them with a tap.",
            "🌿 Cryptocoryne plant added to the shop.",
            "🦐 Shrimp now do cute little hops as they crawl around.",
            "🏖️ New pixel-art seafloor replaces the old line drawing at the bottom of the tank.",
            "📊 Stats tiles reorganized into a cleaner 3-column grid layout.",
            "🐛 Fixed a bug where purchases would fail silently.",
            "🌍 Language support — switch between English and Vietnamese in the Manage tab.",
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
            }}>News</h1>
            <p style={{ fontSize: "13px", color: "#888780", marginBottom: "2rem" }}>
                What&apos;s new in the tank
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

        </div>
    );
}
