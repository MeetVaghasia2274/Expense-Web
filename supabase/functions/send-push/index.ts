// Supabase Edge Function: send-push
// Handles: test push, weekly summary, and month-end summary notifications.
// Invoked directly by the client (test) or by a cron schedule (weekly/monthly).

import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT     = 'mailto:notifications@expenseweb.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ── Helpers ──────────────────────────────────────────────────────

function fmt(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function buildPayload(type: string, expenses: any[]): { title: string; body: string } {
  const now    = new Date();
  const week7  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  if (type === 'test') {
    return {
      title: 'Notifications are set up and working.',
      body:  "You'll receive weekly and monthly summaries automatically.",
    };
  }

  if (type === 'weekly') {
    const week = expenses.filter(e => !e.deleted_at && new Date(e.created_at) >= week7);
    const total = week.reduce((s: number, e: any) => s + e.amount, 0);
    const counts: Record<string, number> = {};
    week.forEach((e: any) => { counts[e.category] = (counts[e.category] ?? 0) + e.amount; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    return {
      title: `Weekly Spending: ${fmt(total)}`,
      body:  `7 days · ${week.length} transactions${top ? ` · Top: ${top}` : ''}`,
    };
  }

  if (type === 'monthly') {
    const month = expenses.filter(e => {
      if (e.deleted_at) return false;
      const d = new Date(e.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const week = month.filter((e: any) => new Date(e.created_at) >= week7);
    const monthName = now.toLocaleString('en-IN', { month: 'long' });
    return {
      title: `${monthName} wrapped up at ${fmt(month.reduce((s: number, e: any) => s + e.amount, 0))}`,
      body:  `Past week: ${fmt(week.reduce((s: number, e: any) => s + e.amount, 0))} · ${month.length} transactions this month`,
    };
  }

  return { title: 'Expense Web', body: 'You have a new notification.' };
}

// ── Main handler ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  const type: string = body.type ?? 'weekly';
  const targetEndpoint: string | undefined = body.endpoint;

  // Fetch expenses from DB
  const { data: expenses } = await supabase.from('expenses').select('*');
  const payload = buildPayload(type, expenses ?? []);

  // Fetch subscriptions
  let query = supabase.from('push_subscriptions').select('*');
  if (targetEndpoint) query = query.eq('endpoint', targetEndpoint);
  const { data: subs } = await query;

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ type, title: payload.title, body: payload.body })
      );
      sent++;
    } catch (err: any) {
      console.error(`Push failed for ${sub.endpoint}:`, err?.statusCode, err?.body);
      // Remove stale subscriptions
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
