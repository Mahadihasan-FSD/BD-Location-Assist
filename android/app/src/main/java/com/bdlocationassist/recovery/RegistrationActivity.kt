package com.bdlocationassist.recovery

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.bdlocationassist.recovery.security.KeystoreManager
import com.bdlocationassist.recovery.service.RecoveryForegroundService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Explicit owner registration screen.
 * Requires authenticated account credentials, explains privacy and background location behavior,
 * and provisions hardware-backed keystore credentials.
 */
class RegistrationActivity : AppCompatActivity() {

    private lateinit var keystoreManager: KeystoreManager
    private val httpClient = OkHttpClient()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_registration)
        keystoreManager = KeystoreManager(this)

        val etOwnerEmail = findViewById<EditText>(R.id.etOwnerEmail)
        val etDeviceLabel = findViewById<EditText>(R.id.etDeviceLabel)
        val etPairingCode = findViewById<EditText>(R.id.etPairingCode)
        val btnAuthorize = findViewById<Button>(R.id.btnAuthorize)
        val tvDeviceInfo = findViewById<TextView>(R.id.tvDeviceInfo)

        val deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}"
        val osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"
        tvDeviceInfo.text = "Device: $deviceModel | $osVersion"
        etDeviceLabel.setText(deviceModel)

        btnAuthorize.setOnClickListener {
            val email = etOwnerEmail.text.toString().trim()
            val label = etDeviceLabel.text.toString().trim()
            val code = etPairingCode.text.toString().trim()

            if (email.isEmpty() || label.isEmpty()) {
                Toast.makeText(this, "Please provide owner email and device label.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            showConsentDialog(email, label, code)
        }
    }

    private fun showConsentDialog(email: String, label: String, code: String) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.owner_registration_title))
            .setMessage(
                "By pairing this device to $email, you authorize BD Location Assist to collect and upload " +
                "GPS and network location data for the sole purpose of finding this device if lost or stolen.\n\n" +
                "A persistent status notification will remain visible whenever recovery is enabled. " +
                "You can pause recovery or permanently unlink this device at any time."
            )
            .setPositiveButton("Authorize & Enable") { _, _ ->
                performRegistration(email, label, code)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun performRegistration(email: String, label: String, code: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val payload = JSONObject().apply {
                    put("deviceName", label)
                    put("model", "${Build.MANUFACTURER} ${Build.MODEL}")
                    put("manufacturer", Build.MANUFACTURER)
                    put("androidVersion", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
                    put("pairingCode", code)
                }

                val body = payload.toString().toRequestBody("application/json".toMediaType())
                val request = Request.Builder()
                    .url("https://bd-location-assist-backend.run.app/api/recovery/devices/register")
                    .post(body)
                    .addHeader("Authorization", "Bearer auth_token_dhaka_owner_2026")
                    .build()

                val response = httpClient.newCall(request).execute()
                val responseString = response.body?.string() ?: ""

                withContext(Dispatchers.Main) {
                    if (response.isSuccessful) {
                        val json = JSONObject(responseString)
                        val credentials = json.getJSONObject("credentials")
                        val deviceId = credentials.getString("deviceId")
                        val deviceSecret = credentials.getString("deviceSecret")

                        keystoreManager.saveDeviceCredentials(deviceId, deviceSecret, email)

                        // Start Foreground Service
                        val serviceIntent = Intent(this@RegistrationActivity, RecoveryForegroundService::class.java).apply {
                            action = RecoveryForegroundService.ACTION_START_RECOVERY
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(serviceIntent)
                        } else {
                            startService(serviceIntent)
                        }

                        Toast.makeText(this@RegistrationActivity, "Device successfully enrolled for recovery!", Toast.LENGTH_LONG).show()
                        setResult(Activity.RESULT_OK)
                        finish()
                    } else {
                        Toast.makeText(this@RegistrationActivity, "Registration failed: ${response.message}", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@RegistrationActivity, "Connection error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}
