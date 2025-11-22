import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Get the Stripe Customer ID from Supabase (Assuming you saved it, 
    // or we search Stripe by email if you didn't save it in profiles table)
    const customers = await stripe.customers.list({ email: user.email });
    let customerId = customers.data[0]?.id;

    if (!customerId) {
        return NextResponse.json({ error: 'No billing history found' }, { status: 404 });
    }

    // 2. Create the Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`, // Send them back to dashboard
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}