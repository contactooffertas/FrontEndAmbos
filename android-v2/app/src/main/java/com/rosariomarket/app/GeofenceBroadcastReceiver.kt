package com.rosariomarket.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent

class GeofenceBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent) ?: return
        if (event.hasError() || event.geofenceTransition != Geofence.GEOFENCE_TRANSITION_ENTER) return

        val now = System.currentTimeMillis()
        val prefs = context.getSharedPreferences("geofences", Context.MODE_PRIVATE)
        val cooldown = context.getSharedPreferences("geofence_cooldown", Context.MODE_PRIVATE)

        // Anti-spam: varios negocios pueden avisar; el cooldown se controla por comercio.
        // Cada comercio tiene su propio cooldown de 6 horas.
        // Si el usuario entra en el radio de dos comercios distintos, ambos pueden avisar.
        val sixHours = 6 * 60 * 60 * 1000L
        for (fence in event.triggeringGeofences.orEmpty()) {
            val id = fence.requestId
            val last = cooldown.getLong("business_$id", 0L)
            if (now - last < sixHours) continue

            val parts = prefs.getString(id, "Negocio cercano|").orEmpty().split("|", limit = 2)
            cooldown.edit().putLong("business_$id", now).apply()

            // Funciona aunque Rosario Market esté en segundo plano y el usuario
            // esté usando WhatsApp u otra aplicación.
            NotificationHelper.showNearby(
                context,
                id,
                parts.getOrElse(0) { "Negocio cercano" },
                parts.getOrElse(1) { "" }
            )
        }
    }
}
