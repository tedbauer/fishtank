import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";

export async function POST(request) {
    try {
        const { householdId, itemName, buyerName, excludeUserId } = await request.json();

        if (!householdId || !itemName || !process.env.VAPID_PRIVATE_KEY) {
            return Response.json({ ok: true, sent: 0 });
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

        let query = supabase
            .from("push_subscriptions")
            .select("*")
            .eq("household_id", householdId);
        if (excludeUserId) query = query.neq("user_id", excludeUserId);

        const { data: subs } = await query;

        if (!subs?.length) return Response.json({ ok: true, sent: 0 });

        const eligible = subs.filter((s) => s.preferences?.choreDoneAlerts !== false);
        if (!eligible.length) return Response.json({ ok: true, sent: 0 });

        const payload = JSON.stringify({
            title: "🛍️ New Tank Item!",
            body: `${buyerName} just bought a ${itemName}!`,
            tag: "purchase",
            url: "/",
        });

        let sent = 0;
        await Promise.allSettled(
            eligible.map(async (s) => {
                try {
                    await webpush.sendNotification(JSON.parse(s.subscription), payload);
                    sent++;
                } catch (err) {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await supabase.from("push_subscriptions").delete().eq("id", s.id);
                    }
                }
            })
        );

        return Response.json({ ok: true, sent });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
