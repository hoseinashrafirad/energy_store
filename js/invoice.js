/* فیش خرید */
'use strict';
(() => {
  const C = window.EnergyCustomer;
  const root = document.querySelector('#invoice-root');
  const actions = document.querySelector('#invoice-actions');
  const id = new URLSearchParams(location.search).get('id');
  const isAdmin = sessionStorage.getItem('energyAdminSession') === 'yes';
  const user = C.current();
  const order = C.read('energyOrders', []).find(o => o.id === id);
  const back = document.querySelector('#invoice-back');
  back.href = isAdmin ? 'admin.html#orders-list' : 'account.html';

  const deny = msg => { root.innerHTML = `<h1>فیش خرید</h1><p>${C.esc(msg)}</p>`; actions.hidden = true; back.hidden = false; actions.hidden = false; document.querySelector('#print-invoice').hidden = true; };
  if (!order) return deny('فیشی با این شماره پیدا نشد.');
  const owner = !!user && ((order.customer?.uid && order.customer.uid === C.uidOf(user)) || (user.email && order.customer?.email === user.email));
  if (!isAdmin && !owner) return deny('دسترسی به این فیش ممکن نیست؛ ابتدا وارد حساب خودت شو.');
  if (!isAdmin && order.status !== 'confirmed') return deny('فیش پس از تایید واریز توسط مدیر صادر می‌شود.');

  const c = order.customer || {};
  const row = (k, v) => v ? `<p><span>${k}</span><b>${C.esc(v)}</b></p>` : '';
  const rows = (order.items || []).map((x, i) => `<tr><td>${(i + 1).toLocaleString('fa-IR')}</td><td>${C.esc(x.name)}</td><td>${C.num(x.qty).toLocaleString('fa-IR')}</td><td>${C.esc(C.money(x.price))}</td><td>${C.esc(C.money(C.num(x.price) * C.num(x.qty)))}</td></tr>`).join('');
  const s = order.status === 'confirmed' ? 'ok' : order.status === 'rejected' ? 'bad' : 'wait';
  const contact = C.settings().phone;
  const subtotal = order.subtotal ?? C.num(order.total);
  root.innerHTML = `
    <div class="invoice-head">
      <div><a class="brand" href="index.html"><span class="brand-mark">E</span>ENERGY</a><p>فیش خرید</p></div>
      <div class="invoice-meta"><b>شماره فیش: ${C.esc(order.id)}</b><span>تاریخ ثبت: ${C.esc(C.fmtDate(order.createdAt))}</span>${order.confirmedAt ? `<span>تاریخ تایید: ${C.esc(C.fmtDate(order.confirmedAt))}</span>` : ''}<span class="status-badge s-${s}">${C.esc(C.statusText(order))}</span></div>
    </div>
    <div class="invoice-grid">
      <div class="invoice-box"><h3>اطلاعات خریدار</h3>${row('نام کاربری', c.username)}${row('ایمیل', c.email)}${row('نام و نام خانوادگی', c.fullName)}${row('شماره تماس', c.phone)}</div>
      <div class="invoice-box"><h3>اطلاعات تحویل</h3>${row('استان / شهر', [c.province, c.city].filter(Boolean).join(' / '))}${row('نشانی', c.address)}${row('پلاک', c.plaque)}${row('کد پستی', c.postal)}</div>
    </div>
    <div class="table-card"><table><thead><tr><th>ردیف</th><th>محصول</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="invoice-totals">
      <p><span>جمع اقلام</span><b>${C.esc(C.money(subtotal))}</b></p>
      ${order.discount ? `<p><span>تخفیف${order.coupon ? ' (' + C.esc(order.coupon) + ')' : ''}</span><b>− ${C.esc(C.money(order.discount))}</b></p>` : ''}
      <p class="grand"><span>مبلغ پرداخت‌شده</span><b>${C.esc(order.total)}</b></p>
    </div>
    <p class="invoice-thanks">از خرید شما سپاسگزاریم.${contact ? ` پشتیبانی: ${C.esc(contact)}` : ''}</p>`;
  document.querySelector('#print-invoice').addEventListener('click', () => window.print());
})();
