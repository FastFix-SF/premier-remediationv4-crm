import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemType, itemId, projectId } = await req.json();
    
    if (!itemType || !itemId || !projectId) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[client-portal-acknowledge-alert] Acknowledging alert:", { itemType, itemId, projectId });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update all matching alerts to acknowledged
    const { data, error } = await supabase
      .from("client_portal_alerts")
      .update({ 
        is_acknowledged: true, 
        acknowledged_at: new Date().toISOString() 
      })
      .eq("project_id", projectId)
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .eq("is_acknowledged", false)
      .select();

    if (error) {
      console.error("[client-portal-acknowledge-alert] Error:", error);
      return new Response(JSON.stringify({ error: "Failed to acknowledge alert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[client-portal-acknowledge-alert] Acknowledged alerts:", data?.length || 0);

    return new Response(JSON.stringify({ success: true, acknowledged: data?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[client-portal-acknowledge-alert] Error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
