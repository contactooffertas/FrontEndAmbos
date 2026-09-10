package com.rosariomarket.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent

class GeofenceBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent) ?: return
        if (event.hasError || event.geofenceTransition != Geofence.GEOFENCE_TRANSITION_ENTER) return
        val prefs = context.getSharedPreferences("geofences", Context.MODE_PRIVATE)
        event.triggeringGeofences?.forEach { fence ->
            val id = fence.requestId
            val parts = prefs.getString(id, "Negocio cercano|").orEmpty().split("|", limit = 2)
            val cooldown = context.getSharedPreferences("geofence_cooldown", Context.MODE_PRIVATE)
            val last = cooldown.getLong(id, 0L)
            if (System.currentTimeMillis() - last < 6 * 60 * 60 * 1000L) return@forEach
            cooldown.edit().putLong(id, System.currentTimeMillis()).apply()
            NotificationHelper.showNearby(context, id, parts.getOrElse(0) { "Negocio cercano" }, parts.getOrElse(1) { "" })
        }
    }
}
