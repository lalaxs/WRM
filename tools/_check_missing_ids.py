# -*- coding: utf-8 -*-
import json, struct
from pathlib import Path
SO=Path("tools/il2cpp_input/arm64/libil2cpp.so").read_bytes(); OFF=0x4000
SJ=json.loads(Path("tools/il2cpp_output/script.json").read_text(encoding="utf-8"))
by_addr={m["Address"]:m for m in SJ["ScriptMethod"]}
addrs=sorted(by_addr)
def mlen(a):
 i=addrs.index(a); return (addrs[i+1] if i+1<len(addrs) else a+0x1000)-a

def find_imm(va, size, targets):
  data=SO[va-OFF:va-OFF+size]
  hits={t:[] for t in targets}
  for i in range(0,size,4):
    insn=struct.unpack_from("<I",data,i)[0]
    if (insn & 0x7F800000)==0x52800000: # MOVZ
      hw=(insn>>21)&3
      if hw!=0: continue
      val=(insn>>5)&0xFFFF
      if val in hits:
        hits[val].append(hex(va+i))
    if (insn & 0x7F800000)==0x71000000: # CMP imm
      imm12=(insn>>10)&0xFFF
      if imm12 in hits:
        hits[imm12].append(hex(va+i)+":CMP")
  return hits

miss=[218,219,220,566,567,568]
for short in ["doevent","act1event"]:
  name="root"+"$$"+short
  m=next(x for x in SJ["ScriptMethod"] if x["Name"]==name)
  print(name, find_imm(m["Address"], mlen(m["Address"]), miss))

name="history"+"$$"+"re"
m=next(x for x in SJ["ScriptMethod"] if x["Name"]==name)
# history.re is huge - only report counts
h=find_imm(m["Address"], mlen(m["Address"]), miss)
print("history.re", {k:len(v) for k,v in h.items()}, {k:v[:3] for k,v in h.items()})

# also check creatperson init of rates
name="root"+"$$"+"creatperson"
m=next(x for x in SJ["ScriptMethod"] if x["Name"]==name)
print("creatperson float inits near rates:")
PERSON={0x34:"slove",0x38:"slust",0x44:"dlove",0x48:"dlust",0xd4:"desire",0xe8:"_feel",0xec:"_love",0xf0:"_lust"}
data=SO[m["Address"]-OFF:m["Address"]-OFF+mlen(m["Address"])]
for i in range(0,len(data),4):
  insn=struct.unpack_from("<I",data,i)[0]
  if (insn&0xFFC00000)==0xBD000000:
    off=((insn>>10)&0xFFF)*4
    if off in PERSON:
      print(hex(m["Address"]+i), "STRS", PERSON[off])
