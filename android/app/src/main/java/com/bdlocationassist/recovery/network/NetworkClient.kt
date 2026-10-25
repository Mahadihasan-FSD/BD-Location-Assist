package com.bdlocationassist.recovery.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.util.Log
import com.bdlocationassist.recovery.receiver.AlarmRinger
import com.bdlocationassist.recovery.security.KeystoreManager
import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

/**
 * Handles authenticated communication between the native Android device and BD Location Assist backend.
 * Enforces X-Device-Id & X-Device-Secret headers, parses pending commands, and wipes credentials upon revocation.
 */
class NetworkClient(private val context: Context) {

    private val keystoreManager = KeystoreManager(context)
    private val alarmRinger = AlarmRinger(context)
    private val gson = Gson()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    // Base URL configuration (Points to local dev gateway or production Cloud Run URL)
    private val baseUrl = "https://bd-location-assist-backend.run.app" // Configurable via build variant

    suspend fun uploadTelemetry(
        latitude: Double,
        longitude: Double,
        accuracyMeters: Float,
        altitudeMeters: Double = 0.0,
        speed: Float = 0.0f
    ): Boolean = withContext(Dispatchers.IO) {
        val deviceId = keystoreManager.getDeviceId() ?: return@withContext false
        val deviceSecret = keystoreManager.getDeviceSecret() ?: return@withContext false

        val (batteryLevel, isCharging) = getBatteryStatus()
        val networkType = getCurrentNetworkType()
        val timestamp = getIsoTimestamp()

        val payloadObj = JsonObject().apply {
            addProperty("latitude", latitude)
            addProperty("longitude", longitude)
            addProperty("accuracyMeters", accuracyMeters)
            addProperty("altitudeMeters", altitudeMeters)
            addProperty("speed", speed)
            addProperty("batteryLevel", batteryLevel)
            addProperty("isCharging", isCharging)
            addProperty("networkType", networkType)
            addProperty("recordedAt", timestamp)
        }

        val mediaType = "application/json; charset=utf-8".toMediaType()
        val requestBody = payloadObj.toString().toRequestBody(mediaType)

        val request = Request.Builder()
            .url("$baseUrl/api/recovery/telemetry")
            .post(requestBody)
            .addHeader("X-Device-Id", deviceId)
            .addHeader("X-Device-Secret", deviceSecret)
            .addHeader("X-HMAC-Signature", keystoreManager.computeHmacSignature(payloadObj.toString()))
            .build()

        try {
            httpClient.newCall(request).execute().use { response ->
                if (response.code == 401 || response.code == 403) {
                    // Owner unlinked device on backend: Wipe local device credentials immediately
                    Log.w("NetworkClient", "Device credentials revoked by owner. Wiping local state.")
                    keystoreManager.clearCredentials()
                    return@withContext false
                }

                if (!response.isSuccessful) {
                    Log.e("NetworkClient", "Failed to upload telemetry. HTTP ${response.code}")
                    return@withContext false
                }

                val responseBody = response.body?.string() ?: return@withContext true
                val jsonResponse = gson.fromJson(responseBody, JsonObject::class.java)

                // Process pending commands returned in telemetry response
                if (jsonResponse.has("commands")) {
                    val commands = jsonResponse.getAsJsonArray("commands")
                    for (i in 0 until commands.size()) {
                        val cmdObj = commands.get(i).asJsonObject
                        handleRemoteCommand(cmdObj)
                    }
                }

                return@withContext true
            }
        } catch (e: Exception) {
            Log.e("NetworkClient", "Network exception during telemetry sync", e)
            return@withContext false
        }
    }

    private fun handleRemoteCommand(cmdObj: JsonObject) {
        val cmdId = cmdObj.get("id").asString
        val command = cmdObj.get("command").asString

        Log.i("NetworkClient", "Received authorized remote command: $command (id: $cmdId)")

        when (command) {
            "RING" -> {
                alarmRinger.startEmergencyRing(durationSeconds = 30)
            }
            "UNLINK" -> {
                Log.w("NetworkClient", "Executing remote UNLINK command.")
                alarmRinger.stopEmergencyRing()
                keystoreManager.clearCredentials()
            }
            "LOCATE_NOW" -> {
                // High accuracy burst triggered by foreground service
            }
        }
    }

    private fun getBatteryStatus(): Pair<Int, Boolean> {
        val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val level = batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1
        val status = batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS) ?: -1
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL
        return Pair(level, isCharging)
    }

    private fun getCurrentNetworkType(): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val activeNet = cm?.activeNetwork ?: return "NONE"
        val caps = cm.getNetworkCapabilities(activeNet) ?: return "NONE"

        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"
            else -> "OTHER"
        }
    }

    private fun getIsoTimestamp(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date())
    }
}
