import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if any users exist
    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (checkError) {
      throw checkError
    }

    if (existingProfiles && existingProfiles.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Admin user already exists', exists: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let body = {}
    try {
      body = await req.json()
    } catch {
      // No body or invalid JSON
    }

    const { email, password, fullName, username, checkOnly } = body as any

    // If just checking, return that no users exist
    if (checkOnly || !email || !password || !fullName || !username) {
      return new Response(
        JSON.stringify({ exists: false, needsBootstrap: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the first admin user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      throw authError
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        username,
      })

    if (profileError) {
      throw profileError
    }

    // Create admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'admin',
        can_view: true,
        can_edit: true,
        can_checkin: true,
        can_checkout: true,
      })

    if (roleError) {
      throw roleError
    }

    console.log('First admin user created successfully:', email)

    return new Response(
      JSON.stringify({ 
        message: 'Admin user created successfully',
        user: { id: authData.user.id, email }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating admin:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
