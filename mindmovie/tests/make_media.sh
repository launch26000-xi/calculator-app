#!/bin/sh
# Makes the small test files the e2e/sweep tests use. Needs ffmpeg + python3 (numpy, Pillow).
set -e
OUT=${1:-./test-media}; mkdir -p "$OUT"; cd "$OUT"
ffmpeg -loglevel error -y -f lavfi -i "testsrc2=size=1280x720:rate=30" -f lavfi -i "sine=frequency=330:sample_rate=44100" -t 4 -c:v libvpx -b:v 1M -c:a libopus clip.webm
python3 - <<'PY'
import numpy as np, wave
from PIL import Image, ImageDraw
sr=44100; dur=12; bpm=120
t=np.arange(sr*dur)/sr; x=0.15*np.sin(2*np.pi*220*t)
for k in range(int(dur*bpm/60)):
    s=int((0.25+k*60/bpm)*sr); n=int(0.08*sr)
    x[s:s+n]+=0.9*np.sin(2*np.pi*60*np.arange(n)/sr)*np.exp(-np.arange(n)/(0.015*sr))
x=np.clip(x,-1,1); st=np.stack([x,x],1)
w=wave.open('music120.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype('<i2').tobytes()); w.close()
for i,c in enumerate([(70,60,160),(200,140,60),(40,120,110)]):
    im=Image.new('RGB',(1200,800),c); d=ImageDraw.Draw(im); d.ellipse((400,200,800,600),fill=(240,210,120)); im.save(f'photo{i+1}.jpg',quality=85)
PY
ffmpeg -loglevel error -y -i music120.wav -b:a 128k music120.mp3
echo "test media in $OUT"
