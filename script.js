document.getElementById('year').textContent = new Date().getFullYear();

const BASE_PRICE = 30;
const PERSONALISE_UPCHARGE = 5;
const SHIPPING_COST = 3.99;

/* ---------- Bag style toggle: Ibiza Bag vs Coming Soon placeholder ---------- */
const orderFormRest = document.getElementById('orderFormRest');
const comingSoonNote = document.getElementById('comingSoonNote');
const bagStyleRadios = document.querySelectorAll('input[name="bag_style"]');

function updateBagStyleView(){
  const isComingSoon = document.querySelector('input[name="bag_style"]:checked').value === 'coming_soon';
  orderFormRest.hidden = isComingSoon;
  comingSoonNote.hidden = !isComingSoon;

  if (isComingSoon) {
    orderFormRest.querySelectorAll('input, textarea').forEach(el => { el.disabled = true; });
  } else {
    orderFormRest.querySelectorAll('input, textarea').forEach(el => { el.disabled = false; });
  }
}
bagStyleRadios.forEach(r => r.addEventListener('change', updateBagStyleView));
updateBagStyleView();

/* ---------- Order type (as is vs personalise +£5) and delivery (shipping +£3.99 vs collection) ---------- */
const personaliseFields = document.getElementById('personaliseFields');
const personaliseSummaryRow = document.getElementById('personaliseSummaryRow');
const shippingSummaryRow = document.getElementById('shippingSummaryRow');
const orderTotalEl = document.getElementById('orderTotal');
const payBtnText = document.getElementById('payBtnText');
const customisationInput = document.getElementById('customisation');
const orderTypeRadios = document.querySelectorAll('input[name="order_type"]');

const shippingFields = document.getElementById('shippingFields');
const collectionNote = document.getElementById('collectionNote');
const deliveryRadios = document.querySelectorAll('input[name="delivery_method"]');

function formatTotal(amount){
  // Whole pounds show without decimals in the button (£30), summary always shows pence (£30.00)
  return amount.toFixed(2);
}

function isPersonaliseSelected(){
  return document.querySelector('input[name="order_type"]:checked').value === 'personalise';
}
function isShippingSelected(){
  return document.querySelector('input[name="delivery_method"]:checked').value === 'shipping';
}

function currentTotal(){
  let total = BASE_PRICE;
  if (isPersonaliseSelected()) total += PERSONALISE_UPCHARGE;
  if (isShippingSelected()) total += SHIPPING_COST;
  return total;
}

function updateSummary(){
  const total = currentTotal();
  orderTotalEl.textContent = `£${formatTotal(total)}`;
  payBtnText.textContent = `Pay & Place Order · £${formatTotal(total)}`;
}

function updateOrderTypeView(){
  const isPersonalise = isPersonaliseSelected();
  personaliseFields.hidden = !isPersonalise;
  personaliseSummaryRow.hidden = !isPersonalise;
  customisationInput.required = isPersonalise;
  updateSummary();
}
orderTypeRadios.forEach(r => r.addEventListener('change', updateOrderTypeView));

function updateDeliveryView(){
  const isShipping = isShippingSelected();
  shippingFields.hidden = !isShipping;
  shippingSummaryRow.hidden = !isShipping;
  collectionNote.hidden = isShipping;
  // shipping address only required when shipping is selected
  ['address_line1','town_city','postcode'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.required = isShipping;
  });
  updateSummary();
}
deliveryRadios.forEach(r => r.addEventListener('change', updateDeliveryView));

updateOrderTypeView();
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

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('formError').hidden = true;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const isPersonalise = isPersonaliseSelected();
  const isShipping = isShippingSelected();
  const total = currentTotal();

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

    // 2. Create a Stripe Checkout Session for the correct total (base bag,
    //    plus £5 if personalised, plus £3.99 UK shipping if selected),
    //    carrying the order reference + customer details as metadata.
    const sessionResponse = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderRef,
        name: form.name.value,
        email: form.email.value,
        personalise: isPersonalise,
        shipping: isShipping,
      }),
    });

    if (!sessionResponse.ok) throw new Error('Could not start checkout. Please try again.');
    const { url } = await sessionResponse.json();

    // 3. Send the shopper to Stripe's secure hosted checkout
    //    (Apple Pay / Google Pay / card all available there automatically).
    window.location.href = url;

  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again, or email Lyndsey@Shadesocialmedia.info.');
    payBtn.disabled = false;
    payBtnText.textContent = `Pay & Place Order · £${formatTotal(total)}`;
  }
});
