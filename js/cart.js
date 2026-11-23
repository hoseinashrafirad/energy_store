/* سبد خرید */
'use strict';
(() => {
  const C = window.EnergyCustomer;
  const $ = s => document.querySelector(s);
  let cart = C.cart();

  function clean() {
    const ids = new Set(C.products().map(p => p.id));
    const kept = cart.filter(r => ids.has(r.id));
    if (kept.length !== cart.length) { cart = kept; C.saveCart(cart); }
  }
  function render() {
    clean();
    const box = $('#cart-items');
    const t = C.totals(cart);
    const checkout = $('#checkout-link');
    if (!t.lines.length) {
      box.innerHTML = '<p>سبد خریدت خالی است.</p>';
      $('#cart-total').innerHTML = '';
      $('#cart-coupon').hidden = true;
      $('#coupon-note').textContent = '';
      checkout.hidden = true;
      return;
    }
    box.innerHTML = t.lines.map(l => {
      const img = C.images(l.p)[0];
      const price = C.discountOf(l.p)
        ? `<s>${C.esc(C.money(l.orig))}</s> ${C.esc(C.money(l.unit))}`
        : C.esc(l.p.price);
      const atMax = l.qty >= C.stockLeft(l.p);
      return `<article class="admin-product-row">${img ? `<img src="${C.esc(img)}" alt="">` : ''}<div class="admin-product-copy"><b>${C.esc(l.p.name)}</b><small>${price} · تعداد ${l.qty.toLocaleString('fa-IR')}</small></div><button class="mini-button" data-plus="${C.esc(l.p.id)}" aria-label="افزایش تعداد"${atMax ? ' disabled' : ''}>+</button><button class="mini-button" data-minus="${C.esc(l.p.id)}" aria-label="کاهش تعداد">−</button><button class="mini-danger" data-remove="${C.esc(l.p.id)}">حذف</button></article>`;
    }).join('');

    $('#cart-coupon').hidden = false;
    const code = C.read('energyPendingCoupon', '');
    const state = C.couponState(code, t.subtotal);
    if (code && !state.ok) { C.write('energyPendingCoupon', ''); }
    $('#coupon-note').textContent = code ? state.msg : '';
    const rows = [`<div class="admin-list-row"><span>جمع اقلام</span><b>${C.esc(C.money(t.subtotal))}</b></div>`];
    if (state.ok) rows.push(`<div class="admin-list-row"><span>کد تخفیف ${C.esc(state.code)}</span><b>− ${C.esc(C.money(state.discount))}</b></div>`);
    rows.push(`<div class="admin-list-row"><span>مبلغ قابل پرداخت</span><b>${C.esc(C.money(t.subtotal - (state.ok ? state.discount : 0)))}</b></div>`);
    $('#cart-total').innerHTML = rows.join('');
    checkout.hidden = false;
    checkout.href = C.current() ? 'checkout.html' : 'login.html?next=checkout.html';
  }

  $('#cart-items').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const id = b.dataset.plus || b.dataset.minus || b.dataset.remove;
    const row = cart.find(x => x.id === id);
    if (!row) return;
    const p = C.products().find(x => x.id === id);
    if (b.dataset.plus) { if (p && row.qty + 1 > C.stockLeft(p)) { C.toast('موجودی این محصول کافی نیست.', 'error'); return; } row.qty++; }
    if (b.dataset.minus) row.qty--;
    if (b.dataset.remove || row.qty < 1) cart = cart.filter(x => x !== row);
    C.saveCart(cart);
    C.history('تغییر سبد خرید');
    render();
  });
  $('#coupon-apply').addEventListener('click', () => {
    const code = $('#coupon-input').value.trim().toUpperCase();
    if (!code) return;
    const state = C.couponState(code, C.totals(cart).subtotal);
    if (state.ok) { C.write('energyPendingCoupon', state.code); $('#coupon-input').value = ''; }
    render();
    $('#coupon-note').textContent = state.msg;
  });
  render();
})();
