package com.rosariomarket.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.Person

object NotificationHelper {
    private const val SITE_ORIGIN = "https://www.rosariomarket.com.ar"
    const val CHANNEL = "rm_notifications_v398"
    private const val GROUP = "rm-notifications"
    private const val SUMMARY_ID = 396000
    const val EXTRA_NOTIFICATION_ID = "rm_notification_id"

    fun createChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        val prefs = context.getSharedPreferences("rm_notifications", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("migrated_v398", false)) {
            manager.cancelAll()
            manager.deleteNotificationChannel("rm_notifications_v397")
            manager.deleteNotificationChannel("rm_notifications_v396")
            manager.deleteNotificationChannel("rm_chat_messages")
            manager.deleteNotificationChannel("rm_chat_messages_v2")
            prefs.edit().putBoolean("migrated_v398", true).apply()
        }
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, "Notificaciones de Rosario Market", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Mensajes, pedidos, ofertas y avisos de Rosario Market"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 220, 100, 220)
                enableLights(true)
                lightColor = 0xFFF97316.toInt()
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setShowBadge(true)
            }
        )
    }

    fun showNearby(context: Context, businessId: String, businessName: String, address: String) {
        val body = if (address.isBlank()) "Estás a menos de 300 m. Tocá para conocerlo." else "A menos de 300 m · $address"
        show(context, "📍 $businessName está cerca tuyo", body, "/negocio/$businessId", "", "", currentVisibleCount(context) + 1, "nearby_business", "nearby-$businessId", "")
    }

    fun show(
        context: Context,
        title: String,
        body: String,
        url: String,
        conversationId: String,
        messageId: String,
        badgeCount: Int,
        type: String,
        tag: String,
        imageUrl: String,
    ) {
        createChannel(context)
        val target = normalizeTargetUrl(url, conversationId)
        val stableKey = messageId.ifBlank { tag.ifBlank { "$type-$target-" + System.currentTimeMillis() } }
        val notificationId = stableKey.hashCode()
        val open = Intent(context, MainActivity::class.java)
            .putExtra("url", target)
            .putExtra(EXTRA_NOTIFICATION_ID, notificationId)
            .putExtra("rm_badge_count", badgeCount)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pending = PendingIntent.getActivity(context, notificationId, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val builder = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_rm_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(if (type == "chat_message" || type == "group_message") NotificationCompat.CATEGORY_MESSAGE else NotificationCompat.CATEGORY_SOCIAL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setNumber(badgeCount.coerceAtLeast(1))
            .setGroup(GROUP)
            .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)

        if (type == "chat_message" || type == "group_message") {
            val sender = Person.Builder().setName(title).build()
            builder.setStyle(NotificationCompat.MessagingStyle(sender).addMessage(body, System.currentTimeMillis(), sender))
        }

        val manager = context.getSystemService(NotificationManager::class.java)
        manager.notify(notificationId, builder.build())
        showSummary(context, manager, badgeCount)
    }

    fun clearAll(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.cancelAll()
    }

    fun opened(context: Context, intent: Intent?) {
        val id = intent?.getIntExtra(EXTRA_NOTIFICATION_ID, Int.MIN_VALUE) ?: Int.MIN_VALUE
        val manager = context.getSystemService(NotificationManager::class.java)
        if (id == Int.MIN_VALUE) {
            // La notificación resumen no tiene id individual. Al tocarla debe
            // desaparecer junto con el contador acumulado.
            if (!intent?.getStringExtra("url").isNullOrBlank()) manager.cancelAll()
            return
        }
        manager.cancel(id)
        val remaining = currentVisibleCount(context)
        if (remaining <= 0) manager.cancel(SUMMARY_ID) else showSummary(context, manager, remaining)
        intent?.removeExtra(EXTRA_NOTIFICATION_ID)
    }

    /** Convierte cualquier ruta recibida por FCM en una URL web válida. */
    fun normalizeTargetUrl(rawUrl: String?, conversationId: String = ""): String {
        var value = rawUrl.orEmpty().trim()

        // Versiones anteriores podían recibir/guardar file:///chatpage%3F...
        // y WebView intentaba abrir un archivo local inexistente.
        if (value.startsWith("file://", ignoreCase = true)) {
            value = value.substring(7).trimStart('/')
        }
        value = runCatching { Uri.decode(value) }.getOrDefault(value)

        if (value.isBlank() || value == "/") {
            value = if (conversationId.isNotBlank()) {
                "/chatpage?conversationId=${Uri.encode(conversationId)}"
            } else "/"
        }

        if (value.startsWith("http://", true) || value.startsWith("https://", true)) {
            val parsed = runCatching { Uri.parse(value) }.getOrNull()
            if (parsed?.host.equals("rosariomarket.com.ar", true) ||
                parsed?.host.equals("www.rosariomarket.com.ar", true)) return value
            return SITE_ORIGIN
        }

        return "$SITE_ORIGIN/${value.trimStart('/')}"
    }

    private fun currentVisibleCount(context: Context): Int {
        val manager = context.getSystemService(NotificationManager::class.java)
        return manager.activeNotifications.count { it.id != SUMMARY_ID }
    }

    private fun showSummary(context: Context, manager: NotificationManager, badgeCount: Int) {
        val count = badgeCount.coerceAtLeast(1)
        val open = Intent(context, MainActivity::class.java)
            .putExtra("url", "https://www.rosariomarket.com.ar/chatpage")
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pending = PendingIntent.getActivity(context, SUMMARY_ID, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val summary = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_rm_notification)
            .setContentTitle("Rosario Market")
            .setContentText(if (count == 1) "1 notificación pendiente" else "$count notificaciones pendientes")
            .setStyle(NotificationCompat.InboxStyle().setSummaryText("$count pendientes"))
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setGroup(GROUP)
            .setGroupSummary(true)
            .setOnlyAlertOnce(true)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setNumber(count)
            .build()
        manager.notify(SUMMARY_ID, summary)
    }
}
