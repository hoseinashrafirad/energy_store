/* ثبت‌نام مشتری */
'use strict';
(() => {
  const C = window.EnergyCustomer, CFG = window.ENERGY_CONFIG || {};
  const form = document.querySelector('#register-form');
  const passwordInput = document.querySelector('#password');
  const toggle = document.querySelector('#toggle-password');
  if (toggle && passwordInput) {
    toggle.addEventListener('click', () => {
      const visible = passwordInput.type === 'password';
      passwordInput.type = visible ? 'text' : 'password';
      toggle.classList.toggle('is-visible', visible);
      toggle.setAttribute('aria-pressed', String(visible));
      toggle.setAttribute('aria-label', visible ? 'مخفی‌کردن رمز عبور' : 'نمایش رمز عبور');
    });
  }
  async function hashPassword(value) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  const loginLink = document.querySelector('.auth-switch a');
  const nextParam = new URLSearchParams(location.search).get('next');
  if (loginLink && nextParam) loginLink.href = 'login.html?next=' + encodeURIComponent(nextParam);

  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const username = document.querySelector('#username').value.trim();
    const email = document.querySelector('#email').value.trim().toLowerCase();
    const fullName = document.querySelector('#full-name').value.trim();
    const phoneRaw = C.digits(document.querySelector('#phone').value).replace(/[\s()-]/g, '');
    const note = form.querySelector('.form-note');
    if (!/^\+?\d{8,15}$/.test(phoneRaw)) { note.textContent = 'شماره تماس معتبر نیست؛ با اعداد فارسی یا انگلیسی وارد کن.'; return; }
    if (username.toLowerCase() === String(CFG.adminUser || 'admin').toLowerCase()) { note.textContent = 'این نام کاربری قابل استفاده نیست.'; return; }
    const users = C.read('energyUsers', []);
    if (users.some(user => String(user.username).toLowerCase() === username.toLowerCase() || (email && user.email === email))) {
      note.textContent = 'این نام کاربری یا ایمیل قبلاً ثبت شده است.';
      return;
    }
    const user = { username, email, uid: email || 'u:' + username.toLowerCase(), fullName, phone: phoneRaw, passwordHash: await hashPassword(passwordInput.value), createdAt: new Date().toISOString() };
    users.push(user);
    if (!C.write('energyUsers', users)) return;
    C.login(user);
    C.history('ساخت حساب کاربری');
    sessionStorage.setItem('energyWelcome', username);
    location.href = C.safeNext();
  });
})();
