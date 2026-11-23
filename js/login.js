/* ورود مشتری و مدیر */
'use strict';
(() => {
  const C = window.EnergyCustomer, CFG = window.ENERGY_CONFIG || {};
  const form = document.querySelector('[data-check-form]');
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
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const registerLink = document.querySelector('.auth-switch a');
  const nextParam = new URLSearchParams(location.search).get('next');
  if (registerLink && nextParam) registerLink.href = 'register.html?next=' + encodeURIComponent(nextParam);

  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const username = document.querySelector('#username').value.trim();
    const password = passwordInput.value;
    const note = form.querySelector('.form-note');
    const passwordHash = await hashPassword(password);
    if (username.toLowerCase() === String(CFG.adminUser || 'admin').toLowerCase()) {
      if (passwordHash === (C.read('energyAdminHash', null) || CFG.adminHash)) {
        sessionStorage.setItem('energyAdminSession', 'yes');
        location.href = 'admin.html';
      } else if (note) note.textContent = 'نام کاربری یا رمز عبور صحیح نیست.';
      return;
    }
    const users = C.read('energyUsers', []);
    const user = users.find(item => String(item.username || '').toLowerCase() === username.toLowerCase() && item.passwordHash === passwordHash);
    if (!user) { if (note) note.textContent = 'نام کاربری یا رمز عبور صحیح نیست.'; return; }
    C.login(user);
    C.history('ورود به حساب');
    sessionStorage.setItem('energyWelcome', user.username);
    location.href = C.safeNext();
  });
})();
