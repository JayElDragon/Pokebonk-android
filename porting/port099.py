"""Aplica el port Android de JayElDragon sobre PokéBonk 0.9.9 (build mw3e1u3x).

Lee los módulos limpios de porting/pristine-0.9.9 y escribe los parcheados en site/assets.
  1. Cambios del port 0.8.92 traducidos a la 0.9.9 (porting/edits-0.9.9.json, generado por gen_edits.py)
     más los que hubo que ubicar a mano (MANUAL). Todos se aplican sobre posiciones del texto original.
  2. Navegación de menú Android (patches/menu-navigation.js) dentro de menus, con los nombres de la 0.9.9.
  3. Servidor local sin internet (offline.js), con el método de mirror.py de Charcher (NAME_PATTERNS por chunk).
  4. Arranque: se permite el origen de la app Android (appassets.androidplatform.net), con permiso del autor.
Cada ancla debe aparecer exactamente una vez; si no, se detiene y dice cuál falló.
Uso:  python porting/port099.py
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PRISTINE = os.path.join(HERE, 'pristine-0.9.9')
ASSETS = os.path.join(ROOT, 'site', 'assets')

MAIN = 'main-Cx4tF-jA-mw3e1u3x.js'     # partida, HUD, cliente del servidor, arranque de la app
MENUS = 'menus-1ZFEe0vd-mw3e1u3x.js'   # menús, mando, retratos, ajustes
ENTRY = 'main-DfdwqtE9-mw3e1u3x.js'    # arranque e idiomas
FILES = {'main': MAIN, 'menus': MENUS, 'entry': ENTRY}


def read(path):
    return open(path, encoding='utf-8').read()


def fail(what, msg):
    sys.exit(f'[{what}] {msg}')


def once(text, old, new, what):
    n = text.count(old)
    if n != 1:
        fail(what, f'el texto aparece {n} veces (debe ser 1): {old[:90]!r}')
    return text.replace(old, new)


# ------------------------------------------------------------------ 1. cambios del port sobre posiciones originales
class Spans:
    def __init__(self, texts):
        self.texts = texts
        self.edits = {k: [] for k in texts}

    def add(self, file, anchor, old, new, what):
        """Sustituye `old` (dentro de `anchor`, que debe ser único) por `new`. old='' con anchor 'A|B' no vale:
        para insertar usa old='' y pon el punto de inserción con `at`."""
        t = self.texts[file]
        n = t.count(anchor)
        if n != 1:
            fail(what, f'ancla {n} veces en {file}: {anchor[:90]!r}')
        a = t.index(anchor)
        if not old or anchor.count(old) != 1:
            fail(what, f'"{old[:60]}" no está una sola vez en el ancla')
        s = a + anchor.index(old)
        self.edits[file].append((s, s + len(old), new, what))

    def insert_after(self, file, anchor, new, what):
        t = self.texts[file]
        if t.count(anchor) != 1:
            fail(what, f'ancla {t.count(anchor)} veces en {file}: {anchor[:90]!r}')
        s = t.index(anchor) + len(anchor)
        self.edits[file].append((s, s, new, what))

    def at(self, file, start, end, new, what):
        self.edits[file].append((start, end, new, what))

    def apply(self):
        out = {}
        for f, t in self.texts.items():
            ed = sorted(self.edits[f], key=lambda e: (e[0], e[1]))
            for x, y in zip(ed, ed[1:]):
                if y[0] < x[1]:
                    fail(y[3], f'se solapa con {x[3]}')
            for s, e, new, _ in reversed(ed):
                t = t[:s] + new + t[e:]
            out[f] = t
        return out


# Nombres de la 0.8.92 que el código nuevo usaba y que en la 0.9.9 viven en otro chunk o cambiaron de forma.
FIX = {
    22: [('PO===n&&LO()', 'CU===n&&EU()')],                       # tooltip actual / cerrar tooltip
    35: [('if(Kn)ts(!1);', 'if(Kn)window.__pbPadMode?.(!1);'),     # modo mando (menus, sin exportar)
         ('ic(!0);', 'window.__pbTouchMode?.(!0);')],              # modo táctil (menus, sin exportar)
    68: [('(pbAndroidSyncMenu(this),', '(window.pbAndroidSyncMenu?.(this),')],
    71: [('pbSyncMenuBackground(this,e);pbSyncMenuMusic(this,e);',
          'window.pbSyncMenuBackground?.(this,e);window.pbSyncMenuMusic?.(this,e);')],
    13: [('xn(`', 'zn(`')],                                       # ruta de recursos
}


def port_changes(sp):
    edits = json.load(open(os.path.join(HERE, 'edits-0.9.9.json'), encoding='utf-8'))
    for e in edits:
        new = e['new']
        for a, b in FIX.get(e['id'], []):
            if a not in new:
                fail(f'cambio {e["id"]}', f'no encuentro {a!r} para corregir')
            new = new.replace(a, b)
        t = sp.texts[e['file']]
        if t.count(e['find']) != 1:
            fail(f'cambio {e["id"]}', 'ancla no única')
        s = t.index(e['find']) + e['at']
        sp.at(e['file'], s, s + e['old'], new, f'cambio {e["id"]}')

    # --- menus: retratos (marca de suelo del compañero, arranque del sprite cuando el canvas entra en la página)
    sp.add('menus', '}}}p&&h&&m?d.drawImage(h,0,0,c,l,0,0,c*u,l*u)', 'p&&h&&m?', 'a.__pbGround&&(a.__pbFrame=t);p&&h&&m?', 'cambio 15')
    sp.add('menus', 'return ee=requestAnimationFrame(te),a}var sU=', 'requestAnimationFrame(te)', 'pbStartSprite(a,te)', 'cambio 17')
    # --- menus: premio de Tesoros con tamaño por defecto
    sp.insert_after('menus', 'function j3(e,t,n,r){', 'const spriteSize=r||56;', 'cambio 47')
    # --- menus: sin pantalla de cuenta; entra directo con la cuenta local
    sp.insert_after('menus', 'function _6(e){', 'if(e.backend.kind===`local`){e.backend.guest().then(account=>e.signedIn(account));return;}', 'cambio 55')
    # --- menus: fila "Fondo del menú" en Interfaz
    sp.add('menus', '`lootHideTreasure`],rows:()=>[o(c(`Tema`),', 'rows:()=>[', 'rows:()=>[pbMenuBackgroundRow(e,r),', 'cambio 61')

    # --- main: pistas de partida más breves
    sp.add('main', 'Fh=7500,Ih=2500,Lh=.4,Rh={ball', 'Fh=7500,Ih=2500', 'Fh=4000,Ih=1000', 'cambio 23')
    # --- main: controles táctiles solo tras tocar la pantalla; sin mando activo
    sp.add('main', 'update(e,t){if(this.run=e,this.show(O&&!Kn&&e.state===`play`&&!e.player.dead),',
           'update(e,t){if(this.run=e,this.show(O&&!Kn',
           'update(e,t){if(Kn)this.touchActive=!1;if(this.run=e,this.show((this.touchActive||!window.AndroidMenu&&O)&&!Kn', 'cambios 40-41')
    sp.add('main', 'this.fs.style.display!==n&&(this.fs.style.display=n),this.touches===0&&(this.lastType===`touch`||this.sawTouchEv)&&(this.stickId>=0||this.looks.size||this.anyOn())&&this.letGo();',
           'this.fs.style.display!==n&&(this.fs.style.display=n),this.touches===0&&(this.lastType===`touch`||this.sawTouchEv)&&(this.stickId>=0||this.looks.size||this.anyOn())&&this.letGo();',
           'this.fs.style.display!==n&&(this.fs.style.display=n);', 'cambio 42')
    sp.add('main', '}destroy(){this.off(),this.show(!1),this.el.remove()}', 'this.off(),this.show(!1),this.el.remove()',
           'removeEventListener(`pointerdown`,this.activateTouch,!0);this.off(),this.show(!1),this.el.remove()', 'cambio 43')
    # --- main: resultados sin clasificación online: "Tus marcas · tier"
    sp.add('main', '{class:`sm-body`},f(e.coop?U(`Clasificación cooperativa`):U(`Clasificación`),',
           'f(e.coop?U(`Clasificación cooperativa`):U(`Clasificación`),',
           'f(U(`Tus marcas · {tier}`,{tier:__pbTiers[e.tier]??``}),', 'cambio 63')
    # --- main: la música del menú arranca aunque el primer toque no desbloquee el audio
    sp.insert_after('main', 'addEventListener(`touchend`,a),addEventListener(`click`,a),',
                    '[300,1500,4000].forEach(e=>setTimeout(()=>{L.running&&i||a()},e)),', 'cambio 70')
    # --- main: aviso al suspender la partida en local
    sp.add('main', 'this.toMenu(),this.notice(U(e?`Partida guardada. Continúala', 'U(e?',
           'U(this.backend.kind===`local`?`Partida guardada en este dispositivo. Continúala desde el menú cuando quieras.`:e?', 'cambio 72')
    # --- main: fondo y música del menú elegidos en Ajustes (estanque / Halloween / Johto / Expedición)
    sp.add('main', 'XS=()=>null,', 'XS=()=>null,', 'XS=()=>window.pbReadMenuBackground?.()??null,', 'fondo del menú')
    sp.add('main', '$S=()=>{let e=So(Date.now())', '$S=()=>{',
           '$S=()=>{let pbChoice=window.pbReadMenuMusic?.()??`auto`;if(pbChoice!==`auto`)return pbChoice;', 'música del menú')
    # --- main: instalar los controles Android antes de arrancar la app
    sp.add('main', 'Xi(),WS(),await new rC().boot();', 'Xi(),WS(),await new rC().boot();',
           'Xi(),WS();window.__pbMenuTrack=()=>$S();const pbMenuInstance=new rC();window.pbInstallAndroidControls?.(pbMenuInstance);await pbMenuInstance.boot();',
           'cambio 73')

    # --- entry: abrir también desde la app Android (permiso del autor)
    sp.add('entry', 'm=e=>/(^|\\.)pokebonk\\.com\\.?$/.test(e)||', 'm=e=>',
           'm=e=>e===`appassets.androidplatform.net`||', 'origen Android')


# ------------------------------------------------------------------ 2. navegación de menú Android en menus
NAV_NAMES = {  # 0.8.92 -> 0.9.9 (menus)
    'ss': 'qo', 'oo': 'Ka', 'Vo': 'Do', 'ts': 'Vo', 'Os': 'hs', 'Fs': 'Ss', 'Ms': 'ys', 'Ls': 'Es', 'j': 'O',
    'xO': 'lU', 'Ua': 'Oa', 'rO': 'GH', 'vO': 'oU', 'jO': 'bU', 'js': 'vs', 'Ds': 'ms', 'Bs': 'Ms', 'Vs': 'Ns',
    'Hs': 'Ps', 'X': 'Z', 'N': 'Y', 'ne': 'b',
}
TOK = r'[A-Za-z_$][\w$]*|`(?:[^`\\]|\\.)*`|\'(?:[^\'\\]|\\.)*\'|"(?:[^"\\]|\\.)*"|//[^\n]*|\s+|.'


def rename_nav(code):
    tk = re.findall(TOK, code, re.S)
    out = []
    for j, t in enumerate(tk):
        prev = next((p for p in reversed(tk[:j]) if not p.isspace()), '')
        nxt = next((p for p in tk[j + 1:] if not p.isspace()), '')
        if t in NAV_NAMES and prev != '.' and not (nxt == ':' and prev in ('{', ',')) and prev not in ('const', 'let', 'function'):
            out.append(NAV_NAMES[t])
        else:
            out.append(t)
    return ''.join(out)


def nav_code():
    code = read(os.path.join(ROOT, 'patches', 'menu-navigation.js'))
    # 0.9.9: escenario y música nuevos (Expedición, Johto)
    code = once(code, '[`pond`,`halloween`,`johto`].includes(value)?value:`pond`; }',
                '[`pond`,`halloween`,`johto`,`expedition`].includes(value)?value:`pond`; }', 'fondos 0.9.9 (leer)')
    code = once(code, 'const value=[`pond`,`halloween`,`johto`].includes(settings.menuBackground)',
                'const value=[`pond`,`halloween`,`johto`,`expedition`].includes(settings.menuBackground)', 'fondos 0.9.9 (guardar)')
    code = once(code, '[`johto`,`Johto`]].map(', '[`johto`,`Johto`],[`expedition`,(window.pbT||(k=>k))(`expedition`)]].map(', 'fondos 0.9.9 (fila)')
    code = once(code, 'return [`auto`,`menu`,`halloween-menu`].includes(value)?value:`auto`;',
                'return [`auto`,`menu`,`halloween-menu`,`johto-menu`].includes(value)?value:`auto`;', 'música 0.9.9 (leer)')
    code = once(code, 'const value=[`auto`,`menu`,`halloween-menu`].includes(settings.menuMusic)',
                'const value=[`auto`,`menu`,`halloween-menu`,`johto-menu`].includes(settings.menuMusic)', 'música 0.9.9 (guardar)')
    code = once(code, '[`halloween-menu`,`Halloween`]].map(', '[`halloween-menu`,`Halloween`],[`johto-menu`,`Johto`]].map(', 'música 0.9.9 (fila)')
    # la pista del menú la calcula main ($S); se expone al arrancar
    code = once(code, 'N.playTrack(yq())', 'N.playTrack(window.__pbMenuTrack?.()??`menu`)', 'pista del menú')
    code = rename_nav(code)
    expose = ('\nwindow.__pbPadMode=e=>Vo(e);window.__pbTouchMode=e=>Xs(e);\n'
              'Object.assign(window,{pbInstallAndroidControls,pbAndroidSyncMenu,pbSyncMenuBackground,pbSyncMenuMusic,'
              'pbReadMenuBackground,pbReadMenuMusic});\n')
    return '/* JAY_MENU_NAV_START */\n' + code + expose + '/* JAY_MENU_NAV_END */\n'


def add_import(text, chunk_prefix, export_name, local, what):
    m = [m for m in re.finditer(r'import\{([^}]*)\}from"\./([^"]+)"', text) if m.group(2).startswith(chunk_prefix)]
    if len(m) != 1:
        fail(what, f'import de {chunk_prefix} encontrado {len(m)} veces')
    m = m[0]
    return text[:m.end(1)] + f',{export_name} as {local}' + text[m.end(1):]


# ------------------------------------------------------------------ 3. servidor local (método de mirror.py de Charcher)
def offline(texts):
    mirror = read(os.path.join(ROOT, 'mirror.py'))
    ns = {}
    exec('import re\n' + mirror[mirror.index('NAME_PATTERNS = {'):mirror.index('def once(')], ns)
    NAME = ns['NAME']
    per = {}
    for keys, pattern in ns['NAME_PATTERNS'].items():
        hits = {(f, g) for f, t in texts.items() for g in re.findall(pattern.replace('@', NAME), t)}
        if len(hits) != 1:
            fail('servidor local', f'{keys}: {len(hits)} coincidencias {sorted(hits)[:4]}')
        (f, got), = hits
        per.setdefault(f, {}).update(zip(keys.split(), got if isinstance(got, tuple) else (got,)))
    local = read(os.path.join(ROOT, 'offline.js'))
    fac = ns['FACTORY'].replace('@', NAME)
    for f, t in texts.items():
        names = per.get(f)
        if names:
            t = ('Object.defineProperties(globalThis.__PB ??= {}, {'
                 + ', '.join(f'{k}: {{ get() {{ return {v}; }} }}' for k, v in names.items()) + '});\n' + t)
        if 'https://api.pokebonk.com' in t and re.search(fac, t):
            if len(re.findall(fac, t)) != 1:
                fail('servidor local', 'fábrica del cliente no única')
            t = re.sub(fac, lambda m: local + f'\nfunction {m.group(1)}(e){{return pbOffline()}}', t, count=1)
            print('  servidor local inyectado en', f)
        for needle, repl in ns['PATCHES']:
            t = t.replace(needle, repl)
        texts[f] = t
    return texts


PORT_TAGS = '''    <script src="./port-i18n.js"></script>
    <link rel="stylesheet" href="./port.css">
    <script src="./port.js" defer></script>
    <script src="./companion.js" defer></script>
    <script src="./preferences.js" defer></script>
    <script src="./donate.js" defer></script>
    <script src="./updater.js" defer></script>
    <script src="./pad-labels.js" defer></script>
'''


def index_html():
    html = read(os.path.join(PRISTINE, 'index.html'))
    vp = '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />\n'
    html = once(html, vp, vp + '    <script src="./ui-scale.js"></script>\n', 'index: ui-scale')
    html = once(html, '  </head>', PORT_TAGS + '  </head>', 'index: scripts del port')
    html = re.sub(r'\s*<script[^>]*cloudflareinsights[^>]*></script>', '', html)  # sin analítica en la app
    open(os.path.join(ROOT, 'site', 'index.html'), 'w', encoding='utf-8', newline='').write(html)


def main_():
    index_html()
    texts = {k: read(os.path.join(PRISTINE, v)) for k, v in FILES.items()}
    sp = Spans(texts)
    port_changes(sp)
    texts = sp.apply()
    texts['main'] = add_import(texts['main'], 'defineProperty', 'pi', '__pbTiers', 'nombres de tier')
    last = texts['menus'].rfind('export{')
    texts['menus'] = texts['menus'][:last] + nav_code() + texts['menus'][last:]
    texts = offline(texts)
    for k, v in FILES.items():
        open(os.path.join(ASSETS, v), 'w', encoding='utf-8', newline='').write(texts[k])
    print('port 0.9.9 aplicado:', sum(len(x) for x in sp.edits.values()), 'cambios en', ', '.join(FILES.values()))


if __name__ == '__main__':
    main_()
