# Traduce los cambios del port 0.8.92 (diff JSON) a la 0.9.9: localiza cada uno por su contexto (nombres minificados como comodín)
# y renombra los identificadores del código nuevo con el mapa del chunk. Escribe porting/edits-0.9.9.json.
import json, re
exec(open('auto.py', encoding='utf-8').read().rsplit('MAIN'+'GUARD', 1)[0])
SKIP = {15, 17, 23, 26, 27, 40, 41, 42, 43, 44, 47, 55, 61, 63, 64, 66, 67, 70, 72, 73}
out = []
for i, c in enumerate(changes):
    if i in SKIP: continue
    if i not in loc: raise SystemExit(f'sin ubicar {i}')
    f, s, e = loc[i]
    r = find_ctx(i); m = r[1]
    anchor = m.group(0); pre = m.group(1)
    new = rename(c['new'], maps[f])
    if src[f].count(anchor) != 1: raise SystemExit(f'ancla no única {i}')
    out.append({'id': i, 'file': f, 'find': anchor, 'at': len(pre), 'old': len(m.group(2)), 'new': new})
json.dump(out, open(R + r'\porting\edits-0.9.9.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out), 'cambios automáticos')
