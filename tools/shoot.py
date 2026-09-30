"""Скриншоты сайта для ревью: python3 tools/shoot.py <outdir>. Нужен запущенный сервер на :8420."""
import subprocess, sys, os, urllib.parse
from PIL import Image
CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
out=sys.argv[1]; os.makedirs(out,exist_ok=True)
B='http://localhost:8420/'
def shot(name,url,w,h,chunk=None):
    p=f'{out}/{name}.png'
    subprocess.run([CH,'--headless=new','--disable-gpu','--hide-scrollbars','--mute-audio',f'--window-size={w},{h}',
        '--virtual-time-budget=60000',f'--screenshot={p}',url],capture_output=True,timeout=90)
    if chunk and os.path.exists(p):
        im=Image.open(p); W,H=im.size; n=0
        for y in range(0,H,chunk):
            seg=im.crop((0,y,W,min(H,y+chunk)))
            if seg.getbbox() and len(set(seg.resize((8,8)).getdata()))>2:
                seg.save(f'{out}/{name}-{n:02d}.png'); n+=1
        os.remove(p)
MOB=390
def snap(src,click='',scroll=0,w=None,fill=''):
    q={'src':'../'+src,'click':click,'scroll':scroll,'gap':1400,'fill':fill}
    if w: q['w']=w
    return B+'tools/snap.html?'+urllib.parse.urlencode(q)
def mshot(name,url,h,chunk=None):
    shot(name,url,600,h,chunk)
    import glob
    for f in glob.glob(f'{out}/{name}*.png'):
        im=Image.open(f); im.crop((0,0,MOB,im.size[1])).save(f)
# полные страницы, нарезанные по экранам
for pg in ['index.html','about.html','news.html']:
    base=pg.split('.')[0]
    shot(f'desk-{base}',snap(pg),1440,9000 if base!='about' else 16000,1800)
    mshot(f'mob-{base}',snap(pg,w=MOB),9000 if base!='about' else 22000,1600)
# состояния магазина
shot('desk-state-product',snap('index.html#item-p06'),1440,900)
shot('desk-state-cart',snap('index.html','[data-add=p01]|[data-add=p06]|[data-cart]'),1440,900)
shot('desk-state-checkout',snap('index.html','[data-add=p01]|[data-cart]|[data-checkout]'),1440,900)
mshot('mob-state-product',snap('index.html#item-p06',w=MOB),844)
mshot('mob-state-cart',snap('index.html','[data-add=p01]|[data-add=p06]|[data-cart]',w=MOB),844)
mshot('mob-state-checkout',snap('index.html','[data-add=p01]|[data-cart]|[data-checkout]',w=MOB),844)
SENT='[data-add=p01]|[data-cart]|[data-checkout]|input[value="Почта России"]|[name=consent]|FILL|SUBMIT'
FILLS='#o-name::Анна|#o-phone::+7 900 000-00-00|#o-addr::Москва, ул. Примерная, 1'
shot('desk-state-sent',snap('index.html',SENT,fill=FILLS),1440,900)
mshot('mob-state-sent',snap('index.html',SENT,w=MOB,fill=FILLS),844)
mshot('mob-state-menu',snap('index.html','[data-menu]',w=MOB),844)
print(sorted(os.listdir(out)))
