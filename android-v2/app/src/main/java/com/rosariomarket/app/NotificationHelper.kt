package com.rosariomarket.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import androidx.core.app.NotificationCompat
import androidx.core.app.Person

object NotificationHelper {
    private const val CHANNEL = "nearby_businesses"
    private const val CHAT_CHANNEL = "rm_chat_messages"
    fun createChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        val prefs = context.getSharedPreferences("rm_notifications", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("chat_channel_reset_v394", false)) {
            manager.deleteNotificationChannel(CHAT_CHANNEL)
            prefs.edit().putBoolean("chat_channel_reset_v394", true).apply()
        }
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, "Negocios cerca tuyo", NotificationManager.IMPORTANCE_HIGH).apply { description = "Avisos cuando entrás en el radio de un negocio de Rosario Market" })
        manager.createNotificationChannel(
            NotificationChannel(CHAT_CHANNEL, "Mensajes de Rosario Market", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Mensajes individuales, grupos y reacciones del chat"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 220, 100, 220)
                enableLights(true)
                lightColor = 0xFFF97316.toInt()
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setShowBadge(true)
            })
    }
    fun showNearby(context: Context, businessId: String, businessName: String, address: String) {
        createChannel(context)
        val open = Intent(context, MainActivity::class.java).putExtra("url", "https://www.rosariomarket.com.ar/negocio/$businessId")
        val pending = PendingIntent.getActivity(context, businessId.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val body = if (address.isBlank()) "Estás a menos de 300 m. Tocá para conocerlo." else "A menos de 300 m · $address"
        val n = NotificationCompat.Builder(context, CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_map)
            .setContentTitle("📍 $businessName está cerca tuyo").setContentText(body).setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH).setAutoCancel(true).setContentIntent(pending).build()
        context.getSystemService(NotificationManager::class.java).notify(businessId.hashCode(), n)
    }
    fun showChat(context: Context, title: String, body: String, url: String, conversationId: String, messageId: String, badgeCount: Int) {
        createChannel(context)
        val target = if (url.startsWith("http")) url else "https://www.rosariomarket.com.ar$url"
        val open = Intent(context, MainActivity::class.java).putExtra("url", target)
        val requestCode = (messageId.ifBlank { conversationId.ifBlank { target } }).hashCode()
        val pending = PendingIntent.getActivity(context, requestCode, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val sender = Person.Builder().setName(title).build()
        val notification = NotificationCompat.Builder(context, CHAT_CHANNEL)
            .setSmallIcon(R.drawable.ic_rm_notification)
            .setLargeIcon(BitmapFactory.decodeResource(context.resources, R.drawable.app_icon))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.MessagingStyle(sender).addMessage(body, System.currentTimeMillis(), sender))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setNumber(badgeCount.coerceAtLeast(1))
            .setGroup("rm-chat")
            .build()
        context.getSystemService(NotificationManager::class.java).notify(requestCode, notification)
    }
}
