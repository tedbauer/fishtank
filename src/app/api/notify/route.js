import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";

const FREQ_DAYS = {
    daily: 1, every2: 2, weekly: 7, biweekly: 14,
    monthly: 30, quarterly: 90, biannual: 182,
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

        // Compute the most recent completion date per household, so we
        // can detect "user has been away" the same way the in-app
        // comeback banner does. Listing 15 chore names in a push
        // notification is a great way to make someone feel worse —
        // when behind, we replace it with a single soft nudge.
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

        // Compute per-household: due today count, overdue list, streak status
        const householdData = {};

        for (const chore of chores) {
            const hid = chore.household_id;
            if (!householdData[hid]) householdData[hid] = { dueToday: [], overdue: [], streakAtRisk: false };

            const freqDays = FREQ_DAYS[chore.freq] || 7;
            const choreCompletions = (completions || [])
                .filter((c) => c.chore_id === chore.id)
                .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date));

            const last = choreCompletions[0];
            let daysSince;

            if (last) {
                const lastDate = new Date(last.completed_date + "T00:00:00");
                daysSince = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            } else if (chore.created_at) {
                const created = new Date(chore.created_at.split("T")[0] + "T00:00:00");
                daysSince = Math.floor((today - created) / (1000 * 60 * 60 * 24));
            } else {
                daysSince = freqDays;
            }

            if (daysSince >= freqDays) {
                const overdueDays = daysSince - freqDays;
                if (overdueDays > 0) {
                    householdData[hid].overdue.push({ name: chore.name, overdueDays });
                }
                householdData[hid].dueToday.push(chore.name);
            }

            // Streak at risk: chore due today or tomorrow
            if (daysSince >= freqDays - 1 && daysSince < freqDays + 2) {
                householdData[hid].streakAtRisk = true;
            }
        }

        let sent = 0;
        let failed = 0;

        for (const sub of subscriptions) {
            const data = householdData[sub.household_id];
            if (!data) continue;

            const prefs = sub.preferences || { dailySummary: true, overdueAlerts: true, streakWarnings: true };
            const messages = [];

            // "Behind" mirrors the in-app comeback-mode threshold: 5+
            // overdue OR 3+ days since the household's last completion.
            // When this is true we send one soft nudge instead of a
            // wall of chore names.
            const lastDateStr = householdLastCompletion[sub.household_id];
            let daysSinceLastCompletion = null;
            if (lastDateStr) {
                const lastDate = new Date(lastDateStr + "T00:00:00");
                daysSinceLastCompletion = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            }
            const isBehind =
                data.overdue.length >= 5 ||
                (daysSinceLastCompletion !== null && daysSinceLastCompletion >= 3);

            if (isBehind && (prefs.dailySummary || prefs.overdueAlerts)) {
                messages.push({
                    title: "🌱 Welcome back to your tank",
                    body: "Just one chore today brings it back to life and starts a fresh streak.",
                    tag: "comeback-nudge",
                });
            } else {
                // Daily summary
                if (prefs.dailySummary && data.dueToday.length > 0) {
                    messages.push({
                        title: `🐟 ${data.dueToday.length} Chore${data.dueToday.length > 1 ? "s" : ""} Due Today`,
                        body: data.dueToday.join(", "),
                        tag: "daily-summary",
                    });
                }

                // Overdue alerts — frame as encouragement, not a scold:
                // even one chore today brings the tank back to baseline.
                if (prefs.overdueAlerts && data.overdue.length > 0) {
                    const n = data.overdue.length;
                    const names = data.overdue.map((a) => a.name).join(", ");
                    messages.push({
                        title: `🐟 ${n} chore${n > 1 ? "s" : ""} overdue`,
                        body: `Doing just one keeps the tank healthy: ${names}`,
                        tag: "overdue-alert",
                    });
                }

                // Streak warnings
                if (prefs.streakWarnings && data.streakAtRisk) {
                    messages.push({
                        title: "🔥 Keep your streak alive",
                        body: "Even one chore today keeps it going",
                        tag: "streak-warning",
                    });
                }
            }

            // Send the most important one (avoid spamming)
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
