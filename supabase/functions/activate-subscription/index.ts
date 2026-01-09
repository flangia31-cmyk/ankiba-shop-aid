import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate JWT manually
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token)
    
    if (claimsError || !claimsData?.user) {
      console.error('Auth error:', claimsError)
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { activationCode, businessId } = await req.json()

    if (!activationCode || !businessId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Code d\'activation et ID de commerce requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role to update subscription
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Find valid unused activation code
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('activation_codes')
      .select('*')
      .eq('code', activationCode)
      .eq('is_used', false)
      .single()

    if (codeError || !codeData) {
      console.log('Code lookup failed:', codeError)
      return new Response(
        JSON.stringify({ success: false, error: 'Code d\'activation invalide ou déjà utilisé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if code has expired
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ce code d\'activation a expiré' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError) {
      console.log('Subscription lookup failed:', subError)
      return new Response(
        JSON.stringify({ success: false, error: 'Aucun abonnement trouvé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate new expiration date
    const now = new Date()
    let baseDate = now
    
    // If subscription is active or trial is still valid, add time to the remaining period
    if (subscription.status === 'active' && subscription.expires_at) {
      const currentExpiry = new Date(subscription.expires_at)
      if (currentExpiry > now) {
        baseDate = currentExpiry
      }
    } else if (subscription.status === 'trial' && subscription.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at)
      if (trialEnd > now) {
        // Add remaining trial days to the subscription
        baseDate = trialEnd
      }
    }
    
    // Add 1 year to the base date
    const expiresAt = new Date(baseDate)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // Mark code as used
    const { error: updateCodeError } = await supabaseAdmin
      .from('activation_codes')
      .update({
        is_used: true,
        used_by_business_id: businessId,
        used_at: now.toISOString(),
      })
      .eq('id', codeData.id)

    if (updateCodeError) {
      console.error('Error marking code as used:', updateCodeError)
    }

    // Update subscription
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        plan_id: 'annual',
        amount: 5000,
        currency: 'KMF',
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur lors de l\'activation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Subscription activated successfully:', subscription.id, 'expires:', expiresAt.toISOString())

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Abonnement activé avec succès',
        expires_at: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})