// lib/stripe/client.ts
// Stripe client configuration for payments

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_API_VERSION = '2024-12-18.acacia' as const;

if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Initialize Stripe with TypeScript support
export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
  typescript: true,
});

// Constants for Stripe configuration
export const STRIPE_CONFIG = {
  // Platform fee percentage (30%)
  PLATFORM_FEE_PERCENTAGE: 0.30,
  
  // Minimum and maximum prices in cents
  MIN_PRICE_CENTS: 500, // $5
  MAX_PRICE_CENTS: 20000, // $200
  
  // Supported currencies
  SUPPORTED_CURRENCIES: ['usd'] as const,
  
  // Webhook endpoint secret (will be set after webhook creation)
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // Public key for client-side
  PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
};

/**
 * Calculate platform fee and creator earnings
 */
export function calculateFees(amountCents: number) {
  const platformFeeCents = Math.round(amountCents * STRIPE_CONFIG.PLATFORM_FEE_PERCENTAGE);
  const creatorNetCents = amountCents - platformFeeCents;
  
  return {
    amountCents,
    platformFeeCents,
    creatorNetCents,
  };
}

/**
 * Format cents to display currency
 */
export function formatCurrency(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Validate price is within allowed range
 */
export function validatePrice(cents: number): boolean {
  return cents >= STRIPE_CONFIG.MIN_PRICE_CENTS && 
         cents <= STRIPE_CONFIG.MAX_PRICE_CENTS;
}