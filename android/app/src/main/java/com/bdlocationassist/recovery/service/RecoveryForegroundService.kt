package com.bdlocationassist.recovery.service

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.bdlocationassist.recovery.BDLocationAssistApp
import com.bdlocationassist.recovery.MainActivity
import com.bdlocationassist.recovery.location.LocationClient
import com.bdlocationassist.recovery.network.NetworkClient
import com.bdlocationassist.recovery.security.KeystoreManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Android 14+ (API 34/35) compliant Foreground Service for real-time device recovery.
 * Must declare foregroundServiceType="location" and display a persistent, user-visible notification
 * to prevent stealth tracking violations according to Google Play Policies.
 */
class RecoveryForegroundService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var keystoreManager: KeystoreManager
    private lateinit var locationClient: LocationClient
    private lateinit var networkClient: NetworkClient

    override fun onCreate() {
        super.onCreate()
        keystoreManager = KeystoreManager(this)
        locationClient = LocationClient(this)
        networkClient = NetworkClient(this)
        Log.i("RecoveryService", "RecoveryForegroundService created.")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action

        if (action == ACTION_STOP_RECOVERY) {
            Log.i("RecoveryService", "User requested to pause recovery from notification.")
            keystoreManager.setRecoveryEnabled(false)
            stopSelf()
            return START_NOT_STICKY
        }

        // Start Foreground with mandatory Android 14+ location type
        startForegroundWithNotification()

        // Start location and telemetry collection loop
        startTelemetryCollection()

        return START_STICKY
    }

    private fun startForegroundWithNotification() {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val openAppPendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val pauseIntent = Intent(this, RecoveryForegroundService::class.java).apply {
            action = ACTION_STOP_RECOVERY
        }
        val pausePendingIntent = PendingIntent.getService(
            this, 1, pauseIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification: Notification = NotificationCompat.Builder(this, BDLocationAssistApp.CHANNEL_RECOVERY_SERVICE)
            .setContentTitle("BD Location Assist: Recovery Active")
            .setContentText("Registered device protection is active. Tap to view or pause.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setContentIntent(openAppPendingIntent)
            .addAction(android.R.drawable.ic_delete, "Pause Recovery", pausePendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val serviceType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            } else {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            }
            startForeground(NOTIFICATION_ID, notification, serviceType)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun startTelemetryCollection() {
        serviceScope.launch {
            while (isActive) {
                if (!keystoreManager.isRecoveryEnabled() || !keystoreManager.isRegistered()) {
                    Log.i("RecoveryService", "Recovery disabled or device unlinked. Stopping service.")
                    stopSelf()
                    break
                }

                try {
                    val location = locationClient.getLastKnownLocation()
                    if (location != null) {
                        networkClient.uploadTelemetry(
                            latitude = location.latitude,
                            longitude = location.longitude,
                            accuracyMeters = location.accuracy,
                            altitudeMeters = location.altitude,
                            speed = location.speed
                        )
                    }
                } catch (e: Exception) {
                    Log.e("RecoveryService", "Error during scheduled telemetry sync", e)
                }

                // Standard heartbeat interval: 60 seconds (power-balanced)
                delay(60_000L)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        Log.i("RecoveryService", "RecoveryForegroundService destroyed.")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val NOTIFICATION_ID = 40401
        const val ACTION_START_RECOVERY = "com.bdlocationassist.action.START_RECOVERY"
        const val ACTION_STOP_RECOVERY = "com.bdlocationassist.action.STOP_RECOVERY"
    }
}
