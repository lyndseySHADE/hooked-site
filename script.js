document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Delivery method toggle ---------- */
const shippingFields = document.getElementById('shippingFields');
const collectionNote = document.getElementById('collectionNote');
const deliveryRadios = document.querySelectorAll('input[name="delivery_method"]');

function updateDeliveryView(){
  const value = document.querySelector('input[name="delivery_method"]:checked').value;
  const isShipping = value === 'shipping';
  shippingFields.hidden = !isShipping;
  collectionNote.hidden = isShipping;
  // shipping address only required when shipping is selected
  ['address_line1','town_city','postcode'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.required = isShipping;
  });
}
deliveryRadios.forEach(r => r.addEventListener('change', updateDeliveryView));
updateDeliveryView();

/* ---------- Inspiration image preview ---------- */
const inspirationInput = document.getElementById('inspiration');
const fileList = document.getElementById('fileList');
inspirationInput.addEventListener('change', () => {
  fileList.innerHTML = '';
  Array.from(inspirationInput.files).forEach(file => {
    const chip = document.createElement('span');
    chip.className = 'file-chip';
    chip.textContent = file.name;
    fileList.appendChild(chip);
  });
});

/* ---------- Helpers ---------- */
function encodeFormData(formEl){
  // Encodes a form (incl. files) for Netlify Forms via fetch()
  return new FormData(formEl);
}

function showError(message){
  const errorEl = document.getElementById('formError');
  errorEl.textContent = message;
  errorEl.hidden = false;
}

/* ---------- Submit: capture order details, then hand off to Stripe Checkout ---------- */
const form = document.getElementById('orderForm');
const payBtn = document.getElementById('payBtn');
const payBtnText = document.getElementById('payBtnText');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('formError').hidden = true;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  payBtn.disabled = true;
  payBtnText.textContent = 'Please wait…';

  // A reference so the order captured by Netlify Forms and the Stripe
  // payment can be matched back up together later.
  const orderRef = 'HOOKED-' + Date.now().toString(36).toUpperCase();

  try {
    // 1. Capture the full order (details + inspiration images) via Netlify Forms.
    //    This triggers Netlify's built-in email notification to the HOOKED inbox
    //    immediately, tagged with the order reference and "pending payment".
    const formData = encodeFormData(form);
    formData.set('form-name', 'hooked-order');
    formData.set('order_ref', orderRef);

    const netlifyResponse = await fetch('/', {
      method: 'POST',
      body: formData,
    });
    if (!netlifyResponse.ok) throw new Error('Could not save your order details. Please try again.');

    // 2. Create a Stripe Checkout Session for the £30 deposit/payment,
    //    carrying the order reference + customer details as metadata.
    const sessionResponse = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderRef,
        name: form.name.value,
        email: form.email.value,
      }),
    });

    if (!sessionResponse.ok) throw new Error('Could not start checkout. Please try again.');
    const { url } = await sessionResponse.json();

    // 3. Send the shopper to Stripe's secure hosted checkout
    //    (Apple Pay / Google Pay / card all available there automatically).
    window.location.href = url;

  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again, or email hello@hookedbags.com.');
    payBtn.disabled = false;
    payBtnText.textContent = 'Pay & Place Order — £30';
  }
});
