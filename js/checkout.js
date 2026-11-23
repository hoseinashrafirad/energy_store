/* اطلاعات تحویل سفارش */
'use strict';
(() => {
  const C = window.EnergyCustomer;
  const user = C.current();
  if (!user) { location.replace('login.html?next=checkout.html'); return; }
  if (!C.totals(C.cart()).lines.length) { location.replace('cart.html'); return; }
  const form = document.querySelector('#checkout-form');
  const note = form.querySelector('.form-note');
  const saved = C.read('energyPendingCheckout', null) || {};
  const pre = { fullName: saved.fullName || user.fullName, phone: saved.phone || user.phone, ...saved };
  Object.keys(pre).forEach(k => { const el = form.elements[k]; if (el && pre[k]) el.value = pre[k]; });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    Object.keys(data).forEach(k => { data[k] = String(data[k]).trim(); });
    data.phone = C.digits(data.phone).replace(/[\s()-]/g, '');
    data.postal = C.digits(data.postal).replace(/\s/g, '');
    data.plaque = C.digits(data.plaque);
    if (!/^\+?\d{8,15}$/.test(data.phone)) { note.textContent = 'شماره تماس معتبر نیست؛ با اعداد فارسی یا انگلیسی وارد کن.'; return; }
    if (!/^\d{10}$/.test(data.postal)) { note.textContent = 'کد پستی باید ۱۰ رقم باشد.'; return; }
    note.textContent = '';
    C.write('energyPendingCheckout', data);
    C.history('ثبت اطلاعات ارسال');
    location.href = 'payment.html';
  });
})();
