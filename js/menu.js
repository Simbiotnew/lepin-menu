/* ==========================================================
   Le Pin — QR-меню
   1. Загружаем данные из data/menu.json
   2. Рисуем вкладки (Кухня / Бар), категории и позиции
   3. Переключаем язык РУС / ҚАЗ без перезагрузки
   4. Подсвечиваем категорию, которую гость сейчас листает
   ========================================================== */

// Состояние приложения: что сейчас выбрано
const state = {
  data: null,
  lang: 'ru',
  menuId: 'kitchen',
};

// Тексты интерфейса на двух языках
const UI = {
  ru: { signature: 'фирменный', noPrice: 'уточняйте', footer: 'Цены указаны в тенге', error: 'Не удалось загрузить меню' },
  kk: { signature: 'фирмалық', noPrice: 'нақтылаңыз', footer: 'Бағалар теңгемен көрсетілген', error: 'Мәзірді жүктеу мүмкін болмады' },
};

// Ссылки на элементы страницы
const el = {
  tabs: document.querySelector('[data-tabs]'),
  chips: document.querySelector('[data-chips]'),
  menu: document.querySelector('[data-menu]'),
  place: document.querySelector('[data-place]'),
  footer: document.querySelector('[data-footer-note]'),
  nav: document.querySelector('.nav'),
  langButtons: document.querySelectorAll('[data-lang]'),
};

/* ---------- Помощники ---------- */

// Берём текст на текущем языке; если казахского нет — показываем русский
function t(obj) {
  if (!obj) return '';
  return obj[state.lang] || obj.ru || '';
}

// 3950 -> «3 950 ₸»
function formatPrice(price) {
  if (price == null) return null;
  return price.toLocaleString('ru-RU') + ' ₸';
}

// Защита от HTML внутри данных (на случай кавычек и спецсимволов)
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

/* ---------- Отрисовка ---------- */

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

  // Объём и описание — в одну строку: «50 мл · Шотландия, односолодовый»
  const details = [item.size, t(item.desc)].filter(Boolean).join(' · ');

  return `
    <article class="item">
      <h3 class="item__name">${escapeHTML(t(item.name))}${badge}</h3>
      <p class="item__price ${price ? '' : 'item__price--empty'}">${price || UI[state.lang].noPrice}</p>
      ${details ? `<p class="item__desc">${escapeHTML(details)}</p>` : ''}
    </article>`;
}

function renderMenu() {
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

function renderStatic() {
  el.place.textContent = t(state.data.restaurant.place);
  el.footer.textContent = UI[state.lang].footer;
  document.documentElement.lang = state.lang;
  el.langButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.lang === state.lang);
  });
}

// Полная перерисовка — вызываем при смене языка или вкладки
function render() {
  renderStatic();
  renderTabs();
  renderChips();
  renderMenu();
  updateNavHeight();
  watchCategories();
}

/* ---------- Подсветка активной категории при скролле ---------- */

let observer = null;

function setActiveChip(id) {
  const chip = el.chips.querySelector(`[data-chip="${id}"]`);
  if (!chip) return;
  el.chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
  chip.classList.add('is-active');

  // Прокручиваем ленту так, чтобы активный чип был виден (сама страница не дёргается)
  el.chips.scrollTo({
    left: chip.offsetLeft - el.chips.clientWidth / 2 + chip.clientWidth / 2,
    behavior: 'smooth',
  });
}

function watchCategories() {
  if (observer) observer.disconnect();

  // Категория «активна», когда её верх проходит линию сразу под навигацией
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveChip(entry.target.id);
      });
    },
    { rootMargin: `-${el.nav.offsetHeight + 1}px 0px -70% 0px` }
  );

  el.menu.querySelectorAll('.category').forEach((section) => observer.observe(section));
}

// Передаём в CSS реальную высоту навигации (для scroll-margin-top)
function updateNavHeight() {
  document.documentElement.style.setProperty('--nav-h', `${el.nav.offsetHeight}px`);
}

/* ---------- События ---------- */

// Переключение языка
el.langButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.lang = btn.dataset.lang;
    try { localStorage.setItem('lepin-lang', state.lang); } catch (e) { /* приватный режим */ }
    render();
  });
});

// Переключение вкладок. Слушаем клик на контейнере (делегирование),
// потому что сами кнопки пересоздаются при каждой отрисовке
el.tabs.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-menu-id]');
  if (!btn || btn.dataset.menuId === state.menuId) return;

  state.menuId = btn.dataset.menuId;
  render();

  // Возвращаем гостя к началу нового раздела
  window.scrollTo({ top: el.nav.offsetTop, behavior: 'smooth' });
});

window.addEventListener('resize', updateNavHeight);

/* ---------- Старт ---------- */

async function init() {
  try { state.lang = localStorage.getItem('lepin-lang') || 'ru'; } catch (e) { /* без сохранения */ }

  try {
    const response = await fetch('data/menu.json');
    if (!response.ok) throw new Error(response.status);
    state.data = await response.json();
    render();
  } catch (error) {
    console.error(error);
    el.menu.innerHTML = `<p class="menu__loading">${UI[state.lang].error}</p>`;
  }
}

init();
