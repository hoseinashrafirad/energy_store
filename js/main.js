/* رفتارهای عمومی رابط کاربری */
"use strict";
(() => {

// منوی موبایل
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");
if (menuButton && navigation) {
  const setOpen = opened => {
    navigation.classList.toggle("open", opened);
    menuButton.setAttribute("aria-expanded", String(opened));
    menuButton.setAttribute("aria-label", opened ? "بستن منو" : "باز کردن منو");
  };
  menuButton.addEventListener("click", () => setOpen(!navigation.classList.contains("open")));
  navigation.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
}

// افکت حرکت سه‌بعدی کارت‌ها با حرکت موس؛ روی دستگاه لمسی غیرفعال می‌ماند.
const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
window.enableEnergyTilt = function () {
  if (!supportsHover) return;
  document.querySelectorAll("[data-tilt]:not([data-tilt-ready])").forEach((card) => {
    card.dataset.tiltReady = "yes";
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.transform = `perspective(850px) rotateX(${(0.5-y)*7}deg) rotateY(${(x-0.5)*7}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
};
window.enableEnergyTilt();

// اسلایدر تصاویر (کارت محصول و صفحه آدرس و درباره ما)
function slideTo(box, step) {
  const slides = box.querySelectorAll(".pslide");
  if (slides.length < 2) return;
  let i = [...slides].findIndex(s => s.classList.contains("is-active"));
  i = (i + step + slides.length) % slides.length;
  slides.forEach((s, n) => s.classList.toggle("is-active", n === i));
  box.querySelectorAll(".pdots i").forEach((d, n) => d.classList.toggle("on", n === i));
}
document.addEventListener("click", e => {
  const b = e.target.closest(".pslide-btn");
  if (!b) return;
  e.preventDefault();
  slideTo(b.closest("[data-slider]"), b.classList.contains("pslide-next") ? 1 : -1);
});
let touchX = null;
document.addEventListener("touchstart", e => { touchX = e.target.closest("[data-slider]") ? e.touches[0].clientX : null; }, { passive: true });
document.addEventListener("touchend", e => {
  const box = e.target.closest("[data-slider]");
  if (touchX === null || !box) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 40) slideTo(box, dx < 0 ? 1 : -1);
});
})();
