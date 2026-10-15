/* ==========================================================
   Le Pin — QR-меню
   1. Загружаем данные из data/menu.json
   2. Рисуем обложку: 3 раздела (Кухня / Бар / Вина) + 4 плитки
   3. По клику на раздел показываем его категории и позиции
   4. Переключаем язык РУС / ҚАЗ / ENG без перезагрузки
   5. Подсвечиваем категорию, которую гость сейчас листает
   ========================================================== */

const LANGS = ['ru', 'kk', 'en'];

const state = {
  data: null,
  lang: 'ru',
  menuId: null,     // null = гость ещё на обложке
  photos: {},       // фото бутылок из data/photos.json (грузятся после меню)
};

const UI = {
  ru: {
    signature: 'фирменный', noPrice: 'уточняйте', footer: 'Цены указаны в тенге',
    error: 'Не удалось загрузить меню',
    tagline: 'Ресторан и бар при отеле «Дом у озера»',
    close: 'Закрыть', open: 'Открыть', back: 'На обложку',
    instagram: 'Instagram', whatsapp: 'WhatsApp', review: 'Оставить отзыв', site: 'Сайт отеля',
    reviewText: 'Отсканируйте QR или нажмите кнопку — нам важно ваше мнение.',
    siteText: 'Номера, услуги и бронирование отеля «Дом у озера».',
  },
  kk: {
    signature: 'фирмалық', noPrice: 'нақтылаңыз', footer: 'Бағалар теңгемен көрсетілген',
    error: 'Мәзірді жүктеу мүмкін болмады',
    tagline: '«Дом у озера» қонақүйіндегі мейрамхана және бар',
    close: 'Жабу', open: 'Ашу', back: 'Басты бетке',
    instagram: 'Instagram', whatsapp: 'WhatsApp', review: 'Пікір қалдыру', site: 'Қонақүй сайты',
    reviewText: 'QR-ды сканерлеңіз немесе батырманы басыңыз — сіздің пікіріңіз біз үшін маңызды.',
    siteText: '«Дом у озера» қонақүйінің нөмірлері, қызметтері және брондау.',
  },
  en: {
    signature: 'signature', noPrice: 'ask staff', footer: 'Prices are in tenge',
    error: 'Could not load the menu',
    tagline: 'Restaurant & bar at Dom u Ozera Hotel',
    close: 'Close', open: 'Open', back: 'Back to cover',
    instagram: 'Instagram', whatsapp: 'WhatsApp', review: 'Leave a review', site: 'Hotel website',
    reviewText: 'Scan the QR code or tap the button — your feedback matters to us.',
    siteText: 'Rooms, services and booking at Dom u Ozera Hotel.',
  },
};

const el = {
  hero: document.querySelector('[data-hero]'),
  heroTagline: document.querySelector('[data-hero-tagline]'),
  heroSections: document.querySelector('[data-hero-sections]'),
  heroExtras: document.querySelector('[data-hero-extras]'),
  place: document.querySelector('[data-place]'),
  app: document.querySelector('[data-app]'),
  back: document.querySelector('[data-back]'),
  tabs: document.querySelector('[data-tabs]'),
  chips: document.querySelector('[data-chips]'),
  menu: document.querySelector('[data-menu]'),
  footer: document.querySelector('[data-footer-note]'),
  topbar: document.querySelector('.topbar'),
  langButtons: document.querySelectorAll('[data-lang]'),
  modal: document.querySelector('[data-modal]'),
  modalCard: document.querySelector('[data-modal-card]'),
};

/* ---------- Помощники ---------- */

// Берём текст на текущем языке; если перевода нет — русский
function t(obj) {
  if (!obj) return '';
  return obj[state.lang] || obj.ru || '';
}

function formatPrice(price) {
  if (price == null) return null;
  return price.toLocaleString('ru-RU') + ' ₸';
}

// «350 мл» → «350 ml» для английского
function formatSize(size) {
  if (!size || state.lang !== 'en') return size;
  return size.replace('мл', 'ml').replace(/ л$/, ' l').replace(/ г$/, ' g');
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function currentMenu() {
  return state.data.menus.find((m) => m.id === state.menuId);
}

function syncLangButtons() {
  document.documentElement.lang = state.lang;
  el.langButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.lang === state.lang));
  el.back.setAttribute('aria-label', UI[state.lang].back);
}

/* ---------- Обложка ---------- */

function renderHero() {
  syncLangButtons();
  el.heroTagline.textContent = UI[state.lang].tagline;
  el.place.textContent = t(state.data.restaurant.place);

  el.heroSections.innerHTML = state.data.menus
    .map((m) => `
      <button class="hero__section-btn" type="button" data-open-menu="${m.id}">
        <span class="hero__section-name">${escapeHTML(t(m.title))}</span>
        <span class="hero__section-arrow" aria-hidden="true">→</span>
      </button>`)
    .join('');

  renderExtras();
}

/* Иконки — простые inline SVG, чтобы не тянуть библиотеку */
const ICONS = {
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.6"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.1A8 8 0 1 1 8.3 19z"/><path d="M9.2 8.6c.2-.5.6-.5.9-.4l.8 1.8-.6.8c.5 1 1.3 1.8 2.3 2.3l.8-.6 1.8.8c.1.3.1.7-.4.9-.6.4-1.5.5-2.6 0a7.4 7.4 0 0 1-3.4-3.4c-.5-1.1-.4-2 0-2.6z"/></svg>',
  review: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  site: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/></svg>',
};

function renderExtras() {
  const links = state.data.restaurant.links || {};
  const ui = UI[state.lang];
  // Instagram и WhatsApp открываются сразу, отзыв и сайт — окно с QR
  el.heroExtras.innerHTML = `
    <a class="extra" href="${links.instagram}" target="_blank" rel="noopener">${ICONS.instagram}<span>${ui.instagram}</span></a>
    <a class="extra" href="${links.whatsapp}" target="_blank" rel="noopener">${ICONS.whatsapp}<span>${ui.whatsapp}</span></a>
    <button class="extra" type="button" data-extra="reviews">${ICONS.review}<span>${ui.review}</span></button>
    <button class="extra" type="button" data-extra="site">${ICONS.site}<span>${ui.site}</span></button>`;
}

function showQrCard(kind) {
  const ui = UI[state.lang];
  const url = state.data.restaurant.links[kind];
  const title = kind === 'reviews' ? ui.review : ui.site;
  const text = kind === 'reviews' ? ui.reviewText : ui.siteText;
  openModal(`
    <h2 class="modal__title">${title}</h2>
    <p class="modal__text">${text}</p>
    <img class="modal__qr" src="img/qr-${kind}.png" alt="QR — ${title}" width="200" height="200">
    <a class="modal__btn" href="${url}" target="_blank" rel="noopener">${ui.open}</a>
    <button class="modal__btn modal__btn--ghost" type="button" data-modal-close>${ui.close}</button>`);
}

function showHero() {
  state.menuId = null;
  el.hero.hidden = false;
  el.app.hidden = true;
  window.scrollTo(0, 0);
}

function showMenu(menuId) {
  state.menuId = menuId;
  el.hero.hidden = true;
  el.app.hidden = false;
  renderMenuView();
  window.scrollTo(0, 0);
}

/* ---------- Отрисовка меню ---------- */

function renderTabs() {
  el.tabs.innerHTML = state.data.menus
    .map((m) => `
      <button class="tabs__btn ${m.id === state.menuId ? 'is-active' : ''}"
              type="button" role="tab" data-menu-id="${m.id}"
              aria-selected="${m.id === state.menuId}">
        ${escapeHTML(t(m.title))}
      </button>`)
    .join('');
}

function renderChips() {
  el.chips.innerHTML = currentMenu().categories
    .map((c) => `<a class="chip" href="#${c.id}" data-chip="${c.id}">${escapeHTML(t(c.title))}</a>`)
    .join('');
}

function renderItem(item) {
  const price = formatPrice(item.price);
  const badge = item.tag === 'signature' ? `<span class="badge">${UI[state.lang].signature}</span>` : '';
  const size = formatSize(item.size);
  const desc = t(item.desc);
  const name = escapeHTML(t(item.name));

  // Фото лежат внутри data/photos.json (ключ — item.img).
  // Пока файл не загрузился или фото нет — карточка без картинки.
  const src = item.img && state.photos[item.img];
  const photo = src
    ? `<button class="item__photo" type="button" data-photo="${item.img}" data-photo-name="${name}">
         <img src="${src}" alt="${name}" width="56" height="72">
       </button>`
    : '';

  return `
    <article class="item ${src ? 'item--photo' : ''}">
      ${photo}
      <h3 class="item__name">${name}${badge}</h3>
      <p class="item__price ${price ? '' : 'item__price--empty'}">${price || UI[state.lang].noPrice}</p>
      ${size ? `<p class="item__size">${escapeHTML(size)}</p>` : ''}
      ${desc ? `<p class="item__desc">${escapeHTML(desc)}</p>` : ''}
    </article>`;
}

function renderMenuItems() {
  el.menu.innerHTML = currentMenu().categories
    .map((c) => `
      <section class="category" id="${c.id}">
        <div class="category__head">
          <h2 class="category__title">${escapeHTML(t(c.title))}</h2>
          ${c.note ? `<p class="category__note">${escapeHTML(t(c.note))}</p>` : ''}
        </div>
        ${c.intro ? `<p class="category__intro">${escapeHTML(t(c.intro))}</p>` : ''}
        ${c.items.map(renderItem).join('')}
      </section>`)
    .join('');
}

function renderMenuView() {
  el.footer.textContent = UI[state.lang].footer;
  syncLangButtons();
  renderTabs();
  renderChips();
  renderMenuItems();
  updateNavOffset();
  watchCategories();
}

/* ---------- Подсветка активной категории при скролле ---------- */

let observer = null;

function setActiveChip(id) {
  const chip = el.chips.querySelector(`[data-chip="${id}"]`);
  if (!chip) return;
  el.chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
  chip.classList.add('is-active');
  el.chips.scrollTo({
    left: chip.offsetLeft - el.chips.clientWidth / 2 + chip.clientWidth / 2,
    behavior: 'smooth',
  });
}

function watchCategories() {
  if (observer) observer.disconnect();
  const offset = el.topbar.offsetHeight + 54; // верхняя панель + строка категорий
  observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveChip(e.target.id); }),
    { rootMargin: `-${offset}px 0px -70% 0px` }
  );
  el.menu.querySelectorAll('.category').forEach((section) => observer.observe(section));
}

function updateNavOffset() {
  document.documentElement.style.setProperty('--topbar-h', `${el.topbar.offsetHeight}px`);
}

/* ---------- Всплывающее окно (фото и QR) ---------- */

function openModal(html, modifier) {
  el.modalCard.className = `modal__card ${modifier || ''}`;
  el.modalCard.innerHTML = html;
  el.modal.hidden = false;
  document.body.classList.add('is-locked');   // фон не скроллится под окном
}

function closeModal() {
  el.modal.hidden = true;
  el.modalCard.innerHTML = '';
  document.body.classList.remove('is-locked');
}

function showPhoto(src, name) {
  openModal(`
    <img class="modal__photo" src="${src}" alt="${name}">
    <p class="modal__caption">${name}</p>
    <button class="modal__btn modal__btn--ghost" type="button" data-modal-close>${UI[state.lang].close}</button>`, 'modal__card--photo');
}

el.modal.addEventListener('click', (event) => {
  if (event.target.closest('[data-modal-close]')) closeModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !el.modal.hidden) closeModal();
});

el.menu.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-photo]');
  if (btn) showPhoto(state.photos[btn.dataset.photo], btn.dataset.photoName);
});

/* ---------- События ---------- */

el.langButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.lang = btn.dataset.lang;
    try { localStorage.setItem('lepin-lang', state.lang); } catch (e) {}
    renderHero();
    if (state.menuId) renderMenuView();
  });
});

el.heroSections.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-open-menu]');
  if (btn) showMenu(btn.dataset.openMenu);
});

el.back.addEventListener('click', showHero);

el.heroExtras.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-extra]');
  if (btn) showQrCard(btn.dataset.extra);
});

el.tabs.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-menu-id]');
  if (!btn || btn.dataset.menuId === state.menuId) return;
  state.menuId = btn.dataset.menuId;
  renderMenuView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('resize', updateNavOffset);

/* ---------- Старт ---------- */

// Фото грузим вторым запросом, чтобы меню открывалось сразу,
// а картинки «подтягивались» через секунду-две.
async function loadPhotos() {
  try {
    const response = await fetch('data/photos.json');
    if (!response.ok) return;
    state.photos = await response.json();
    if (state.menuId) { renderMenuItems(); watchCategories(); }
  } catch (e) { /* без фото меню всё равно работает */ }
}

async function init() {
  try {
    const saved = localStorage.getItem('lepin-lang');
    if (LANGS.includes(saved)) state.lang = saved;
  } catch (e) {}

  try {
    const response = await fetch('data/menu.json');
    if (!response.ok) throw new Error(response.status);
    state.data = await response.json();
    renderHero();
    loadPhotos();
  } catch (error) {
    console.error(error);
    el.heroSections.innerHTML = `<p class="hero__error">${UI[state.lang].error}</p>`;
  }
}

init();
