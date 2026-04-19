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

        const householdAlerts = {};

        for (const chore of chores) {
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
                const hid = chore.household_id;
                if (!householdAlerts[hid]) householdAlerts[hid] = [];
                const overdueDays = daysSince - freqDays;
                householdAlerts[hid].push({
                    name: chore.name,
                    overdue: overdueDays > 0,
                    overdueDays,
                });
            }
        }

        let sent = 0;
        let failed = 0;

        for (const sub of subscriptions) {
            const alerts = householdAlerts[sub.household_id];
            if (!alerts || alerts.length === 0) continue;

            const overdueCount = alerts.filter((a) => a.overdue).length;
            const dueCount = alerts.length;

            let title, body;
            if (overdueCount > 0) {
                title = `🔴 ${overdueCount} Overdue Chore${overdueCount > 1 ? "s" : ""}!`;
                body = `Don't break your streak! ${alerts.filter((a) => a.overdue).map((a) => a.name).join(", ")}`;
            } else {
                title = `🐟 ${dueCount} Chore${dueCount > 1 ? "s" : ""} Due Today`;
                body = alerts.map((a) => a.name).join(", ");
            }

            try {
                await webpush.sendNotification(
                    JSON.parse(sub.subscription),
                    JSON.stringify({ title, body, tag: "chore-daily", url: "/" })
                );
                sent++;
            } catch (err) {
                failed++;
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                }
            }
        }

        return Response.json({ sent, failed, households: Object.keys(householdAlerts).length });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
