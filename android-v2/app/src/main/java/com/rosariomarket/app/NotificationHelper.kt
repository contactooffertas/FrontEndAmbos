package com.rosariomarket.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.Person

object NotificationHelper {
    const val CHANNEL = "rm_notifications_v396"
    private const val GROUP = "rm-notifications"
    private const val SUMMARY_ID = 396000
    const val EXTRA_NOTIFICATION_ID = "rm_notification_id"

    fun createChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
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
        val target = if (url.startsWith("http")) url else "https://www.rosariomarket.com.ar$url"
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

    fun opened(context: Context, intent: Intent?) {
        val id = intent?.getIntExtra(EXTRA_NOTIFICATION_ID, Int.MIN_VALUE) ?: Int.MIN_VALUE
        if (id == Int.MIN_VALUE) return
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.cancel(id)
        val remaining = currentVisibleCount(context)
        if (remaining <= 0) manager.cancel(SUMMARY_ID) else showSummary(context, manager, remaining)
        intent.removeExtra(EXTRA_NOTIFICATION_ID)
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
