import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.user.id
    const body = await req.json().catch(() => null)
    const activationCode = typeof body?.activationCode === 'string' ? body.activationCode.trim() : ''
    const businessId = typeof body?.businessId === 'string' ? body.businessId.trim() : ''

    if (!activationCode || activationCode.length > 64 || !businessId || !UUID_RE.test(businessId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Requête invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user owns the business
    const { data: businessData, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('user_id')
      .eq('id', businessId)
      .maybeSingle()

    if (businessError || !businessData || businessData.user_id !== userId) {
      console.warn('Unauthorized business activation attempt', { userId, businessId })
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('activation_codes')
      .select('*')
      .eq('code', activationCode)
      .eq('is_used', false)
      .maybeSingle()

    if (codeError || !codeData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Code d\'activation invalide ou déjà utilisé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ce code d\'activation a expiré' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Aucun abonnement trouvé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const now = new Date()
    let baseDate = now

    if (subscription.status === 'active' && subscription.expires_at) {
      const currentExpiry = new Date(subscription.expires_at)
      if (currentExpiry > now) baseDate = currentExpiry
    } else if (subscription.status === 'trial' && subscription.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at)
      if (trialEnd > now) baseDate = trialEnd
    }

    const durationMonths = codeData.duration_months || 12
    const expiresAt = new Date(baseDate)
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

    const { error: updateCodeError } = await supabaseAdmin
      .from('activation_codes')
      .update({
        is_used: true,
        used_by_business_id: businessId,
        used_at: now.toISOString(),
      })
      .eq('id', codeData.id)
      .eq('is_used', false)

    if (updateCodeError) {
      console.error('Error marking code as used:', updateCodeError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur lors de l\'activation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        plan_id: durationMonths === 1 ? 'monthly' : 'annual',
        amount: codeData.amount || 10000,
        currency: 'FC',
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

    const durationText = durationMonths === 1 ? '1 mois' : '1 an'
    return new Response(
      JSON.stringify({
        success: true,
        message: `Abonnement activé avec succès pour ${durationText}`,
        expires_at: expiresAt.toISOString(),
        duration_months: durationMonths,
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
