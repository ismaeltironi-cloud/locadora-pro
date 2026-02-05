 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 interface ExtractedData {
   plate: string;
   model: string;
   km: number;
   cnpj: string;
   defect_description: string;
 }
 
 async function extractDataWithAI(pdfText: string): Promise<ExtractedData> {
   const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
   if (!LOVABLE_API_KEY) {
     throw new Error("LOVABLE_API_KEY is not configured");
   }
 
   const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
     method: "POST",
     headers: {
       Authorization: `Bearer ${LOVABLE_API_KEY}`,
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       model: "google/gemini-3-flash-preview",
       messages: [
         {
           role: "system",
           content: `Você é um assistente que extrai dados de solicitações de serviços de veículos.
 Extraia as seguintes informações do texto fornecido:
 - Placa do veículo (campo CARRO > Placa)
 - Modelo do veículo (campo CARRO > Modelo)
 - Quilometragem/KM (campo CARRO > Km)
 - CNPJ do cliente (campo FATURAR PARA - apenas os números)
 - Descrição do defeito (campo SERVIÇOS SOLICITADOS)
 
 Retorne APENAS um JSON válido com as chaves: plate, model, km, cnpj, defect_description`
         },
         {
           role: "user",
           content: pdfText
         }
       ],
       tools: [
         {
           type: "function",
           function: {
             name: "extract_vehicle_data",
             description: "Extrai dados do veículo da solicitação de serviço",
             parameters: {
               type: "object",
               properties: {
                 plate: { type: "string", description: "Placa do veículo" },
                 model: { type: "string", description: "Modelo do veículo" },
                 km: { type: "number", description: "Quilometragem do veículo" },
                 cnpj: { type: "string", description: "CNPJ do cliente (apenas números)" },
                 defect_description: { type: "string", description: "Descrição do defeito/serviços solicitados" }
               },
               required: ["plate", "model", "km", "cnpj", "defect_description"],
               additionalProperties: false
             }
           }
         }
       ],
       tool_choice: { type: "function", function: { name: "extract_vehicle_data" } }
     }),
   });
 
   if (!response.ok) {
     const errorText = await response.text();
     console.error("AI Gateway error:", response.status, errorText);
     throw new Error(`AI extraction failed: ${response.status}`);
   }
 
   const data = await response.json();
   const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
   
   if (!toolCall) {
     throw new Error("No tool call response from AI");
   }
 
   return JSON.parse(toolCall.function.arguments);
 }
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     // This endpoint can receive either:
     // 1. Direct PDF text (for testing)
     // 2. Webhook payload from email service (SendGrid/Mailgun)
     const contentType = req.headers.get('content-type') || '';
     let pdfText = '';
 
     if (contentType.includes('application/json')) {
       // Direct JSON payload with PDF text
       const body = await req.json();
       pdfText = body.pdf_text || body.text || '';
       
       if (!pdfText) {
         throw new Error("No PDF text provided");
       }
     } else if (contentType.includes('multipart/form-data')) {
       // Webhook from email service (SendGrid Inbound Parse)
       const formData = await req.formData();
       
       // SendGrid sends email content in 'text' or 'html' fields
       pdfText = formData.get('text') as string || '';
       
       // Check for attachments (PDF)
       const attachmentInfo = formData.get('attachment-info');
       if (attachmentInfo) {
         const attachments = JSON.parse(attachmentInfo as string);
         for (const key of Object.keys(attachments)) {
           const attachment = formData.get(key) as File;
           if (attachment && attachment.type === 'application/pdf') {
             // For now, we'll use the email text content
             // Full PDF parsing would require additional libraries
             console.log("PDF attachment found:", attachment.name);
           }
         }
       }
       
       if (!pdfText) {
         throw new Error("No text content in email");
       }
     } else {
       throw new Error("Unsupported content type");
     }
 
     console.log("Processing service request with text length:", pdfText.length);
 
     // Extract data using AI
     const extractedData = await extractDataWithAI(pdfText);
     console.log("Extracted data:", extractedData);
 
     // Clean CNPJ (remove any non-numeric characters)
     const cleanCnpj = extractedData.cnpj.replace(/\D/g, '');
 
     // Find client by CNPJ
     const { data: client, error: clientError } = await supabase
       .from('clients')
       .select('id, name')
       .or(`cnpj.eq.${cleanCnpj},cnpj.eq.${cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}`)
       .maybeSingle();
 
     if (clientError) {
       console.error("Error finding client:", clientError);
       throw new Error(`Error finding client: ${clientError.message}`);
     }
 
     if (!client) {
       console.log("Client not found for CNPJ:", cleanCnpj);
       return new Response(JSON.stringify({ 
         success: false, 
         error: "Cliente não encontrado",
         cnpj: cleanCnpj,
         extracted_data: extractedData
       }), {
         status: 404,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     console.log("Found client:", client.name);
 
     // Create the vehicle
     const { data: vehicle, error: vehicleError } = await supabase
       .from('vehicles')
       .insert({
         client_id: client.id,
         plate: extractedData.plate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
         model: extractedData.model,
         km: extractedData.km,
         defect_description: extractedData.defect_description,
         status: 'aguardando_entrada',
         needs_tow: false,
       })
       .select()
       .single();
 
     if (vehicleError) {
       console.error("Error creating vehicle:", vehicleError);
       throw new Error(`Error creating vehicle: ${vehicleError.message}`);
     }
 
     console.log("Vehicle created successfully:", vehicle.id);
 
     return new Response(JSON.stringify({ 
       success: true, 
       vehicle_id: vehicle.id,
       client_name: client.name,
       extracted_data: extractedData
     }), {
       status: 200,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
 
   } catch (error) {
     console.error("Error processing service request:", error);
     return new Response(JSON.stringify({ 
       success: false, 
       error: error instanceof Error ? error.message : "Unknown error" 
     }), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 });