/* نمایش اطلاعات حساب مشتری */
'use strict';
(() => {
  const C = window.EnergyCustomer;
  const user = C.current();
  function logoutAccount() {
    localStorage.removeItem('energyCurrentUser');
    sessionStorage.removeItem('energyWelcome');
    location.href = 'index.html';
  }
  document.querySelector('#logout')?.addEventListener('click', logoutAccount);
  document.querySelector('#account-logout')?.addEventListener('click', logoutAccount);
  if (!user) { location.replace('login.html'); return; }

  document.querySelector('#welcome-title').textContent = `${user.username} خوش اومدی!!`;
  const toast = document.querySelector('#welcome-toast');
  if (toast && sessionStorage.getItem('energyWelcome')) {
    toast.textContent = `${user.username} خوش اومدی!!`;
    toast.hidden = false;
    sessionStorage.removeItem('energyWelcome');
  }
  document.querySelector('#profile-info').innerHTML = `<p>نام کاربری: ${C.esc(user.username)}</p>${user.email ? `<p>ایمیل: ${C.esc(user.email)}</p>` : ''}<p>نام و نام خانوادگی: ${C.esc(user.fullName || '—')}</p>${user.phone ? `<p>شماره تماس: ${C.esc(user.phone)}</p>` : ''}`;

  const t = C.totals(C.cart());
  document.querySelector('#cart-summary').textContent = `${t.count.toLocaleString('fa-IR')} کالا در سبد خرید`;
  const preview = document.querySelector('#cart-preview');
  if (preview) {
    preview.innerHTML = t.lines.length
      ? t.lines.map(l => `<div class="cart-preview-row"><span>${C.esc(l.p.name)}</span><b>× ${l.qty.toLocaleString('fa-IR')}</b></div>`).join('')
      : '<small>هنوز محصولی به سبد اضافه نکرده‌ای.</small>';
  }

  const orders = C.read('energyOrders', []).filter(o => (o.customer?.uid && o.customer.uid === C.uidOf(user)) || (user.email && o.customer?.email === user.email));
  document.querySelector('#my-orders').innerHTML = orders.length
    ? orders.map(o => {
        const status = o.status === 'confirmed' ? 'ok' : o.status === 'rejected' ? 'bad' : 'wait';
        const action = o.status === 'confirmed'
          ? `<a class="mini-button" href="invoice.html?id=${encodeURIComponent(o.id)}">مشاهده فیش</a>`
          : o.status === 'rejected'
            ? `<small class="order-reason">${C.esc(o.rejectReason || 'رسید تایید نشد. لطفاً با پشتیبانی تماس بگیر.')}</small>`
            : `<small class="order-reason">رسید شما در حال بررسی است.</small>`;
        return `<div class="order-row"><div><b>سفارش ${C.esc(o.id)}</b><small>${C.esc(C.fmtDate(o.createdAt))} · ${C.esc(o.total)}</small></div><span class="status-badge s-${status}">${C.esc(C.statusText(o))}</span>${action}</div>`;
      }).join('')
    : '<p>هنوز سفارشی ثبت نکرده‌ای.</p>';

  const history = C.read('energyUserHistory', {})[C.uidOf(user)] || [];
  document.querySelector('#activity-list').innerHTML = history.length
    ? history.slice(0, 12).map(item => `<article class="admin-product-row"><div class="admin-product-copy"><b>${C.esc(item.action)}</b><small>${new Date(item.at).toLocaleString('fa-IR')}</small></div></article>`).join('')
    : '<p>هنوز فعالیتی ثبت نشده است.</p>';
})();
