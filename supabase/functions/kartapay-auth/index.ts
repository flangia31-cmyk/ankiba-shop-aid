import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const clientId = Deno.env.get('KARTAPAY_CLIENT_ID')
    const clientSecret = Deno.env.get('KARTAPAY_CLIENT_SECRET')
    const merchantId = Deno.env.get('KARTAPAY_MERCHANT_ID')

    if (!clientId || !clientSecret || !merchantId) {
      throw new Error('Kartapay credentials not configured')
    }

    // Get OAuth2 token
    const tokenResponse = await fetch('https://auth.kartapay.me/prod/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      throw new Error(`Failed to get Kartapay token: ${error}`)
    }

    const tokenData = await tokenResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        access_token: tokenData.access_token,
        merchant_id: merchantId,
        expires_in: tokenData.expires_in 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Kartapay auth error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
