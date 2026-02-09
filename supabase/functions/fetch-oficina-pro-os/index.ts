import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const localSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await localSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { plates, status, os_id, action } = body;

    const oficinProUrl = Deno.env.get('OFICINA_PRO_URL');
    const oficinProKey = Deno.env.get('OFICINA_PRO_ANON_KEY');

    if (!oficinProUrl || !oficinProKey) {
      return new Response(JSON.stringify({ error: 'Oficina Pro credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const oficinaPro = createClient(oficinProUrl, oficinProKey);

    // Diagnostic: list distinct statuses
    if (action === 'list_statuses') {
      const { data: statuses, error: sErr } = await oficinaPro
        .from('service_orders')
        .select('status');
      if (sErr) {
        return new Response(JSON.stringify({ error: sErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const unique = [...new Set((statuses || []).map((s: any) => s.status))];
      return new Response(JSON.stringify({ statuses: unique }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle status update (check-in / check-out)
    if (action === 'update_status' && os_id) {
      const newStatus = body.new_status;
      if (!newStatus) {
        return new Response(JSON.stringify({ error: 'new_status required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'check_in') {
        updateData.checkin_at = new Date().toISOString();
      } else if (newStatus === 'check_out') {
        updateData.checkout_at = new Date().toISOString();
        updateData.data_conclusao = new Date().toISOString().split('T')[0];
      }

      const { data: updated, error: updateError } = await oficinaPro
        .from('service_orders')
        .update(updateData)
        .eq('id', os_id)
        .select('*, vehicle:vehicles(*), client:clients(*)')
        .single();

      if (updateError) {
        console.error('Error updating OS:', updateError);
        // If enum error, try to discover valid values
        if (updateError.message?.includes('enum')) {
          const { data: allOrders } = await oficinaPro
            .from('service_orders')
            .select('status')
            .limit(200);
          const validStatuses = [...new Set((allOrders || []).map((o: any) => o.status))];
          console.log('Available statuses in DB:', validStatuses);
          return new Response(JSON.stringify({ 
            error: 'Failed to update OS', 
            details: updateError.message,
            available_statuses: validStatuses 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'Failed to update OS', details: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ order: updated }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle fetch by ID
    if (os_id && !action) {
      const { data: order, error: orderError } = await oficinaPro
        .from('service_orders')
        .select('*, vehicle:vehicles(*), client:clients(*)')
        .eq('id', os_id)
        .single();

      if (orderError) {
        console.error('Error fetching OS:', orderError);
        return new Response(JSON.stringify({ error: 'Failed to fetch OS', details: orderError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ order }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle list query
    let query = oficinaPro.from('service_orders').select('*, vehicle:vehicles(*), client:clients(*)');

    if (status) {
      query = query.eq('status', status);
    }

    if (plates && Array.isArray(plates) && plates.length > 0) {
      query = query.in('veiculo_placa', plates.map((p: string) => p.toUpperCase()));
    }

    if (!status && (!plates || !Array.isArray(plates) || plates.length === 0)) {
      return new Response(JSON.stringify({ error: 'status, plates, or os_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error('Error fetching OS from Oficina Pro:', ordersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch service orders', details: ordersError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ orders: orders || [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
