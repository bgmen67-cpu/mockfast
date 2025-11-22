import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { NextResponse } from 'next/server';
import { freeTierRatelimit } from '@/lib/ratelimit';
import { SignJWT } from 'jose';

// We use a direct Supabase client here for admin tasks (logging, fetching)
// This bypasses RLS so the API can always read the data it needs.
const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const handler = async (req: Request, { params }: { params: { id: string } }) => {
  // Await params to satisfy Next.js 15+ requirements
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;

  // 1. Fetch the Endpoint Data
  const { data: endpoint } = await adminDb
    .from('endpoints')
    .select('*, profiles:user_id ( is_pro )')
    .eq('id', id)
    .single();

  if (!endpoint) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  // Check if owner is Pro
  // @ts-ignore
  const isPro = endpoint.profiles?.is_pro || false;

  // 🛑 RATE LIMITING (Redis Check)
  // If they are NOT Pro, we check the speed limit
  if (!isPro) {
    const { success } = await freeTierRatelimit.limit(`rate_limit_endpoint_${id}`);
    if (!success) {
      return NextResponse.json({ error: 'Rate Limit Exceeded (60/min). Upgrade to Pro.' }, { status: 429 });
    }
  }

  // 📝 LOGGING (Fire and forget - doesn't slow down response)
  adminDb.from('request_logs').insert({
    endpoint_id: id,
    method: req.method,
    ip_address: req.headers.get('x-forwarded-for') || 'unknown'
  }).then();

  // 🔒 AUTH CHECK (Bearer Token)
  if (endpoint.protected_token) {
    const auth = req.headers.get('authorization') || '';
    if (auth.replace('Bearer ', '') !== endpoint.protected_token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // 💥 CHAOS MODE (Random Errors)
  if (endpoint.chaos_config?.enabled && Math.random() < endpoint.chaos_config.rate) {
    return NextResponse.json({ error: 'Chaos Monkey 💥' }, { status: 500 });
  }

  // ⏳ ARTIFICIAL DELAY
  if (endpoint.delay_ms > 0) await new Promise(r => setTimeout(r, endpoint.delay_ms));

  // 🧠 SMART SCENARIOS (If/Else Logic)
  const url = new URL(req.url);
  if (endpoint.scenarios && Array.isArray(endpoint.scenarios)) {
    const scenario = endpoint.scenarios.find((s: any) => 
      url.searchParams.get(s.condition_param) === s.condition_value
    );
    if (scenario) {
      return NextResponse.json(JSON.parse(scenario.response_body || '{}'), { status: parseInt(scenario.response_code) });
    }
  }

  // 🏗️ GENERATE RESPONSE (Faker)
  let template = endpoint.json_template;
  
  // Inject Query Params
  url.searchParams.forEach((val, key) => {
    template = template.replace(new RegExp(`{{query.${key}}}`, 'g'), val);
  });

  // Generate JWT if needed
  if(template.includes('{{auth.jwt}}')) {
     const secret = new TextEncoder().encode('secret-key');
     const jwt = await new SignJWT({'role': 'user'}).setProtectedHeader({alg: 'HS256'}).sign(secret);
     template = template.replace('{{auth.jwt}}', jwt);
  }

  let body;
  try {
    body = JSON.parse(faker.helpers.fake(template));
  } catch (e) {
    body = { error: 'JSON Parse Error', raw: template };
  }

  return NextResponse.json(body, {
    status: endpoint.status_code,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      ...endpoint.custom_headers
    }
  });
};

export async function GET(r: Request, c: any) { return handler(r, c); }
export async function POST(r: Request, c: any) { return handler(r, c); }
export async function PUT(r: Request, c: any) { return handler(r, c); }
export async function DELETE(r: Request, c: any) { return handler(r, c); }
export async function OPTIONS() { return new NextResponse(null, { headers: { 'Access-Control-Allow-Origin': '*' } }); }