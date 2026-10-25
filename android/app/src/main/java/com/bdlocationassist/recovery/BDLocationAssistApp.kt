package com.bdlocationassist.recovery

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class BDLocationAssistApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val recoveryChannel = NotificationChannel(
                CHANNEL_RECOVERY_SERVICE,
                "Device Recovery Status",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Displays persistent status when BD Location Assist device recovery is active."
                setShowBadge(false)
            }

            val alarmChannel = NotificationChannel(
                CHANNEL_ALARM,
                "Emergency Find Alert",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High-priority sound alerts triggered remotely by the verified owner."
                enableVibration(true)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(recoveryChannel)
            notificationManager?.createNotificationChannel(alarmChannel)
        }
    }

    companion object {
        const val CHANNEL_RECOVERY_SERVICE = "bd_recovery_foreground_channel"
        const val CHANNEL_ALARM = "bd_recovery_alarm_channel"
    }
}
