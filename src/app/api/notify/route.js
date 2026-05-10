import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";

const FREQ_DAYS = {
    daily: 1, every2: 2, weekly: 7, biweekly: 14,
    monthly: 30, quarterly: 90, biannual: 182,
};

// Mirror of the in-app schedule helpers (kept inline so this route is
// self-contained). A chore is "due today" only if today is on its
// schedule — skipped days don't carry forward as overdue, so we don't
// send "X chores overdue" notifications anymore.
const dayOfWeek = (d) => d.getDay();
const weekParityOf = (d) => {
    const refMs = Date.UTC(1970, 0, 4);
    const weeks = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - refMs) / (7 * 86400000));
    return ((weeks % 2) + 2) % 2;
};
const daysInMonth = (year, monthIndex) =>
    new Date(year, monthIndex + 1, 0).getDate();
const parseDate = (s) => {
    const d = new Date(s + "T00:00:00");
    d.setHours(0, 0, 0, 0);
    return d;
};
const daysBetween = (d1, d2) =>
    Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));

const choreSchedule = (chore, fallback) => {
    const created = chore.created_at ? parseDate(chore.created_at.split("T")[0]) : fallback;
    return {
        dow: chore.schedule_dow ?? dayOfWeek(created),
        weekParity: chore.schedule_week_parity ?? weekParityOf(created),
        dom: chore.schedule_dom ?? created.getDate(),
        created,
    };
};

const isScheduledForDay = (chore, date) => {
    if (chore.one_time) {
        if (!chore.deadline) return false;
        return chore.deadline.split("T")[0] === date.toISOString().split("T")[0];
    }
    const sched = choreSchedule(chore, date);
    if (date < sched.created) return false;
    const freq = chore.freq;
    if (freq === "daily") return true;
    if (freq === "every2") return daysBetween(sched.created, date) % 2 === 0;
    if (freq === "weekly") return dayOfWeek(date) === sched.dow;
    if (freq === "biweekly") {
        return dayOfWeek(date) === sched.dow && weekParityOf(date) === sched.weekParity;
    }
    if (freq === "monthly") {
        const dim = daysInMonth(date.getFullYear(), date.getMonth());
        return date.getDate() === Math.min(sched.dom, dim);
    }
    const fd = FREQ_DAYS[freq] || 7;
    return daysBetween(sched.created, date) % fd === 0;
};

export async function GET(request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    webpush.setVapidDetails(
        "mailto:choretracker@example.com",
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    try {
        const { data: chores } = await supabase.from("chores").select("*");
        const { data: completions } = await supabase.from("completions").select("*");
        const { data: subscriptions } = await supabase.from("push_subscriptions").select("*");

        if (!chores || !subscriptions || subscriptions.length === 0) {
            return Response.json({ sent: 0, reason: "no subscriptions" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        // Most recent completion per household — used for the comeback
        // "you've been away" check.
        const choreHousehold = new Map((chores || []).map((c) => [c.id, c.household_id]));
        const householdLastCompletion = {};
        for (const c of completions || []) {
            const hid = choreHousehold.get(c.chore_id);
            if (!hid) continue;
            const d = c.completed_date;
            if (!householdLastCompletion[hid] || d > householdLastCompletion[hid]) {
                householdLastCompletion[hid] = d;
            }
        }

        // For each household, build today's scheduled chores. Skips chores
        // that are already done today or were done within freqDays - 1 days
        // (the "did it early" guard the in-app status uses).
        const householdData = {};
        for (const chore of chores) {
            const hid = chore.household_id;
            if (!householdData[hid]) householdData[hid] = { dueToday: [] };
            if (!isScheduledForDay(chore, today)) continue;

            const choreCompletions = (completions || [])
                .filter((c) => c.chore_id === chore.id)
                .sort((a, b) => b.completed_date.localeCompare(a.completed_date));
            const last = choreCompletions[0];
            const freqDays = FREQ_DAYS[chore.freq] || 7;

            if (last) {
                if (last.completed_date === todayStr) continue;
                const lastDate = parseDate(last.completed_date);
                const since = daysBetween(lastDate, today);
                if (since < freqDays - 1) continue;
            }
            householdData[hid].dueToday.push(chore.name);
        }

        let sent = 0;
        let failed = 0;

        for (const sub of subscriptions) {
            const data = householdData[sub.household_id];
            const prefs = sub.preferences || { dailySummary: true, streakWarnings: true };
            const messages = [];

            const lastDateStr = householdLastCompletion[sub.household_id];
            let daysSinceLastCompletion = null;
            if (lastDateStr) {
                const lastDate = parseDate(lastDateStr);
                daysSinceLastCompletion = daysBetween(lastDate, today);
            }
            const isBehind =
                daysSinceLastCompletion !== null && daysSinceLastCompletion >= 3;

            if (isBehind && prefs.dailySummary) {
                messages.push({
                    title: "🌱 Welcome back to your tank",
                    body: "Just one chore today brings it back to life and starts a fresh streak.",
                    tag: "comeback-nudge",
                });
            } else if (data && prefs.dailySummary && data.dueToday.length > 0) {
                const n = data.dueToday.length;
                messages.push({
                    title: `🐟 ${n} chore${n > 1 ? "s" : ""} on today's schedule`,
                    body: data.dueToday.join(", "),
                    tag: "daily-summary",
                });
            }

            const msg = messages[0];
            if (!msg) continue;

            try {
                await webpush.sendNotification(
                    JSON.parse(sub.subscription),
                    JSON.stringify({ ...msg, url: "/" })
                );
                sent++;
            } catch (err) {
                failed++;
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                }
            }
        }

        return Response.json({ sent, failed, households: Object.keys(householdData).length });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
