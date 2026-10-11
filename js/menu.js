/* ==========================================================
   Le Pin — QR-меню
   1. Загружаем данные из data/menu.json
   2. Рисуем обложку с 3 разделами (Кухня / Бар / Вина)
   3. По клику на раздел показываем его категории и позиции
   4. Переключаем язык РУС / ҚАЗ без перезагрузки
   5. Подсвечиваем категорию, которую гость сейчас листает
   ========================================================== */

const state = {
  data: null,
  lang: 'ru',
  menuId: null,     // null = гость ещё на обложке
};

const UI = {
  ru: {
    signature: 'фирменный', noPrice: 'уточняйте', footer: 'Цены указаны в тенге',
    error: 'Не удалось загрузить меню',
    tagline: 'Ресторан и бар при отеле «Дом у озера»',
  },
  kk: {
    signature: 'фирмалық', noPrice: 'нақтылаңыз', footer: 'Бағалар теңгемен көрсетілген',
    error: 'Мәзірді жүктеу мүмкін болмады',
    tagline: '«Дом у озера» қонақүйіндегі мейрамхана және бар',
  },
};

const el = {
  hero: document.querySelector('[data-hero]'),
  heroTagline: document.querySelector('[data-hero-tagline]'),
  heroSections: document.querySelector('[data-hero-sections]'),
  place: document.querySelector('[data-place]'),
  app: document.querySelector('[data-app]'),
  back: document.querySelector('[data-back]'),
  tabs: document.querySelector('[data-tabs]'),
  chips: document.querySelector('[data-chips]'),
  menu: document.querySelector('[data-menu]'),
  footer: document.querySelector('[data-footer-note]'),
  topbar: document.querySelector('.topbar'),
  langButtons: document.querySelectorAll('[data-lang]'),
};

/* ---------- Помощники ---------- */

function t(obj) {
  if (!obj) return '';
  return obj[state.lang] || obj.ru || '';
}

function formatPrice(price) {
  if (price == null) return null;
  return price.toLocaleString('ru-RU') + ' ₸';
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

/* ---------- Обложка ---------- */

function renderHero() {
  el.heroTagline.textContent = UI[state.lang].tagline;
  el.place.textContent = t(state.data.restaurant.place);

  const otherLang = state.lang === 'ru' ? 'kk' : 'ru';
  el.heroSections.innerHTML = state.data.menus
    .map((m) => `
      <button class="hero__section-btn" type="button" data-open-menu="${m.id}">
        <span>
          <span class="hero__section-name">${escapeHTML(t(m.title))}</span>
          <span class="hero__section-kk">${escapeHTML(m.title[otherLang] || '')}</span>
        </span>
        <span class="hero__section-arrow">→</span>
      </button>`)
    .join('');
}

function showHero() {
  state.menuId = null;
  el.hero.hidden = false;
  el.app.hidden = true;
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
  const details = [item.size, t(item.desc)].filter(Boolean).join(' · ');

  return `
    <article class="item">
      <h3 class="item__name">${escapeHTML(t(item.name))}${badge}</h3>
      <p class="item__price ${price ? '' : 'item__price--empty'}">${price || UI[state.lang].noPrice}</p>
      ${details ? `<p class="item__desc">${escapeHTML(details)}</p>` : ''}
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
        ${c.items.map(renderItem).join('')}
      </section>`)
    .join('');
}

function renderMenuView() {
  el.footer.textContent = UI[state.lang].footer;
  document.documentElement.lang = state.lang;
  el.langButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.lang === state.lang));

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
  const offset = el.topbar.offsetHeight + 44; // topbar + chips row
  observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveChip(e.target.id); }),
    { rootMargin: `-${offset}px 0px -70% 0px` }
  );
  el.menu.querySelectorAll('.category').forEach((section) => observer.observe(section));
}

function updateNavOffset() {
  document.documentElement.style.setProperty('--nav-h', `${el.topbar.offsetHeight + 44}px`);
}

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

el.tabs.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-menu-id]');
  if (!btn || btn.dataset.menuId === state.menuId) return;
  state.menuId = btn.dataset.menuId;
  renderMenuView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('resize', updateNavOffset);

/* ---------- Старт ---------- */

async function init() {
  try { state.lang = localStorage.getItem('lepin-lang') || 'ru'; } catch (e) {}

  try {
    const response = await fetch('data/menu.json');
    if (!response.ok) throw new Error(response.status);
    state.data = await response.json();
    renderHero();
  } catch (error) {
    console.error(error);
    el.heroSections.innerHTML = `<p style="color:#f4f1e9">${UI[state.lang].error}</p>`;
  }
}

init();
