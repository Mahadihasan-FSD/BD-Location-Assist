package com.bdlocationassist.recovery.receiver

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

/**
 * Handles remote alarm / siren playback to locate misplaced or lost device nearby.
 * Explicitly targets STREAM_ALARM to override silent mode, with accompanying vibration.
 */
class AlarmRinger(private val context: Context) {

    private var ringtone: Ringtone? = null
    private var isPlaying = false

    fun startEmergencyRing(durationSeconds: Int = 30) {
        if (isPlaying) return
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

            // Set alarm volume to maximum so owner can locate device in room
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)

            val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

            ringtone = RingtoneManager.getRingtone(context, alarmUri)?.apply {
                audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                play()
            }
            isPlaying = true

            // Trigger vibration pattern
            startVibration()

            // Schedule auto-stop after duration
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                stopEmergencyRing()
            }, durationSeconds * 1000L)

        } catch (e: Exception) {
            Log.e("AlarmRinger", "Failed to start emergency ring", e)
        }
    }

    fun stopEmergencyRing() {
        try {
            ringtone?.stop()
            ringtone = null
            stopVibration()
            isPlaying = false
        } catch (e: Exception) {
            Log.e("AlarmRinger", "Failed to stop emergency ring", e)
        }
    }

    private fun startVibration() {
        val pattern = longArrayOf(0, 500, 200, 500, 200, 500)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
        }
    }

    private fun stopVibration() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator?.cancel()
        } else {
            @Suppress("DEPRECATION")
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            vibrator?.cancel()
        }
    }
}
