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
    // Validate JWT manually
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token)
    
    if (claimsError || !claimsData?.user) {
      console.error('Auth error:', claimsError)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { planId, planName, amount, businessId } = await req.json()

    if (!planId || !amount || !businessId) {
      throw new Error('Missing required fields: planId, amount, businessId')
    }

    const clientId = Deno.env.get('KARTAPAY_CLIENT_ID')
    const clientSecret = Deno.env.get('KARTAPAY_CLIENT_SECRET')
    const merchantId = Deno.env.get('KARTAPAY_MERCHANT_ID')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!clientId || !clientSecret || !merchantId) {
      throw new Error('Kartapay credentials not configured')
    }

    console.log('Starting Kartapay checkout for plan:', planId, 'amount:', amount)

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
      console.error('Token error:', error)
      throw new Error(`Failed to get Kartapay token: ${error}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    console.log('Got access token, creating subscription record...')

    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

    // Create pending subscription record
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        business_id: businessId,
        plan_id: planId,
        status: 'pending',
        amount: amount,
        currency: 'XOF',
      })
      .select()
      .single()

    if (subError) {
      console.error('Subscription creation error:', subError)
      throw new Error(`Failed to create subscription: ${subError.message}`)
    }

    console.log('Subscription created:', subscription.id)

    // Build callback URLs
    const baseUrl = req.headers.get('origin') || 'https://lkcjxuiysqxhwwrchabv.lovable.app'
    const successUrl = `${baseUrl}/subscription?status=success&subscription_id=${subscription.id}`
    const cancelUrl = `${baseUrl}/subscription?status=cancelled`
    const webhookUrl = `${supabaseUrl}/functions/v1/kartapay-webhook`

    // Create Kartapay payment
    const paymentPayload = {
      merchant_id: merchantId,
      amount: amount,
      currency: 'XOF',
      description: `Abonnement ${planName || planId}`,
      reference: subscription.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      webhook_url: webhookUrl,
    }

    console.log('Creating Kartapay payment:', paymentPayload)

    const paymentResponse = await fetch('https://api.kartapay.me/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    })

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text()
      console.error('Payment creation error:', errorText)
      
      // Update subscription status to failed
      await supabase
        .from('subscriptions')
        .update({ status: 'failed' })
        .eq('id', subscription.id)
      
      throw new Error(`Payment creation failed: ${errorText}`)
    }

    const paymentData = await paymentResponse.json()
    console.log('Payment created:', paymentData)

    // Update subscription with transaction ID
    if (paymentData.transaction_id) {
      await supabase
        .from('subscriptions')
        .update({ kartapay_transaction_id: paymentData.transaction_id })
        .eq('id', subscription.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: paymentData.checkout_url || paymentData.payment_url,
        subscription_id: subscription.id,
        transaction_id: paymentData.transaction_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Kartapay checkout error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})