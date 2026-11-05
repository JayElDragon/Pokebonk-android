import json, re, sys
R = r'C:\Users\user\Desktop\Codigo de Pokebonk para Jay\PokeBonk-0.9.8'
W = R + r'\porting\web-0.9.9-mw3e1u3x\assets'
FILES = {'main': 'main-Cx4tF-jA-mw3e1u3x.js', 'menus': 'menus-1ZFEe0vd-mw3e1u3x.js'}
src = {k: open(W + '/' + v, encoding='utf-8').read() for k, v in FILES.items()}
patched = open(R + r'\site-mw17215b\assets\main-DE_Gq1n2-mw17215b.js', encoding='utf-8').read()
changes = json.load(open(R + r'\porting\main-DE_Gq1n2-mw17215b.js.diff.json', encoding='utf-8'))
KEEP = set('if else return let var const new this function for of in try catch typeof void null true false await async class extends case break switch do while delete instanceof window document performance Math e t n r i a o s c l u d f p m h g v y x'.split())
TOK = r'[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|\s+|.'
def toks(t): return re.findall(TOK, t, re.S)
def is_id(t): return re.fullmatch(r'[A-Za-z_$][\w$]*', t) is not None
def minified(t): return is_id(t) and t not in KEEP and (len(t) <= 2 or (len(t) <= 3 and not t.islower()))
def pattern(text):
    return ''.join(r'[A-Za-z_$][\w$]{0,3}' if minified(t) else re.escape(t) for t in toks(text))
def surround(i):
    c = changes[i]
    probe = c['ctx'][-60:] + c['new']
    k = patched.find(probe)
    if k < 0 or patched.find(probe, k + 1) >= 0:
        return None
    s = k + 60; e = s + len(c['new'])
    return patched[max(0, s - 300):s], patched[e:e + 300]
def locate(i):
    c = changes[i]
    sur = surround(i)
    before = c['ctx'] if sur is None else sur[0]
    after = '' if sur is None else sur[1]
    best = None
    for nb in (80, 50, 30, 18, 10):
        for na in (0, 15, 30, 60, 120):
            b, a = before[-nb:], after[:na]
            pat = '(' + pattern(b) + ')(' + pattern(c['old']) + ')(' + pattern(a) + ')'
            hits = []
            for k, s in src.items():
                for m in re.finditer(pat, s):
                    hits.append((k, m)); 
                    if len(hits) > 3: break
            if len(hits) == 1:
                return hits[0][0], hits[0][1], b, a
    return None
if __name__ == '__main__':
    for i in [int(x) for x in sys.argv[1:]] or range(len(changes)):
        r = locate(i)
        print(i, 'MISS' if r is None else (r[0], r[1].start(2), repr(r[1].group(2)[:80])))
