/* ثبت پیام پشتیبانی */
'use strict';
(() => {
  const C = window.EnergyCustomer;
  const form = document.querySelector('#support-form');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const messages = C.read('energyMessages', []);
    messages.unshift({
      id: 'MSG-' + Date.now().toString(36).toUpperCase(),
      name: form.querySelector('#name').value.trim(),
      email: form.querySelector('#email').value.trim(),
      message: form.querySelector('#message').value.trim(),
      createdAt: new Date().toISOString()
    });
    if (!C.write('energyMessages', messages.slice(0, 200))) return;
    form.reset();
    const note = form.querySelector('.form-note');
    if (note) note.textContent = 'پیام شما ثبت شد. به‌زودی بررسی می‌شود.';
    C.toast('پیام شما ثبت شد.', 'ok');
  });
})();
