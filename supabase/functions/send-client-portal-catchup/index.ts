import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface CatchupRequest {
  projectId: string;
  projectName: string;
  updatesSummary: string;
}

/**
 * Format phone number to E.164 format (+1XXXXXXXXXX)
 */
function formatPhoneToE164(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If already has + prefix, return as-is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  return phone;
}

/**
 * Validate if a phone number is valid
 */
function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  
  const digits = phone.replace(/\D/g, '');
  
  // Valid US numbers are 10 digits or 11 digits starting with 1
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: CatchupRequest = await req.json()
    const { projectId, projectName, updatesSummary } = body

    console.log('📬 Send Client Portal Catch-up request:', { projectId, projectName })

    // Validate required fields
    if (!projectId || !projectName) {
      console.error('❌ Missing required fields: projectId or projectName')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: projectId and projectName' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Step 1: Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, client_phone, client_name, client_email')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('❌ Error fetching project:', projectError)
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (!project.client_phone || !isValidPhone(project.client_phone)) {
      console.error('❌ No valid client phone number on project')
      return new Response(
        JSON.stringify({ error: 'No valid client phone number on project' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Step 2: Fetch portal access URL slug
    const { data: portalAccess, error: accessError } = await supabase
      .from('client_portal_access')
      .select('url_slug')
      .eq('project_id', projectId)
      .maybeSingle()

    if (accessError) {
      console.error('❌ Error fetching portal access:', accessError)
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://example.com'
    let portalUrl = siteUrl
    if (portalAccess?.url_slug) {
      portalUrl = `${siteUrl}/client-portal/${portalAccess.url_slug}`
    }
    console.log('🔗 Portal URL:', portalUrl)

    // Step 3: Send SMS via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('❌ Twilio credentials not configured')
      return new Response(
        JSON.stringify({ 
          error: 'SMS service not configured',
          portalUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const formattedPhone = formatPhoneToE164(project.client_phone)
    const clientDisplayName = project.client_name || 'there'
    
    // SMS message with updates summary
    const smsMessage = `🔔 Project Update: ${projectName}

${updatesSummary}

View all updates: ${portalUrl}

- The Roofing Friend Team`

    console.log('📱 Sending catch-up SMS to:', formattedPhone)

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
    
    const smsResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: twilioPhoneNumber,
        Body: smsMessage,
      }),
    })

    const smsResult = await smsResponse.json()
    
    if (!smsResponse.ok) {
      console.error('❌ Twilio SMS failed:', smsResult)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS',
          twilioError: smsResult,
          portalUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('✅ SMS sent successfully:', smsResult.sid)

    // Step 4: Update client_last_notified_at timestamp
    const { error: updateError } = await supabase
      .from('projects')
      .update({ client_last_notified_at: new Date().toISOString() })
      .eq('id', projectId)

    if (updateError) {
      console.error('❌ Failed to update client_last_notified_at:', updateError)
      // Don't fail the whole request, SMS was sent successfully
    } else {
      console.log('✅ Updated client_last_notified_at timestamp')
    }

    console.log('🎉 Client catch-up notification complete!')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Catch-up notification sent to client',
        portalUrl,
        smsSent: true,
        notifiedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Unexpected error in send-client-portal-catchup:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
