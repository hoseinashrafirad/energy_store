/* پرداخت کارت‌به‌کارت و بارگذاری رسید */
'use strict';
(() => {
  const C = window.EnergyCustomer;
  const $ = s => document.querySelector(s);
  const user = C.current();
  if (!user) { location.replace('login.html?next=payment.html'); return; }
  const checkout = C.read('energyPendingCheckout', null);
  const items = C.cart();
  let t = C.totals(items);
  if (!t.lines.length) { location.replace('cart.html'); return; }
  if (!checkout) { location.replace('checkout.html'); return; }

  const state = C.couponState(C.read('energyPendingCoupon', ''), t.subtotal);
  const discount = state.ok ? state.discount : 0;
  const total = t.subtotal - discount;

  $('#payment-total').textContent = C.money(total);
  const lines = [`<div class="admin-list-row"><span>جمع اقلام</span><b>${C.esc(C.money(t.subtotal))}</b></div>`];
  if (discount) lines.push(`<div class="admin-list-row"><span>تخفیف (${C.esc(state.code)})</span><b>− ${C.esc(C.money(discount))}</b></div>`);
  $('#payment-lines').innerHTML = lines.join('');
  $('#delivery-summary').textContent = `تحویل‌گیرنده: ${checkout.fullName || '—'} · ${checkout.province || ''} ${checkout.city || ''}`;

  const pay = C.read('energyPaymentSettings', {});
  const hasCard = !!String(pay.card || '').trim();
  $('#bank-info').innerHTML = hasCard
    ? `<small>${C.esc(pay.bank || 'کارت مقصد')}</small><b dir="ltr" id="card-number">${C.esc(pay.card)}</b><span>به نام ${C.esc(pay.holder || '—')}</span>`
    : `<small>اطلاعات کارت</small><span>شماره کارت هنوز ثبت نشده است. لطفاً از بخش پشتیبانی پیگیری کن.</span>`;
  $('#pay-guide').textContent = pay.guide || 'مبلغ نهایی را به کارت بالا واریز کن و تصویر رسید را بارگذاری کن.';
  const copyBtn = $('#copy-card');
  copyBtn.hidden = !hasCard;
  copyBtn.addEventListener('click', async () => {
    const digits = C.digits(pay.card).replace(/[^\d]/g, '');
    try { await navigator.clipboard.writeText(digits); C.toast('شماره کارت کپی شد.', 'ok'); }
    catch { C.toast('کپی انجام نشد؛ شماره را دستی وارد کن.', 'error'); }
  });

  const fileInput = $('#receipt-input'), preview = $('#receipt-preview'), submit = $('#submit-order'), note = $('#pay-note');
  let receipt = '';
  submit.disabled = !hasCard;
  fileInput.addEventListener('change', async () => {
    receipt = ''; preview.hidden = true; note.textContent = '';
    const file = fileInput.files[0];
    if (!file) return;
    if (!C.okImage(file) || file.size > 8 * 1024 * 1024) { note.textContent = 'فقط تصویر JPG، PNG یا WebP تا ۸ مگابایت قابل قبول است.'; fileInput.value = ''; return; }
    try {
      receipt = await C.compressImage(file, 1100, 0.75);
      preview.src = receipt; preview.hidden = false;
    } catch { note.textContent = 'خواندن تصویر انجام نشد؛ تصویر دیگری انتخاب کن.'; fileInput.value = ''; }
  });

  submit.addEventListener('click', () => {
    if (!receipt) { note.textContent = 'ابتدا تصویر رسید واریز را بارگذاری کن.'; return; }
    submit.disabled = true;
    // بازبینی موجودی بلافاصله پیش از ثبت
    const products = C.products();
    t = C.totals(C.cart());
    const short = t.lines.find(l => l.qty > C.stockLeft(products.find(p => p.id === l.p.id)));
    if (short) { C.flash(`موجودی «${short.p.name}» کافی نیست؛ سبد را اصلاح کن.`, 'error'); location.href = 'cart.html'; return; }
    const orders = C.read('energyOrders', []);
    let id;
    do { id = 'EN-' + Date.now().toString().slice(-7) + Math.floor(Math.random() * 10); } while (orders.some(o => o.id === id));
    const order = {
      id,
      customer: { username: user.username, email: user.email, uid: C.uidOf(user), ...checkout },
      items: t.lines.map(l => ({ id: l.p.id, name: l.p.name, qty: l.qty, price: l.unit, originalPrice: l.orig, image: C.images(l.p)[0] || '' })),
      subtotal: t.subtotal, discount, coupon: state.ok ? state.code : '',
      totalNum: total, total: C.money(total),
      status: 'pending', receipt,
      createdAt: new Date().toISOString()
    };
    // کم‌کردن موجودی
    const updated = products.map(p => { const l = t.lines.find(x => x.p.id === p.id); return l && p.stock !== undefined && p.stock !== null && p.stock !== '' ? { ...p, stock: Math.max(0, C.num(p.stock) - l.qty) } : p; });
    orders.unshift(order);
    if (!C.write('energyOrders', orders)) { submit.disabled = false; return; }
    C.write('energyProducts', updated);
    if (state.ok) { const cs = C.read('energyCoupons', []); const c = cs.find(x => x.code === state.code); if (c) { c.used = (c.used || 0) + 1; C.write('energyCoupons', cs); } }
    C.saveCart([]);
    C.write('energyPendingCheckout', null);
    C.write('energyPendingCoupon', '');
    C.history('ثبت سفارش ' + id, { orderId: id });
    C.flash('سفارش ثبت شد. پس از تایید واریز توسط مدیر، فیش خرید در پنل شما قرار می‌گیرد.', 'ok');
    location.href = 'account.html';
  });
})();
