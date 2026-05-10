"use client";

const FONT = "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', cursive";

const ENTRIES = [
    {
        date: "May 10, 2026 (evening)",
        title: "Calmer Tiles, Daily Bonus, Longer-Cycle Spotlight",
        items: [
            "🎨 Tile borders are now neutral dark instead of the freq color, so the every-2-days orange and other strong palettes stopped reading as 'warning'. Frequency lives in the chip + a thin colored stripe along the top of the tile.",
            "🎁 First chore each day earns a +5 daily bonus on top of the chore's reward. The progress header dangles the bonus before you start ('🎁 +5 daily bonus on your first chore'), and the completion toast names it on the first chore of the day.",
            "🌟 Week tab now has a 'Bigger projects this week' callout above the day strip — monthly / quarterly / biannual chores landing in the visible week show up there with the day they're scheduled, so things like 'scrub the tub on Saturday' feel like a heads-up instead of a surprise. Tap an entry to jump to that day.",
            "📈 Coin balance retroactively includes daily bonuses for every day the household had at least one completion — derived from existing data so nothing needs backfilling.",
        ],
    },
    {
        date: "May 10, 2026 (afternoon)",
        title: "Tiles, Progress, and Calendars That Feel Good",
        items: [
            "🐟 Today is now a grid of cute tiles instead of a tall card list. Each tile is colored by frequency (daily=pink, weekly=purple, etc), tap the whole tile to mark complete. Tap the small avatar in the corner to cycle ownership: you → partner → up for grabs.",
            "🌱 Cute progress header at the top of Today: '🌱 3 of 8 done · 25 min left' with a filling bar. The emoji and tagline shift as you make progress (🌱 → 🐠 → 🐟 → 🌟 → 🎉).",
            "✓ Done today is collapsed at the bottom by default — done chores are still there if you want to see them, but they don't crowd what's remaining.",
            "📅 This Week became a 7-day strip with a tiny progress ring per day. Tap a day to see its chores below; today gets a 🐟 fish in the ring once everything's done.",
            "📆 This Month grid got friendlier: each cell shows the date, a few colored dots (or a count if 5+), and a daily time total. Past days where you cleared everything turn green with a soft border. Tap a day for the full list.",
            "⏱️ Each chore can now have a time estimate (Add Chore + Manage forms). Aggregates show on Today, This Week, and This Month so you can plan around shorter / longer chores.",
            "🚫 Schedule tab is gone — its functionality lives in This Week and This Month at their own zoom levels.",
            "🌿 Today rows lost the redundant 'due today' chip and the 'last: X days ago' subtitle. The tiles do all the work with less weight.",
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
