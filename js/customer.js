/* حساب مشتری، سبد خرید و ابزارهای مشترک فروشگاه */
(() => {
  'use strict';
  const CFG = window.ENERGY_CONFIG || {};
  const FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';
  const digits = s => String(s ?? '').replace(/[۰-۹]/g, d => FA.indexOf(d)).replace(/[٠-٩]/g, d => AR.indexOf(d));
  const num = v => Number(digits(v).replace(/[^\d]/g, '')) || 0;
  const money = v => num(v).toLocaleString('fa-IR') + ' تومان';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };

  /* پیام کوتاه روی صفحه */
  let toastTimer;
  function toast(message, type) {
    let t = document.getElementById('site-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'site-toast';
      t.className = 'site-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.dataset.type = type || 'info';
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3800);
  }
  const flash = (message, type) => { try { sessionStorage.setItem('energyFlash', JSON.stringify({ message, type })); } catch {} };

  const write = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch { toast('حافظه مرورگر پر است؛ تصویر کم‌حجم‌تری انتخاب کن یا داده‌های قدیمی را حذف کن.', 'error'); return false; }
  };

  /* فشرده‌سازی تصویر پیش از ذخیره‌سازی */
  function compressImage(file, max = 1000, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('image'));
        img.onload = () => {
          const ratio = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * ratio)), h = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  const okImage = f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type);

  /* کاربر فعلی و تاریخچه */
  const current = () => read('energyCurrentUser', null);
  // شناسه یکتای کاربر؛ اگر ایمیل ثبت نشده باشد از نام کاربری ساخته می‌شود
  const uidOf = u => u ? (u.uid || u.email || 'u:' + String(u.username || '').toLowerCase()) : '';
  const history = (action, details = {}) => {
    const u = current(); if (!u) return;
    const all = read('energyUserHistory', {});
    const id = uidOf(u);
    const list = all[id] = all[id] || [];
    list.unshift({ action, details, at: new Date().toISOString() });
    all[id] = list.slice(0, 60);
    write('energyUserHistory', all);
  };

  /* محصول: تصویرها، قیمت، موجودی */
  const images = p => (Array.isArray(p?.images) && p.images.length ? p.images : (p?.image ? [p.image] : []));
  const discountOf = p => Math.min(90, Math.max(0, num(p?.discount)));
  const unit = p => Math.round(num(p?.price) * (100 - discountOf(p)) / 100);
  const stockLeft = p => (p?.stock === undefined || p?.stock === null || p?.stock === '') ? Infinity : num(p.stock);

  /* سبد خرید جدا برای هر کاربر؛ مهمان تا زمان ورود سبد جداگانه دارد */
  const cartKey = () => 'energyCart:' + (uidOf(current()) || 'guest');
  function migrateLegacyCart() {
    const old = read('energyCart', null);
    if (old === null) return;
    if (Array.isArray(old) && old.length && !read('energyCart:guest', []).length) write('energyCart:guest', old);
    try { localStorage.removeItem('energyCart'); } catch {}
  }
  migrateLegacyCart();
  const cart = () => { const c = read(cartKey(), []); return Array.isArray(c) ? c : []; };
  const saveCart = items => write(cartKey(), items);
  function mergeGuestCart() {
    const guest = read('energyCart:guest', []);
    if (!guest.length) return;
    const mine = cart();
    guest.forEach(g => { const row = mine.find(x => x.id === g.id); if (row) row.qty += g.qty; else mine.push(g); });
    saveCart(mine);
    try { localStorage.removeItem('energyCart:guest'); } catch {}
  }
  function login(user) {
    write('energyCurrentUser', { username: user.username, email: user.email || '', uid: uidOf(user), phone: user.phone || '', fullName: user.fullName || '' });
    mergeGuestCart();
  }
  function safeNext() {
    const n = new URLSearchParams(location.search).get('next');
    return ['checkout.html', 'cart.html', 'payment.html'].includes(n) ? n : 'account.html';
  }

  const products = () => read('energyProducts', []);
  function add(id) {
    const p = products().find(x => x.id === id);
    if (!p) return toast('این محصول دیگر موجود نیست.', 'error');
    const items = cart();
    const row = items.find(x => x.id === id);
    const qty = (row ? row.qty : 0) + 1;
    if (qty > stockLeft(p)) return toast('موجودی این محصول کافی نیست.', 'error');
    if (row) row.qty = qty; else items.push({ id, qty: 1 });
    if (!saveCart(items)) return;
    history('افزودن به سبد: ' + p.name, { productId: id });
    toast('محصول به سبد خرید اضافه شد.', 'ok');
  }

  /* محاسبه سبد و کد تخفیف */
  function totals(items) {
    const list = products();
    const lines = [];
    let missing = 0;
    items.forEach(row => {
      const p = list.find(x => x.id === row.id);
      if (!p) { missing++; return; }
      const u = unit(p);
      lines.push({ p, qty: row.qty, unit: u, orig: num(p.price), sum: u * row.qty });
    });
    const subtotal = lines.reduce((a, l) => a + l.sum, 0);
    return { lines, subtotal, missing, count: lines.reduce((a, l) => a + l.qty, 0) };
  }
  const todayStr = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  function couponState(code, subtotal) {
    code = String(code || '').trim().toUpperCase();
    if (!code) return { ok: false, discount: 0, msg: '' };
    const c = read('energyCoupons', []).find(x => x.code === code);
    if (!c || c.active === false) return { ok: false, discount: 0, msg: 'این کد تخفیف معتبر نیست.' };
    const t = todayStr();
    if (c.start && t < c.start) return { ok: false, discount: 0, msg: 'این کد تخفیف هنوز فعال نشده است.' };
    if (c.end && t > c.end) return { ok: false, discount: 0, msg: 'مهلت استفاده از این کد تمام شده است.' };
    if (c.limit && (c.used || 0) >= c.limit) return { ok: false, discount: 0, msg: 'سقف استفاده از این کد پر شده است.' };
    const discount = c.type === 'percent' ? Math.round(subtotal * Math.min(100, c.value) / 100) : Math.min(c.value, subtotal);
    return { ok: true, code, discount, msg: 'کد تخفیف اعمال شد.' };
  }

  const STATUS = { pending: 'در انتظار تایید واریزی', confirmed: 'پرداخت تایید شد', rejected: 'رسید رد شد' };
  const statusText = o => STATUS[o.status] || o.status || '—';
  const fmtDate = iso => iso ? new Date(iso).toLocaleString('fa-IR') : '—';

  /* اطلاعات تماس فوتر */
  const settings = () => Object.assign({ phone: CFG.phone || '', instagram: CFG.instagram || '' }, read('energySiteSettings', {}));
  function telHref(p) {
    const d = digits(p).replace(/[^\d+]/g, '');
    if (d.startsWith('+')) return d;
    if (d.startsWith('00')) return '+' + d.slice(2);
    if (d.startsWith('0')) return '+98' + d.slice(1);
    return d;
  }
  function applyContact() {
    const s = settings();
    document.querySelectorAll('[data-site-phone]').forEach(a => {
      const p = String(s.phone || '').trim();
      a.hidden = !p;
      if (p) { a.href = 'tel:' + telHref(p); const sp = a.querySelector('span'); if (sp) sp.textContent = p; }
    });
    document.querySelectorAll('[data-site-instagram]').forEach(a => {
      const u = String(s.instagram || '').trim();
      const valid = /^https?:\/\//i.test(u);
      a.hidden = !valid;
      if (valid) a.href = u;
    });
  }

  function esc2(s) { return esc(s); }
  function updateHeader() {
    const user = current();
    if (!user) return;
    document.querySelectorAll('a.login-link').forEach(a => {
      a.outerHTML = `<a class="account-chip" href="account.html" aria-label="پنل کاربری"><svg class="user-round-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-3.5 3-5.5 7-5.5s6.4 2 7 5.5"/></svg> <span>${esc2(user.username)}</span> <b>✓</b></a>`;
    });
  }

  window.EnergyCustomer = {
    read, write, esc, num, digits, money, toast, flash, compressImage, okImage, current, uidOf, history,
    images, discountOf, unit, stockLeft, cart, saveCart, add, login, safeNext, products,
    totals, couponState, statusText, fmtDate, settings, applyContact, updateHeader
  };

  document.addEventListener('click', e => { const b = e.target.closest('[data-add-cart]'); if (b) add(b.dataset.addCart); });
  document.addEventListener('change', e => { if (e.target.matches('#site-filter')) history('تغییر فیلتر محصولات', { category: e.target.value }); });

  updateHeader();
  applyContact();
  try {
    const f = sessionStorage.getItem('energyFlash');
    if (f) { sessionStorage.removeItem('energyFlash'); const o = JSON.parse(f); toast(o.message, o.type || 'ok'); }
  } catch {}
})();
