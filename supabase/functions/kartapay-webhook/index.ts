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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    const payload = await req.json()
    console.log('Webhook received:', JSON.stringify(payload))

    const {
      reference,
      transaction_id,
      status,
      amount,
      currency,
    } = payload

    if (!reference) {
      console.error('Missing reference in webhook payload')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing reference' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find the subscription by reference (which is the subscription ID)
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', reference)
      .single()

    if (fetchError || !subscription) {
      console.error('Subscription not found:', reference, fetchError)
      return new Response(
        JSON.stringify({ success: false, error: 'Subscription not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Found subscription:', subscription.id, 'current status:', subscription.status)

    // Map Kartapay status to our status
    let newStatus: string
    let startedAt: string | null = null
    let expiresAt: string | null = null

    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
      case 'paid':
        newStatus = 'active'
        startedAt = new Date().toISOString()
        // Set expiry to 30 days from now
        const expiry = new Date()
        expiry.setDate(expiry.getDate() + 30)
        expiresAt = expiry.toISOString()
        break
      case 'failed':
      case 'declined':
      case 'error':
        newStatus = 'failed'
        break
      case 'cancelled':
      case 'canceled':
        newStatus = 'cancelled'
        break
      case 'pending':
        newStatus = 'pending'
        break
      default:
        console.log('Unknown status:', status, '- keeping current status')
        newStatus = subscription.status
    }

    console.log('Updating subscription to status:', newStatus)

    // Update the subscription
    const updateData: Record<string, unknown> = {
      status: newStatus,
      kartapay_transaction_id: transaction_id || subscription.kartapay_transaction_id,
    }

    if (startedAt) updateData.started_at = startedAt
    if (expiresAt) updateData.expires_at = expiresAt

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', reference)

    if (updateError) {
      console.error('Failed to update subscription:', updateError)
      throw new Error(`Failed to update subscription: ${updateError.message}`)
    }

    console.log('Subscription updated successfully')

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Webhook error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})