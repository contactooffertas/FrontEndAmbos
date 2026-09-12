package com.rosariomarket.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.work.*
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object GeofenceManager {
    private const val RADIUS = 300f
    private const val MAX_GEOFENCES = 90
    private const val API = "https://new-backend-lovat.vercel.app/api/business/nearby"
    private val client = OkHttpClient()

    fun scheduleRefresh(context: Context) {
        val request = PeriodicWorkRequestBuilder<GeofenceRefreshWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("rosario-market-geofence-refresh", ExistingPeriodicWorkPolicy.UPDATE, request)
    }

    @SuppressLint("MissingPermission")
    fun refresh(context: Context) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return
        val fused = LocationServices.getFusedLocationProviderClient(context)
        fused.lastLocation.addOnSuccessListener { location ->
            if (location != null) Thread { runCatching { register(context, fetchNearby(location.latitude, location.longitude)) } }.start()
            else fused.getCurrentLocation(com.google.android.gms.location.Priority.PRIORITY_BALANCED_POWER_ACCURACY, null).addOnSuccessListener { current ->
                if (current != null) Thread { runCatching { register(context, fetchNearby(current.latitude, current.longitude)) } }.start()
            }
        }
    }

    private fun fetchNearby(lat: Double, lng: Double): List<BusinessPlace> {
        val response = client.newCall(Request.Builder().url("$API?lat=$lat&lng=$lng&radius=15000&limit=$MAX_GEOFENCES").get().build()).execute()
        if (!response.isSuccessful) return emptyList()
        return parseBusinesses(response.body?.string().orEmpty()).take(MAX_GEOFENCES)
    }

    private fun parseBusinesses(raw: String): List<BusinessPlace> {
        val root = runCatching { JSONObject(raw) }.getOrNull()
        val array: JSONArray = when {
            root?.optJSONArray("businesses") != null -> root.getJSONArray("businesses")
            root?.optJSONArray("results") != null -> root.getJSONArray("results")
            root?.optJSONArray("data") != null -> root.getJSONArray("data")
            else -> runCatching { JSONArray(raw) }.getOrElse { JSONArray() }
        }
        return buildList {
            for (i in 0 until array.length()) {
                val b = array.optJSONObject(i) ?: continue
                val id = b.optString("_id", b.optString("id")); val loc = b.optJSONObject("location"); val c = loc?.optJSONArray("coordinates")
                val x = c?.optDouble(0, Double.NaN) ?: Double.NaN; val y = c?.optDouble(1, Double.NaN) ?: Double.NaN
                if (id.isNotBlank() && !x.isNaN() && !y.isNaN()) add(BusinessPlace(id, b.optString("name", "Negocio cercano"), y, x, b.optString("address").takeIf { it.isNotBlank() }))
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun register(context: Context, places: List<BusinessPlace>) {
        if (places.isEmpty() || ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return
        val prefs = context.getSharedPreferences("geofences", Context.MODE_PRIVATE); val editor = prefs.edit().clear()
        val fences = places.map { p ->
            editor.putString(p.id, "${p.name}|${p.address.orEmpty()}")
            Geofence.Builder().setRequestId(p.id).setCircularRegion(p.lat, p.lng, RADIUS)
                .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER).setExpirationDuration(Geofence.NEVER_EXPIRE).setNotificationResponsiveness(60_000).build()
        }; editor.apply()
        val request = GeofencingRequest.Builder().setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER).addGeofences(fences).build()
        val pi = PendingIntent.getBroadcast(context, 2020, Intent(context, GeofenceBroadcastReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
        val client = LocationServices.getGeofencingClient(context)
        client.removeGeofences(pi).addOnCompleteListener { client.addGeofences(request, pi) }
    }
}
