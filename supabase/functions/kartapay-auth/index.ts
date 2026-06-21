import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Require an authenticated user to mint payment-gateway tokens
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const clientId = Deno.env.get('KARTAPAY_CLIENT_ID')
    const clientSecret = Deno.env.get('KARTAPAY_CLIENT_SECRET')
    const merchantId = Deno.env.get('KARTAPAY_MERCHANT_ID')

    if (!clientId || !clientSecret || !merchantId) {
      console.error('Kartapay credentials not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Service de paiement indisponible' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenResponse = await fetch('https://auth.kartapay.me/prod/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text().catch(() => '')
      console.error('Kartapay auth failed', tokenResponse.status, detail)
      return new Response(
        JSON.stringify({ success: false, error: 'Service de paiement temporairement indisponible' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenResponse.json()

    return new Response(
      JSON.stringify({
        success: true,
        access_token: tokenData.access_token,
        merchant_id: merchantId,
        expires_in: tokenData.expires_in,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: unknown) {
    console.error('Kartapay auth error:', error instanceof Error ? error.message : error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
