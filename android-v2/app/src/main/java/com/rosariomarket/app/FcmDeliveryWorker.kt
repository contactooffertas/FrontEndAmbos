package com.rosariomarket.app

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class FcmDeliveryWorker(
    appContext: Context,
    params: WorkerParameters,
) : Worker(appContext, params) {
    override fun doWork(): Result {
        val messageId = inputData.getString("messageId").orEmpty()
        if (messageId.isBlank()) return Result.failure()

        val auth = applicationContext
            .getSharedPreferences("rm_push", Context.MODE_PRIVATE)
            .getString("auth", "")
            .orEmpty()
        if (auth.isBlank()) return Result.retry()

        val request = Request.Builder()
            .url("https://new-backend-lovat.vercel.app/api/chat/messages/$messageId/delivered")
            .header("Authorization", "Bearer $auth")
            .post("{}".toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            OkHttpClient().newCall(request).execute().use { response ->
                when {
                    response.isSuccessful -> Result.success()
                    response.code == 401 || response.code == 403 || response.code == 404 -> Result.failure()
                    else -> Result.retry()
                }
            }
        } catch (_: Exception) {
            Result.retry()
        }
    }
}
