package com.rosariomarket.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.graphics.Color
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebResourceRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var rootView: FrameLayout
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pageLoaded = false
    private var permissionPromptShownThisSession = false

    private val foregroundPermission =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            if (result[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
                continuePermissionFlow()
            }
        }

    private val backgroundPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            if (it) {
                GeofenceManager.scheduleRefresh(this)
                GeofenceManager.refresh(this)
            }
        }

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            if (it) continuePermissionFlow()
        }

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = filePathCallback ?: return@registerForActivityResult
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            callback.onReceiveValue(uris)
            filePathCallback = null
        }

    private inner class AndroidShareBridge {
        @JavascriptInterface
        fun share(title: String, text: String, url: String) {
            runOnUiThread {
                val message = buildString {
                    if (text.isNotBlank()) append(text.trim())
                    if (url.isNotBlank()) {
                        if (isNotEmpty()) append("\n")
                        append(url.trim())
                    }
                }

                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, title)
                    putExtra(Intent.EXTRA_TEXT, message)
                }

                startActivity(Intent.createChooser(shareIntent, "Compartir producto"))
            }
        }
    }

    private inner class AndroidPermissionBridge {
        @JavascriptInterface
        fun startPermissionFlow() {
            runOnUiThread { continuePermissionFlow() }
        }

        @JavascriptInterface
        fun permissionsGranted(): Boolean = allRequiredPermissionsGranted()

        @JavascriptInterface
        fun deferPermissionPrompt() {
            runOnUiThread {
                // Permite seguir usando la app. El aviso podrá mostrarse de nuevo
                // después de que el usuario navegue a otra pantalla.
                permissionPromptShownThisSession = false
            }
        }
    }

    private inner class AndroidPushBridge {
        @JavascriptInterface
        fun registerAuthToken(authToken: String) {
            if (authToken.isBlank()) return
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { token ->
                    FcmRegistration.send(this@MainActivity, authToken, token)
                }
                .addOnFailureListener {
                    // The page retries registration periodically.
                }
        }

        @JavascriptInterface
        fun logout() {
            getSharedPreferences("rm_push", MODE_PRIVATE).edit().remove("auth").apply()
        }
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        NotificationHelper.createChannel(this)
        NotificationHelper.opened(this, intent)

        webView = WebView(this)
        rootView = FrameLayout(this)
        rootView.addView(webView, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))
        setContentView(rootView)
        showBrandedIntro()

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.settings.setGeolocationEnabled(true)
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true

        val appVersion =
            packageManager.getPackageInfo(packageName, 0).versionName ?: "0.0.0"
        webView.settings.userAgentString =
            webView.settings.userAgentString + " RosarioMarketAndroid/$appVersion"

        webView.addJavascriptInterface(AndroidShareBridge(), "RosarioMarketAndroid")
        webView.addJavascriptInterface(AndroidPermissionBridge(), "RosarioMarketPermissions")
        webView.addJavascriptInterface(AndroidPushBridge(), "RosarioMarketPush")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean = request?.url?.let(::openExternalUrlIfNeeded) ?: false

            @Suppress("DEPRECATION")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean =
                url?.let { openExternalUrlIfNeeded(Uri.parse(it)) } ?: false

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                pageLoaded = true

                view?.evaluateJavascript(
                    """
                    (function(){
                      if (!window.RosarioMarketAndroid) return;
                      navigator.share = function(data) {
                        data = data || {};
                        window.RosarioMarketAndroid.share(
                          String(data.title || ''),
                          String(data.text || ''),
                          String(data.url || '')
                        );
                        return Promise.resolve();
                      };
                    })();
                    """.trimIndent(),
                    null
                )
                view?.evaluateJavascript(
                    """
                    (function(){
                      if(window.__rmPushSyncStarted) return;
                      window.__rmPushSyncStarted=true;
                      function syncPush(){
                        var t=localStorage.getItem('marketplace_token')||'';
                        if(t && window.RosarioMarketPush){
                          window.RosarioMarketPush.registerAuthToken(t);
                        }
                      }
                      syncPush();
                      setInterval(syncPush,30000);
                      window.addEventListener('focus', syncPush);
                      document.addEventListener('visibilitychange', function(){
                        if(document.visibilityState==='visible') syncPush();
                      });
                    })();
                    """.trimIndent(),
                    null
                )
                showPermissionPrompt()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val chooserIntent = try {
                    fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "image/*"
                    }
                } catch (_: Exception) {
                    Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "image/*"
                    }
                }

                return try {
                    fileChooserLauncher.launch(chooserIntent)
                    true
                } catch (_: Exception) {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    false
                }
            }
        }

        webView.loadUrl(
            intent.getStringExtra("url") ?: "https://www.rosariomarket.com.ar"
        )

        GeofenceManager.scheduleRefresh(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        NotificationHelper.opened(this, intent)
        val target = intent.getStringExtra("url")
        if (::webView.isInitialized && !target.isNullOrBlank()) {
            webView.loadUrl(target)
        }
    }

    private fun showBrandedIntro() {
        val overlay = FrameLayout(this).apply {
            setBackgroundColor(Color.WHITE)
            elevation = 100f
        }
        val size = (190 * resources.displayMetrics.density).toInt()
        val logo = ImageView(this).apply {
            setImageResource(R.drawable.app_icon)
            scaleType = ImageView.ScaleType.FIT_CENTER
            alpha = 0f
            scaleX = 0.72f
            scaleY = 0.72f
        }
        overlay.addView(logo, FrameLayout.LayoutParams(size, size, Gravity.CENTER))
        rootView.addView(overlay, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))
        logo.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(550).start()
        overlay.postDelayed({
            overlay.animate().alpha(0f).setDuration(350).withEndAction {
                rootView.removeView(overlay)
            }.start()
        }, 1450)
    }

    /**
     * WebView cannot open Android app schemes such as whatsapp:// and otherwise
     * replaces Rosario Market with ERR_UNKNOWN_URL_SCHEME. Keep our website in
     * the WebView and hand WhatsApp (plus any other external scheme) to Android.
     */
    private fun openExternalUrlIfNeeded(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase() ?: return false
        val host = uri.host?.lowercase().orEmpty()
        val isWhatsAppWebLink = scheme in setOf("http", "https") &&
            (host == "wa.me" || host == "api.whatsapp.com" || host.endsWith(".whatsapp.com"))
        val isExternalScheme = scheme !in setOf("http", "https", "about", "data", "javascript")

        if (!isWhatsAppWebLink && !isExternalScheme) return false

        val externalIntent = Intent(Intent.ACTION_VIEW, uri).apply {
            addCategory(Intent.CATEGORY_BROWSABLE)
        }

        return try {
            startActivity(externalIntent)
            true
        } catch (_: Exception) {
            if (scheme == "whatsapp") {
                val phone = uri.getQueryParameter("phone").orEmpty()
                val text = uri.getQueryParameter("text").orEmpty()
                val fallback = Uri.parse(
                    "https://wa.me/$phone?text=${Uri.encode(text)}"
                )
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, fallback))
                } catch (_: Exception) {
                    // No compatible app/browser: consume the link so WebView
                    // never navigates to its built-in error page.
                }
            }
            true
        }
    }

    private fun continuePermissionFlow() {
        if (
            Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            return
        }
        if (
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            foregroundPermission.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
            return
        }

        requestBackgroundLocation()
    }

    private fun requestBackgroundLocation() {
        if (Build.VERSION.SDK_INT < 29) return
        if (
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            GeofenceManager.refresh(this)
            return
        }

        if (Build.VERSION.SDK_INT >= 30) {
            openAppLocationSettings()
        } else {
            backgroundPermission.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        }
    }

    private fun allRequiredPermissionsGranted(): Boolean {
        val foregroundGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val backgroundGranted = Build.VERSION.SDK_INT < 29 || ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_BACKGROUND_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val notificationsGranted = Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
        return foregroundGranted && backgroundGranted && notificationsGranted
    }

    private fun hidePermissionPrompt() {
        if (!::webView.isInitialized || !pageLoaded) return
        webView.evaluateJavascript(
            "document.getElementById('rm-background-permission-modal')?.remove();",
            null
        )
    }

    private fun showPermissionPrompt() {
        if (
            !::webView.isInitialized ||
            !pageLoaded ||
            permissionPromptShownThisSession ||
            allRequiredPermissionsGranted()
        ) return

        permissionPromptShownThisSession = true
        val needsForeground = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) != PackageManager.PERMISSION_GRANTED
        val needsBackground = Build.VERSION.SDK_INT >= 29 && ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_BACKGROUND_LOCATION
        ) != PackageManager.PERMISSION_GRANTED
        val needsNotifications = Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) != PackageManager.PERMISSION_GRANTED

        if (needsNotifications) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            return
        }

        webView.evaluateJavascript(
            """
            (function () {
              if (document.getElementById('rm-background-permission-modal')) return;
              var style = document.getElementById('rm-background-permission-style');
              if (!style) {
                style = document.createElement('style');
                style.id = 'rm-background-permission-style';
                style.textContent = `
                  #rm-background-permission-modal{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,20,38,.72);backdrop-filter:blur(5px);font-family:Arial,sans-serif}
                  #rm-background-permission-modal .rm-box{width:min(92vw,390px);box-sizing:border-box;background:#fff;border-radius:24px;padding:27px 23px 22px;text-align:center;box-shadow:0 22px 65px rgba(0,0,0,.32);border-top:7px solid #f47b20;animation:rmPop .22s ease-out}
                  #rm-background-permission-modal .rm-logo{width:70px;height:70px;margin:0 auto 13px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#0b4f8a,#08355e);color:#fff;font-size:26px;font-weight:900;box-shadow:0 8px 22px rgba(11,79,138,.28)}
                  #rm-background-permission-modal h2{margin:0 0 10px;color:#123a5a;font-size:23px;line-height:1.15}
                  #rm-background-permission-modal p{margin:0 0 12px;color:#435466;font-size:15px;line-height:1.48}
                  #rm-background-permission-modal .rm-note{margin:13px 0 19px;padding:11px 12px;border-radius:12px;background:#fff4ea;color:#80400f;font-size:13px;font-weight:700}
                  #rm-background-permission-modal .rm-primary,#rm-background-permission-modal .rm-later{width:100%;border:0;cursor:pointer;font-weight:800}
                  #rm-background-permission-modal .rm-primary{padding:14px;border-radius:13px;background:#f47b20;color:#fff;font-size:16px;box-shadow:0 7px 17px rgba(244,123,32,.3)}
                  #rm-background-permission-modal .rm-later{margin-top:8px;padding:10px;background:transparent;color:#697887;font-size:14px}
                  @keyframes rmPop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
                `;
                document.head.appendChild(style);
              }
              var needsForeground = $needsForeground;
              var needsBackground = $needsBackground;
              var needsNotifications = $needsNotifications;
              var title = needsForeground ? 'Activá los avisos cercanos' : (needsBackground ? 'Ubicación en segundo plano' : 'Activá las notificaciones');
              var message = needsForeground
                ? 'Android primero solicitará la ubicación mientras usás la app. Después podrás habilitar el acceso permanente para recibir avisos aunque Rosario Market esté cerrada.'
                : (needsBackground
                    ? 'Para recibir avisos al acercarte a un negocio aunque la app esté cerrada, falta habilitar la ubicación permanente.'
                    : 'La ubicación permanente ya está habilitada. Solo falta permitir las notificaciones para poder mostrarte los avisos cercanos.');
              var note = needsBackground ? 'En la configuración elegí Ubicación > “Permitir todo el tiempo”.' : 'Podés rechazarlo y seguir usando Rosario Market normalmente.';
              var action = needsForeground ? 'Continuar' : (needsBackground ? 'Abrir configuración' : 'Permitir notificaciones');
              var modal = document.createElement('div');
              modal.id = 'rm-background-permission-modal';
              modal.innerHTML = '<div class="rm-box" role="dialog" aria-modal="true" aria-labelledby="rm-permission-title">' +
                '<div class="rm-logo">RM</div>' +
                '<h2 id="rm-permission-title">' + title + '</h2>' +
                '<p>' + message + '</p>' +
                '<div class="rm-note">' + note + ' No necesitás iniciar sesión.</div>' +
                '<button class="rm-primary" type="button">' + action + '</button>' +
                '<button class="rm-later" type="button">No permitir</button>' +
                '</div>';
              modal.querySelector('.rm-primary').onclick = function () {
                modal.remove();
                window.RosarioMarketPermissions.startPermissionFlow();
              };
              modal.querySelector('.rm-later').onclick = function () {
                modal.remove();
                window.RosarioMarketPermissions.deferPermissionPrompt();
              };
              document.body.appendChild(modal);
            })();
            """.trimIndent(),
            null
        )
    }

    private fun openAppLocationSettings() {
        val intent = Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:$packageName")
        )
        startActivity(intent)
    }

    override fun onResume() {
        super.onResume()
        if (allRequiredPermissionsGranted()) {
            hidePermissionPrompt()
            GeofenceManager.scheduleRefresh(this)
            GeofenceManager.refresh(this)
        } else if (::webView.isInitialized) {
            webView.postDelayed({ showPermissionPrompt() }, 500)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
