import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterRequest {
  tenantId: string;
  phone: string;
  name?: string;
  isSystemOwner?: boolean; // Flag to assign 'owner' role for system owner bypass
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's auth token to get user info
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: RegisterRequest = await req.json();
    const { tenantId, phone, name, isSystemOwner } = requestData;

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Missing tenantId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Registering user:', { userId: user.id, tenantId, phone, name });

    // Check if user already exists in team_directory for this tenant
    const { data: existingMember } = await supabase
      .from('team_directory')
      .select('id, role, status')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      // User already exists - return current status
      console.log('Existing member found:', existingMember);
      return new Response(
        JSON.stringify({
          role: existingMember.role,
          status: existingMember.status,
          isAutoAdmin: false,
          message: `Welcome back! You are logged in as ${existingMember.role}.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count existing active admins (excludes system owner who has 'owner' role)
    const { count: adminCount, error: countError } = await supabase
      .from('team_directory')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .eq('role', 'admin');

    if (countError) {
      console.error('Error counting admins:', countError);
    }

    const currentAdminCount = adminCount || 0;
    console.log('Current active admin count:', currentAdminCount);

    // Determine role based on existing admins
    // System owner gets 'owner' role via bypass, first 2 regular users get 'admin'
    let role: string;
    let status: 'active' | 'pending';
    let isAutoAdmin = false;
    let message: string;

    if (isSystemOwner) {
      // System owner always gets 'owner' role (highest)
      role = 'owner';
      status = 'active';
      isAutoAdmin = true;
      message = 'Welcome, System Owner! You have full access to this business.';
    } else if (currentAdminCount < 2) {
      // First 2 regular users become admin
      role = 'admin';
      status = 'active';
      isAutoAdmin = true;
      message = 'Welcome! You have been automatically assigned as an admin.';
    } else {
      // Subsequent users need approval
      role = 'member';
      status = 'pending';
      isAutoAdmin = false;
      message = 'Your account has been created and is pending admin approval.';
    }

    // Get email from user metadata or phone
    const userEmail = user.email || user.phone || phone;

    // Create team_directory entry
    const { data: newMember, error: insertError } = await supabase
      .from('team_directory')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        name: name || user.user_metadata?.name || user.user_metadata?.full_name || phone,
        email: userEmail,
        phone: phone,
        role: role,
        status: status,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating team member:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to register user', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('New member created:', newMember);

    // If this is an auto-admin, also add to admin_users table for compatibility
    if (isAutoAdmin && (role === 'owner' || role === 'admin')) {
      await supabase
        .from('admin_users')
        .upsert({
          user_id: user.id,
          email: userEmail,
          is_active: true,
        }, { onConflict: 'user_id' })
        .catch((err) => console.error('Error adding to admin_users:', err));
    }

    return new Response(
      JSON.stringify({
        role,
        status,
        isAutoAdmin,
        message,
        member: newMember
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
