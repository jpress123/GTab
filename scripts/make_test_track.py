"""Generate a short guitar/bass test mixture from the bundled licensed samples."""
from pathlib import Path
import subprocess
import imageio_ffmpeg
import numpy as np
import soundfile as sf

root=Path(__file__).resolve().parents[1]
sr=44100
mix=np.zeros((sr*12,2),dtype=np.float32)
for instrument,note,starts,level in [('guitar-acoustic','E3',[0,2,4,6,8],.22),('guitar-acoustic','G3',[.03,2.03,4.03,6.03,8.03],.18),('guitar-acoustic','C4',[.06,2.06,4.06,6.06,8.06],.18),('bass-electric','E1',[0,1,2,3,4,5,6,7,8,9],.28)]:
    raw=subprocess.check_output([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(root/'assets/samples'/instrument/(note+'.mp3')),'-ar',str(sr),'-ac','2','-f','f32le','pipe:1'])
    sample=np.frombuffer(raw,dtype=np.float32).reshape(-1,2)
    for start in starts:
        offset=int(start*sr);length=min(len(sample),len(mix)-offset)
        mix[offset:offset+length]+=sample[:length]*level
sf.write('/tmp/gtab-band-test.wav',mix,sr)
print('/tmp/gtab-band-test.wav')
