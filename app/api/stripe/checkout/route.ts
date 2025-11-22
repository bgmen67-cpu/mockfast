import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    // The price ID is the unique identifier for the $1.99/mo subscription
    const priceId = process.env.STRIPE_PRICE_ID!; 
    
    // The Base URL is used for success/cancel redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    // 1. Create the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Pass the Supabase User ID to Stripe metadata
      metadata: {
        user_id: userId,
      },
      // Redirect back to the app on success/cancel
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/?canceled=true`,
    });

    // 2. Return the Stripe Checkout URL
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}