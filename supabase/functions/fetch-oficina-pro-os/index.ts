import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const localSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await localSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const { plates, status, os_id, action } = body;

    const oficinProUrl = Deno.env.get('OFICINA_PRO_URL');
    const oficinProKey = Deno.env.get('OFICINA_PRO_ANON_KEY');

    if (!oficinProUrl || !oficinProKey) {
      return jsonResponse({ error: 'Oficina Pro credentials not configured' }, 500);
    }

    const oficinaPro = createClient(oficinProUrl, oficinProKey);

    // ── Check-in / Check-out with photo ──
    if (action === 'checkin_photo' || action === 'checkout_photo') {
      const { photo_base64, content_type } = body;
      if (!os_id) return jsonResponse({ error: 'os_id required' }, 400);
      if (!photo_base64) return jsonResponse({ error: 'photo_base64 required' }, 400);

      const isCheckin = action === 'checkin_photo';
      const photoType = isCheckin ? 'checkin' : 'checkout';
      const fileName = `${os_id}/${photoType}_${Date.now()}.jpg`;

      // Upload photo to os-photos bucket
      const fileBytes = decode(photo_base64);
      const { error: uploadError } = await oficinaPro.storage
        .from('os-photos')
        .upload(fileName, fileBytes, {
          contentType: content_type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return jsonResponse({ error: 'Failed to upload photo', details: uploadError.message }, 500);
      }

      // Get public URL
      const { data: urlData } = oficinaPro.storage
        .from('os-photos')
        .getPublicUrl(fileName);

      const photoUrl = urlData.publicUrl;

      // Update service order with photo URL and optionally status
      const updateData: Record<string, unknown> = {};
      if (isCheckin) {
        updateData.checkin_photo_url = photoUrl;
        updateData.checkin_at = new Date().toISOString();
      } else {
        updateData.checkout_photo_url = photoUrl;
        updateData.checkout_at = new Date().toISOString();
        updateData.data_conclusao = new Date().toISOString().split('T')[0];
        updateData.status = 'finalizada';
      }

      const { data: updated, error: updateError } = await oficinaPro
        .from('service_orders')
        .update(updateData)
        .eq('id', os_id)
        .select('*, vehicle:vehicles(*), client:clients(*)')
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return jsonResponse({ error: 'Failed to update OS', details: updateError.message }, 500);
      }

      return jsonResponse({ order: updated, photo_url: photoUrl });
    }

    // ── Update status (admin manual) ──
    if (action === 'update_status' && os_id) {
      const newStatus = body.new_status;
      if (!newStatus) return jsonResponse({ error: 'new_status required' }, 400);

      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'finalizada') {
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
        return jsonResponse({ error: 'Failed to update OS', details: updateError.message }, 500);
      }

      return jsonResponse({ order: updated });
    }

    // ── Fetch by ID ──
    if (os_id && !action) {
      const { data: order, error: orderError } = await oficinaPro
        .from('service_orders')
        .select('*, vehicle:vehicles(*), client:clients(*)')
        .eq('id', os_id)
        .single();

      if (orderError) {
        console.error('Error fetching OS:', orderError);
        return jsonResponse({ error: 'Failed to fetch OS', details: orderError.message }, 500);
      }

      return jsonResponse({ order });
    }

    // ── List query ──
    let query = oficinaPro.from('service_orders').select('*, vehicle:vehicles(*), client:clients(*)');

    if (status) {
      query = query.eq('status', status);
    }

    if (plates && Array.isArray(plates) && plates.length > 0) {
      query = query.in('veiculo_placa', plates.map((p: string) => p.toUpperCase()));
    }

    if (!status && (!plates || !Array.isArray(plates) || plates.length === 0)) {
      return jsonResponse({ error: 'status, plates, or os_id required' }, 400);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error('Error fetching OS:', ordersError);
      return jsonResponse({ error: 'Failed to fetch service orders', details: ordersError.message }, 500);
    }

    return jsonResponse({ orders: orders || [] });

  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
