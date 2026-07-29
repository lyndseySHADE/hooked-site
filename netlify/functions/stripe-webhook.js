// Netlify Function: stripe-webhook
// Listens for Stripe's `checkout.session.completed` event and, once payment
// has genuinely succeeded:
//   1. emails the customer a confirmation
//   2. emails the HOOKED inbox a "payment confirmed" alert with the order ref
//
// Uses Resend (resend.com) for email — swap sendEmail() for any provider you prefer.
//
// Set up in Stripe Dashboard > Developers > Webhooks:
//   URL:    https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook
//   Event:  checkout.session.completed

const Stripe = require('stripe');

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'hello@hookedbags.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'HOOKED <orders@hookedbags.com>';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook signature verification failed: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const orderRef = session.metadata?.order_ref || 'N/A';
    const customerName = session.metadata?.customer_name || 'there';
    const customerEmail = session.customer_details?.email || session.customer_email;

    try {
      // Customer confirmation
      if (customerEmail) {
        await sendEmail({
          to: customerEmail,
          subject: 'Your Ibiza Bag order is confirmed 🧡',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
              <h1 style="font-size:22px;">Thank you, ${escapeHtml(customerName)}!</h1>
              <p>Your payment for <strong>The Ibiza Bag</strong> has been received and your order is confirmed.</p>
              <p>Order reference: <strong>${escapeHtml(orderRef)}</strong></p>
              <p>I'll be in touch shortly about your custom design and delivery. Thank you for supporting HOOKED! 💛</p>
            </div>`,
        });
      }

      // Owner alert
      await sendEmail({
        to: OWNER_EMAIL,
        subject: `💰 Payment confirmed — ${orderRef}`,
        html: `
          <div style="font-family:sans-serif;">
            <p>Payment received for order <strong>${escapeHtml(orderRef)}</strong>.</p>
            <p>Customer: ${escapeHtml(customerName)} (${escapeHtml(customerEmail || 'no email')})</p>
            <p>Full customisation details and inspiration images are in the matching Netlify Forms submission (same order ref).</p>
          </div>`,
      });
    } catch (err) {
      console.error('Email sending failed:', err);
      // Don't fail the webhook response over email issues — Stripe will retry
      // the whole event otherwise, and payment itself already succeeded.
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email send.');
    return;
  }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
