package com.rosariomarket.app

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters

class GeofenceRefreshWorker(appContext: Context, params: WorkerParameters) : Worker(appContext, params) {
    override fun doWork(): Result { GeofenceManager.refresh(applicationContext); return Result.success() }
}
