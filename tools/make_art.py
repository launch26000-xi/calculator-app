"""Builds the faded background art (SVG) for Colorado No2.
Run: python3 tools/make_art.py   (writes into art/)"""
import math, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'art')
os.makedirs(OUT, exist_ok=True)
NAVY, RED = '#0B2545', '#C8102E'

def star(cx, cy, r, rot=-90):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.382
        a = math.radians(rot + i * 36)
        pts.append(f"{cx + rr*math.cos(a):.2f},{cy + rr*math.sin(a):.2f}")
    return 'M' + ' L'.join(pts) + 'Z'

def save(name, body, w=400, h=400):
    with open(os.path.join(OUT, name), 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>')

# 1) 1776 circle of 13 stars with "Second Amendment"
stars = ''.join(f'<path d="{star(200 + 140*math.cos(math.radians(-90 + i*360/13)), 200 + 140*math.sin(math.radians(-90 + i*360/13)), 22)}"/>' for i in range(13))
save('stars-circle.svg', f'''
<g fill="{NAVY}">{stars}</g>
<circle cx="200" cy="200" r="98" fill="none" stroke="{RED}" stroke-width="3"/>
<circle cx="200" cy="200" r="90" fill="none" stroke="{RED}" stroke-width="1"/>
<g font-family="Georgia, 'Times New Roman', serif" font-weight="700" fill="{NAVY}" text-anchor="middle">
<text x="200" y="192" font-size="30" letter-spacing="2">SECOND</text>
<text x="200" y="226" font-size="22" letter-spacing="1">AMENDMENT</text>
<text x="200" y="256" font-size="14" fill="{RED}" letter-spacing="3">MDCCXCI</text></g>''')

# 2) Heraldic eagle (simple, stylised)
feathers = []
for side in (-1, 1):
    for i in range(7):
        ang = side * (18 + i * 12)
        ln = 150 - i * 9
        feathers.append(f'<g transform="translate({200 + side*28} 190) rotate({ang if side>0 else ang})"><path d="M0 0 C {side*18} -10 {side*ln*0.95} -18 {side*ln} -6 C {side*ln*0.9} 6 {side*20} 12 0 8Z"/></g>')
tail = ''.join(f'<path transform="rotate({a} 200 280)" d="M193 270 L200 350 L207 270Z"/>' for a in (-24,-12,0,12,24))
save('eagle.svg', f'''
<g fill="{NAVY}">{''.join(feathers)}{tail}
<ellipse cx="200" cy="230" rx="42" ry="70"/>
<circle cx="200" cy="140" r="26"/>
<path d="M222 136 L250 146 L224 156Z" fill="#B8860B"/>
</g>
<g transform="translate(176 205)"><path d="M0 0 H48 V40 C48 62 24 72 24 72 C24 72 0 62 0 40Z" fill="#fff"/>
<rect x="0" y="0" width="48" height="16" fill="{NAVY}" stroke="#fff"/>
{''.join(f'<rect x="{4+i*8}" y="16" width="4" height="54" fill="{RED}"/>' for i in range(6))}
<path d="M0 0 H48 V40 C48 62 24 72 24 72 C24 72 0 62 0 40Z" fill="none" stroke="#fff" stroke-width="3"/></g>
<g fill="{NAVY}" transform="translate(200 120)">{''.join(f'<path d="{star(-60+i*20, -40 - (10 if i in (2,3,4) else 0) , 6)}"/>' for i in range(7))}</g>''')

# 3) Liberty bell
save('bell.svg', f'''
<g fill="none" stroke="{NAVY}" stroke-width="6" stroke-linejoin="round">
<path d="M150 90 H250 V70 H150Z"/>
<path d="M200 70 V45"/><circle cx="200" cy="40" r="10"/>
<path d="M150 95 C120 120 125 200 110 260 C100 300 80 310 80 320 H320 C320 310 300 300 290 260 C275 200 280 120 250 95Z" fill="{NAVY}" fill-opacity=".08"/>
<path d="M95 290 H305"/><path d="M100 305 H300" stroke-width="3"/>
<path d="M190 200 L205 230 L195 250 L210 280" stroke="{RED}" stroke-width="5"/>
<circle cx="200" cy="335" r="14" fill="{NAVY}"/></g>
<text x="200" y="140" font-family="Georgia, serif" font-size="13" text-anchor="middle" fill="{NAVY}" letter-spacing="1">PROCLAIM LIBERTY</text>''')

# 4) Quill and scroll ("We the People")
lines = ''.join(f'<path d="M110 {190+i*16} H{290 - (i%3)*30}" stroke="{NAVY}" stroke-width="2" stroke-opacity=".6"/>' for i in range(8))
save('quill.svg', f'''
<path d="M90 120 C90 100 110 100 110 100 H300 C320 100 320 120 320 120 V320 C320 340 300 340 300 340 H110 C90 340 90 320 90 320Z" fill="#E9DCC0" stroke="{NAVY}" stroke-width="3"/>
<text x="200" y="165" font-family="Georgia, serif" font-style="italic" font-size="34" text-anchor="middle" fill="{NAVY}">We the People</text>
{lines}
<g transform="translate(300 60) rotate(35)"><path d="M0 0 C30 40 30 140 0 230 C-30 140 -30 40 0 0Z" fill="#fff" stroke="{NAVY}" stroke-width="3"/><path d="M0 10 V250" stroke="{NAVY}" stroke-width="3"/></g>''')

# 5) 13-stripe flag with Betsy-style star circle
stripes = ''.join(f'<rect y="{i*20}" width="400" height="20" fill="{RED if i%2==0 else "#fff"}"/>' for i in range(13))
ring = ''.join(f'<path d="{star(80 + 50*math.cos(math.radians(-90 + i*360/13)), 70 + 50*math.sin(math.radians(-90 + i*360/13)), 9)}" fill="#fff"/>' for i in range(13))
save('flag.svg', f'{stripes}<rect width="160" height="140" fill="{NAVY}"/>{ring}', 400, 260)

# 6) Parchment texture
save('parchment.svg', '''
<filter id="p"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7"/>
<feColorMatrix values="0 0 0 0 .55  0 0 0 0 .43  0 0 0 0 .25  0 0 0 .09 0"/></filter>
<rect width="400" height="400" fill="#F4ECD8"/><rect width="400" height="400" filter="url(#p)"/>''')
print('art written to', os.path.abspath(OUT))
