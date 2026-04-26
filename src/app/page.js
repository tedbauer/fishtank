"use client";

import { useState, useEffect, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import ChoreApp from "@/components/ChoreApp";
import HouseholdSetup from "@/components/HouseholdSetup";
import LanguagePicker from "@/components/LanguagePicker";

export default function HomePage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsHousehold, setNeedsHousehold] = useState(false);
  const [needsLanguage, setNeedsLanguage] = useState(false);
  const loadingShrimp = useMemo(() => ["cherry", "jade", "jelly", "sunkissed"][Math.floor(Math.random() * 4)], []);

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
        setNeedsLanguage(true);
        setLoading(false);
        return;
      }

      setProfile(prof);

      if (!prof.language) {
        setNeedsLanguage(true);
        setLoading(false);
        return;
      }

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

  const handleLanguageComplete = async (language) => {
    setNeedsLanguage(false);
    // Reload fresh profile + members from DB so downstream components see the new language
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setProfile(prof);
    if (!prof?.household_id) {
      setNeedsHousehold(true);
      return;
    }
    const { data: members } = await supabase
      .from("profiles")
      .select("*")
      .eq("household_id", prof.household_id);
    setHouseholdMembers(members || []);
  };

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
        <div style={{ textAlign: "center", color: "#888780", fontFamily: "sans-serif" }}>
          <img src={`/tank/shrimp_${loadingShrimp}.png`} alt="shrimp" width={48} style={{ marginBottom: "12px", animation: "ptr-fish-bob 1s ease-in-out infinite" }} />
          <div>Loading…</div>
        </div>
        <style>{`@keyframes ptr-fish-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
      </div>
    );
  }

  if (needsLanguage) {
    return (
      <LanguagePicker
        user={session.user}
        profile={profile}
        onComplete={handleLanguageComplete}
      />
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
