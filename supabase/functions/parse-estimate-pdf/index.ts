import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawText } = await req.json();

    if (!rawText || typeof rawText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'rawText is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('[parse-estimate-pdf] Received text length:', rawText.length);
    console.log('[parse-estimate-pdf] First 500 chars:', rawText.substring(0, 500));

    const systemPrompt = `You are an estimate document parser for construction and roofing projects. Your job is to find and extract the TOTAL costs for five specific categories from estimate documents.

Extract the following totals:
1. **Contract Price / Grand Total** - Look for: "Grand Total", "Total Price", "Contract Price", "Estimate Total", "Project Total", "Total Cost", "Amount Due", or the final total amount of the entire estimate
2. **Labor Total** - Look for: "Total Labor", "Labor Cost", "Labor Subtotal", "Crew Cost", "Installation Labor", "Workmanship", or similar labor-related totals
3. **Materials Total** - Look for: "Total Materials", "Materials Cost", "Material Subtotal", "Supplies", "Product Cost", or similar materials-related totals
4. **Overhead Total** - Look for: "Overhead", "Other Costs", "Miscellaneous", "Admin Costs", "Contingency", or similar overhead/misc totals (NOT profit - overhead is separate)
5. **Profit Total** - Look for: "Profit", "Company Profit", "Net Profit", "Markup", "Margin", "Contractor's Profit", "Builder's Profit", or similar profit/markup amounts

IMPORTANT RULES:
- Look for TOTALS, not individual line items
- The contract_price should be the GRAND TOTAL of the entire estimate (the final amount the customer pays)
- If you find multiple labor sections, sum them up for the total
- If you can't find a specific category, return 0 for that category
- Return dollar amounts as plain numbers (no $ signs or commas)
- If a value shows as negative, return 0
- If overhead and profit are combined (like "Profit & Overhead: $10,000"), try to split them or put the full value in profit
- Profit and overhead are SEPARATE categories - don't combine them`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse this estimate document and extract the Contract Price (grand total), Labor, Materials, Overhead, and Company Profit costs:\n\n${rawText}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_estimate_totals',
              description: 'Extract the total costs for contract price, labor, materials, overhead, and profit from an estimate document',
              parameters: {
                type: 'object',
                properties: {
                  contract_price: { 
                    type: 'number', 
                    description: 'The grand total / contract price / estimate total in dollars (number only, no currency symbol)' 
                  },
                  labor_total: { 
                    type: 'number', 
                    description: 'Total labor cost in dollars (number only, no currency symbol)' 
                  },
                  materials_total: { 
                    type: 'number', 
                    description: 'Total materials cost in dollars (number only, no currency symbol)' 
                  },
                  overhead_total: { 
                    type: 'number', 
                    description: 'Total overhead/other costs in dollars (number only, no currency symbol)' 
                  },
                  profit_total: { 
                    type: 'number', 
                    description: 'Total company profit/markup in dollars (number only, no currency symbol)' 
                  }
                },
                required: ['contract_price', 'labor_total', 'materials_total', 'overhead_total', 'profit_total'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_estimate_totals' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[parse-estimate-pdf] AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits or enter values manually.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[parse-estimate-pdf] AI response:', JSON.stringify(data, null, 2));

    // Extract values from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== 'extract_estimate_totals') {
      console.error('[parse-estimate-pdf] No valid tool call in response');
      throw new Error('Failed to extract estimate totals from AI response');
    }

    const parsedArgs = JSON.parse(toolCall.function.arguments);
    const result = {
      contract_price: parsedArgs.contract_price || 0,
      labor_total: parsedArgs.labor_total || 0,
      materials_total: parsedArgs.materials_total || 0,
      overhead_total: parsedArgs.overhead_total || 0,
      profit_total: parsedArgs.profit_total || 0
    };

    console.log('[parse-estimate-pdf] Extracted totals:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[parse-estimate-pdf] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
