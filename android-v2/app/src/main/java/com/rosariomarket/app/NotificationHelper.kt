package com.rosariomarket.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat

object NotificationHelper {
    private const val CHANNEL = "nearby_businesses"
    fun createChannel(context: Context) {
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL, "Negocios cerca tuyo", NotificationManager.IMPORTANCE_HIGH).apply { description = "Avisos cuando entrás en el radio de un negocio de Rosario Market" })
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
}
