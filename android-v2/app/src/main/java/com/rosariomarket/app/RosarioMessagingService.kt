package com.rosariomarket.app

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class RosarioMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val auth = getSharedPreferences("rm_push", MODE_PRIVATE).getString("auth", "").orEmpty()
        if (auth.isNotBlank()) FcmRegistration.send(this, auth, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val data = message.data
        val title = data["title"] ?: message.notification?.title ?: "Rosario Market"
        val body = data["body"] ?: message.notification?.body ?: "Tenés una notificación nueva"
        val url = data["url"] ?: "/"
        val conversationId = data["conversationId"].orEmpty()
        val messageId = data["messageId"].orEmpty()
        val count = data["badgeCount"]?.toIntOrNull()?.coerceAtLeast(1) ?: 1
        val type = data["type"] ?: "general"
        val tag = data["tag"].orEmpty()
        val image = data["image"].orEmpty()

        // Enqueue first: WorkManager retries the receipt when the network is
        // temporarily unavailable, even if Android stops this service.
        if (messageId.isNotBlank()) FcmDelivery.enqueue(this, messageId)

        NotificationHelper.show(
            context = this,
            title = title,
            body = body,
            url = url,
            conversationId = conversationId,
            messageId = messageId,
            badgeCount = count,
            type = type,
            tag = tag,
            imageUrl = image,
        )
    }
}

object FcmRegistration {
    private val client = OkHttpClient()
    private const val RETRY_WINDOW_MS = 6 * 60 * 60 * 1000L

    fun send(context: Context, auth: String, token: String) {
        val prefs = context.getSharedPreferences("rm_push", Context.MODE_PRIVATE)
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
    fun enqueue(context: Context, messageId: String) {
        val request = OneTimeWorkRequestBuilder<FcmDeliveryWorker>()
            .setInputData(workDataOf("messageId" to messageId))
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "rm-delivery-$messageId",
            ExistingWorkPolicy.KEEP,
            request,
        )
    }
}
