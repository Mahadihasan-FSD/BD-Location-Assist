package com.bdlocationassist.recovery.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.bdlocationassist.recovery.security.KeystoreManager
import com.bdlocationassist.recovery.service.RecoveryForegroundService

/**
 * Resumes device recovery monitoring after device restart if previously authorized by the owner.
 * Never runs stealthily; immediately presents the required foreground service notification.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            val keystoreManager = KeystoreManager(context)
            if (keystoreManager.isRegistered() && keystoreManager.isRecoveryEnabled()) {
                Log.i("BootReceiver", "Boot completed. Resuming authorized recovery service.")
                val serviceIntent = Intent(context, RecoveryForegroundService::class.java).apply {
                    action = RecoveryForegroundService.ACTION_START_RECOVERY
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } else {
                Log.i("BootReceiver", "Boot completed but device recovery is not active. Ignoring.")
            }
        }
    }
}
