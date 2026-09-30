"""Скриншоты отдельных блоков: python3 tools/sections.py <outdir> [page]. Сервер на :8420."""
import subprocess, sys, os, json, time, base64, urllib.request, tempfile, websocket
out=sys.argv[1]; page=sys.argv[2] if len(sys.argv)>2 else 'index.html'; os.makedirs(out,exist_ok=True)
CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
p=subprocess.Popen([CH,'--headless=new','--remote-debugging-port=9336',f'--user-data-dir={tempfile.mkdtemp()}','--hide-scrollbars','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for _ in range(50):
    try: tabs=json.load(urllib.request.urlopen('http://127.0.0.1:9336/json'));break
    except Exception: time.sleep(.2)
ws=websocket.create_connection([t for t in tabs if t['type']=='page'][0]['webSocketDebuggerUrl'],suppress_origin=True);n=[0]
def cmd(m,**pr):
    n[0]+=1;ws.send(json.dumps({'id':n[0],'method':m,'params':pr}))
    while True:
        r=json.loads(ws.recv())
        if r.get('id')==n[0]: return r.get('result',{})
SEL={'index.html':['.intro','.promo','.story','#masterclass','#contacts'],'about.html':['.about-hero','#y2005','#y2006']}[page]
for tag,w,h,m in (('desk',1440,900,False),('mob',390,844,True)):
    cmd('Emulation.setDeviceMetricsOverride',width=w,height=h,deviceScaleFactor=1,mobile=m)
    cmd('Page.navigate',url='about:blank');time.sleep(.3)
    cmd('Page.navigate',url=f'http://localhost:8420/{page}');time.sleep(2.5)
    cmd('Runtime.evaluate',expression="localStorage.setItem('ch-cookie','true');document.getElementById('cookie')?.classList.remove('show');document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'));document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')")
    time.sleep(1.5)
    for i,sel in enumerate(SEL):
        cmd('Runtime.evaluate',expression=f"(()=>{{const e=document.querySelector('{sel}');window.scrollTo(0,e.getBoundingClientRect().top+scrollY-{'80' if not m else '72'})}})()")
        time.sleep(1.2)
        open(f'{out}/{tag}-{i}.png','wb').write(base64.b64decode(cmd('Page.captureScreenshot',format='png')['data']))
ws.close();p.terminate();print('ok')
