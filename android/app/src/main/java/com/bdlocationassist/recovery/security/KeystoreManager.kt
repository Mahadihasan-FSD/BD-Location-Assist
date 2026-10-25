package com.bdlocationassist.recovery.security

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Handles hardware-backed cryptographic storage using Android Keystore and MasterKey.
 * Secures device authorization secrets and generates HMAC signatures for telemetry payloads.
 */
class KeystoreManager(private val context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val encryptedPrefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "bd_recovery_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveDeviceCredentials(deviceId: String, deviceSecret: String, ownerEmail: String) {
        encryptedPrefs.edit()
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_DEVICE_SECRET, deviceSecret)
            .putString(KEY_OWNER_EMAIL, ownerEmail)
            .putBoolean(KEY_IS_REGISTERED, true)
            .putBoolean(KEY_RECOVERY_ENABLED, true)
            .apply()
    }

    fun getDeviceId(): String? = encryptedPrefs.getString(KEY_DEVICE_ID, null)

    fun getDeviceSecret(): String? = encryptedPrefs.getString(KEY_DEVICE_SECRET, null)

    fun getOwnerEmail(): String? = encryptedPrefs.getString(KEY_OWNER_EMAIL, null)

    fun isRegistered(): Boolean = encryptedPrefs.getBoolean(KEY_IS_REGISTERED, false)

    fun isRecoveryEnabled(): Boolean = encryptedPrefs.getBoolean(KEY_RECOVERY_ENABLED, false)

    fun setRecoveryEnabled(enabled: Boolean) {
        encryptedPrefs.edit().putBoolean(KEY_RECOVERY_ENABLED, enabled).apply()
    }

    /**
     * Permanent unlinking: Cryptographically wipes local tokens and flags device unlinked.
     */
    fun clearCredentials() {
        encryptedPrefs.edit()
            .remove(KEY_DEVICE_ID)
            .remove(KEY_DEVICE_SECRET)
            .remove(KEY_OWNER_EMAIL)
            .putBoolean(KEY_IS_REGISTERED, false)
            .putBoolean(KEY_RECOVERY_ENABLED, false)
            .apply()
    }

    /**
     * Compute HMAC-SHA256 signature over telemetry string for mutual integrity.
     */
    fun computeHmacSignature(payload: String): String {
        val secret = getDeviceSecret() ?: return ""
        val hmacKey = SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256")
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(hmacKey)
        val hmacBytes = mac.doFinal(payload.toByteArray(Charsets.UTF_8))
        return hmacBytes.joinToString("") { "%02x".format(it) }
    }

    companion object {
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_SECRET = "device_secret"
        private const val KEY_OWNER_EMAIL = "owner_email"
        private const val KEY_IS_REGISTERED = "is_registered"
        private const val KEY_RECOVERY_ENABLED = "recovery_enabled"
    }
}
