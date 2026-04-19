import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { subscription, user_id, household_id } = await request.json();

        if (!subscription || !user_id || !household_id) {
            return Response.json({ error: "Missing fields" }, { status: 400 });
        }

        const endpoint = subscription.endpoint;

        // Delete existing subscription for this endpoint
        await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user_id)
            .eq("endpoint", endpoint);

        // Insert new
        const { error } = await supabase.from("push_subscriptions").insert({
            user_id,
            household_id,
            subscription: JSON.stringify(subscription),
            endpoint,
        });

        if (error) throw error;

        return Response.json({ ok: true });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
