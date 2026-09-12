package com.rosariomarket.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.appcompat.app.AlertDialog
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

    private val foregroundPermission =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            if (result[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
                requestNotifications()
                requestBackgroundLocation()
                GeofenceManager.refresh(this)
            }
        }

    private val backgroundPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            if (it) GeofenceManager.refresh(this)
        }

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

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

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)

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

        ensurePermissions()
        GeofenceManager.scheduleRefresh(this)
    }

    private fun ensurePermissions() {
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
        } else {
            requestNotifications()
            requestBackgroundLocation()
            GeofenceManager.refresh(this)
        }
    }

    private fun requestNotifications() {
        if (
            Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
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

        // Android 11+ ya no concede "Permitir todo el tiempo" desde el popup normal.
        // Hay que llevar al usuario a la ficha de la app para activarlo.
        if (Build.VERSION.SDK_INT >= 30) {
            val prefs = getSharedPreferences("rm_permissions", MODE_PRIVATE)
            val alreadyExplained = prefs.getBoolean("background_location_explained", false)

            if (!alreadyExplained) {
                AlertDialog.Builder(this)
                    .setTitle("Avisos de negocios cercanos")
                    .setMessage(
                        "Para avisarte cuando pases a menos de 300 m de un negocio, incluso mientras usás WhatsApp u otra app, Rosario Market necesita que elijas Ubicación > Permitir todo el tiempo."
                    )
                    .setPositiveButton("Abrir configuración") { _, _ ->
                        prefs.edit().putBoolean("background_location_explained", true).apply()
                        openAppLocationSettings()
                    }
                    .setNegativeButton("Ahora no", null)
                    .show()
            }
        } else {
            // Android 10 sí permite solicitarlo directamente.
            backgroundPermission.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        }
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
        if (
            Build.VERSION.SDK_INT < 29 ||
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            GeofenceManager.scheduleRefresh(this)
            GeofenceManager.refresh(this)
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
