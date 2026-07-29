// Netlify Function: create-checkout-session
// Creates a Stripe Checkout Session for the Ibiza Bag.
// Apple Pay / Google Pay are shown automatically by Stripe Checkout
// whenever the shopper's device/browser supports them — no extra
// config needed beyond enabling them in the Stripe Dashboard
// (Settings > Payment methods).

const Stripe = require('stripe');

const PRICE_GBP_PENCE = 3000; // £30.00 — change if the price changes
const SITE_URL = process.env.URL || 'http://localhost:8888';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Stripe is not configured yet. Set STRIPE_SECRET_KEY in Netlify environment variables.' }),
    };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { orderRef, name, email } = JSON.parse(event.body || '{}');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'], // Apple Pay / Google Pay surface automatically via 'card'
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: PRICE_GBP_PENCE,
            product_data: {
              name: 'The Ibiza Bag',
              description: 'Handmade to order crochet bag — HOOKED',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_ref: orderRef || '',
        customer_name: name || '',
      },
      success_url: `${SITE_URL}/success.html?order_ref=${encodeURIComponent(orderRef || '')}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/#order`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
