/* Чороон XXI Век — магазин, «О нас», новости. Без сборки и зависимостей. */
(() => {
'use strict';

/* Куда уходят заказы и заявки. Все заказы получает менеджер и подтверждает их сам.
   Пока приёмника нет (endpoint пустой), после отправки покупатель видит экран
   «Остался один шаг» и сам выбирает, как передать заказ: письмом, звонком или скопировать текст.
   Когда появится приёмник (Telegram‑бот менеджеру, CRM, form‑сервис) — впишите его адрес в endpoint,
   сайт будет отправлять заказ JSON POST‑запросом и сразу показывать «Заказ принят». */
const CONFIG = { email: 'choroon21vek@mail.ru', phone: '+79148289800', phoneText: '+7 914 828‑98‑00', vk: 'https://vk.com/choroon_xxi', endpoint: '' };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// неразрывный пробел после коротких слов, чтобы предлоги не висели в конце строки
const typo = s => esc(s).replace(/(^|[\s(«])([А-Яа-яЁёA-Za-z]{1,2})\s/g, '$1$2 ');
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const P = window.PRODUCTS || [];
const byId = id => P.find(p => p.id === id);
const money = n => n.toLocaleString('ru-RU') + ' ₽';
const priceText = p => p.price ? (p.from ? 'от ' : '') + money(p.price) : 'Цена по запросу';
const catName = c => ((window.CATEGORIES || []).find(x => x[0] === c) || [])[1] || '';

function toast(msg) {
  const t = $('#toast'); if (!t || (openOv && openOv.id === 'cart')) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ---------- общие элементы ---------- */
const page = document.body.dataset.page;
$$(`[data-nav="${page}"]`).forEach(a => a.setAttribute('aria-current', 'page'));
$$('[data-year]').forEach(y => y.textContent = new Date().getFullYear());

const mnav = $('#mnav');
const lock = on => { document.body.style.overflow = on ? 'hidden' : ''; };
$$('[data-menu]').forEach(b => b.addEventListener('click', () => { mnav.classList.add('open'); lock(true); }));
const closeMenu = () => { mnav.classList.remove('open'); lock(false); };
$$('[data-menu-close], #mnav a').forEach(b => b.addEventListener('click', closeMenu));

const io = 'IntersectionObserver' in window
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' })
  : null;
const reveal = els => els.forEach(el => io ? io.observe(el) : el.classList.add('in'));
reveal($$('.rv'));

const ck = $('#cookie');
if (ck && !store.get('ch-cookie', false)) ck.classList.add('show');
$$('[data-cookie]').forEach(b => b.addEventListener('click', () => { store.set('ch-cookie', true); ck.classList.remove('show'); }));

// оверлеи
let openOv = null;
function showOv(el) { if (openOv && openOv !== el) hideOv(openOv); el.classList.add('open'); openOv = el; lock(true); }
function hideOv(el) {
  el.classList.remove('open'); if (openOv === el) openOv = null; lock(false);
  if (/^#(item|post)-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
}
document.addEventListener('click', e => { const c = e.target.closest('[data-close]'); if (c) hideOv(c.closest('.ov')); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const lb = $('#lb'); if (lb && lb.classList.contains('open')) return lb.classList.remove('open');
  if (openOv) hideOv(openOv); else if (mnav.classList.contains('open')) closeMenu();
});

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch { const a = document.createElement('textarea'); a.value = t; document.body.append(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; }
}

// кнопка «наверх»
const totop = $('#totop');
if (totop) {
  const t = () => totop.classList.toggle('show', scrollY > innerHeight * 1.2);
  addEventListener('scroll', t, { passive: true }); t();
  totop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---------- корзина ---------- */
let cart = store.get('ch-cart', {});
Object.keys(cart).forEach(id => { if (!byId(id)) delete cart[id]; });
const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
function saveCart() {
  store.set('ch-cart', cart);
  $$('.cart-n').forEach(n => { n.textContent = cartCount(); n.classList.toggle('has', cartCount() > 0); });
  $$('[data-add]').forEach(b => {
    const on = !!cart[b.dataset.add];
    b.classList.toggle('on', on);
    b.innerHTML = b.classList.contains('btn') ? (on ? 'В корзине ✓' : 'В корзину') : `<svg><use href="#i-${on ? 'check' : 'plus'}"/></svg>`;
    b.setAttribute('aria-label', on ? 'В корзине, убрать' : 'Добавить в корзину');
  });
}
function add(id, q = 1) { cart[id] = (cart[id] || 0) + q; saveCart(); toast('Добавлено в корзину'); }
function setQty(id, q) { if (q <= 0) delete cart[id]; else cart[id] = q; saveCart(); }
const orderLines = () => Object.keys(cart).map(id => `— ${byId(id).name} × ${cart[id]}`);

function renderCart() {
  const b = $('#cart-b'), f = $('#cart-f'), ids = Object.keys(cart);
  $('#cart-t').textContent = 'Корзина';
  if (!ids.length) {
    b.innerHTML = `<div class="empty">Корзина пуста.<br><br><a href="index.html#catalog" data-close>Перейти в каталог</a></div>`;
    f.innerHTML = ''; f.style.display = 'none'; return;
  }
  f.style.display = '';
  b.innerHTML = ids.map(id => { const p = byId(id); return `
    <div class="ci"><img src="img/p/${p.img}-s.webp" alt="">
      <div><div class="n">${typo(p.name)}</div><div class="m">${priceText(p)}</div><button class="rm" data-rm="${id}">Удалить</button></div>
      <div class="qty"><button data-q="${id}" data-d="-1" aria-label="Меньше">−</button><span>${cart[id]}</span><button data-q="${id}" data-d="1" aria-label="Больше">+</button></div>
    </div>`; }).join('') + `<p class="cart-hint">Заказ получит менеджер: он свяжется с вами, подтвердит наличие, стоимость и доставку. Платить заранее не нужно.</p>`;
  const allPriced = ids.every(id => byId(id).price);
  const total = ids.reduce((s, id) => s + (byId(id).price || 0) * cart[id], 0);
  f.innerHTML = `<div class="sum"><span>Итого, ${cartCount()} шт.</span><span>${allPriced ? '≈ ' + money(total) : 'Стоимость подтвердит менеджер'}</span></div><p class="sum-note">Точную сумму и доставку подтвердит менеджер.</p>
    <button class="btn full" data-checkout>Оформить заказ</button>`;
}
function renderCheckout() {
  const b = $('#cart-b'), f = $('#cart-f');
  $('#cart-t').textContent = 'Оформление заказа';
  f.innerHTML = ''; f.style.display = 'none';
  const ids = Object.keys(cart);
  b.innerHTML = `
    <button class="back" data-tolist>← Корзина</button>
    <div class="co-items">${ids.map(id => `<div><img src="img/p/${byId(id).img}-s.webp" alt=""><span>${typo(byId(id).name)}</span><span class="muted">× ${cart[id]}</span></div>`).join('')}</div>
    <form class="form" data-form="order" novalidate>
      <div class="fld"><label for="o-name">Имя</label><input id="o-name" name="name" autocomplete="name" required></div>
      <div class="fld"><label for="o-phone">Телефон</label><input id="o-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required></div>
      <div class="fld"><label for="o-mail">Email, если удобнее переписываться</label><input id="o-mail" name="email" type="email" autocomplete="email"></div>
      <div class="step-t">Где вы хотите получить заказ?</div>
      <div class="radios" data-group="delivery">
        <label><input type="radio" name="delivery" value="Самовывоз: Лонгинова, 88" required><span>Самовывоз в Якутске, мастерская<small>ул. Лонгинова, 88 · пн–пт 10–18, сб 10–16</small></span></label>
        <label><input type="radio" name="delivery" value="Самовывоз: «Биир Ситим», Лермонтова, 26"><span>Самовывоз в Якутске, «Биир Ситим»<small>ул. Лермонтова, 26 · ежедневно 10–20</small></span></label>
        <label><input type="radio" name="delivery" value="Доставка по Якутску" data-addr><span>Доставка по Якутску<small>Курьер службы такси по тарифу, пн–сб. Доставку оформляем при заказе от 5000 ₽</small></span></label>
        <label><input type="radio" name="delivery" value="Почта России" data-addr><span>В другой город России<small>Почтой России. Срок и стоимость менеджер назовёт после оформления</small></span></label>
        <label><input type="radio" name="delivery" value="В другую страну" data-addr><span>В другую страну<small>Условия менеджер обсудит с вами</small></span></label>
      </div>
      <div class="fld" id="o-addr-f" hidden><label for="o-addr">Город и адрес доставки</label><textarea id="o-addr" name="address" autocomplete="street-address"></textarea></div>
      <div class="fld"><label for="o-msg">Комментарий</label><textarea id="o-msg" name="msg" placeholder="Например, нужна подарочная упаковка"></textarea></div>
      <label class="consent"><input type="checkbox" name="consent" required><span>Согласен на обработку персональных данных в соответствии с <a href="policy.html">политикой конфиденциальности</a></span></label>
      <div class="co-note">Оплата не нужна сейчас. Менеджер свяжется с вами, подтвердит наличие, стоимость и доставку.</div>
      <button class="btn full" type="submit">Отправить заказ менеджеру</button>
    </form>
    <div class="ok" role="status"></div>`;
  const addrF = $('#o-addr-f'), addr = $('textarea', addrF);
  $$('input[name=delivery]', b).forEach(r => r.addEventListener('change', () => {
    const need = r.hasAttribute('data-addr');
    addrF.hidden = !need; need ? addr.setAttribute('required', '') : addr.removeAttribute('required');
    $('[data-group=delivery]', b).classList.remove('err');
  }));
  bindForm($('form', b));
  b.scrollTop = 0;
}
const cartOv = $('#cart');
if (cartOv) {
  document.addEventListener('click', e => {
    if (e.target.closest('[data-cart]')) { renderCart(); showOv(cartOv); }
    const a = e.target.closest('[data-add]'); if (a) { if (cart[a.dataset.add]) { setQty(a.dataset.add, 0); toast('Убрано из корзины'); } else add(a.dataset.add); }
    const q = e.target.closest('[data-q]'); if (q) { setQty(q.dataset.q, (cart[q.dataset.q] || 0) + +q.dataset.d); renderCart(); }
    const rm = e.target.closest('[data-rm]'); if (rm) { setQty(rm.dataset.rm, 0); renderCart(); }
    if (e.target.closest('[data-checkout]')) renderCheckout();
    if (e.target.closest('[data-tolist]')) renderCart();
  });
}

/* ---------- каталог ---------- */
const grid = $('#grid');
if (grid) {
  grid.innerHTML = P.map(p => `
    <article class="prod rv" data-cat="${p.cat}">
      <button class="pimg${p.life ? ' two' : ''}" data-view="${p.id}" aria-label="${esc(p.name)}">
        <img src="img/p/${p.img}-s.webp" srcset="img/p/${p.img}-s.webp 520w, img/p/${p.img}.webp 1000w" sizes="(min-width:1100px) 25vw, (min-width:760px) 33vw, 50vw" alt="${esc(p.name)}" loading="lazy" width="520" height="650">
        ${p.life ? `<img class="alt" src="img/p/${p.img}-life-s.webp" alt="" loading="lazy" width="520" height="650">` : ''}
      </button>
      <button class="pname" data-view="${p.id}">${typo(p.name)}</button>
      <div class="prow"><span class="pmeta">${priceText(p)}</span><button class="padd" data-add="${p.id}"></button></div>
    </article>`).join('');
  // промо-баннер кытыйа после первых четырёх товаров
  const k = byId('p08');
  const wide = document.createElement('figure');
  wide.className = 'promo rv';
  wide.innerHTML = `<div class="promo-img"><img src="img/kytyya-s.webp" srcset="img/kytyya-s.webp 800w, img/kytyya.webp 1600w" sizes="(min-width:900px) 60vw, 100vw" alt="Кытыйа с матовой глазурью на вышитой скатерти" loading="lazy"></div>
    <figcaption class="promo-body">
      <span class="promo-k">Первые в Якутии</span>
      <h3>Кытыйа с&nbsp;матовой глазурью</h3>
      <p>Традиционная якутская чаша в фарфоре. В 2019 году мы первыми в Якутии выпустили кытыйа с матовой глазурью и объёмной деколью.</p>
      <ul class="promo-stats"><li><b>2019</b><span>первые в Якутии</span></li><li><b>Фарфор</b><span>матовая глазурь</span></li><li><b>${money(k.price)}</b><span>за чашу</span></li></ul>
      <div class="promo-cta"><button class="btn light" data-add="p08"></button><button class="u" data-view="p08">Подробнее</button></div>
    </figcaption>`;
  const kids = $$('.prod', grid); if (kids[4]) grid.insertBefore(wide, kids[4]);
  const intro = document.createElement('p'); intro.className = 'cat-intro'; grid.before(intro);
  const cats = $('#cats'), count = $('#count');
  const n = c => c === 'all' ? P.length : P.filter(p => p.cat === c).length;
  const word = k => { const a = k % 10, b = k % 100; return (a === 1 && b !== 11) ? 'изделие' : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 'изделия' : 'изделий'; };
  cats.innerHTML = (window.CATEGORIES || []).map(([k, v], i) => `<button class="cat" data-c="${k}" aria-pressed="${i === 0}">${v}<sup>${n(k)}</sup></button>`).join('');
  const setCat = c => {
    $$('.cat', cats).forEach(b => b.setAttribute('aria-pressed', b.dataset.c === c));
    $$('.prod', grid).forEach(el => { const s = c === 'all' || el.dataset.cat === c; el.classList.toggle('hide', !s); if (s) el.classList.add('in'); });
    count.textContent = `${n(c)} ${word(n(c))}`;
    wide.style.display = c === 'all' ? '' : 'none';
    const t = (window.CAT_INTRO || {})[c]; intro.textContent = t || ''; intro.hidden = !t;
  };
  cats.addEventListener('click', e => {
    const b = e.target.closest('.cat'); if (!b) return; setCat(b.dataset.c);
  });
  setCat('all');
  reveal($$('.rv', grid));
}
$$('[data-price]').forEach(el => { const p = byId(el.dataset.price); if (p) el.textContent = priceText(p); });
saveCart();

// карточка товара
const pv = $('#pv');
function view(id) {
  const p = byId(id); if (!p || !pv) return;
  let q = 1;
  const pics = [`img/p/${p.img}.webp`].concat(p.life ? [`img/p/${p.img}-life.webp`] : []);
  const box = $('#pv-box');
  box.className = 'pv-box' + (p.full ? '' : ' cut');
  box.innerHTML = `
    <button class="x pv-x" data-close aria-label="Закрыть">×</button>
    <div class="pv-media">
      <div class="pv-img"><img id="pv-main" src="${pics[0]}" alt="${esc(p.name)}"></div>
      ${pics.length > 1 ? `<div class="pv-thumbs">${pics.map((s, i) => `<button data-pic="${i}" aria-label="Фото ${i + 1}" ${i ? '' : 'class="on"'}><img src="${s.replace('.webp', '-s.webp')}" alt=""></button>`).join('')}</div>` : ''}
    </div>
    <div class="pv-info">
      <div class="label">${esc(catName(p.cat))}</div>
      <h2>${typo(p.name)}</h2>
      <div class="pv-price">${priceText(p)}</div>
      <p class="d">${typo(p.d)}</p>
      ${p.yt ? `<a class="pv-story" href="about.html#y${p.y}"><span>${p.y}</span>${typo(p.yt)} →</a>` : ''}
      <dl class="pv-spec"><dt>Материал</dt><dd>${esc(p.mat)}</dd><dt>Наличие</dt><dd>Подтвердит менеджер</dd></dl>
      <div class="pv-buy"><div class="qty"><button data-pq="-1" aria-label="Меньше">−</button><span id="pv-q">1</span><button data-pq="1" aria-label="Больше">+</button></div><button class="btn" data-pvadd>В корзину</button></div>
      <p class="pv-note">${p.price ? '' : `Узнать цену сразу: <a class="u" href="tel:${CONFIG.phone}">${CONFIG.phoneText}</a> или <a class="u" href="${CONFIG.vk}" target="_blank" rel="noopener">ВКонтакте</a>. `}Самовывоз в Якутске, доставка по городу, Почтой России по стране, за рубеж по договорённости.</p>
      <button class="pv-share" data-share>Поделиться ссылкой</button>
    </div>`;
  box.onclick = async e => {
    const d = e.target.closest('[data-pq]'); if (d) { q = Math.max(1, q + +d.dataset.pq); $('#pv-q').textContent = q; }
    const pic = e.target.closest('[data-pic]'); if (pic) { $('#pv-main').src = pics[+pic.dataset.pic]; $$('[data-pic]', box).forEach(x => x.classList.toggle('on', x === pic)); }
    if (e.target.closest('[data-pvadd]')) { add(p.id, q); hideOv(pv); }
    if (e.target.closest('[data-share]')) {
      const url = location.origin + location.pathname + '#item-' + p.id;
      if (navigator.share) { try { await navigator.share({ title: p.name + ' — Чороон XXI Век', text: p.yt || p.d, url }); } catch {} }
      else if (await copyText(url)) toast('Ссылка скопирована');
    }
  };
  showOv(pv); box.scrollTop = 0;
  history.replaceState(null, '', '#item-' + p.id);
}
document.addEventListener('click', e => { const v = e.target.closest('[data-view]'); if (v) view(v.dataset.view); });
if (location.hash.startsWith('#item-')) view(location.hash.slice(6));

/* ---------- формы ---------- */
const SUBJ = { mk: d => 'Запись на мастер-класс: ' + d.kind, order: () => 'Заказ с сайта' };
const LBL = { kind: 'Направление', name: 'Имя', phone: 'Телефон', email: 'Email', qty: 'Количество человек', days: 'Удобные дни', delivery: 'Получение', address: 'Адрес', msg: 'Комментарий' };
function bindForm(form) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    let first = null;
    $$('[required]', form).forEach(inp => {
      let bad, box;
      if (inp.type === 'radio') { bad = !$(`input[name="${inp.name}"]:checked`, form); box = inp.closest('.radios'); }
      else { bad = inp.type === 'checkbox' ? !inp.checked : inp.type === 'tel' ? inp.value.replace(/\D/g, '').length < 10 : !inp.value.trim(); box = inp.closest('.fld') || inp.closest('.consent'); }
      box.classList.toggle('err', bad);
      if (bad && !first) first = inp;
    });
    if (first) { first.focus(); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); toast('Заполните отмеченные поля'); return; }
    const type = form.dataset.form, data = Object.fromEntries(new FormData(form)); delete data.consent;
    const lines = [];
    if (type === 'order') lines.push('Заказ:', ...orderLines(), '');
    Object.entries(data).forEach(([k, v]) => { if (String(v).trim()) lines.push(`${LBL[k] || k}: ${v}`); });
    const subject = SUBJ[type](data), text = lines.join('\n');
    let sent = false;
    if (CONFIG.endpoint) {
      try {
        const r = await fetch(CONFIG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, subject, ...data, items: type === 'order' ? Object.keys(cart).map(id => ({ id, name: byId(id).name, qty: cart[id] })) : undefined }) });
        sent = r.ok;
      } catch {}
    }
    const ok = form.nextElementSibling, what = type === 'order' ? 'заказ' : 'заявку';
    if (sent) {
      ok.innerHTML = `<h3>Спасибо, ${type === 'order' ? 'заказ принят' : 'заявка принята'}</h3><p>Менеджер свяжется с вами в рабочее время и всё подтвердит. Срочно? <a class="u" href="tel:${CONFIG.phone}">${CONFIG.phoneText}</a></p>`;
      if (type === 'order') { cart = {}; saveCart(); }
    } else {
      const mail = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      const nowTxt = shopNowText();
      ok.innerHTML = `<h3>Остался один шаг</h3>
        <p class="ok-now">${nowTxt}</p>
        <p>Передайте ${what} менеджеру удобным способом. ${type === 'order' ? 'Заказ' : 'Заявка'} считается переданным, когда вы отправите письмо, сообщение или дозвонитесь. Текст уже готов.</p>
        <pre class="ok-text">${esc(text)}</pre>
        <div class="ok-actions">
          <a class="btn" href="${mail}">Отправить письмом</a>
          <a class="btn line" href="tel:${CONFIG.phone}">Позвонить ${CONFIG.phoneText}</a>
        </div>
        <div class="ok-links"><button data-copy>Скопировать ${what}</button><a data-vk href="${CONFIG.vk}" target="_blank" rel="noopener">Написать ВКонтакте</a></div>
        <p class="ok-hint">Если почта не открылась, скопируйте ${what} и отправьте на <a class="u" href="mailto:${CONFIG.email}">${CONFIG.email}</a>.</p>
        <button class="ok-done" data-done>Я отправил(а) ${what}</button>`;
      const full = `${subject}\n\n${text}`;
      $('[data-copy]', ok).onclick = async () => { if (await copyText(full)) toast('Текст скопирован'); };
      // ссылка открывается сама (iOS не блокирует), текст копируем в тот же момент
      $('[data-vk]', ok).onclick = () => { copyText(full); toast('Текст скопирован — вставьте его в сообщение'); };
      $('[data-done]', ok).onclick = () => {
        if (type === 'order') { cart = {}; saveCart(); }
        ok.innerHTML = `<h3>Спасибо!</h3><p>Менеджер свяжется с вами в рабочее время и подтвердит ${type === 'order' ? 'наличие, стоимость и доставку' : 'дату и время'}.</p>`;
      };
    }
    form.style.display = 'none'; ok.classList.add('show');
    const co = form.parentElement.querySelector('.co-items'); if (co) co.style.display = 'none';
    ok.scrollIntoView({ block: 'nearest' });
  });
  $$('input, textarea', form).forEach(i => i.addEventListener('input', () => (i.closest('.fld') || i.closest('.consent'))?.classList.remove('err')));
}
$$('form[data-form]').forEach(bindForm);

const mkf = $('form[data-form=mk]');
if (mkf) {
  let ppl = 1;
  const upd = () => {
    const kind = $('input[name=kind]:checked', mkf).value, days = ($('input[name=days]:checked', mkf) || {}).value || 'любое время';
    const short = { 'Ручная роспись на фарфоре': 'Роспись по фарфору' }[kind] || kind;
    $('#t-kind').textContent = short; $('#m-qty').value = ppl; $('#t-ppl').textContent = ppl;
    $('#t-icons').textContent = '●'.repeat(Math.min(ppl, 8)) + (ppl > 8 ? ' +' + (ppl - 8) : '');
    const w = ppl % 10 === 1 && ppl % 100 !== 11 ? 'человек' : (ppl % 10 >= 2 && ppl % 10 <= 4 && (ppl % 100 < 12 || ppl % 100 > 14)) ? 'человека' : 'человек';
    $('#t-sum').innerHTML = `${esc(short)}<small>${ppl} ${w} · ${esc(days.toLowerCase())}</small>`;
  };
  mkf.addEventListener('change', upd);
  mkf.addEventListener('click', e => { const b = e.target.closest('[data-ppl]'); if (b) { ppl = Math.min(30, Math.max(1, ppl + +b.dataset.ppl)); upd(); } });
  upd();
}

/* ---------- режим работы (время Якутска, UTC+9) ---------- */
const SHOPS = { longinova: d => (d >= 1 && d <= 5) ? [10, 18] : d === 6 ? [10, 16] : null, biir: () => [10, 20] };
const DAYS = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];
function shopStatus() {
  const now = new Date(Date.now() + 9 * 3600e3), d = now.getUTCDay(), h = now.getUTCHours() + now.getUTCMinutes() / 60;
  $$('[data-shop]').forEach(el => {
    const f = SHOPS[el.dataset.shop], t = f(d), st = $('.status', el);
    let txt, on = false;
    if (t && h >= t[0] && h < t[1]) { on = true; txt = `Открыто до ${t[1]}:00`; }
    else { let k = (t && h < t[0]) ? 0 : 1, nd; while (!(nd = f((d + k) % 7)) && k < 7) k++; txt = `Закрыто, откроется ${k === 0 ? 'сегодня' : k === 1 ? 'завтра' : DAYS[(d + k) % 7]} в ${nd[0]}:00`; }
    if (on) { const left = t[1] - h, hh = Math.floor(left), mm = Math.round((left - hh) * 60); txt += ` · закроется через ${hh ? hh + ' ч ' : ''}${mm} мин`; }
    st.classList.toggle('on', on); $('span', st).textContent = txt;
    const wk = $('[data-week]', el);
    if (wk) wk.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(i => { const tt = f(i); return `<div class="${i === d ? 'today' : ''}${tt ? '' : ' off'}"><b>${['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][i]}</b><span>${tt ? tt[0] + '–' + tt[1] : 'выходной'}</span></div>`; }).join('');
  });
}
if ($('[data-shop]')) { shopStatus(); setInterval(shopStatus, 60e3); }
function shopNowText() {
  const now = new Date(Date.now() + 9 * 3600e3), d = now.getUTCDay(), h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const open = Object.values(SHOPS).some(f => { const t = f(d); return t && h >= t[0] && h < t[1]; });
  const hm = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  return open ? `Сейчас в Якутске ${hm}, магазин открыт — можно звонить.` : `Сейчас в Якутске ${hm} (МСК+6), магазины закрыты. Звоните с 10:00 по Якутску, а письмо или сообщение менеджер увидит утром.`;
}

/* ---------- новости ---------- */
const NEWS = window.NEWS || [];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const fmtDate = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${MONTHS[+m - 1]} ${y}`; };
const lb = $('#lb'); let lbList = [], lbI = 0;
const lbShow = () => { $('img', lb).src = lbList[lbI]; };
if (lb) lb.addEventListener('click', e => {
  if (e.target.closest('.ln')) { lbI = (lbI + 1) % lbList.length; lbShow(); }
  else if (e.target.closest('.lp')) { lbI = (lbI - 1 + lbList.length) % lbList.length; lbShow(); }
  else if (e.target.closest('.lx') || e.target === lb) lb.classList.remove('open');
});
function openPost(id) {
  const n = NEWS.find(x => x.id === +id), box = $('#pv-box'); if (!n || !box) return;
  const pics = n.imgs.map(i => 'img/news/' + i);
  box.className = 'pv-box art-box';
  box.innerHTML = `<button class="x pv-x" data-close aria-label="Закрыть">×</button><div class="article"><time datetime="${n.date}">${fmtDate(n.date)}</time><h2>${typo(n.title)}</h2>
    <div class="pics">${pics.map((s, i) => `<img src="${s}" alt="" data-pi="${i}" loading="lazy">`).join('')}</div>${n.body.map(p => `<p>${typo(p)}</p>`).join('')}</div>`;
  box.onclick = e => { const im = e.target.closest('[data-pi]'); if (im && lb) { lbList = pics; lbI = +im.dataset.pi; lbShow(); lb.classList.add('open'); } };
  showOv(pv); box.scrollTop = 0;
  history.replaceState(null, '', location.pathname + location.search + '#post-' + n.id);
}
document.addEventListener('click', e => { const c = e.target.closest('[data-post]'); if (c) openPost(c.dataset.post); });
const arch = $('#news');
if (arch) {
  const years = [...new Set(NEWS.map(n => n.date.slice(0, 4)))];
  const yf = $('#years-f'), q = $('#q'), more = $('#more');
  let year = new URLSearchParams(location.search).get('y') || 'all', shown = 12;
  if (year !== 'all' && !years.includes(year)) year = 'all';
  yf.innerHTML = `<button class="cat" data-y="all">Все</button>` + years.map(y => `<button class="cat" data-y="${y}">${y}</button>`).join('');
  const list = () => NEWS.filter(n => (year === 'all' || n.date.startsWith(year)) && (!q.value.trim() || (n.title + ' ' + n.body.join(' ')).toLowerCase().includes(q.value.toLowerCase().trim())));
  const draw = () => {
    $$('.cat', yf).forEach(b => b.setAttribute('aria-pressed', b.dataset.y === year));
    const l = list();
    arch.innerHTML = l.slice(0, shown).map(n => `<button class="nc" data-post="${n.id}"><div class="ni"><img src="img/news/${n.imgs[0]}" alt="" loading="lazy"></div><time datetime="${n.date}">${fmtDate(n.date)}</time><h3>${typo(n.title)}</h3></button>`).join('') || '<p class="muted">Ничего не нашлось.</p>';
    more.style.display = l.length > shown ? '' : 'none';
    $('#cnt').textContent = l.length;
  };
  yf.addEventListener('click', e => { const b = e.target.closest('.cat'); if (!b) return; year = b.dataset.y; shown = 12; history.replaceState(null, '', year === 'all' ? 'news.html' : 'news.html?y=' + year); draw(); });
  q.addEventListener('input', () => { shown = 12; draw(); });
  more.addEventListener('click', () => { shown += 12; draw(); });
  draw();
  if (location.hash.startsWith('#post-')) openPost(location.hash.slice(6));
}

/* ---------- О нас: таймлайн ---------- */
const tl = $('#timeline');
if (tl && window.HISTORY) {
  // главы — ключевые годы, которые получают крупный масштаб
  const MAJOR = [2001, 2006, 2007, 2013, 2021, 2024, 'Сегодня'];
  const nCount = y => NEWS.filter(n => n.date.startsWith(String(y))).length;
  const form = k => { const a = k % 10, b = k % 100; return (a === 1 && b !== 11) ? 'публикация' : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 'публикации' : 'публикаций'; };
  const idOf = h => typeof h.y === 'number' ? 'y' + h.y : 'now';
  tl.innerHTML = HISTORY.map(h => {
    const c = typeof h.y === 'number' ? nCount(h.y) : 0, major = MAJOR.includes(h.y), prod = h.p && byId(h.p);
    const links = [prod ? `<a href="index.html#item-${prod.id}">В каталоге: ${typo(prod.name)} →</a>` : '', c ? `<a href="news.html?y=${h.y}">${c} ${form(c)} за ${h.y} год →</a>` : ''].filter(Boolean).join('');
    const img = h.img ? `<div class="yr-img${h.tall ? ' tall' : ''}"><img src="img/${h.img}-s.webp" srcset="img/${h.img}-s.webp 800w, img/${h.img}.webp 1600w" sizes="(min-width:1000px) 760px, 100vw" alt="" loading="lazy"></div>` : '';
    const head = `<div class="yr-y">${h.y}</div><h3>${typo(h.h)}</h3>`;
    const body = `<p>${typo(h.t)}</p>${h.x ? `<ul>${h.x.map(i => `<li>${typo(i)}</li>`).join('')}</ul>` : ''}${links ? `<div class="yr-links">${links}</div>` : ''}`;
    const side = h.img && !major;
    return `<article class="yr${major ? ' major' : ''}${h.img ? '' : ' noimg'}${side ? ' side' : ''}" id="${idOf(h)}">
      ${side ? `<div class="yr-txt">${head}${body}</div>${img}` : `${head}${img}${body}`}
    </article>`;
  }).join('');
  const nav = $('#years');
  nav.innerHTML = HISTORY.map(h => `<a href="#${idOf(h)}" data-y="${idOf(h)}">${h.y}</a>`).join('');
  const links = $$('a', nav), items = $$('.yr', tl);
  let cur = '';
  const spy = () => {
    const line = Math.min(innerHeight * .35, 360); let id = items[0].id;
    for (const it of items) { if (it.getBoundingClientRect().top <= line) id = it.id; else break; }
    if (id === cur) return; cur = id;
    links.forEach(a => a.classList.toggle('on', a.dataset.y === id));
    const on = links.find(a => a.dataset.y === id);
    if (on && getComputedStyle(nav).flexDirection === 'row') nav.scrollTo({ left: on.offsetLeft - 20, behavior: 'smooth' });
  };
  let raf = 0; addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(spy); }, { passive: true }); spy();
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView(), 60); }
}
})();
