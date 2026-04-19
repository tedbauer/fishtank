"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import ChoreApp from "@/components/ChoreApp";
import HouseholdSetup from "@/components/HouseholdSetup";

export default function HomePage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsHousehold, setNeedsHousehold] = useState(false);

  const supabase = getSupabase();

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) {
        // Preserve join code through login redirect
        const params = window.location.search;
        window.location.href = `/login${params}`;
        return;
      }
      setSession(s);
      await loadProfile(s.user);
    };

    const loadProfile = async (user) => {
      // Get profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!prof) {
        // Profile doesn't exist yet (trigger may not have fired yet)
        // Create it manually
        const { data: newProf } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || "User",
            avatar_url: user.user_metadata?.avatar_url || null,
          })
          .select()
          .single();
        setProfile(newProf);
        setNeedsHousehold(true);
        setLoading(false);
        return;
      }

      setProfile(prof);

      if (!prof.household_id) {
        setNeedsHousehold(true);
        setLoading(false);
        return;
      }

      // Load household members
      const { data: members } = await supabase
        .from("profiles")
        .select("*")
        .eq("household_id", prof.household_id);

      setHouseholdMembers(members || []);
      setLoading(false);
    };

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (event === "SIGNED_OUT") {
          window.location.href = "/login";
        }
        if (s) {
          setSession(s);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleHouseholdComplete = async () => {
    // Reload profile and members
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    setProfile(prof);

    if (prof?.household_id) {
      const { data: members } = await supabase
        .from("profiles")
        .select("*")
        .eq("household_id", prof.household_id);
      setHouseholdMembers(members || []);
      setNeedsHousehold(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#f8f7f4",
      }}>
        <div style={{ textAlign: "center", color: "#888780" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🐟</div>
          <div>Loading…</div>
        </div>
      </div>
    );
  }

  if (needsHousehold) {
    return (
      <HouseholdSetup
        user={session.user}
        profile={profile}
        onComplete={handleHouseholdComplete}
      />
    );
  }

  return (
    <ChoreApp
      user={session.user}
      profile={profile}
      householdMembers={householdMembers}
    />
  );
}
