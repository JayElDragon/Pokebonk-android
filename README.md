# PokéBonk Android — port by JayElDragon

Código del port para Android de **PokéBonk**, un fan game web gratuito creado por **Charcher**. Este repositorio contiene **solo el trabajo del port**: la app Android y las mejoras de interfaz. **No incluye el juego**.

> Proyecto de fans, no oficial y sin ánimo de lucro. No está afiliado ni respaldado por Nintendo, The Pokémon Company, Creatures Inc., GAME FREAK inc. ni por el autor de PokéBonk. Pokémon y sus nombres son marcas de sus respectivos dueños.

## Qué hay aquí
- `android/`: app Android (WebView a pantalla completa, modo 100 % local, mando y controles táctiles, 60 Hz para reducir el calor). El icono es original y no contiene personajes ni marcas.
- `site/port.css`, `site/port.js`: menú principal rediseñado y corrección de la WebView de Android.
- `site/port-i18n.js`: textos del port en 9 idiomas (ES, EN, PT, FR, JA, ZH, ZHT, KO, RU).
- `site/companion.js`, `site/preferences.js`: panel de compañero y edición del nombre del entrenador.
- `site/donate.js`: botón de donaciones al Ko-fi de JayElDragon.
- `patches/menu-navigation.js`: navegación de menús con mando.
- `build.py`: script de compilación y firma del APK.

## Qué NO hay aquí
El código, los gráficos, los sonidos, los modelos y los datos del juego pertenecen a su autor original y a terceros (por ejemplo, los sprites de PMD SpriteCollab tienen licencia CC BY-NC 4.0). No se distribuyen en este repositorio. Sin esos archivos el proyecto no se puede compilar.

## Donaciones
Si quieres apoyar el trabajo del port: https://ko-fi.com/jayeldragon. Las donaciones no dan ninguna ventaja en el juego.

## Créditos
- Port para Android y mejoras: **JayElDragon**.
- PokéBonk: **Charcher**.
- Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc.
