/* آدرس و معرفی فروشگاه و باشگاه */
'use strict';
(() => {
  const C = window.EnergyCustomer;
  const host = document.querySelector('#about-entries');
  if (!host) return;
  const entries = C.read('energyAbout', []);
  if (!entries.length) {
    host.innerHTML = '<p class="about-empty">آدرس و معرفی فروشگاه و باشگاه به‌زودی در این بخش قرار می‌گیرد.</p>';
    return;
  }
  const pin = '<svg class="pin-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>';
  host.innerHTML = entries.map(e => {
    const imgs = Array.isArray(e.images) ? e.images : [];
    const slides = imgs.map((src, i) => `<img class="pslide${i === 0 ? ' is-active' : ''}" src="${C.esc(src)}" alt="${C.esc(e.title)}${imgs.length > 1 ? ' — تصویر ' + (i + 1) : ''}" loading="lazy">`).join('');
    const controls = imgs.length > 1
      ? `<button type="button" class="pslide-btn pslide-prev" aria-label="تصویر قبلی">›</button><button type="button" class="pslide-btn pslide-next" aria-label="تصویر بعدی">‹</button><div class="pdots" aria-hidden="true">${imgs.map((_, i) => `<i${i === 0 ? ' class="on"' : ''}></i>`).join('')}</div>`
      : '';
    const media = imgs.length
      ? `<div class="about-media"${imgs.length > 1 ? ' data-slider' : ''}>${slides}${controls}</div>`
      : `<div class="about-media about-media-empty"><span>ENERGY</span></div>`;
    const map = /^https?:\/\//i.test(e.map || '') ? `<a class="button ghost" href="${C.esc(e.map)}" target="_blank" rel="noopener noreferrer">مشاهده روی نقشه</a>` : '';
    return `<section class="about-entry">${media}<div class="about-copy"><span class="about-type">${C.esc(e.type)}</span><h2>${C.esc(e.title)}</h2>${e.address ? `<p class="about-address">${pin}<span>${C.esc(e.address)}</span></p>` : ''}${e.description ? `<p class="about-text">${C.esc(e.description)}</p>` : ''}${map}</div></section>`;
  }).join('');
})();
