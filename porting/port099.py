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
DP = 'defineProperty-5g46wf9l-mw3e1u3x.js'  # datos comunes (tabla de eventos...)
FILES = {'main': MAIN, 'menus': MENUS, 'entry': ENTRY, 'dp': DP}


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


# Cambios de la 0.8.92 que NO se aplican en la 0.9.9.
#  6: activaba el modo mando cada fotograma si el stick pasaba de .25 respecto a su reposo; en la 0.9.9 eso se
#     cumple en reposo y anulaba cada toque (los botones táctiles nunca aparecían). El juego ya cambia a mando
#     cuando el stick cruza el umbral (variable m), así que basta con el original.
DROP = {6}
# Controles táctiles: la 0.9.9 trae su propio joystick y botones para móvil. Los arreglos táctiles de la 0.8.92
# (1-3, 10-12, 28-43) chocaban con ellos: el personaje no se movía y muchos botones no respondían.
# Se conserva el 4: tocar la pantalla sale SIEMPRE del modo mando (el original no lo hacía si se usó el mando
# en los últimos 5 s, y los controles táctiles seguían ocultos).
TOUCH_0892 = False
if not TOUCH_0892:
    DROP |= {1, 2, 3, 10, 11, 12, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39}

# Nombres de la 0.8.92 que el código nuevo usaba y que en la 0.9.9 viven en otro chunk o cambiaron de forma.
FIX = {
    22: [('PO===n&&LO()', 'CU===n&&EU()')],                       # tooltip actual / cerrar tooltip
    35: [('if(Kn)ts(!1);', 'if(Kn)window.__pbPadMode?.(!1);'),     # modo mando (menus, sin exportar)
         ('ic(!0);', 'window.__pbTouchMode?.(!0);')],              # modo táctil (menus, sin exportar)
    68: [('(pbAndroidSyncMenu(this),', '(window.pbAndroidSyncMenu?.(this),')],
    71: [('pbSyncMenuBackground(this,e);pbSyncMenuMusic(this,e);',
          'window.pbSyncMenuBackground?.(this,e);window.pbSyncMenuMusic?.(this,e);')],
    13: [('xn(`', 'zn(`')],
    7: [('let D=window.__pbDpad,', 'let D=null,')],  # la cruceta ya llega por el mando; la copia de Java podía quedarse pegada                                       # ruta de recursos
}


def port_changes(sp):
    edits = json.load(open(os.path.join(HERE, 'edits-0.9.9.json'), encoding='utf-8'))
    for e in edits:
        if e['id'] in DROP:
            continue
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
    # --- main: controles táctiles solo tras tocar la pantalla; sin mando activo (solo con los arreglos de la 0.8.92)
    if TOUCH_0892:
        sp.add('main', 'update(e,t){if(this.run=e,this.show(O&&!Kn&&e.state===`play`&&!e.player.dead),',
               'update(e,t){if(this.run=e,this.show(O&&!Kn',
               'update(e,t){if(Kn)this.touchActive=!1;if(this.run=e,this.show((this.touchActive||!window.AndroidMenu&&O)&&!Kn', 'cambios 40-41')
        sp.add('main', 'this.fs.style.display!==n&&(this.fs.style.display=n),this.touches===0&&(this.lastType===`touch`||this.sawTouchEv)&&(this.stickId>=0||this.looks.size||this.anyOn())&&this.letGo();',
               'this.fs.style.display!==n&&(this.fs.style.display=n),this.touches===0&&(this.lastType===`touch`||this.sawTouchEv)&&(this.stickId>=0||this.looks.size||this.anyOn())&&this.letGo();',
               'this.fs.style.display!==n&&(this.fs.style.display=n);', 'cambio 42')
        sp.add('main', '}destroy(){this.off(),this.show(!1),this.el.remove()}', 'this.off(),this.show(!1),this.el.remove()',
               'removeEventListener(`pointerdown`,this.activateTouch,!0);this.off(),this.show(!1),this.el.remove()', 'cambio 43')
    # --- joystick táctil: ninguna rutina de "soltar todo" (mando en menus, entrada en main) lo borra mientras
    #     el dedo sigue en él; solo releaseStick (al levantar el dedo) lo pone a cero. Con la consola en la mano,
    #     el mando físico vaciaba el joystick táctil en cada fotograma y el personaje no se movía.
    sp.add('menus', 'this.held.clear(),this.input.stickX=this.input.stickY=0}', 'this.input.stickX=this.input.stickY=0}',
           'this.input.touchStick||(this.input.stickX=this.input.stickY=0)}', 'joystick táctil (mando)')
    sp.add('main', 'e.startsWith(`Mouse`)&&this.release(e);this.mouseDown=[!1,!1,!1],this.stickX=this.stickY=0}',
           'this.stickX=this.stickY=0}', 'this.touchStick||(this.stickX=this.stickY=0)}', 'joystick táctil (entrada)')
    # --- el personaje NUNCA se mueve solo con el mando: zona muerta del 12 % para el stick físico (deriva);
    #     el joystick táctil (touchStick) no se ve afectado.
    sp.add('main', 'p=Math.max(-1,Math.min(1,d===0?n.stickX:d)),m=Math.max(-1,Math.min(1,f===0?n.stickY:f));',
           'p=Math.max(-1,Math.min(1,d===0?n.stickX:d)),m=Math.max(-1,Math.min(1,f===0?n.stickY:f));',
           'pbDz=!n.touchStick&&Math.hypot(n.stickX,n.stickY)<.12,p=Math.max(-1,Math.min(1,d===0?(pbDz?0:n.stickX):d)),m=Math.max(-1,Math.min(1,f===0?(pbDz?0:n.stickY):f));',
           'zona muerta del mando')
    # --- mando: si el stick físico está en el centro (ejes crudos < .15), su salida es 0 aunque la calibración
    #     automática del juego haya aprendido un reposo desplazado (el personaje caminaba solo con el mando quieto).
    sp.add('menus', 'let o=this.rmap,[s,c,l]=this.radial(a,Xo,yo),[u,d,f]=this.radial(a,o,bo);',
           'let o=this.rmap,[s,c,l]=this.radial(a,Xo,yo),[u,d,f]=this.radial(a,o,bo);',
           'let o=this.rmap,[s,c,l]=this.radial(a,Xo,yo),[u,d,f]=this.radial(a,o,bo);'
           'Math.hypot(a[Xo.xi]??0,a[Xo.yi]??0)<.15&&(s=c=l=0);Math.hypot(a[o.xi]??0,a[o.yi]??0)<.15&&(u=d=f=0);',
           'stick físico en reposo')
    # --- mando: la calibración automática (drift) tomaba como "nuevo centro" cualquier inclinación sostenida unos
    #     segundos (mandos 'generic' como el del Odin): al caminar recto el personaje se frenaba y al soltar el stick
    #     caminaba solo. Ahora solo aprende un centro casi real (< .1) y radial ignora centros guardados mayores.
    sp.add('menus', '(this.layout===`generic`||Math.hypot(a,o)<.45)&&(this.rest[t.xi]=a,this.rest[t.yi]=o)',
           '(this.layout===`generic`||Math.hypot(a,o)<.45)', 'Math.hypot(a,o)<.1', 'calibración: sin centros inclinados')
    sp.add('menus', 'radial(e,t,n){let r=((e[t.xi]??0)-this.rest[t.xi])*t.xs,i=((e[t.yi]??0)-this.rest[t.yi])*t.ys,',
           'let r=((e[t.xi]??0)-this.rest[t.xi])*t.xs,i=((e[t.yi]??0)-this.rest[t.yi])*t.ys,',
           'let pbRx=Math.abs(this.rest[t.xi]??0)<.1?this.rest[t.xi]??0:0,pbRy=Math.abs(this.rest[t.yi]??0)<.1?this.rest[t.yi]??0:0,'
           'r=((e[t.xi]??0)-pbRx)*t.xs,i=((e[t.yi]??0)-pbRy)*t.ys,', 'calibración: centro limitado')
    # --- La Gran Expedición local: el PC de Bill se abre también con el backend local (exp-local.js)
    sp.add('menus', 'if(e.backend.kind!==`http`){e.notice(c(`La Expedición necesita conexión con el servidor.`));return}',
           'e.backend.kind!==`http`', 'e.backend.kind!==`http`&&e.backend.kind!==`local`', 'Expedición local')
    # --- eventos siempre activos: el jugador elige cuál jugar; cada uno se reinicia cada lo que duró en la web
    sp.add('dp', 'function jr(e){let t=kr[e.id],n=Number.isFinite(t?.start)?t.start:Date.parse(e.start),r=Number.isFinite(t?.end)?t.end:Date.parse(e.end);',
           'function jr(e){let t=kr[e.id],n=Number.isFinite(t?.start)?t.start:Date.parse(e.start),r=Number.isFinite(t?.end)?t.end:Date.parse(e.end);',
           'function __pbEvCycle(id){if(window.pbEventCycle===!1)return null;let e=Er.find(e=>e.id===id);if(!e)return null;let s0=Date.parse(e.start),d=Date.parse(e.end)-s0;if(!(d>0))return null;let k=Math.floor((Date.now()-s0)/d),s=s0+k*d;return{start:s,end:s+d,cycle:k}}window.__pbEvWhen=__pbEvCycle;'
           'function jr(e){let t=kr[e.id],pbW=__pbEvCycle(e.id),n=pbW?pbW.start:Number.isFinite(t?.start)?t.start:Date.parse(e.start),r=pbW?pbW.end:Number.isFinite(t?.end)?t.end:Date.parse(e.end);',
           'rotación de eventos')
    # --- menú: la segunda tarjeta de evento muestra también el otro evento activo (el jugador elige cuál jugar)
    sp.add('menus', 'i=n&&r.find(t=>!t.live&&t.claimable&&e.meta.eventReady(t.id)>0);if(!i)return null;let a=t(`event claim`,Q(i.art.icon,40),c(i.name),c(`Terminado: reclama tus premios`),',
           'i=n&&r.find(t=>!t.live&&t.claimable&&e.meta.eventReady(t.id)>0);if(!i)return null;let a=t(`event claim`,Q(i.art.icon,40),c(i.name),c(`Terminado: reclama tus premios`),',
           'i=n&&(r.find(t=>t.live)??r.find(t=>!t.live&&t.claimable&&e.meta.eventReady(t.id)>0));if(!i)return null;'
           'let a=t(i.live?`event`:`event claim`,Q(i.art.icon,40),c(i.name),i.live?c(`¡Evento! Termina en {time}`,{time:z8(i.end-Date.now())}):c(`Terminado: reclama tus premios`),',
           'dos eventos en el menú')
    # --- stick derecho en menús: desplazamiento fluido (curva progresiva, en cada fotograma, sin perder fracciones de píxel)
    sp.add('menus', 'if(a){let t=js(hs)??As();t&&(t.scrollTop+=a*900*e)}', 'if(a){let t=js(hs)??As();t&&(t.scrollTop+=a*900*e)}',
           'window.__pbScrollV=a,window.__pbScrollT=a?js(hs)??As():null,window.__pbScrollAt=performance.now();',
           'stick derecho fluido')
    # --- la pantalla no cambia nunca de modo: en Android siempre es táctil. El ratón virtual del Odin
    #     («ODIN Station Virtual Mouse») emitía eventos de ratón con el mando y el juego pasaba al diseño de escritorio
    #     (los menús se encogían) hasta el siguiente toque.
    sp.add('menus', 'addEventListener(`pointerdown`,e=>{Us||(e.pointerType===`touch`?Xs(!0):e.pointerType===`mouse`&&Xs(!1))},{capture:!0}),addEventListener(`pointermove`,e=>{!Us&&Gs&&e.pointerType===`mouse`&&(e.movementX||e.movementY)&&Xs(!1)',
           'e.pointerType===`touch`?Xs(!0):e.pointerType===`mouse`&&Xs(!1)', 'e.pointerType===`touch`&&Xs(!0)', 'modo táctil fijo (clic)')
    sp.add('menus', 'addEventListener(`pointermove`,e=>{!Us&&Gs&&e.pointerType===`mouse`&&(e.movementX||e.movementY)&&Xs(!1)',
           '!Us&&Gs&&e.pointerType===`mouse`&&(e.movementX||e.movementY)&&Xs(!1)', '!1', 'modo táctil fijo (movimiento)')
    # --- PC de Bill: sin las pestañas Rivales y Comercio (ecos y mercado entre jugadores necesitan el servidor oficial)
    sp.add('menus', ',[`rivals`,c(`Rivales`),`rival`],[`codex`,', ',[`rivals`,c(`Rivales`),`rival`]', '', 'PC de Bill sin Rivales')
    sp.add('menus', ',[`trade`,c(`Comercio`),`friends`],[`forge`,', ',[`trade`,c(`Comercio`),`friends`]', '', 'PC de Bill sin Comercio')
    sp.add('menus', '_4=[`prep`,`market`,`trade`,`forge`,`contracts`,`rivals`,`codex`]', '_4=[`prep`,`market`,`trade`,`forge`,`contracts`,`rivals`,`codex`]', '_4=[`prep`,`market`,`forge`,`contracts`,`codex`]', 'PC de Bill sin Rivales ni Comercio (Q/E)')
    # --- mando: el logo y la etiqueta de versión (v0.9.9 / Beta) no reciben el foco (siguen funcionando al tocarlos)
    sp.add('menus', 'function Ss(e){if(!bs(e)||e.closest(`[aria-hidden="true"], .rotate-hint`))return!1;',
           '`[aria-hidden="true"], .rotate-hint`', '`[aria-hidden="true"], .rotate-hint, .logo-ver, .logo`', 'mando sin versión ni logo')
    # --- menú principal con mapa de mando propio (patches/home-nav.js): el cursor empieza siempre en Jugar
    sp.add('menus', 'function ms(e){let t=hs;', 'function ms(e){', 'function ms(e){if(window.__pbHomeNav?.(e)||window.__pbPcNav?.(e)||window.__pbShopNav?.(e))return;', 'menú principal: mapa de mando')
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
              'pbReadMenuBackground,pbReadMenuMusic});\n'
              '(()=>{let acc=0,last=0;const f=t=>{const dt=last?Math.min(.05,(t-last)/1000):0;last=t;'
              'const a=performance.now()-(window.__pbScrollAt||0)<200?window.__pbScrollV||0:0,el=window.__pbScrollT;'
              'if(a&&el&&el.isConnected){acc+=Math.sign(a)*Math.pow(Math.abs(a),1.6)*1500*dt;const d=Math.trunc(acc);'
              'if(d){el.style.scrollBehavior=`auto`;el.scrollTop+=d;acc-=d}}else acc=0;requestAnimationFrame(f)};requestAnimationFrame(f)})();\n')
    return '/* JAY_MENU_NAV_START */\n' + code + expose + read(os.path.join(ROOT, 'patches', 'home-nav.js')) + read(os.path.join(ROOT, 'patches', 'pc-nav.js')) + read(os.path.join(ROOT, 'patches', 'shop-nav.js')) + '/* JAY_MENU_NAV_END */\n'


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
    local = read(os.path.join(ROOT, 'offline.js')) + '\n' + exp_parts()[1]
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
    <script src="./scroll-bars.js" defer></script>
'''


def index_html():
    html = read(os.path.join(PRISTINE, 'index.html'))
    vp = '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />\n'
    html = once(html, vp, vp + '    <script src="./ui-scale.js"></script>\n', 'index: ui-scale')
    html = once(html, '  </head>', PORT_TAGS + '  </head>', 'index: scripts del port')
    html = re.sub(r'\s*<script[^>]*cloudflareinsights[^>]*></script>', '', html)  # sin analítica en la app
    open(os.path.join(ROOT, 'site', 'index.html'), 'w', encoding='utf-8', newline='').write(html)


EXP_NAMES = {  # $NOMBRE$ de exp-local.js -> nombre minificado en menus (patrón con un grupo)
    'qW': r'function ([\w$]+)\(e,t,n=0,r=0\)\{let i=new [\w$]+\([\w$]+\(e,[\w$]+\(`\$\{t\.k\}',
    'jW': r'[,;\s]([\w$]+)=e=>\{let t=[\w$]+\(e\)\.find;for\(let n of e\)',
    'NW': r'function ([\w$]+)\(e\)\{let t=[\w$]+\.get\(e\.b\);if\(!t\)return 0;',
    'FW': r'[,;\s]([\w$]+)=e=>[\w$]+\(e\)\?[\w$]+\[e\.r\]\*\(e\.sh\?3:1\):0',
    'IW': r',([\w$]+)=e=>[\w$]+\(e\)\?Math\.max\(1,Math\.round\([\w$]+\[e\.r\]\*\(\.7\+e\.lv/30\)',
    'LW': r',([\w$]+)=e=>\{let t=e\.rf\?\.length\?\?0;',
    'RW': r',([\w$]+)=e=>Math\.round\([\w$]+\(\{\.\.\.e,d:100\}\)\*4\.5\+10\)',
    'cG': r',([\w$]+)=e=>Math\.max\([\w$]+\.min,Math\.round\([\w$]+\(\{\.\.\.e,d:100\}\)\*[\w$]+\.share\)\)',
    'uG': r',([\w$]+)=e=>[\w$]+\(e\)\.reduce\(\(e,t\)=>e\+[\w$]+\(t\),0\),[\w$]+=\{tax:',
    'oG': r'function ([\w$]+)\(e\)\{return e\.over\.length\?',
    'QW': r',([\w$]+)=e=>\{let t=1;for\(let n=1;n<[\w$]+\.length;n\+\+\)e>=',
    'ZW': r',([\w$]+)=\[0,120,320,650,',
    'tG': r',([\w$]+)=e=>5\+Math\.floor\([\w$]+\(e\)/3\)',
    'eG': r',([\w$]+)=e=>Math\.round\(400\*1\.6\*\*',
    '$W': r',([\w$]+)=\{base:40,step:10,max:120\}',
    'dW': r',([\w$]+)=e=>[\w$]+\([\w$]+\.get\(e\.b\)\?\.kind\),[\w$]+=e=>\{let t=',
    'fW': r',([\w$]+)=e=>\{let t=[\w$]+\.get\(e\.b\)\?\.kind;return [\w$]+\(t\)\?t:null\}',
    'lW': r',([\w$]+)=new Map\([\w$]+\.map\(e=>\[e\.key,e\]\)\),[\w$]+=e=>e===`held`',
    'qU': r',([\w$]+)=\[`held`,`band`,`charm`,`gem`\]',
    'aW': r',([\w$]+)=\[\{key:`leg-moltres`',
    'oW': r',([\w$]+)=\[\{key:`potion`',
    'sW': r',([\w$]+)=\[\{key:`stardust`',
    'iW': r',([\w$]+)=\[[\w$]+\(`choice-band`',
    'YW': r',([\w$]+)=\{night:1200,',
    'XW': r',([\w$]+)=\{start:300,aid:',
    'sG': r'[,\s]([\w$]+)=\{share:\.3,min:4,wear:',
    'dG': r',([\w$]+)=\{tax:\.1,',
}


def exp_parts():
    src = read(os.path.join(ROOT, 'exp-local.js'))
    a0, a1 = src.index('/* ==== PARTE A'), src.index('/* ==== FIN PARTE A ==== */')
    b0 = src.index('/* ==== PARTE B')
    return src[a0:a1], src[b0:]


def exp_part_a(menus):
    part, _ = exp_parts()
    for key, pat in EXP_NAMES.items():
        hits = set(re.findall(pat, menus))
        if len(hits) != 1:
            fail('Expedición local', f'{key}: {len(hits)} nombres {sorted(hits)[:4]}')
        part = part.replace('$' + key + '$', hits.pop())
    if re.search(r'\$[A-Za-z_$]{2}\$', part):
        fail('Expedición local', 'quedan nombres sin resolver en la parte A')
    return part + '\n'


def main_():
    index_html()
    texts = {k: read(os.path.join(PRISTINE, v)) for k, v in FILES.items()}
    sp = Spans(texts)
    port_changes(sp)
    texts = sp.apply()
    texts['main'] = add_import(texts['main'], 'defineProperty', 'pi', '__pbTiers', 'nombres de tier')
    last = texts['menus'].rfind('export{')
    texts['menus'] = texts['menus'][:last] + nav_code() + exp_part_a(texts['menus']) + texts['menus'][last:]
    texts = offline(texts)
    for k, v in FILES.items():
        open(os.path.join(ASSETS, v), 'w', encoding='utf-8', newline='').write(texts[k])
    print('port 0.9.9 aplicado:', sum(len(x) for x in sp.edits.values()), 'cambios en', ', '.join(FILES.values()))


if __name__ == '__main__':
    main_()
