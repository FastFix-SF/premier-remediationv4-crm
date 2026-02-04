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
    const { changeOrderId, projectId, projectName, clientName, coNumber, amount } = await req.json();
    
    if (!changeOrderId || !projectId) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[notify-change-order-approval] Processing approval notification for CO:", changeOrderId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch the change order to get created_by and project_manager_id
    const { data: changeOrder, error: coError } = await supabase
      .from("change_orders")
      .select("id, created_by, project_manager_id")
      .eq("id", changeOrderId)
      .single();

    if (coError || !changeOrder) {
      console.error("[notify-change-order-approval] Change order not found:", coError);
      return new Response(JSON.stringify({ error: "Change order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Determine who to notify: created_by > project_manager_id > project's PM
    let recipientId = changeOrder.created_by || changeOrder.project_manager_id;

    // If neither is set, fetch from project
    if (!recipientId) {
      const { data: project } = await supabase
        .from("projects")
        .select("project_manager_id, address")
        .eq("id", projectId)
        .single();

      recipientId = project?.project_manager_id;
    }

    if (!recipientId) {
      console.log("[notify-change-order-approval] No recipient found for notification");
      return new Response(JSON.stringify({ success: false, message: "No recipient found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch recipient's phone from team_directory
    const { data: teamMember, error: tmError } = await supabase
      .from("team_directory")
      .select("id, full_name, phone_number, sms_notifications_enabled")
      .eq("user_id", recipientId)
      .single();

    if (tmError || !teamMember) {
      console.log("[notify-change-order-approval] Team member not found for user:", recipientId);
      return new Response(JSON.stringify({ success: false, message: "Team member not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if SMS notifications are enabled
    if (teamMember.sms_notifications_enabled === false) {
      console.log("[notify-change-order-approval] SMS notifications disabled for:", teamMember.full_name);
      return new Response(JSON.stringify({ success: false, message: "SMS notifications disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if phone number exists
    if (!teamMember.phone_number) {
      console.log("[notify-change-order-approval] No phone number for:", teamMember.full_name);
      return new Response(JSON.stringify({ success: false, message: "No phone number on file" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Format the phone number
    let phoneNumber = teamMember.phone_number.replace(/\D/g, '');
    if (phoneNumber.length === 10) {
      phoneNumber = `+1${phoneNumber}`;
    } else if (phoneNumber.length === 11 && phoneNumber.startsWith('1')) {
      phoneNumber = `+${phoneNumber}`;
    } else if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+${phoneNumber}`;
    }

    // 5. Fetch project address for the message
    const { data: projectData } = await supabase
      .from("projects")
      .select("address")
      .eq("id", projectId)
      .single();

    const projectAddress = projectData?.address || projectName || 'your project';

    // 6. Format amount
    const formattedAmount = amount ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) : 'N/A';

    // 7. Build the SMS message
    const displayCoNumber = coNumber || 'N/A';
    const displayClientName = clientName || 'A client';
    
    const smsMessage = `✅ Change Order Approved!\n\n${displayClientName} at ${projectAddress} approved Change Order #${displayCoNumber} for ${formattedAmount}.\n\n- Roofing Friend`;

    console.log("[notify-change-order-approval] Sending SMS to:", phoneNumber);
    console.log("[notify-change-order-approval] Message:", smsMessage);

    // 8. Send SMS via Twilio
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      console.error("[notify-change-order-approval] Missing Twilio credentials");
      return new Response(JSON.stringify({ success: false, message: "SMS service not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: twilioFromNumber,
        Body: smsMessage,
      }),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error("[notify-change-order-approval] Twilio error:", errorText);
      return new Response(JSON.stringify({ success: false, message: "Failed to send SMS" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const twilioResult = await twilioResponse.json();
    console.log("[notify-change-order-approval] SMS sent successfully:", twilioResult.sid);

    // 9. Also create an in-app notification for the team member
    await supabase.from("team_member_notifications").insert({
      member_id: teamMember.id,
      type: "change_order_approved",
      title: "Change Order Approved",
      message: `${displayClientName} approved CO #${displayCoNumber} for ${formattedAmount}`,
      priority: "high",
      reference_type: "change_order",
      reference_id: changeOrderId,
      action_url: `/admin/projects/${projectId}`,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Notification sent",
      recipientName: teamMember.full_name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[notify-change-order-approval] Error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
