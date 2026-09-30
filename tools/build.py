"""Собирает about/news/policy из общей шапки и подвала index.html.
Запуск из папки сайта: python3 tools/build.py"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
VER = re.search(r'styles\.css\?v=(\d+)', (root / 'index.html').read_text()).group(1)
idx = (root / 'index.html').read_text()
head = idx[:idx.index('<body')]
header = idx[idx.index('<!--#header-->'):idx.index('<!--/header-->') + len('<!--/header-->')]
footer = idx[idx.index('<!--#footer-->'):idx.index('<!--/footer-->') + len('<!--/footer-->')]

def page(name, title, desc, key, body, scripts, extra='', ogimg=''):
    h = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', head)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', h)
    h = re.sub(r'<script type="application/ld\+json">.*?</script>\n', '', h, flags=re.S)
    if ogimg: h = h.replace('https://choroon21.com/img/og.jpg', f'https://choroon21.com/img/{ogimg}')
    h = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="https://choroon21.com/{name}">', h)
    h = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{title}">', h)
    h = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">', h)
    html = f'{h}<body data-page="{key}">\n{header}\n\n<main id="main">\n{body}\n</main>\n\n{footer}\n{extra}\n' + \
           ''.join(f'<script src="{s}?v={VER}"></script>\n' for s in scripts) + '</body>\n</html>\n'
    (root / name).write_text(html)

LB = '<div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="Фото"><button class="lx" aria-label="Закрыть">×</button><button class="lp" aria-label="Предыдущее">‹</button><img alt=""><button class="ln" aria-label="Следующее">›</button></div>'

page('about.html', 'О нас — Чороон XXI Век',
     'История компании «Чороон XXI Век» с 2001 года: что и в каком году мы делали, как развивались.', 'about', '''
<section class="about-hero">
  <div class="wrap">
    <div class="crumbs"><a href="index.html">Главная</a> / О нас</div>
    <div class="grid2">
      <h1>Делаем якутскую посуду с&nbsp;2001 года</h1>
      <p class="lead">С 2001 года наше небольшое предприятие выпускает фарфоровую посуду в национальном стиле и эксклюзивные керамические сувениры. Многим доводилось видеть чорооны из фарфора: именно они стали визитной карточкой компании и дали ей имя. Наше дело — популяризация и сохранение якутской культуры.</p>
    </div>
    <div class="about-img"><img src="img/tea-grass.webp" srcset="img/tea-grass-s.webp 800w, img/tea-grass.webp 1600w" sizes="100vw" alt="Фарфоровый сервиз с якутским орнаментом на траве"></div>
    <div class="grid2" style="margin-top:clamp(40px,5vw,72px)">
      <p class="lead" style="color:var(--ink)">Чороон — сакральный сосуд, один из ключевых символов якутской культуры, постоянный атрибут ритуалов и праздников. Символ благополучия и изобилия.</p>
      <p class="muted" style="margin:0">Ниже год за годом: что мы делали, с кем работали и как развивались.</p>
    </div>
    <div class="tl-layout">
      <nav class="years" id="years" aria-label="Годы"></nav>
      <div id="timeline"></div>
    </div>
    <div class="about-end">
      <h2>Каждая вещь в нашем каталоге продолжает эту историю</h2>
      <div class="btns"><a class="btn" href="index.html#catalog">Смотреть каталог</a><a class="btn line" href="index.html#masterclass">Записаться на мастер‑класс</a></div>
    </div>
  </div>
</section>''', ['data/products.js', 'data/history.js', 'data/news.js', 'js/app.js'], LB, 'og-about.jpg')

page('news.html', 'Новости — Чороон XXI Век',
     'Новости компании «Чороон XXI Век»: мастер‑классы, конкурсы, выставки и проекты.', 'news', '''
<section class="page-hero">
  <div class="wrap">
    <div class="crumbs"><a href="index.html">Главная</a> / <a href="about.html">О нас</a> / Новости</div>
    <h1>Новости</h1>
    <p class="lead" style="margin-top:16px">Мастер‑классы, конкурсы, экспедиции и встречи с народными мастерами. Публикаций: <span id="cnt">0</span>.</p>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="toolbar"><div class="cats" id="years-f" role="group" aria-label="Год"></div><input class="search" id="q" type="search" placeholder="Поиск по новостям" aria-label="Поиск по новостям"></div>
    <div class="news-grid" id="news"></div>
    <button class="btn line more" id="more">Показать ещё</button>
  </div>
</section>''', ['data/products.js', 'data/news.js', 'js/app.js'], LB, 'og-news.jpg')

policy = (root / 'tools' / 'policy.part.html').read_text()
page('policy.html', 'Политика конфиденциальности — Чороон XXI Век',
     'Политика обработки персональных данных ООО «Чороон XXI век».', 'policy', policy, ['data/products.js', 'js/app.js'])
print('ok')
