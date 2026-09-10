package com.rosariomarket.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.net.Uri\nimport android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback\nimport android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private val foregroundPermission = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        if (result[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            requestNotifications(); requestBackgroundLocation(); GeofenceManager.refresh(this)
        }
    }
    private val backgroundPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { if (it) GeofenceManager.refresh(this) }
    private val notificationPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
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
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, title)
                    putExtra(Intent.EXTRA_TEXT, message)
                }
                startActivity(Intent.createChooser(intent, "Compartir producto"))
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        NotificationHelper.createChannel(this)
        webView = WebView(this); setContentView(webView)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.settings.setGeolocationEnabled(true)

        val appVersion = packageManager.getPackageInfo(packageName, 0).versionName ?: "0.0.0"
        webView.settings.userAgentString = webView.settings.userAgentString + " RosarioMarketAndroid/$appVersion"

        webView.addJavascriptInterface(AndroidShareBridge(), "RosarioMarketAndroid")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // La web ya usa navigator.share(). Dentro del WebView lo conectamos
                // al selector nativo de Android para evitar el fallback "Enlace copiado".
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
            override fun onGeolocationPermissionsShowPrompt(origin: String?, callback: GeolocationPermissions.Callback?) { callback?.invoke(origin, true, false) }
        }
        webView.loadUrl(intent.getStringExtra("url") ?: "https://www.rosariomarket.com.ar")
        ensurePermissions(); GeofenceManager.scheduleRefresh(this)
    }

    private fun ensurePermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED)
            foregroundPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        else { requestNotifications(); requestBackgroundLocation(); GeofenceManager.refresh(this) }
    }
    private fun requestNotifications() {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
    private fun requestBackgroundLocation() {
        if (Build.VERSION.SDK_INT >= 29 && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED)
            backgroundPermission.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
    }
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() { if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed() }
}
