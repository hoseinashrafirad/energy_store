/* پنل مدیریت ENERGY */
'use strict';
(() => {
  const C = window.EnergyCustomer;
  if (sessionStorage.getItem('energyAdminSession') !== 'yes') { location.replace('login.html'); return; }
  const $ = id => document.getElementById(id);
  const { esc: safe, num, money, read, write, toast } = C;

  let products = read('energyProducts', []);
  let categories = read('energyCategories', ['مکمل', 'لباس']);
  const defaults = {
    checklist: [['برچسب', 'ترکیبات، وزن و تاریخ مصرف'], ['اصالت', 'شناسه و مدارک قابل استعلام'], ['فروشنده', 'اطلاعات تماس و شرایط مرجوعی']],
    comparison: [['مکمل', 'پروتئین وی', 'محصول تغذیه ورزشی'], ['مکمل', 'کراتین', 'محصول تغذیه ورزشی'], ['تجهیزات', 'کش تمرینی', 'ابزار تمرین']]
  };

  /* آپلودر چندتصویره (فشرده‌سازی خودکار) */
  function uploader(inputId, previewId, max) {
    let list = [];
    const input = $(inputId), prev = $(previewId);
    const render = () => { prev.innerHTML = list.map((src, i) => `<div class="thumb"><img src="${safe(src)}" alt="تصویر ${(i + 1).toLocaleString('fa-IR')}"><button type="button" data-rm="${i}" aria-label="حذف تصویر">×</button>${i === 0 ? '<small>اصلی</small>' : ''}</div>`).join(''); };
    input.addEventListener('change', async () => {
      for (const f of [...input.files]) {
        if (list.length >= max) { toast(`حداکثر ${max.toLocaleString('fa-IR')} تصویر مجاز است.`, 'error'); break; }
        if (!C.okImage(f) || f.size > 8 * 1024 * 1024) { toast('فقط JPG، PNG یا WebP تا ۸ مگابایت مجاز است.', 'error'); continue; }
        try { list.push(await C.compressImage(f, 1000, 0.8)); } catch { toast('خواندن تصویر انجام نشد.', 'error'); }
      }
      input.value = ''; render();
    });
    prev.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; list.splice(Number(b.dataset.rm), 1); render(); });
    return { get: () => list.slice(), set: a => { list = Array.isArray(a) ? a.slice() : []; render(); } };
  }
  const productImages = uploader('product-image', 'product-image-preview', 6);
  const aboutImages = uploader('about-image', 'about-image-preview', 4);

  /* دسته‌بندی‌ها */
  function renderCategories() {
    $('product-category').innerHTML = categories.map(c => `<option value="${safe(c)}">${safe(c)}</option>`).join('');
    $('category-admin-list').innerHTML = categories.map(c => `<div class="admin-list-row"><span>${safe(c)}</span><button type="button" data-remove-category="${safe(c)}" class="mini-danger">حذف</button></div>`).join('');
  }

  /* محصولات */
  function renderProducts() {
    $('admin-products').innerHTML = products.length ? products.map(p => {
      const imgs = C.images(p);
      return `<article class="admin-product-row">${imgs[0] ? `<img src="${safe(imgs[0])}" alt="">` : '<div class="admin-image-placeholder">بدون عکس</div>'}<div class="admin-product-copy"><b>${safe(p.name)}</b><small>${safe(p.category)} · ${safe(p.price)} · موجودی: ${num(p.stock).toLocaleString('fa-IR')} · ${imgs.length.toLocaleString('fa-IR')} تصویر</small><span>${safe(p.description || '')}</span><small>تخفیف: ${C.discountOf(p).toLocaleString('fa-IR')}٪ · قیمت نهایی: ${money(C.unit(p))}</small></div><button type="button" data-edit="${safe(p.id)}" class="mini-button">ویرایش</button><button type="button" data-delete="${safe(p.id)}" class="mini-danger">حذف</button></article>`;
    }).join('') : '<p>هنوز محصولی اضافه نشده است.</p>';
  }
  function resetProductForm() {
    $('product-form').reset(); $('product-id').value = '';
    $('product-form-title').textContent = 'افزودن محصول';
    $('product-stock').value = 10; $('product-discount').value = 0;
    productImages.set([]);
  }
  $('product-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    const id = $('product-id').value || crypto.randomUUID();
    const old = products.find(p => p.id === id);
    const images = productImages.get();
    const p = {
      ...old, id, name: $('product-name').value.trim(), category: $('product-category').value,
      price: $('product-price').value.trim(), description: $('product-description').value.trim(),
      images, image: images[0] || '',
      stock: Math.max(0, num($('product-stock').value)), discount: Math.min(90, Math.max(0, num($('product-discount').value)))
    };
    const next = old ? products.map(x => x.id === id ? p : x) : [p, ...products];
    if (!write('energyProducts', next)) return;
    products = next; resetProductForm(); renderAll(); toast('محصول ذخیره شد.', 'ok');
  });
  $('cancel-edit').addEventListener('click', resetProductForm);
  $('admin-products').addEventListener('click', e => {
    const edit = e.target.closest('[data-edit]'), del = e.target.closest('[data-delete]');
    if (edit) {
      const p = products.find(x => x.id === edit.dataset.edit); if (!p) return;
      $('product-id').value = p.id; $('product-name').value = p.name; $('product-category').value = p.category;
      $('product-price').value = p.price; $('product-description').value = p.description || '';
      $('product-stock').value = num(p.stock); $('product-discount').value = C.discountOf(p);
      productImages.set(C.images(p));
      $('product-form-title').textContent = 'ویرایش محصول';
      $('product-editor').scrollIntoView({ behavior: 'smooth' });
    }
    if (del && confirm('این محصول حذف شود؟')) {
      products = products.filter(p => p.id !== del.dataset.delete);
      write('energyProducts', products); renderAll();
    }
  });

  /* دسته‌بندی‌ها: افزودن/حذف */
  $('category-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('category-name').value.trim();
    if (!name || categories.some(x => x.toLowerCase() === name.toLowerCase())) return;
    categories.push(name); write('energyCategories', categories); $('category-name').value = ''; renderCategories();
  });
  $('category-admin-list').addEventListener('click', e => {
    const b = e.target.closest('[data-remove-category]'); if (!b) return;
    const name = b.dataset.removeCategory;
    if (products.some(p => p.category === name) || categories.length < 2) { toast('این دسته قابل حذف نیست.', 'error'); return; }
    categories = categories.filter(x => x !== name); write('energyCategories', categories); renderCategories();
  });

  /* محتوای صفحه اصلی */
  function loadContent() {
    const c = read('energySiteContent', defaults);
    $('checklist-editor').value = (c.checklist || []).map(r => r.join(' | ')).join('\n');
    $('comparison-editor').value = (c.comparison || []).map(r => r.join(' | ')).join('\n');
  }
  $('save-content').addEventListener('click', () => {
    const parse = (id, n) => $(id).value.split('\n').map(x => x.split('|').map(v => v.trim())).filter(r => r.some(Boolean) && r.length === n);
    if (write('energySiteContent', { checklist: parse('checklist-editor', 2), comparison: parse('comparison-editor', 3) })) toast('محتوای صفحه اصلی ذخیره شد.', 'ok');
  });

  /* کد تخفیف */
  function renderCoupons() {
    const cs = read('energyCoupons', []);
    $('coupon-list').innerHTML = cs.map(c => `<div class="admin-list-row"><span><b>${safe(c.code)}</b> · ${c.type === 'percent' ? c.value + '٪' : money(c.value)} · استفاده ${(c.used || 0).toLocaleString('fa-IR')}${c.limit ? ' از ' + c.limit.toLocaleString('fa-IR') : ''}</span><button class="mini-danger" data-coupon="${safe(c.code)}">حذف</button></div>`).join('') || '<p>کدی ساخته نشده است.</p>';
  }
  $('coupon-form').addEventListener('submit', e => {
    e.preventDefault();
    const code = $('coupon-code').value.trim().toUpperCase(), coupons = read('energyCoupons', []);
    if (coupons.some(c => c.code === code)) { toast('این کد قبلاً ثبت شده است.', 'error'); return; }
    const value = num($('coupon-value').value);
    if (!code || !value) return;
    if ($('coupon-type').value === 'percent' && value > 100) { toast('درصد تخفیف نباید بیشتر از ۱۰۰ باشد.', 'error'); return; }
    coupons.push({ code, type: $('coupon-type').value, value, limit: num($('coupon-limit').value), start: $('coupon-start').value, end: $('coupon-end').value, used: 0, active: true });
    if (write('energyCoupons', coupons)) { e.target.reset(); renderCoupons(); toast('کد تخفیف ذخیره شد.', 'ok'); }
  });
  $('coupon-list').addEventListener('click', e => {
    const b = e.target.closest('[data-coupon]'); if (!b) return;
    write('energyCoupons', read('energyCoupons', []).filter(c => c.code !== b.dataset.coupon)); renderCoupons();
  });

  /* تنظیمات پرداخت */
  const pay = read('energyPaymentSettings', { bank: '', holder: '', card: '', guide: 'مبلغ نهایی را کارت‌به‌کارت واریز کن و تصویر رسید را بارگذاری کن.' });
  $('pay-bank').value = pay.bank || ''; $('pay-holder').value = pay.holder || ''; $('pay-card').value = pay.card || ''; $('pay-guide').value = pay.guide || '';
  $('payment-settings-form').addEventListener('submit', e => {
    e.preventDefault();
    if (write('energyPaymentSettings', { bank: $('pay-bank').value.trim(), holder: $('pay-holder').value.trim(), card: $('pay-card').value.trim(), guide: $('pay-guide').value.trim() })) toast('تنظیمات پرداخت ذخیره شد.', 'ok');
  });

  /* ارتباط با ما (فوتر) */
  const st = C.settings();
  $('contact-phone').value = st.phone || ''; $('contact-instagram').value = st.instagram || '';
  $('contact-form').addEventListener('submit', e => {
    e.preventDefault();
    const instagram = $('contact-instagram').value.trim();
    if (instagram && !/^https?:\/\//i.test(instagram)) { toast('لینک باید با https:// شروع شود.', 'error'); return; }
    if (write('energySiteSettings', { phone: $('contact-phone').value.trim(), instagram })) toast('اطلاعات ارتباط با ما ذخیره شد.', 'ok');
  });

  /* آدرس و درباره ما */
  function renderAbout() {
    const list = read('energyAbout', []);
    $('about-list').innerHTML = list.length ? list.map(a => `<article class="admin-product-row">${a.images?.[0] ? `<img src="${safe(a.images[0])}" alt="">` : '<div class="admin-image-placeholder">بدون عکس</div>'}<div class="admin-product-copy"><b>${safe(a.type)} · ${safe(a.title)}</b><small>${safe(a.address || '')}</small><span>${safe((a.description || '').slice(0, 120))}</span></div><button type="button" class="mini-button" data-about-edit="${safe(a.id)}">ویرایش</button><button type="button" class="mini-danger" data-about-del="${safe(a.id)}">حذف</button></article>`).join('') : '<p>هنوز موردی اضافه نشده است.</p>';
  }
  function resetAbout() { $('about-form').reset(); $('about-id').value = ''; $('about-form-title').textContent = 'افزودن آدرس و معرفی'; aboutImages.set([]); }
  $('about-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    const map = $('about-map').value.trim();
    if (map && !/^https?:\/\//i.test(map)) { toast('لینک نقشه باید با https:// شروع شود.', 'error'); return; }
    const list = read('energyAbout', []);
    const id = $('about-id').value || crypto.randomUUID();
    const entry = { id, type: $('about-type').value, title: $('about-title').value.trim(), address: $('about-address').value.trim(), description: $('about-description').value.trim(), map, images: aboutImages.get() };
    const next = list.some(x => x.id === id) ? list.map(x => x.id === id ? entry : x) : [...list, entry];
    if (write('energyAbout', next)) { resetAbout(); renderAbout(); toast('اطلاعات ذخیره شد.', 'ok'); }
  });
  $('about-cancel').addEventListener('click', resetAbout);
  $('about-list').addEventListener('click', e => {
    const ed = e.target.closest('[data-about-edit]'), del = e.target.closest('[data-about-del]');
    const list = read('energyAbout', []);
    if (ed) {
      const a = list.find(x => x.id === ed.dataset.aboutEdit); if (!a) return;
      $('about-id').value = a.id; $('about-type').value = a.type; $('about-title').value = a.title; $('about-address').value = a.address || '';
      $('about-map').value = a.map || ''; $('about-description').value = a.description || ''; aboutImages.set(a.images || []);
      $('about-form-title').textContent = 'ویرایش آدرس و معرفی';
      $('about-admin').scrollIntoView({ behavior: 'smooth' });
    }
    if (del && confirm('این مورد حذف شود؟')) { write('energyAbout', list.filter(x => x.id !== del.dataset.aboutDel)); renderAbout(); }
  });

  /* پیام‌های پشتیبانی */
  function renderMessages() {
    const list = read('energyMessages', []);
    $('admin-messages').innerHTML = list.length ? list.map(m => `<article class="admin-product-row"><div class="admin-product-copy"><b>${safe(m.name)} · ${safe(m.email)}</b><small>${safe(C.fmtDate(m.createdAt))}</small><span>${safe(m.message)}</span></div><button class="mini-danger" data-msg="${safe(m.id)}">حذف</button></article>`).join('') : '<p>هنوز پیامی ثبت نشده است.</p>';
  }
  $('admin-messages').addEventListener('click', e => {
    const b = e.target.closest('[data-msg]'); if (!b) return;
    write('energyMessages', read('energyMessages', []).filter(m => m.id !== b.dataset.msg)); renderMessages();
  });

  /* رسیدهای آپلودی و سفارش‌ها */
  const sCls = o => o.status === 'confirmed' ? 'ok' : o.status === 'rejected' ? 'bad' : 'wait';
  function renderOrders() {
    const all = read('energyOrders', []);
    const f = $('orders-filter').value;
    const orders = all.filter(o => f === 'all' || (o.status || 'pending') === f);
    $('admin-orders').innerHTML = orders.length ? orders.map(o => {
      const c = o.customer || {};
      const pending = (o.status || 'pending') === 'pending';
      return `<article class="receipt-card">
        <div class="receipt-thumb">${o.receipt ? `<button type="button" data-zoom="${safe(o.id)}" aria-label="بزرگ‌نمایی رسید"><img src="${safe(o.receipt)}" alt="رسید واریز ${safe(o.id)}"></button>` : '<div class="admin-image-placeholder">بدون رسید</div>'}</div>
        <div class="receipt-body">
          <div class="receipt-top"><b>سفارش ${safe(o.id)}</b><span class="status-badge s-${sCls(o)}">${safe(C.statusText(o))}</span></div>
          <div class="info-grid">
            <span>خریدار: <b>${safe(c.fullName || c.username || '—')}</b></span>
            <span>نام کاربری: <b>${safe(c.username || '—')}</b></span>
            <span>ایمیل: <b>${safe(c.email || '—')}</b></span>
            <span>تلفن: <b>${safe(c.phone || '—')}</b></span>
            <span>استان / شهر: <b>${safe([c.province, c.city].filter(Boolean).join(' / ') || '—')}</b></span>
            <span>کد پستی: <b>${safe(c.postal || '—')}</b></span>
            <span class="wide">نشانی: <b>${safe(c.address || '—')}${c.plaque ? '، پلاک ' + safe(c.plaque) : ''}</b></span>
          </div>
          <p class="receipt-items">${safe((o.items || []).map(x => x.name + ' × ' + x.qty).join('، '))}</p>
          <p class="receipt-total">مبلغ: <b>${safe(o.total)}</b>${o.coupon ? ` · کد ${safe(o.coupon)}` : ''} · ${safe(C.fmtDate(o.createdAt))}</p>
          ${o.status === 'rejected' && o.rejectReason ? `<p class="receipt-total">دلیل رد: ${safe(o.rejectReason)}</p>` : ''}
          <div class="receipt-actions">
            ${pending ? `<button type="button" class="mini-button" data-confirm="${safe(o.id)}">تایید واریزی</button><button type="button" class="mini-danger" data-reject="${safe(o.id)}">رد رسید</button>` : ''}
            ${o.status === 'confirmed' ? `<a class="mini-button" href="invoice.html?id=${encodeURIComponent(o.id)}">مشاهده / چاپ فیش</a>` : ''}
          </div>
        </div></article>`;
    }).join('') : '<p>موردی برای نمایش وجود ندارد.</p>';
  }
  $('orders-filter').addEventListener('change', renderOrders);
  $('admin-orders').addEventListener('click', e => {
    const orders = read('energyOrders', []);
    const z = e.target.closest('[data-zoom]');
    if (z) {
      const o = orders.find(x => x.id === z.dataset.zoom); if (!o) return;
      const box = document.createElement('div');
      box.className = 'lightbox';
      box.innerHTML = `<img src="${safe(o.receipt)}" alt="رسید واریز"><button type="button" aria-label="بستن">×</button>`;
      box.addEventListener('click', () => box.remove());
      document.body.appendChild(box);
      return;
    }
    const ok = e.target.closest('[data-confirm]'), no = e.target.closest('[data-reject]');
    if (ok) {
      const o = orders.find(x => x.id === ok.dataset.confirm); if (!o) return;
      if (!confirm('واریزی این سفارش تایید شود و فیش صادر شود؟')) return;
      o.status = 'confirmed'; o.confirmedAt = new Date().toISOString(); delete o.rejectReason;
      if (write('energyOrders', orders)) { renderAll(); toast('واریزی تایید شد و فیش صادر شد.', 'ok'); }
    }
    if (no) {
      const o = orders.find(x => x.id === no.dataset.reject); if (!o) return;
      const reason = prompt('دلیل رد رسید را بنویس (برای خریدار نمایش داده می‌شود):');
      if (reason === null) return;
      o.status = 'rejected'; o.rejectReason = reason.trim() || 'رسید تایید نشد.';
      // بازگردانی موجودی و استفاده از کد تخفیف
      products = products.map(p => { const it = (o.items || []).find(x => x.id === p.id); return it && p.stock !== undefined && p.stock !== null && p.stock !== '' ? { ...p, stock: num(p.stock) + num(it.qty) } : p; });
      write('energyProducts', products);
      if (o.coupon) { const cs = read('energyCoupons', []); const c = cs.find(x => x.code === o.coupon); if (c && c.used > 0) { c.used--; write('energyCoupons', cs); } }
      if (write('energyOrders', orders)) { renderAll(); toast('رسید رد شد.', 'ok'); }
    }
  });

  /* گزارش‌ها و آمار */
  function allCarts() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('energyCart:')) { const items = read(k, []); if (items.length) out.push({ owner: k.slice(11) === 'guest' ? 'مهمان' : k.slice(11), items }); }
    }
    return out;
  }
  const paid = () => read('energyOrders', []).filter(o => o.status === 'confirmed');
  function renderStats() {
    $('stat-products').textContent = products.length.toLocaleString('fa-IR');
    $('stat-users').textContent = read('energyUsers', []).length.toLocaleString('fa-IR');
    $('stat-orders').textContent = read('energyOrders', []).length.toLocaleString('fa-IR');
    $('stat-cart').textContent = allCarts().reduce((a, c) => a + c.items.reduce((b, x) => b + num(x.qty), 0), 0).toLocaleString('fa-IR');
  }
  function renderReports() {
    const orders = paid();
    const units = orders.reduce((a, o) => a + (o.items || []).reduce((b, x) => b + num(x.qty), 0), 0);
    const revenue = orders.reduce((a, o) => a + (o.totalNum ?? num(o.total)), 0);
    $('stat-revenue').textContent = money(revenue);
    $('stat-units').textContent = units.toLocaleString('fa-IR');
    $('stat-low-stock').textContent = products.filter(p => p.stock !== undefined && num(p.stock) < 5).length.toLocaleString('fa-IR');
    const rows = {};
    orders.forEach(o => (o.items || []).forEach(x => { const k = x.id || x.name; rows[k] ??= { name: x.name || k, qty: 0, revenue: 0 }; rows[k].qty += num(x.qty); rows[k].revenue += num(x.price) * num(x.qty); }));
    $('product-sales-report').innerHTML = Object.values(rows).length ? Object.values(rows).map(x => `<article class="admin-product-row"><div class="admin-product-copy"><b>${safe(x.name)}</b><small>تعداد فروش: ${x.qty.toLocaleString('fa-IR')} · مبلغ: ${money(x.revenue)}</small></div></article>`).join('') : '<p>هنوز فروش تاییدشده‌ای برای گزارش وجود ندارد.</p>';
    const users = read('energyUsers', []);
    $('admin-members').innerHTML = users.length ? users.map(u => `<article class="admin-product-row"><div class="admin-product-copy"><b>${safe(u.username)}</b><small>${safe(u.email || '')} · ${safe(u.phone || 'شماره ثبت نشده')} · عضویت: ${safe((u.createdAt || '').slice(0, 10))}</small></div></article>`).join('') : '<p>هنوز عضوی ثبت‌نام نکرده است.</p>';
  }

  /* نمایش کامل آمار با کلیک روی کارت‌ها */
  const detail = {
    products: ['همه محصولات', () => products.length ? products.map(p => { const i = C.images(p)[0]; return `<article class="admin-product-row">${i ? `<img src="${safe(i)}" alt="">` : '<div class="admin-image-placeholder">بدون عکس</div>'}<div class="admin-product-copy"><b>${safe(p.name)}</b><small>${safe(p.category)} · ${safe(p.price)} · موجودی: ${num(p.stock).toLocaleString('fa-IR')} · تخفیف: ${C.discountOf(p).toLocaleString('fa-IR')}٪</small></div></article>`; }).join('') : '<p>محصولی ثبت نشده است.</p>'],
    users: ['همه کاربران', () => { const u = read('energyUsers', []); return u.length ? u.map(x => `<article class="admin-product-row"><div class="admin-product-copy"><b>${safe(x.username)}${x.fullName ? ' · ' + safe(x.fullName) : ''}</b><small>${safe(x.email || '')} · ${safe(x.phone || 'شماره ثبت نشده')} · عضویت: ${safe(C.fmtDate(x.createdAt))}</small></div></article>`).join('') : '<p>کاربری ثبت‌نام نکرده است.</p>'; }],
    orders: ['همه سفارش‌ها', () => { const o = read('energyOrders', []); return o.length ? o.map(x => `<article class="admin-product-row"><div class="admin-product-copy"><b>سفارش ${safe(x.id)} · ${safe(x.customer?.fullName || x.customer?.username || '')}</b><small>${safe(C.statusText(x))} · ${safe(x.total)} · ${safe(C.fmtDate(x.createdAt))}</small><span>${safe((x.items || []).map(i => i.name + ' × ' + i.qty).join('، '))}</span></div></article>`).join('') : '<p>سفارشی ثبت نشده است.</p>'; }],
    cart: ['همه اقلام سبدها', () => { const carts = allCarts(); return carts.length ? carts.map(c => { const t = C.totals(c.items); return `<article class="admin-product-row"><div class="admin-product-copy"><b>سبد ${safe(c.owner)}</b><small>${safe(t.lines.map(l => l.p.name + ' × ' + l.qty.toLocaleString('fa-IR')).join('، ') || '—')}</small></div></article>`; }).join('') : '<p>هیچ سبد فعالی وجود ندارد.</p>'; }]
  };
  document.querySelectorAll('[data-stat]').forEach(btn => btn.addEventListener('click', () => {
    const d = detail[btn.dataset.stat]; if (!d) return;
    document.querySelectorAll('[data-stat]').forEach(b => b.setAttribute('aria-expanded', String(b === btn)));
    $('stat-detail-title').textContent = d[0];
    $('stat-detail-body').innerHTML = d[1]();
    $('stat-detail').hidden = false;
    $('stat-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
  $('stat-detail-close').addEventListener('click', () => { $('stat-detail').hidden = true; document.querySelectorAll('[data-stat]').forEach(b => b.setAttribute('aria-expanded', 'false')); });

  /* تغییر رمز مدیر */
  const sha = async v => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)))].map(b => b.toString(16).padStart(2, '0')).join('');
  $('password-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget, note = $('pw-note');
    if (!form.reportValidity()) return;
    const stored = read('energyAdminHash', null) || (window.ENERGY_CONFIG || {}).adminHash;
    if (await sha($('pw-current').value) !== stored) { note.textContent = 'رمز فعلی درست نیست.'; return; }
    if ($('pw-new').value !== $('pw-confirm').value) { note.textContent = 'رمز جدید و تکرار آن یکسان نیست.'; return; }
    if ($('pw-new').value === $('pw-current').value) { note.textContent = 'رمز جدید باید با رمز فعلی فرق داشته باشد.'; return; }
    if (write('energyAdminHash', await sha($('pw-new').value))) { form.reset(); note.textContent = ''; toast('رمز مدیر تغییر کرد.', 'ok'); }
  });

  $('admin-logout').addEventListener('click', () => { sessionStorage.removeItem('energyAdminSession'); location.href = 'login.html'; });

  function renderAll() {
    renderCategories(); renderProducts(); renderStats(); renderOrders(); renderReports(); renderCoupons(); renderAbout(); renderMessages();
    if (!$('stat-detail').hidden) { const open = document.querySelector('[data-stat][aria-expanded="true"]'); if (open) open.click(); }
  }
  loadContent(); resetProductForm(); renderAll();
})();
