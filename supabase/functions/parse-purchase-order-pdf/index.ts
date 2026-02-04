import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MaterialItem {
  category: string;
  item_name: string;
  quantity: number;
  unit: string;
  measurement: string;
  unit_cost: number;
  total: number;
}

interface ParseResponse {
  items: MaterialItem[];
  rawResponse?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText } = await req.json();

    if (!pdfText || typeof pdfText !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid pdfText" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[parse-purchase-order-pdf] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[parse-purchase-order-pdf] Parsing PDF text, length:", pdfText.length);

    const systemPrompt = `You are a material order parser for roofing/construction projects. Extract all material items from the provided text.

The document is organized by sections/categories (like "Low Slope Materials", "Standing Seam Materials", "General Materials", etc.).

For each material item, extract:
- category: The section header this item belongs to
- item_name: Description of the material (e.g., "GTA torch applied Granulated cap sheet")
- quantity: The numeric quantity (e.g., 8 from "8 roll")
- unit: The unit type (Roll, Piece, Section, EA, Box, Bag, Sqr, Each, Bundle, etc.)
- measurement: The measurement info if present (e.g., "6.0 Sq", "136.0 Ft")
- unit_cost: 0 (material orders typically don't include pricing)
- total: 0 (will be calculated later)

IMPORTANT RULES:
- Group items under their section headers
- Parse quantity and unit separately (e.g., "14 10' Section" → qty: 14, unit: "10' Section")
- If a line looks like a header (no qty/unit, bold formatting, all caps), treat it as a category name
- Ignore image references, totals, page numbers, and non-material rows
- Clean up descriptions to be readable
- If no clear category is found, use "General Materials"
- Parse the quantity as a number, not a string`;

    const userPrompt = `Extract all material items from this material order PDF text:

${pdfText}

Return the items as a JSON array.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_materials",
              description: "Extract material items from the PDF text",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", description: "Section/category name" },
                        item_name: { type: "string", description: "Material description" },
                        quantity: { type: "number", description: "Numeric quantity" },
                        unit: { type: "string", description: "Unit type (Roll, Box, EA, etc.)" },
                        measurement: { type: "string", description: "Measurement info if present" },
                        unit_cost: { type: "number", description: "Unit cost (default 0)" },
                        total: { type: "number", description: "Total cost (default 0)" },
                      },
                      required: ["category", "item_name", "quantity", "unit"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_materials" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[parse-purchase-order-pdf] AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to parse PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[parse-purchase-order-pdf] AI response received");

    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_materials") {
      console.error("[parse-purchase-order-pdf] No valid tool call in response");
      return new Response(
        JSON.stringify({ error: "Failed to extract materials", items: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsedItems: MaterialItem[] = [];
    try {
      const args = JSON.parse(toolCall.function.arguments);
      parsedItems = args.items || [];
      
      // Ensure all items have required fields with defaults
      parsedItems = parsedItems.map((item: Partial<MaterialItem>) => ({
        category: item.category || "General Materials",
        item_name: item.item_name || "Unknown Item",
        quantity: typeof item.quantity === "number" ? item.quantity : parseFloat(String(item.quantity)) || 1,
        unit: item.unit || "EA",
        measurement: item.measurement || "",
        unit_cost: item.unit_cost || 0,
        total: item.total || 0,
      }));
      
      console.log("[parse-purchase-order-pdf] Parsed", parsedItems.length, "items");
    } catch (parseError) {
      console.error("[parse-purchase-order-pdf] Failed to parse tool arguments:", parseError);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", items: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: ParseResponse = { items: parsedItems };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[parse-purchase-order-pdf] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
