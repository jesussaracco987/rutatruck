/*
 * Reemplaza el LauncherActivity que genera bubblewrap. No editar el de
 * app/src: bubblewrap lo regenera. Se copia con scripts/twa/aplicar-install-referrer.mjs.
 *
 * En la primera apertura después de instalar, lee el Install Referrer de Play
 * (los utm_* que llevaba el link a la Play Store) y los agrega a la URL de
 * inicio. Así proxy.ts guarda el canal en la cookie cc_origen y el registro
 * queda atribuido a la campaña, igual que en la web. Sin esto, quien llega por
 * un anuncio abierto en el navegador de Instagram/Facebook pierde la cookie
 * (ese navegador no comparte cookies con Chrome) y queda como
 * "ref:ar.com.clickcargo.twa".
 */
package ar.com.clickcargo.twa;

import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;

public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    private static final String TAG = "ClickCargoLauncher";
    private static final String PREFS = "cc_install_referrer";
    private static final String KEY_LISTO = "listo";
    private static final String KEY_INTENTOS = "intentos";

    /** Si Play no responde en este tiempo, se abre la app igual. */
    private static final long TIMEOUT_MS = 2000;
    /** Si el servicio de Play no está disponible, se reintenta en las próximas aperturas. */
    private static final int MAX_INTENTOS = 3;

    private static final String[] PARAMS = {
            "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid",
    };

    private final Handler handler = new Handler(Looper.getMainLooper());
    private InstallReferrerClient referrerClient;
    private boolean esperandoReferrer;
    private boolean lanzada;
    /** Referrer leído en esta apertura; solo se usa una vez. */
    private String referrer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (esperandoReferrer && !isFinishing()) leerReferrer();
    }

    @Override
    protected boolean shouldLaunchImmediately() {
        // Solo la apertura desde el ícono: un link o un share ya trae su propia URL.
        esperandoReferrer = getIntent().getData() == null && !prefs().getBoolean(KEY_LISTO, false);
        return !esperandoReferrer;
    }

    @Override
    protected Uri getLaunchingUrl() {
        Uri url = super.getLaunchingUrl();
        if (referrer == null || referrer.isEmpty()) return url;

        Uri datos = Uri.parse("https://x/?" + referrer);
        Uri.Builder builder = url.buildUpon();
        boolean agregado = false;
        for (String param : PARAMS) {
            String valor = datos.getQueryParameter(param);
            if (valor != null && !valor.isEmpty() && url.getQueryParameter(param) == null) {
                builder.appendQueryParameter(param, valor);
                agregado = true;
            }
        }
        return agregado ? builder.build() : url;
    }

    private void leerReferrer() {
        handler.postDelayed(() -> terminar(null, false), TIMEOUT_MS);
        try {
            referrerClient = InstallReferrerClient.newBuilder(this).build();
            referrerClient.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int codigo) {
                    if (codigo == InstallReferrerClient.InstallReferrerResponse.OK) {
                        String valor = null;
                        try {
                            ReferrerDetails detalles = referrerClient.getInstallReferrer();
                            valor = detalles.getInstallReferrer();
                        } catch (Exception e) {
                            Log.w(TAG, "No se pudo leer el install referrer", e);
                        }
                        terminar(valor, true);
                    } else {
                        // FEATURE_NOT_SUPPORTED no va a cambiar; lo demás puede ser transitorio.
                        terminar(null, codigo == InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED);
                    }
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    terminar(null, false);
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "Install referrer no disponible", e);
            terminar(null, false);
        }
    }

    /** Puede llegar desde el listener (otro hilo) o del timeout: se pasa al hilo principal. */
    private void terminar(String valor, boolean definitivo) {
        handler.post(() -> {
            if (lanzada) return;
            lanzada = true;
            handler.removeCallbacksAndMessages(null);

            SharedPreferences prefs = prefs();
            int intentos = prefs.getInt(KEY_INTENTOS, 0) + 1;
            prefs.edit()
                    .putInt(KEY_INTENTOS, intentos)
                    .putBoolean(KEY_LISTO, definitivo || intentos >= MAX_INTENTOS)
                    .apply();

            referrer = valor;
            cerrarCliente();
            if (!isFinishing()) launchTwa();
        });
    }

    private void cerrarCliente() {
        if (referrerClient == null) return;
        try {
            referrerClient.endConnection();
        } catch (Exception ignored) {
        }
        referrerClient = null;
    }

    private SharedPreferences prefs() {
        return getSharedPreferences(PREFS, MODE_PRIVATE);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        cerrarCliente();
        super.onDestroy();
    }
}
