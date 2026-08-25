# HOOKED — The Ibiza Bag

A premium, mobile-first one-page ordering site, ready to deploy on Netlify.

## What's included

- `index.html`, `styles.css`, `script.js` — the site itself
- `success.html` — thank-you page shown after payment
- `netlify/functions/create-checkout-session.js` — creates a Stripe Checkout Session (card, Apple Pay, Google Pay)
- `netlify/functions/stripe-webhook.js` — emails the customer + you once payment is confirmed
- `netlify.toml`, `package.json` — Netlify + function config

Order details (name, customisation notes, inspiration photos, delivery info) are captured with **Netlify Forms**, which has built-in file upload support and free email notifications — no database needed.

## 1. Photography & logo — already in

Your real logo and product photos are wired in under `assets/`:

- `hooked-logo.png` — your logo, used in the header and footer
- `hero-pink-outfit.jpg` — hero image (bag on the arm, styled with gold jewellery)
- `flatlay-full-bag.jpg`, `detail-macro-hook.jpg`, `lifestyle-car-red.jpg` — the gallery grid in "About the Bag"
- `gift-newspaper.jpg` — the "Buy Her A Crochet Bag" sign, used in the new gifting banner section

A few extra shots you sent (`flatlay-pavers.jpg`, `flatlay-wood-handles.jpg`, plus the earlier fruit-market/marina/cocktail shots) are sitting unused in `assets/` in case you'd like to swap any of them in later — just point a matching `src="assets/…"` at the filename in `index.html`.

To swap or add photos later: drop the file into `assets/`, then update the matching `src="assets/…"` in `index.html`.

## 2. Deploy to Netlify

1. Push this folder to a GitHub/GitLab repo (or drag-and-drop the folder into Netlify's dashboard for a quick first deploy).
2. In Netlify: **Add new site > Import an existing project**, connect the repo. Build settings are already set via `netlify.toml` (publish `.`, functions `netlify/functions`) — no build command needed.
3. Deploy. Your site will be live at a `*.netlify.app` URL (add a custom domain any time under **Domain settings**).

## 3. Turn on Stripe payments

1. Create a [Stripe account](https://dashboard.stripe.com/register) and switch on **Apple Pay** and **Google Pay** under **Settings > Payment methods** (card is on by default).
2. Grab your **Secret key** from Stripe (Developers > API keys).
3. In Netlify: **Site configuration > Environment variables**, add:
   - `STRIPE_SECRET_KEY` — your Stripe secret key
4. Redeploy. The "Pay & Place Order" button will now create a real Stripe Checkout Session and redirect to Stripe's secure hosted payment page (Apple Pay / Google Pay appear automatically on supported devices).
5. Change the price any time by editing `PRICE_GBP_PENCE` in `netlify/functions/create-checkout-session.js`.

## 4. Turn on order notifications (Netlify Forms)

Netlify auto-detects the hidden `hooked-order` form in `index.html`, including the image upload field — nothing to configure to start receiving submissions.

To get emailed for every order:

1. In Netlify: **Site configuration > Forms > Notifications > Add notification > Email notification**.
2. Enter the email address you want orders sent to.

Each submission includes the customer's details, their "dream bag" description, any inspiration photos, and delivery info — viewable in **Site configuration > Forms**, or in your inbox.

**Note on timing:** order details are submitted the moment someone clicks "Pay", just before they're sent to Stripe — this is what allows the (potentially large) inspiration photos to be captured, since Stripe Checkout can't carry file uploads through to its hosted page. If a customer abandons payment, you may still see their order details land in Netlify Forms without a completed payment — the webhook below tells you definitively which orders were actually paid.

## 5. Turn on payment-confirmation emails

The `stripe-webhook` function sends a confirmation email to the customer and an alert to you the moment Stripe confirms payment (not before), using [Resend](https://resend.com) (free tier is generous; swap for any provider you prefer by editing `sendEmail()`).

1. Create a free Resend account, verify a sending domain (or use their test domain to start).
2. In Netlify environment variables, add:
   - `RESEND_API_KEY`
   - `OWNER_EMAIL` — your inbox
   - `FROM_EMAIL` — e.g. `HOOKED <orders@yourdomain.com>`
3. In Stripe: **Developers > Webhooks > Add endpoint**
   - URL: `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`
   - Event: `checkout.session.completed`
4. Copy the **Signing secret** Stripe gives you and add it to Netlify as `STRIPE_WEBHOOK_SECRET`.
5. Redeploy.

You can also turn on Stripe's own automatic payment receipt emails under **Settings > Emails** for extra peace of mind — these are separate from, and complementary to, the custom confirmation above.

## Local testing

```bash
npm install -g netlify-cli
npm install
netlify dev
```

This runs the site with functions locally. Use Stripe's [test card numbers](https://docs.stripe.com/testing) (e.g. `4242 4242 4242 4242`, any future date/CVC) to test payment without charging real money — do this before going live.

## Editing content

- Price, headline, features, FAQ copy all live directly in `index.html` — no build step, just edit and redeploy.
- Colours/fonts/spacing are all defined as CSS variables at the top of `styles.css` under `:root`.
