"""Reproduce a rejected research candidate; never used by the application.
Run from the repository root after prepare_note_windows.py:
  uv run --no-project --with numpy==2.5.3 python docs/evaluation/fit_measured_cluster_profiles.py
Uses only calibration data. Generated profiles are derived from GuitarSet v1.1.0,
CC BY 4.0, by Qingyang Xi, Rachel M. Bittner, Johan Pauwels, Xuzhou Ye and
Juan Pablo Bello (2018). Source: https://zenodo.org/records/3371780.
"""
import collections, hashlib, json, wave
from pathlib import Path
import numpy as np
root=Path('artifacts/guitarset')
manifest_path=root/'calibration-note-windows.json'
m=json.loads(manifest_path.read_text())
assert m['split']=='calibration' and m['heldOutRead'] is False
windows=collections.defaultdict(list)
for w in m['windows']: windows[w['file']].append(w)
groups=collections.defaultdict(list)
rejected=collections.Counter()
for file in m['files']:
 assert file['player'] in ['00','01','02','03']
 path=root/file['file']
 assert hashlib.sha256(path.read_bytes()).hexdigest()==file['sha256']
 with wave.open(str(path)) as recording:
  rate=recording.getframerate();assert recording.getsampwidth()==2 and recording.getnchannels()==1
  samples=np.frombuffer(recording.readframes(recording.getnframes()),dtype='<i2').astype(float)/32768
 for w in windows[file['file']]:
  frame=samples[w['sampleStart']:w['sampleStart']+8192]
  assert len(frame)==8192
  if np.sqrt(np.mean(frame**2))<.003:
   rejected['quiet']+=1;continue
  spectrum=np.abs(np.fft.rfft(frame*(.5-.5*np.cos(2*np.pi*np.arange(8192)/8192))))
  fundamental=440*2**((w['annotatedMidi']-69)/12)
  magnitudes=[];mask=np.zeros(len(spectrum),dtype=bool)
  for h in range(1,11):
   f=fundamental*h
   if f>=min(4000,rate/2):magnitudes.append(0.0);continue
   center=round(f*8192/rate);lo=max(1,center-2);hi=min(len(spectrum),center+3)
   magnitudes.append(float(max(spectrum[lo:hi])));mask[lo:hi]=True
  purity=float(sum(spectrum[mask]**2)/sum(spectrum[1:]**2))
  if purity<.8:
   rejected['spectrallyImpure']+=1;continue
  amps=np.array(magnitudes);amps/=np.linalg.norm(amps)
  groups[(w['midi'],'all')].append((amps,file['file'],w['noteIndex']))
profiles=[]
for (midi,phase),examples in sorted(groups.items()):
 distinct=len({(f,n) for _,f,n in examples})
 if distinct<5:
  rejected['insufficientGroupWindows']+=len(examples);continue
 data=np.array([a for a,_,_ in examples])
 centers=[data[np.argmin(np.sum((data-np.mean(data,axis=0))**2,axis=1))]]
 for _ in range(3):
  distance=np.min(np.array([np.sum((data-center)**2,axis=1) for center in centers]),axis=0)
  if max(distance)<1e-10:break
  centers.append(data[np.argmax(distance)])
 centers=np.array(centers)
 for _ in range(50):
  labels=np.argmin(np.sum((data[:,None,:]-centers[None,:,:])**2,axis=2),axis=1)
  updated=np.array([np.mean(data[labels==i],axis=0) if np.any(labels==i) else centers[i] for i in range(len(centers))])
  if np.max(np.abs(updated-centers))<1e-8:break
  centers=updated
 for i,center in enumerate(centers):
  members=[example for label,example in zip(labels,examples) if label==i]
  count=len({(file,note) for _,file,note in members})
  if count<5:continue
  center=center/np.linalg.norm(center)
  profiles.append({'midi':midi,'phase':f'cluster-{i}','examples':count,'harmonics':center.tolist()})
model={'source':m['source'],'license':m['license'],'heldOutRead':False,'manifestSha256':hashlib.sha256(manifest_path.read_bytes()).hexdigest(),'numpyVersion':np.__version__,'minimumRms':.003,'minimumHarmonicEnergyFraction':.8,'minimumDistinctNotes':5,'profiles':profiles,'rejected':dict(rejected)}
(root/'measured-note-profiles.json').write_text(json.dumps(model,indent=2)+'\n')
print(json.dumps({'profiles':len(profiles),'rejected':dict(rejected),'G3':[p for p in profiles if p['midi']==55]},indent=2))
