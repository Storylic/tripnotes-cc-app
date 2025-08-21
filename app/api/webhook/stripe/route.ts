// app/api/webhook/stripe/route.ts
// Stripe webhook handler for payment events

import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG, calculateFees } from '@/lib/stripe/client';
import { db } from '@/db/client';
import { purchases, creatorEarnings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.WEBHOOK_SECRET
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { 
    id: paymentIntentId,
    amount,
    currency,
    metadata,
    latest_charge,
  } = paymentIntent;

  // Extract metadata
  const userId = metadata?.userId;
  const tripId = metadata?.tripId;
  const creatorId = metadata?.creatorId;

  if (!userId || !tripId || !creatorId) {
    console.error('Missing required metadata in payment intent:', paymentIntentId);
    return;
  }

  // Get charge ID - latest_charge can be string or Charge object
  const chargeId = typeof latest_charge === 'string' ? latest_charge : latest_charge?.id;

  // Update purchase status
  const [purchase] = await db
    .update(purchases)
    .set({
      status: 'completed',
      stripeChargeId: chargeId,
    })
    .where(eq(purchases.stripePaymentIntentId, paymentIntentId))
    .returning();

  if (!purchase) {
    console.error('Purchase not found for payment intent:', paymentIntentId);
    return;
  }

  // Calculate and create creator earnings
  const fees = calculateFees(amount);
  
  await db.insert(creatorEarnings).values({
    creatorId,
    purchaseId: purchase.id,
    amountCents: amount,
    platformFeeCents: fees.platformFeeCents,
    creatorNetCents: fees.creatorNetCents,
    payoutStatus: 'pending',
  });

  console.log('Payment succeeded:', {
    paymentIntentId,
    purchaseId: purchase.id,
    amount,
    creatorEarnings: fees.creatorNetCents,
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { id: paymentIntentId } = paymentIntent;

  // Update purchase status to failed
  await db
    .update(purchases)
    .set({ status: 'failed' })
    .where(eq(purchases.stripePaymentIntentId, paymentIntentId));

  console.log('Payment failed:', paymentIntentId);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const { payment_intent, amount_refunded, refunds } = charge;

  if (!payment_intent || typeof payment_intent !== 'string') {
    console.error('No payment intent in charge refund');
    return;
  }

  // Get refund reason
  const refundReason = refunds?.data[0]?.reason || 'requested_by_customer';

  // Update purchase status
  await db
    .update(purchases)
    .set({
      status: 'refunded',
      refundedAt: new Date(),
      refundReason,
    })
    .where(eq(purchases.stripePaymentIntentId, payment_intent));

  // Update creator earnings to reflect refund
  const [purchase] = await db
    .select()
    .from(purchases)
    .where(eq(purchases.stripePaymentIntentId, payment_intent))
    .limit(1);

  if (purchase) {
    // Mark earnings as refunded
    await db
      .update(creatorEarnings)
      .set({
        payoutStatus: 'refunded',
      })
      .where(eq(creatorEarnings.purchaseId, purchase.id));
  }

  console.log('Charge refunded:', {
    paymentIntent: payment_intent,
    amountRefunded: amount_refunded,
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const {
    payment_intent,
    customer,
    metadata,
    amount_total,
    currency,
  } = session;

  console.log('Checkout session completed:', {
    sessionId: session.id,
    paymentIntent: payment_intent,
    customer,
    amount: amount_total,
  });

  // Additional checkout completion logic here if needed
}