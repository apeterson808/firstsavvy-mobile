import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);

    // POST — submit a task completion OR redeem a reward
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      // Redeem a reward
      if (action === "redeem") {
        const { childId, rewardId } = body;
        if (!childId || !rewardId) {
          return new Response(JSON.stringify({ error: "childId and rewardId are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Load reward to get star_cost and check stock
        const { data: reward, error: rewardErr } = await supabase
          .from("rewards")
          .select("id, title, star_cost, stock_quantity, expires_at, is_active, assigned_to_child_id")
          .eq("id", rewardId)
          .maybeSingle();

        if (rewardErr || !reward) {
          return new Response(JSON.stringify({ error: "Reward not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!reward.is_active) {
          return new Response(JSON.stringify({ error: "Reward is no longer available" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (reward.expires_at && new Date(reward.expires_at) < new Date()) {
          return new Response(JSON.stringify({ error: "This reward has expired" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (reward.stock_quantity !== null && reward.stock_quantity <= 0) {
          return new Response(JSON.stringify({ error: "This reward is out of stock" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Load child to check star balance
        const { data: child, error: childErr } = await supabase
          .from("child_profiles")
          .select("id, stars_balance")
          .eq("id", childId)
          .maybeSingle();

        if (childErr || !child) {
          return new Response(JSON.stringify({ error: "Child not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const starCost = reward.star_cost ?? 0;
        if (starCost > 0 && child.stars_balance < starCost) {
          return new Response(JSON.stringify({ error: "Not enough stars" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check for an existing pending redemption to avoid duplicates
        const { data: existing } = await supabase
          .from("reward_redemptions")
          .select("id")
          .eq("child_profile_id", childId)
          .eq("reward_id", rewardId)
          .eq("status", "pending")
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ error: "You already have a pending request for this reward" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Insert redemption row (pending parent approval)
        const { error: insertErr } = await supabase
          .from("reward_redemptions")
          .insert({
            child_profile_id: childId,
            reward_id: rewardId,
            points_spent: starCost,
            status: "pending",
          });

        if (insertErr) {
          return new Response(JSON.stringify({ error: insertErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Default POST — submit a task completion
      const { childId, taskId, starsEarned, note } = body;
      if (!childId || !taskId) {
        return new Response(JSON.stringify({ error: "childId and taskId are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const record: Record<string, unknown> = {
        child_profile_id: childId,
        task_id: taskId,
        status: "pending",
        stars_earned: starsEarned ?? 1,
      };
      if (note && typeof note === "string" && note.trim()) {
        record.note = note.trim();
      }

      const { error } = await supabase.from("task_completions").insert(record);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET — fetch all child data
    const childId = url.searchParams.get("childId");
    if (!childId) {
      return new Response(JSON.stringify({ error: "childId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [childRes, tasksRes, completionsRes, rewardsRes, pendingRedemptionsRes] = await Promise.all([
      supabase
        .from("child_profiles")
        .select("id, child_name, first_name, display_name, avatar_url, stars_balance, cash_balance, current_permission_level")
        .eq("id", childId)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select("id, title, icon, color, star_reward")
        .eq("assigned_to_child_id", childId)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("task_completions")
        .select("id, task_id, status, stars_earned, note")
        .eq("child_profile_id", childId)
        .gte("created_at", new Date(new Date().toLocaleDateString('en-CA')).toISOString()),
      supabase
        .from("rewards")
        .select("id, title, star_cost, image_url, icon, color")
        .eq("assigned_to_child_id", childId)
        .eq("is_active", true)
        .is("redeemed_at", null),
      supabase
        .from("reward_redemptions")
        .select("reward_id")
        .eq("child_profile_id", childId)
        .eq("status", "pending"),
    ]);

    // Collect reward IDs that already have a pending redemption request
    const pendingRewardIds = new Set(
      (pendingRedemptionsRes.data ?? []).map((r: { reward_id: string }) => r.reward_id)
    );

    const rewards = (rewardsRes.data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      redemption_pending: pendingRewardIds.has(r.id as string),
    }));

    return new Response(
      JSON.stringify({
        child: childRes.data,
        tasks: tasksRes.data ?? [],
        completions: completionsRes.data ?? [],
        rewards,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
