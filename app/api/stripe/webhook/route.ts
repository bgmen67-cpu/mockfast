import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

// FIX: Cast apiVersion to 'any' here as well
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const supabase = createClient();
    const sig = req.headers.get('stripe-signature');
    let event: Stripe.Event;
    
    const body = await req.text();

    try {
        event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
    } catch (err) {
        console.error(`⚠️ Webhook Error: ${(err as Error).message}`);
        return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId; // Ensure this matches what you sent in checkout

        if (userId) {
            const { error } = await supabase
                .from('profiles')
                .update({ is_pro: true })
                .eq('id', userId);

            if (error) {
                console.error('Supabase update failed:', error);
                return new NextResponse('Supabase update failed', { status: 500 });
            }
        }
    }
    
    return NextResponse.json({ received: true }, { status: 200 });
}