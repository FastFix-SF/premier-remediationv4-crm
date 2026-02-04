import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log('Stripe key exists:', !!stripeKey);
    
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const { changeOrderId, amount, customerEmail, projectSlug, coNumber, description, isPartialPayment } = await req.json();
    console.log('Received request:', { changeOrderId, amount, customerEmail, projectSlug, coNumber, isPartialPayment });

    if (!changeOrderId || !amount) {
      console.error('Missing required fields:', { changeOrderId, amount });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount <= 0) {
      console.error('Invalid amount:', amount);
      return new Response(
        JSON.stringify({ error: 'Amount must be greater than zero' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amountInCents = Math.round(amount * 100);
    console.log('Creating checkout session for amount:', amountInCents, 'cents');

    // Build return URL
    const baseUrl = Deno.env.get('SUPABASE_URL') || '';
    const returnUrl = projectSlug 
      ? `${baseUrl.replace('supabase.co', 'lovable.app')}/portal/${projectSlug}/change-order-complete?session_id={CHECKOUT_SESSION_ID}`
      : `${baseUrl}/change-order-complete?session_id={CHECKOUT_SESSION_ID}`;

    // Create checkout session with embedded mode
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Change Order ${coNumber || changeOrderId.slice(0, 8)}`,
              description: description || 'Change order payment',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      ...(customerEmail && customerEmail.trim() ? { customer_email: customerEmail.trim() } : {}),
      return_url: returnUrl,
      metadata: {
        change_order_id: changeOrderId,
        type: 'change_order',
        is_partial_payment: isPartialPayment ? 'true' : 'false',
      },
    });

    console.log('Checkout session created successfully:', session.id);

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
