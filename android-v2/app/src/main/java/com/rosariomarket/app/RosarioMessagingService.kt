package com.rosariomarket.app

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class RosarioMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val auth = getSharedPreferences("rm_push", MODE_PRIVATE).getString("auth", "").orEmpty()
        if (auth.isNotBlank()) FcmRegistration.send(this, auth, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val data = message.data
        val title = message.notification?.title ?: data["title"] ?: "Rosario Market"
        val body = message.notification?.body ?: data["body"] ?: "Tenés un mensaje nuevo"
        val url = data["url"] ?: "/chatpage"
        val conversationId = data["conversationId"].orEmpty()
        val messageId = data["messageId"].orEmpty()
        if (messageId.isNotBlank()) FcmDelivery.acknowledge(this, messageId)
        val count = data["badgeCount"]?.toIntOrNull() ?: 1
        NotificationHelper.showChat(this, title, body, url, conversationId, messageId, count)
    }
}

object FcmRegistration {
    private val client = OkHttpClient()
    private const val RETRY_WINDOW_MS = 6 * 60 * 60 * 1000L

    fun send(context: android.content.Context, auth: String, token: String) {
        val prefs = context.getSharedPreferences("rm_push", android.content.Context.MODE_PRIVATE)
        prefs.edit().putString("auth", auth).putString("fcm_token", token).apply()

        val sameToken = prefs.getString("registered_fcm_token", "") == token
        val sameAuth = prefs.getString("registered_auth", "") == auth
        val lastSuccess = prefs.getLong("registered_at", 0L)
        if (sameToken && sameAuth && System.currentTimeMillis() - lastSuccess < RETRY_WINDOW_MS) return

        Thread {
            val json = JSONObject().put("token", token).put("platform", "android").toString()
            val request = Request.Builder()
                .url("https://new-backend-lovat.vercel.app/api/push/fcm/register")
                .header("Authorization", "Bearer $auth")
                .post(json.toRequestBody("application/json".toMediaType()))
                .build()

            runCatching {
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        prefs.edit()
                            .putString("registered_fcm_token", token)
                            .putString("registered_auth", auth)
                            .putLong("registered_at", System.currentTimeMillis())
                            .apply()
                    } else {
                        prefs.edit().remove("registered_at").apply()
                    }
                }
            }.onFailure {
                prefs.edit().remove("registered_at").apply()
            }
        }.start()
    }
}


object FcmDelivery {
    private val client = OkHttpClient()
    fun acknowledge(context: android.content.Context, messageId: String) {
        val auth = context.getSharedPreferences("rm_push", android.content.Context.MODE_PRIVATE)
            .getString("auth", "").orEmpty()
        if (auth.isBlank()) return
        Thread {
            val request = Request.Builder()
                .url("https://new-backend-lovat.vercel.app/api/chat/messages/$messageId/delivered")
                .header("Authorization", "Bearer $auth")
                .post("{}".toRequestBody("application/json".toMediaType()))
                .build()
            runCatching { client.newCall(request).execute().close() }
        }.start()
    }
}
