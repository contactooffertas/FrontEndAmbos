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

        // Anti-spam global: como máximo 3 avisos de proximidad por día por dispositivo.
        val day = now / (24 * 60 * 60 * 1000L)
        val storedDay = cooldown.getLong("day", -1L)
        var dailyCount = if (storedDay == day) cooldown.getInt("daily_count", 0) else 0
        if (storedDay != day) cooldown.edit().putLong("day", day).putInt("daily_count", 0).apply()
        if (dailyCount >= 3) return

        // Si entró simultáneamente en varios radios, mostramos sólo uno.
        val fence = event.triggeringGeofences?.firstOrNull() ?: return
        val id = fence.requestId
        val last = cooldown.getLong("business_$id", 0L)

        // El mismo comercio no vuelve a avisar durante 24 horas.
        if (now - last < 24 * 60 * 60 * 1000L) return

        val parts = prefs.getString(id, "Negocio cercano|").orEmpty().split("|", limit = 2)
        cooldown.edit()
            .putLong("business_$id", now)
            .putInt("daily_count", ++dailyCount)
            .apply()

        // No depende de login ni de seguir al negocio: alcanza con tener la APK,
        // ubicación permitida y notificaciones habilitadas.
        NotificationHelper.showNearby(
            context,
            id,
            parts.getOrElse(0) { "Negocio cercano" },
            parts.getOrElse(1) { "" }
        )
    }
}
