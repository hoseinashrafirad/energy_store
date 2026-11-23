// نمایش محصولات، فیلتر کشویی و جستجوی زنده
"use strict";
(() => {
const C = window.EnergyCustomer;
const PRODUCTS_KEY = "energyProducts", CATEGORIES_KEY = "energyCategories";
function getArray(key, fallback) { try { const x = JSON.parse(localStorage.getItem(key)); return Array.isArray(x) ? x : fallback; } catch { return fallback; } }
const products = getArray(PRODUCTS_KEY, []);
const categories = getArray(CATEGORIES_KEY, ["مکمل", "لباس"]);
const input = document.querySelector("#site-search");
const filterSelect = document.querySelector("#site-filter");
const results = document.querySelector("#search-results");
const supplementGrid = document.querySelector("#supplement-products");
const allProductsGrid = document.querySelector("#all-products-grid");
const clothingGrid = document.querySelector("#clothing-products");
const clothingNote = document.querySelector("#clothing-coming-soon");
const moreWrap = document.querySelector("#products-more-wrap");
const normalize = value => String(value ?? "").toLocaleLowerCase("fa").trim();
const escapeHTML = C.esc;
let activeCategory = "همه";

function sliderHTML(p) {
  const imgs = C.images(p);
  if (!imgs.length) return `<span>ENERGY PRODUCT</span><b>${escapeHTML(p.name)}</b>`;
  const slides = imgs.map((src, i) => `<img class="pslide${i === 0 ? " is-active" : ""}" src="${escapeHTML(src)}" alt="${escapeHTML(p.name)}${imgs.length > 1 ? " — تصویر " + (i + 1) : ""}" loading="lazy">`).join("");
  const controls = imgs.length > 1
    ? `<button type="button" class="pslide-btn pslide-prev" aria-label="تصویر قبلی">›</button><button type="button" class="pslide-btn pslide-next" aria-label="تصویر بعدی">‹</button><div class="pdots" aria-hidden="true">${imgs.map((_, i) => `<i${i === 0 ? ' class="on"' : ""}></i>`).join("")}</div>`
    : "";
  return slides + controls;
}
function productCard(p) {
  const disc = C.discountOf(p);
  const hasImg = C.images(p).length > 0;
  const left = C.stockLeft(p);
  const soldOut = left <= 0;
  const price = disc
    ? `<div class="price-box"><s>${escapeHTML(C.money(p.price))}</s><strong>${escapeHTML(C.money(C.unit(p)))}</strong></div>`
    : `<div class="price-box"><strong>${escapeHTML(p.price)}</strong></div>`;
  const badge = disc ? `<em class="discount-badge">٪${disc.toLocaleString("fa-IR")} تخفیف</em>` : "";
  const button = soldOut
    ? `<button type="button" class="add-cart-button" disabled>ناموجود</button>`
    : `<button type="button" class="add-cart-button" data-add-cart="${escapeHTML(p.id)}">افزودن به سبد</button>`;
  return `<article class="product-card" data-tilt><div class="product-visual ${hasImg ? "has-product-image" : "visual-purple"}"${C.images(p).length > 1 ? " data-slider" : ""}>${sliderHTML(p)}${badge}</div><div class="product-info"><small>${escapeHTML(p.category)}</small><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.description)}</p><div class="product-bottom">${price}${button}</div></div></article>`;
}
function renderFilterOptions() {
  if (!filterSelect) return;
  filterSelect.innerHTML = `<option value="همه">فیلتر</option>` + categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  filterSelect.value = categories.includes(activeCategory) ? activeCategory : "همه";
}
function matches(p, query) {
  const text = normalize([p.name, p.category, p.description, p.price].join(" "));
  return (!query || text.includes(query)) && (activeCategory === "همه" || p.category === activeCategory);
}
function renderSearch() {
  if (!input || !results) return;
  const query = normalize(input.value);
  if (!query && activeCategory === "همه") { results.hidden = true; return; }
  const found = products.filter(p => matches(p, query));
  results.hidden = false;
  results.innerHTML = found.length ? found.map(p => { const img = C.images(p)[0]; return `<a class="search-result-item" href="products.html">${img ? `<img src="${escapeHTML(img)}" alt="">` : ""}<span><b>${escapeHTML(p.name)}</b><small>${escapeHTML(p.category)} · ${escapeHTML(C.unit(p) && C.discountOf(p) ? C.money(C.unit(p)) : p.price)}</small></span></a>`; }).join("") : "<p class='search-empty'>محصولی پیدا نشد.</p>";
}
const isSupplement = p => p.category === "مکمل" || normalize(p.category).includes("مکمل");
const isClothing = p => normalize(p.category) === "لباس" || normalize(p.category) === "پوشاک";
function renderHome() {
  if (!supplementGrid) return;
  const visible = products.filter(isSupplement).slice(0, 8);
  supplementGrid.innerHTML = visible.length
    ? visible.map(productCard).join("")
    : "<p class='empty-products'>هنوز محصولی در دسته مکمل ثبت نشده است.</p>";
  let shown = visible.length;
  if (clothingGrid) {
    const clothes = products.filter(isClothing).slice(0, 8);
    shown += clothes.length;
    clothingGrid.innerHTML = clothes.length ? clothes.map(productCard).join("") : "";
    if (clothingNote) clothingNote.hidden = clothes.length > 0;
  }
  // دسته‌بندی‌هایی که مدیر اضافه کرده، در صفحه اصلی بخش جدا می‌گیرند
  const host = document.querySelector("#products");
  categories.filter(c => !isSupplement({ category: c }) && !isClothing({ category: c })).forEach(c => {
    const list = products.filter(p => p.category === c).slice(0, 8);
    if (!list.length || !host) return;
    shown += list.length;
    host.insertAdjacentHTML("beforeend", `<div class="category-block"><div class="category-title"><div><h3>${escapeHTML(c)}</h3></div></div><div class="product-grid">${list.map(productCard).join("")}</div></div>`);
  });
  if (moreWrap) moreWrap.hidden = products.length <= shown;
  if (window.enableEnergyTilt) window.enableEnergyTilt();
  renderEditableContent();
}
function renderEditableContent() {
  const data = getArray("energySiteContent", null);
  if (!data) return;
  const checklist = document.querySelector("#editable-checklist tbody");
  const comparison = document.querySelector("#editable-comparison tbody");
  if (checklist) checklist.innerHTML = (data.checklist || []).map(r => `<tr><td>${escapeHTML(r[0])}</td><td>${escapeHTML(r[1])}</td></tr>`).join("");
  if (comparison) comparison.innerHTML = (data.comparison || []).map(r => `<tr><td>${escapeHTML(r[0])}</td><td>${escapeHTML(r[1])}</td><td>${escapeHTML(r[2])}</td></tr>`).join("");
}
function renderAllProducts() {
  if (!allProductsGrid) return;
  const query = normalize(input?.value || "");
  const shown = products.filter(product => matches(product, query));
  allProductsGrid.innerHTML = shown.length
    ? shown.map(productCard).join("")
    : "<p class='empty-products'>محصولی در این دسته پیدا نشد.</p>";
  if (window.enableEnergyTilt) window.enableEnergyTilt();
}
if (filterSelect) filterSelect.addEventListener("change", () => { activeCategory = filterSelect.value; renderSearch(); renderAllProducts(); });
if (input) input.addEventListener("input", () => { renderSearch(); renderAllProducts(); });
renderFilterOptions(); renderHome(); renderAllProducts();
})();
