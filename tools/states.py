"""Скриншоты состояний магазина через DevTools-протокол (реальное время, реальные клики).
python3 tools/states.py <outdir>  — нужен сервер на :8420."""
import subprocess, sys, os, json, time, base64, urllib.request, tempfile
import websocket
out=sys.argv[1]; os.makedirs(out,exist_ok=True)
CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
prof=tempfile.mkdtemp()
p=subprocess.Popen([CH,'--headless=new','--remote-debugging-port=9333',f'--user-data-dir={prof}','--hide-scrollbars','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for _ in range(50):
    try: tabs=json.load(urllib.request.urlopen('http://127.0.0.1:9333/json')); break
    except Exception: time.sleep(.2)
ws=websocket.create_connection([t for t in tabs if t['type']=='page'][0]['webSocketDebuggerUrl'],suppress_origin=True)
n=0
def cmd(m,**pr):
    global n; n+=1; ws.send(json.dumps({'id':n,'method':m,'params':pr}))
    while True:
        r=json.loads(ws.recv())
        if r.get('id')==n: return r.get('result',{})
def js(e): return cmd('Runtime.evaluate',expression=e,awaitPromise=True)
def size(w,h,mob): cmd('Emulation.setDeviceMetricsOverride',width=w,height=h,deviceScaleFactor=1,mobile=mob)
def go(url):
    cmd('Page.navigate',url='about:blank'); time.sleep(.3)
    cmd('Page.navigate',url=url); time.sleep(2.2)
    js("localStorage.setItem('ch-cookie','true');localStorage.removeItem('ch-cart');document.getElementById('cookie')?.classList.remove('show');document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'))")
def shot(name):
    time.sleep(.9); d=cmd('Page.captureScreenshot',format='png')['data']
    open(f'{out}/{name}.png','wb').write(base64.b64decode(d)); print(name,end=' ',flush=True)
B='http://localhost:8420/index.html'
CLICK=lambda s: js(f"document.querySelector({json.dumps(s)}).click()")
FILL="""(()=>{const f=document.querySelector('form[data-form=order]');f.querySelector('#o-name').value='Анна';f.querySelector('#o-phone').value='+7 900 000-00-00';
f.querySelector('input[value="Почта России"]').click();f.querySelector('#o-addr').value='Москва, ул. Примерная, 1';f.querySelector('[name=consent]').click();})()"""
cmd('Page.enable')
for tag,w,h,mob in (('desk',1440,900,False),('mob',390,844,True)):
    size(w,h,mob)
    go(B+'#item-p06'); shot(f'{tag}-state-product')
    go(B); CLICK('[data-add=p01]'); CLICK('[data-add=p06]'); time.sleep(.3); CLICK('[data-cart]'); shot(f'{tag}-state-cart')
    CLICK('[data-checkout]'); shot(f'{tag}-state-checkout')
    js(FILL); js("document.querySelector('form[data-form=order]').requestSubmit()"); time.sleep(.5); shot(f'{tag}-state-sent')
    if mob: go(B); CLICK('[data-menu]'); shot('mob-state-menu')
ws.close(); p.terminate()
