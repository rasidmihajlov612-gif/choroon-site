"""Вырезает товары из фото (U2Net через onnxruntime) и ставит на единый фон карточки.
python3 tools/cutout.py /path/u2net.onnx"""
import sys, os, numpy as np, onnxruntime as ort
from PIL import Image, ImageFilter, ImageDraw
S='assets/src/'; BG=(237,234,228); W,H=1000,1250
sess=ort.InferenceSession(sys.argv[1],providers=['CPUExecutionProvider'])
def mask(im):
    x=np.asarray(im.convert('RGB').resize((320,320),Image.LANCZOS)).astype(np.float32); x/=x.max()
    x=(x-[0.485,0.456,0.406])/[0.229,0.224,0.225]; x=x.transpose(2,0,1)[None].astype(np.float32)
    m=sess.run(None,{sess.get_inputs()[0].name:x})[0][0,0]
    m=(m-m.min())/(m.max()-m.min()+1e-8)
    return Image.fromarray((m*255).astype('uint8')).resize(im.size,Image.LANCZOS)
def crop(f,b):
    im=Image.open(S+f).convert('RGB'); w,h=im.size
    return im.crop((int(b[0]*w),int(b[1]*h),int(b[2]*w),int(b[3]*h)))
def place(im,fitw=.76,fith=.68,base=.86):
    m=mask(im); m=m.point(lambda v: 0 if v<40 else (255 if v>200 else int((v-40)*255/160)))
    bb=m.point(lambda v:255 if v>128 else 0).getbbox(); im=im.crop(bb); m=m.crop(bb)
    s=min(W*fitw/im.size[0],H*fith/im.size[1]); nw,nh=int(im.size[0]*s),int(im.size[1]*s)
    im=im.resize((nw,nh),Image.LANCZOS); m=m.resize((nw,nh),Image.LANCZOS)
    c=Image.new('RGB',(W,H),BG); x=(W-nw)//2; y=int(H*base)-nh
    sh=Image.new('L',(W,H),0); d=ImageDraw.Draw(sh)
    d.ellipse((x+nw*.12,y+nh-18,x+nw*.88,y+nh+16),fill=70); sh=sh.filter(ImageFilter.GaussianBlur(18))
    c.paste(Image.new('RGB',(W,H),(150,140,125)),(0,0),sh)
    c.paste(im,(x,y),m.filter(ImageFilter.GaussianBlur(.6)))
    return c
J={
 'tripod-a':('prod-32.jpg',(.02,.02,.48,.97)), 'tripod-b':('prod-32.jpg',(.53,.02,.9,.9)),
 'choroon-olonkho':('about-12.png',(.53,0,.91,1)), 'choroon-white':('about-12.png',(.14,0,.52,1)),
 'vessel':('about-22.png',(.3,.05,.78,.98)), 'tea-service':('prod-33.jpg',(.05,.18,.97,.9)),
 'teacups':('home-01.jpg',(.69,.55,.9,.75)), 'kytyya':('about-25.jpg',(.53,.66,.85,.97)),
 'karas':('home-04.jpg',(.24,.12,.84,.74)), 'angob':('about-19.jpg',(.49,.43,.65,.74)),
 'ceramic-bowl':('about-13.png',(.41,.28,.84,.56)), 'clay-bowls':('about-29.jpeg',(.24,.24,.74,.73)),
 'relief':('prod-34.jpg',(.18,0,.82,1)), 'olonkho-figures':('about-16.png',(0,0,1,1)),
 'casket':('about-20.png',(.2,0,.8,1)), 'keychains':('about-18.png',(.05,.1,.98,.95)),
 'xmas-tree':('about-30.jpg',(.28,.1,.76,.86)), 'xmas-boots':('about-24.jpg',(.02,.1,.98,.95)),
 'bell-silver':('about-23.jpg',(.17,.14,.55,.97)), 'bell-light':('about-23.jpg',(.5,.18,.88,.97)),
}
os.makedirs('img/p',exist_ok=True)
for k,(f,b) in J.items():
    # старый кадр-лайфстайл сохраняем как вторую фотографию
    if os.path.exists(f'img/p/{k}.webp') and not os.path.exists(f'img/p/{k}-life.webp'):
        os.rename(f'img/p/{k}.webp',f'img/p/{k}-life.webp'); os.rename(f'img/p/{k}-s.webp',f'img/p/{k}-life-s.webp')
    c=place(crop(f,b)); c.save(f'img/p/{k}.webp','WEBP',quality=84,method=5)
    s=c.copy(); s.thumbnail((520,650)); s.save(f'img/p/{k}-s.webp','WEBP',quality=82,method=5)
    print(k,end=' ',flush=True)
