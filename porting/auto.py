import json, re, sys
exec(open('locate.py', encoding='utf-8').read().rsplit('MAIN'+'GUARD', 1)[0])
def find_ctx(i, tails=(80, 50, 30, 18)):
    c = changes[i]
    for n in tails:
        pat = '(' + pattern(c['ctx'][-n:]) + ')(' + pattern(c['old']) + ')'
        hits = [(k, m) for k, s in src.items() for m in re.finditer(pat, s)]
        if len(hits) == 1: return hits[0][0], hits[0][1], n
        if len(hits) > 1: return None
    return None
def align(a_text, b_text, mp):
    a, b = toks(a_text), toks(b_text)
    if len(a) != len(b): return
    for x, y in zip(a, b):
        if is_id(x) and x != y: mp.setdefault(x, set()).add(y)
maps = {'main': {}, 'menus': {}}
loc = {}
for i in range(len(changes)):
    r = find_ctx(i)
    if r:
        f, m, n = r; loc[i] = (f, m.start(2), m.end(2))
        align(changes[i]['ctx'][-n:] + changes[i]['old'], m.group(0), maps[f])
for f in maps: maps[f] = {k: sorted(v)[0] for k, v in maps[f].items() if len(v) == 1}
def rename(text, mp):
    tk = toks(text); out = []
    for j, t in enumerate(tk):
        prev = next((p for p in reversed(tk[:j]) if not p.isspace()), '')
        out.append(mp[t] if (t in mp and prev != '.' and minified(t)) else t)
    return ''.join(out)
# MAINGUARD
if __name__ == '__main__':
    for i in range(len(changes)):
        c = changes[i]
        if i not in loc: print(f'### [{i}] UNLOCATED'); continue
        f, s, e = loc[i]
        new = rename(c['new'], maps[f])
        print(f'### [{i}] {f}@{s} old={src[f][s:e][:120]!r}\n    new={new[:400]!r}')
