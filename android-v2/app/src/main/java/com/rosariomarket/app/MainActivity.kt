package com.rosariomarket.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
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

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        NotificationHelper.createChannel(this)

        webView = WebView(this)
        setContentView(webView)

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

        webView.webViewClient = object : WebViewClient() {
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

    private fun continuePermissionFlow() {
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

        if (
            Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
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

    private fun showPermissionPrompt() {
        if (
            !::webView.isInitialized ||
            !pageLoaded ||
            permissionPromptShownThisSession ||
            allRequiredPermissionsGranted()
        ) return

        permissionPromptShownThisSession = true

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
              var modal = document.createElement('div');
              modal.id = 'rm-background-permission-modal';
              modal.innerHTML = '<div class="rm-box" role="dialog" aria-modal="true" aria-labelledby="rm-permission-title">' +
                '<div class="rm-logo">RM</div>' +
                '<h2 id="rm-permission-title">Negocios cerca tuyo</h2>' +
                '<p>Activá la ubicación en segundo plano y las notificaciones para que Rosario Market pueda avisarte cuando estés a menos de 300 metros de un negocio, aunque la app esté cerrada o estés usando otra aplicación.</p>' +
                '<div class="rm-note">En Ubicación elegí “Permitir todo el tiempo”. No necesitás iniciar sesión.</div>' +
                '<button class="rm-primary" type="button">Permitir en segundo plano</button>' +
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
