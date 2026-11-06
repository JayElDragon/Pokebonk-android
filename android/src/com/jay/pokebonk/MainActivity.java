package com.jay.pokebonk;

import android.app.Activity;
import android.app.AlertDialog;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.text.InputType;
import android.text.InputFilter;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.inputmethod.InputMethodManager;
import android.view.inputmethod.EditorInfo;
import org.json.JSONObject;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.webkit.JavascriptInterface;
import android.util.Log;
import android.view.Display;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.Locale;
import java.util.Map;

/**
 * PokéBonk (port Android de JayElDragon): el juego web copiado por mirror.py, servido desde los assets del APK
 * a un WebView a pantalla completa. Hace lo mismo que `mirror.py serve`:
 *  - sirve site/ (con el bundle ya parcheado con offline.js: no hace falta el servidor del juego);
 *  - sin internet: nada sale de la app (lo que falte en el APK se registra en logcat con la etiqueta PokeBonk).
 * Las partidas quedan en el localStorage del WebView (se conservan entre aperturas).
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String ORIGIN = "https://" + HOST + "/";

    private WebView web;
    private volatile boolean menuMode = true;
    private volatile int menuConfirm = 0;
    private volatile int menuBack = 1;
    private final Handler menuHandler = new Handler(Looper.getMainLooper());
    private final Set<Integer> consumedMenuKeys = new HashSet<>();
    private String hatCommand = null;
    private String lastMenuCommand = "";
    private long lastMenuAt = -1000;
    private final Runnable repeatHat = new Runnable() {
        @Override public void run() {
            if (!menuMode || hatCommand == null || web == null) return;
            sendMenuCommand(hatCommand);
            menuHandler.postDelayed(this, 110);
        }
    };

    // ---------- actualizador (como el de Pokémon Survivors) ----------
    // Al abrir el juego pregunta a GitHub por la última release de este repositorio. Si su número de revisión
    // (tag "v19", o "...android19") es mayor que el versionCode instalado, el juego muestra un aviso para
    // descargar el APK nuevo en el navegador. Sin internet o sin release, no hace nada.
    static final String UPDATE_REPO = "JayElDragon/Pokebonk-android";
    private volatile String pendingUpdate = "";

    private long installedVersionCode() {
        try {
            android.content.pm.PackageInfo p = getPackageManager().getPackageInfo(getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? p.getLongVersionCode() : p.versionCode;
        } catch (Exception e) {
            return Long.MAX_VALUE;
        }
    }

    static long revisionOf(String tag) {
        if (tag == null) return -1;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("android(\\d+)").matcher(tag);
        if (m.find()) return Long.parseLong(m.group(1));
        m = java.util.regex.Pattern.compile("(\\d+)").matcher(tag);
        long last = -1;
        while (m.find()) last = Long.parseLong(m.group(1));
        return last;
    }

    private void checkForUpdate() {
        new Thread(() -> {
            java.net.HttpURLConnection c = null;
            try {
                c = (java.net.HttpURLConnection) new java.net.URL("https://api.github.com/repos/" + UPDATE_REPO + "/releases/latest").openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                c.setRequestProperty("User-Agent", "PokeBonkAndroid");
                c.setRequestProperty("Accept", "application/vnd.github+json");
                if (c.getResponseCode() != 200) return;
                String body;
                try (InputStream in = c.getInputStream()) {
                    body = new String(readAll(in), "UTF-8");
                }
                JSONObject j = new JSONObject(body);
                String tag = j.optString("tag_name", "");
                long rev = revisionOf(tag), cur = installedVersionCode();
                if (rev <= cur) return;
                String page = j.optString("html_url", "https://github.com/" + UPDATE_REPO + "/releases");
                String url = page;
                org.json.JSONArray assets = j.optJSONArray("assets");
                if (assets != null) {
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject a = assets.optJSONObject(i);
                        if (a != null && a.optString("name", "").toLowerCase(Locale.ROOT).endsWith(".apk")) {
                            url = a.optString("browser_download_url", page);
                            break;
                        }
                    }
                }
                JSONObject info = new JSONObject();
                info.put("tag", tag);
                info.put("name", j.optString("name", tag));
                info.put("cur", String.valueOf(cur));
                info.put("url", url);
                pendingUpdate = info.toString();
                menuHandler.post(() -> {
                    if (web != null) web.evaluateJavascript("window.pbUpdateFound && window.pbUpdateFound(" + pendingUpdate + ")", null);
                });
            } catch (Exception ignored) {
            } finally {
                if (c != null) c.disconnect();
            }
        }, "pb-update-check").start();
    }

    public final class MenuBridge {
        // El aviso del juego pide la información si llegó antes de que el menú estuviera listo.
        @JavascriptInterface public String updateInfo() {
            return pendingUpdate;
        }
        // Abre la descarga en el navegador; solo enlaces de este repositorio de GitHub.
        @JavascriptInterface public void openUpdate(String url) {
            if (url == null || !url.startsWith("https://github.com/" + UPDATE_REPO + "/")) return;
            menuHandler.post(() -> {
                try {
                    startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(url))
                            .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (Exception ignored) {
                }
            });
        }
        @JavascriptInterface public void setMenuMode(boolean enabled) {
            menuMode = enabled;
            resetDpad();
            if (!enabled) menuHandler.post(() -> stopHat());
        }
        @JavascriptInterface public void setMenuBindings(int confirm, int back) {
            if (confirm >= 0 && confirm <= 16) menuConfirm = confirm;
            if (back >= 0 && back <= 16) menuBack = back;
        }
        @JavascriptInterface public void editTrainerName(String current, boolean spanish) {
            editTrainerNameText(current,
                    spanish ? "Nombre del entrenador" : "Trainer name",
                    spanish ? "Guardar" : "Save",
                    spanish ? "Cancelar" : "Cancel",
                    spanish ? "Escribe tu nombre" : "Enter your name");
        }

        // Textos ya traducidos por port-i18n.js (9 idiomas).
        @JavascriptInterface public void editTrainerNameText(String current, String title, String save, String cancel, String empty) {
            menuHandler.post(() -> {
                if (web == null || isFinishing()) return;
                EditText input = new EditText(MainActivity.this);
                input.setSingleLine(true);
                input.setTextSize(18);
                input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PERSON_NAME | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
                input.setImeOptions(EditorInfo.IME_ACTION_DONE | EditorInfo.IME_FLAG_NO_EXTRACT_UI);
                input.setFilters(new InputFilter[]{new InputFilter.LengthFilter(24)});
                input.setText(current == null ? "" : current);
                FrameLayout frame = new FrameLayout(MainActivity.this);
                int pad = Math.round(20 * getResources().getDisplayMetrics().density);
                frame.setPadding(pad, pad / 2, pad, 0);
                frame.addView(input, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
                InputMethodManager ime = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
                Runnable hide = () -> { if (ime != null) ime.hideSoftInputFromWindow(input.getWindowToken(), 0); };
                AlertDialog dialog = new AlertDialog.Builder(MainActivity.this)
                    .setTitle(title)
                    .setView(frame)
                    .setPositiveButton(save, null)
                    .setNegativeButton(cancel, (d, which) -> hide.run())
                    .create();
                dialog.setOnCancelListener(d -> hide.run());
                dialog.setOnShowListener(d -> {
                    dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
                        String name = input.getText().toString().trim();
                        if (name.isEmpty()) { input.setError(empty); return; }
                        if (web != null) web.evaluateJavascript("window.pbSaveTrainerName && window.pbSaveTrainerName(" + JSONObject.quote(name) + ")", null);
                        hide.run();
                        dialog.dismiss();
                    });
                    input.setOnEditorActionListener((v, action, event) -> {
                        if (action == EditorInfo.IME_ACTION_DONE) { dialog.getButton(AlertDialog.BUTTON_POSITIVE).performClick(); return true; }
                        return false;
                    });
                    input.requestFocus();
                    input.selectAll();
                    if (dialog.getWindow() != null) dialog.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE | WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
                    input.postDelayed(() -> {
                        if (!dialog.isShowing()) return;
                        if (Build.VERSION.SDK_INT >= 30 && input.getWindowInsetsController() != null) input.getWindowInsetsController().show(WindowInsets.Type.ime());
                        else if (ime != null) ime.showSoftInput(input, 0);
                    }, 150);
                });
                dialog.show();
            });
        }
        @JavascriptInterface public int getThermalStatus() {
            if (Build.VERSION.SDK_INT < 29) return 0;
            PowerManager power = (PowerManager) getSystemService(POWER_SERVICE);
            try { return power == null ? 0 : power.getCurrentThermalStatus(); }
            catch (RuntimeException ignored) { return 0; }
        }
    }

    private void sendMenuCommand(String command) {
        if (web == null || !menuMode) return;
        long now = SystemClock.uptimeMillis();
        if (command.equals(lastMenuCommand) && now - lastMenuAt < 90) return;
        lastMenuCommand = command;
        lastMenuAt = now;
        // Commands come only from the fixed mappings below, never from arbitrary text.
        web.evaluateJavascript("window.pbAndroidMenuKey && window.pbAndroidMenuKey('" + command + "')", null);
    }

    private void stopHat() {
        hatCommand = null;
        menuHandler.removeCallbacks(repeatHat);
    }

    private String menuCommand(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_UP: return "up";
            case KeyEvent.KEYCODE_DPAD_DOWN: return "down";
            case KeyEvent.KEYCODE_DPAD_LEFT: return "left";
            case KeyEvent.KEYCODE_DPAD_RIGHT: return "right";
            case KeyEvent.KEYCODE_DPAD_CENTER: return "confirm";
        }
        int button;
        switch (keyCode) {
            case KeyEvent.KEYCODE_BUTTON_A: button = 0; break;
            case KeyEvent.KEYCODE_BUTTON_B: button = 1; break;
            case KeyEvent.KEYCODE_BUTTON_X: button = 2; break;
            case KeyEvent.KEYCODE_BUTTON_Y: button = 3; break;
            case KeyEvent.KEYCODE_BUTTON_L1: button = 4; break;
            case KeyEvent.KEYCODE_BUTTON_R1: button = 5; break;
            case KeyEvent.KEYCODE_BUTTON_L2: button = 6; break;
            case KeyEvent.KEYCODE_BUTTON_R2: button = 7; break;
            case KeyEvent.KEYCODE_BUTTON_SELECT: button = 8; break;
            case KeyEvent.KEYCODE_BUTTON_START: button = 9; break;
            case KeyEvent.KEYCODE_BUTTON_THUMBL: button = 10; break;
            case KeyEvent.KEYCODE_BUTTON_THUMBR: button = 11; break;
            default: return null;
        }
        if (button == menuConfirm) return "confirm";
        if (button == menuBack || button == 9) return "back";
        if (button == 4) return "previousTab";
        if (button == 5) return "nextTab";
        return null;
    }

    // ---------- cruceta en partida: mueve al jugador ----------
    // Android entrega la cruceta como teclas DPAD o como ejes HAT según el mando; en ambos casos se pasa al juego
    // como window.__pbDpad = [x, y] (x: -1 izquierda / 1 derecha; y: -1 arriba / 1 abajo).
    private int dpadKeyX = 0, dpadKeyY = 0;
    private float dpadHatX = 0, dpadHatY = 0;
    private String dpadSent = "0,0";

    private void pushDpad() {
        float x = Math.max(-1f, Math.min(1f, dpadKeyX + dpadHatX));
        float y = Math.max(-1f, Math.min(1f, dpadKeyY + dpadHatY));
        String v = Math.round(x) + "," + Math.round(y);
        if (v.equals(dpadSent) || web == null) return;
        dpadSent = v;
        web.evaluateJavascript("window.__pbDpad=[" + v + "]", null);
    }

    private boolean playDpadKey(KeyEvent event) {
        int code = event.getKeyCode();
        boolean down = event.getAction() == KeyEvent.ACTION_DOWN;
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_UP: dpadKeyY = down ? -1 : (dpadKeyY == -1 ? 0 : dpadKeyY); break;
            case KeyEvent.KEYCODE_DPAD_DOWN: dpadKeyY = down ? 1 : (dpadKeyY == 1 ? 0 : dpadKeyY); break;
            case KeyEvent.KEYCODE_DPAD_LEFT: dpadKeyX = down ? -1 : (dpadKeyX == -1 ? 0 : dpadKeyX); break;
            case KeyEvent.KEYCODE_DPAD_RIGHT: dpadKeyX = down ? 1 : (dpadKeyX == 1 ? 0 : dpadKeyX); break;
            default: return false;
        }
        pushDpad();
        return true;
    }

    private void resetDpad() {
        dpadKeyX = dpadKeyY = 0;
        dpadHatX = dpadHatY = 0;
        menuHandler.post(this::pushDpad);
    }

    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        int code = event.getKeyCode();
        // Android fabrica flechas de cruceta a partir del stick (eventos de respaldo, FLAG_FALLBACK). El juego ya lee el
        // stick por su cuenta: si además llegaran estas flechas, cada movimiento del stick contaría dos veces y en los
        // menús (subida de nivel, tiendas) se saltaría una opción. La cruceta física no lleva esta marca.
        if ((event.getFlags() & KeyEvent.FLAG_FALLBACK) != 0 && (code == KeyEvent.KEYCODE_DPAD_UP
                || code == KeyEvent.KEYCODE_DPAD_DOWN || code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_DPAD_RIGHT)) {
            return true;
        }
        if (!menuMode) playDpadKey(event);
        if (event.getAction() == KeyEvent.ACTION_UP && consumedMenuKeys.remove(code)) return true;
        String command = menuCommand(code);
        if (menuMode && command != null && event.getAction() == KeyEvent.ACTION_DOWN) {
            consumedMenuKeys.add(code);
            if (event.getRepeatCount() == 0 || command.equals("up") || command.equals("down") ||
                    command.equals("left") || command.equals("right")) sendMenuCommand(command);
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override public boolean dispatchGenericMotionEvent(MotionEvent event) {
        if (event.isFromSource(InputDevice.SOURCE_JOYSTICK) && event.getAction() == MotionEvent.ACTION_MOVE) {
            String command = null;
            if (menuMode) {
                float x = event.getAxisValue(MotionEvent.AXIS_HAT_X);
                float y = event.getAxisValue(MotionEvent.AXIS_HAT_Y);
                command = y < -0.5f ? "up" : y > 0.5f ? "down" : x < -0.5f ? "left" : x > 0.5f ? "right" : null;
            } else {
                float x = event.getAxisValue(MotionEvent.AXIS_HAT_X);
                float y = event.getAxisValue(MotionEvent.AXIS_HAT_Y);
                dpadHatX = x < -0.5f ? -1 : x > 0.5f ? 1 : 0;
                dpadHatY = y < -0.5f ? -1 : y > 0.5f ? 1 : 0;
                pushDpad();
            }
            if (command == null) stopHat();
            else if (!command.equals(hatCommand)) {
                stopHat();
                hatCommand = command;
                sendMenuCommand(command);
                menuHandler.postDelayed(repeatHat, 330);
            }
        }
        // Forward all axis releases so Chromium's gamepad state never gets stuck.
        return super.dispatchGenericMotionEvent(event);
    }



    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        limitTo60Hz();
        // Inspección por adb (chrome devtools protocol) para depurar en la consola.
        WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        web.setBackgroundColor(0xFF1A1630);
        setContentView(web);
        hideBars();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        // Sin setOffscreenPreRaster: pre-rasterizar toda la página agotaba la memoria de tiles de la GPU
        // ("tile memory limits exceeded") y dejaba menús y textos sin dibujar (en negro), además de calentar.
        s.setOffscreenPreRaster(false);
        web.addJavascriptInterface(new MenuBridge(), "AndroidMenu");

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return serve(req);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                String host = u.getHost();
                // Única excepción al modo local: el botón de donaciones abre el Ko-fi de JayElDragon en el navegador.
                if ("https".equals(u.getScheme()) && host != null && (host.equals("ko-fi.com") || host.endsWith(".ko-fi.com"))) {
                    try {
                        startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, u)
                                .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
                    } catch (Exception ignored) {
                    }
                    return true;
                }
                // Juego 100 % local: los demás enlaces a webs externas no se abren.
                return !HOST.equals(host);
            }
        });
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.requestFocus();
        if (state != null) {
            web.restoreState(state);
        } else {
            web.loadUrl(ORIGIN);
        }
        checkForUpdate();
    }

    // ---------- servidor local ----------

    private WebResourceResponse serve(WebResourceRequest req) {
        Uri u = req.getUrl();
        if (!HOST.equals(u.getHost())) {
            return notFound();   // juego 100 % local: ninguna petición sale a internet
        }
        String path = u.getPath();
        if (path == null || path.isEmpty()) {
            path = "/";
        }
        if (path.endsWith("/")) {
            path += "index.html";
        }
        path = path.substring(1);
        if (path.contains("..")) {
            return notFound();
        }
        byte[] data = load(path);
        if (data == null) {
            return notFound();
        }
        String range = null;
        for (Map.Entry<String, String> h : req.getRequestHeaders().entrySet()) {
            if ("range".equalsIgnoreCase(h.getKey())) {
                range = h.getValue();
            }
        }
        return respond(path, data, range);
    }

    private byte[] load(String path) {
        try (InputStream in = getAssets().open("site/" + path)) {
            return readAll(in);
        } catch (IOException ignored) {
        }
        File f = new File(getFilesDir(), "site/" + path);
        if (f.isFile()) {
            try (InputStream in = new FileInputStream(f)) {
                return readAll(in);
            } catch (IOException ignored) {
            }
        }
        // Juego 100 % local: ya no se descarga nada de pokebonk.com. Se registra lo que falte para añadirlo al APK.
        Log.w("PokeBonk", "Falta en el APK: " + path);
        return null;
    }

    // La Odin 3 va a 120 Hz: la WebView dibuja a la frecuencia de la pantalla, así que se fija el modo de 60 Hz
    // (misma resolución) para reducir a la mitad el trabajo de CPU/GPU y el calor.
    private void limitTo60Hz() {
        if (Build.VERSION.SDK_INT < 23) {
            return;
        }
        Display d = getWindowManager().getDefaultDisplay();
        Display.Mode cur = d.getMode();
        Display.Mode best = null;
        for (Display.Mode m : d.getSupportedModes()) {
            if (m.getPhysicalWidth() == cur.getPhysicalWidth() && m.getPhysicalHeight() == cur.getPhysicalHeight()
                    && Math.abs(m.getRefreshRate() - 60f) < 1f) {
                best = m;
            }
        }
        if (best != null) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.preferredDisplayModeId = best.getModeId();
            lp.preferredRefreshRate = 60f;
            getWindow().setAttributes(lp);
        }
    }

    private WebResourceResponse respond(String path, byte[] d, String range) {
        String mime = mime(path);
        Map<String, String> h = new HashMap<>();
        h.put("Access-Control-Allow-Origin", "*");
        h.put("Cache-Control", "no-cache");
        h.put("Accept-Ranges", "bytes");
        int status = 200;
        String reason = "OK";
        int start = 0;
        int end = d.length - 1;
        if (range != null && range.startsWith("bytes=") && d.length > 0) {
            String[] p = range.substring(6).split("-", 2);
            try {
                if (!p[0].trim().isEmpty()) {
                    start = Integer.parseInt(p[0].trim());
                    if (p.length > 1 && !p[1].trim().isEmpty()) {
                        end = Math.min(end, Integer.parseInt(p[1].trim()));
                    }
                } else if (p.length > 1 && !p[1].trim().isEmpty()) {
                    start = Math.max(0, d.length - Integer.parseInt(p[1].trim()));
                }
            } catch (NumberFormatException ignored) {
            }
            if (start <= end && start < d.length) {
                status = 206;
                reason = "Partial Content";
                h.put("Content-Range", "bytes " + start + "-" + end + "/" + d.length);
            } else {
                start = 0;
                end = d.length - 1;
            }
        }
        int len = Math.max(0, end - start + 1);
        h.put("Content-Length", String.valueOf(len));
        boolean text = mime.startsWith("text/") || mime.contains("json") || mime.contains("javascript");
        return new WebResourceResponse(mime, text ? "utf-8" : null, status, reason, h,
                new ByteArrayInputStream(d, start, len));
    }

    private static WebResourceResponse notFound() {
        Map<String, String> h = new HashMap<>();
        h.put("Access-Control-Allow-Origin", "*");
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", h,
                new ByteArrayInputStream(new byte[0]));
    }

    private static String mime(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        int dot = p.lastIndexOf('.');
        String ext = dot >= 0 ? p.substring(dot + 1) : "";
        switch (ext) {
            case "html": return "text/html";
            case "js": case "mjs": return "text/javascript";
            case "css": return "text/css";
            case "json": return "application/json";
            case "webmanifest": return "application/manifest+json";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "webp": return "image/webp";
            case "gif": return "image/gif";
            case "svg": return "image/svg+xml";
            case "ico": return "image/x-icon";
            case "ogg": return "audio/ogg";
            case "mp3": return "audio/mpeg";
            case "wav": return "audio/wav";
            case "glb": return "model/gltf-binary";
            case "gltf": return "model/gltf+json";
            case "woff2": return "font/woff2";
            case "woff": return "font/woff";
            case "ttf": return "font/ttf";
            case "wasm": return "application/wasm";
            case "txt": return "text/plain";
            default: return "application/octet-stream";
        }
    }

    private static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream(Math.max(8192, in.available()));
        byte[] buf = new byte[65536];
        int n;
        while ((n = in.read(buf)) > 0) {
            out.write(buf, 0, n);
        }
        return out.toByteArray();
    }

    // ---------- pantalla completa y ciclo de vida ----------

    @SuppressWarnings("deprecation")
    private void hideBars() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideBars();
        } else {
            stopHat();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        stopHat();
        consumedMenuKeys.clear();
        if (web != null) {
            web.onPause();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
        }
        hideBars();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) {
            web.saveState(out);
        }
    }

    @Override
    protected void onDestroy() {
        stopHat();
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    // Atrás (o B del mando sin usar por el juego) = Escape: abre/cierra la pausa y los menús del juego.
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web == null) {
            super.onBackPressed();
            return;
        }
        web.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ESCAPE));
        web.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ESCAPE));
    }
}
