package com.bdlocationassist.recovery

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.content.ContextCompat
import com.bdlocationassist.recovery.receiver.AlarmRinger
import com.bdlocationassist.recovery.security.KeystoreManager
import com.bdlocationassist.recovery.service.RecoveryForegroundService

/**
 * Main dashboard for BD Location Assist on the Android device.
 * Enforces transparent user disclosure, handles runtime permissions for Android 14+,
 * and allows the user to monitor, toggle, or permanently unlink recovery.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var keystoreManager: KeystoreManager
    private lateinit var alarmRinger: AlarmRinger

    private lateinit var tvStatusBadge: TextView
    private lateinit var tvOwnerInfo: TextView
    private lateinit var tvDeviceId: TextView
    private lateinit var switchRecovery: SwitchCompat
    private lateinit var btnUnlink: Button
    private lateinit var btnRegister: Button
    private lateinit var btnTestSiren: Button
    private lateinit var btnPermissions: Button
    private lateinit var tvPermissionStatus: TextView

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineLocation = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseLocation = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        val notifications = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions[Manifest.permission.POST_NOTIFICATIONS] ?: false
        } else true

        if (fineLocation || coarseLocation) {
            updateUI()
            checkBatteryOptimization()
        } else {
            Toast.makeText(
                this,
                "Precise location is required for lost phone recovery features.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        keystoreManager = KeystoreManager(this)
        alarmRinger = AlarmRinger(this)

        initViews()
        setupListeners()
    }

    override fun onResume() {
        super.onResume()
        updateUI()
    }

    private fun initViews() {
        tvStatusBadge = findViewById(R.id.tvStatusBadge)
        tvOwnerInfo = findViewById(R.id.tvOwnerInfo)
        tvDeviceId = findViewById(R.id.tvDeviceId)
        switchRecovery = findViewById(R.id.switchRecovery)
        btnUnlink = findViewById(R.id.btnUnlink)
        btnRegister = findViewById(R.id.btnRegister)
        btnTestSiren = findViewById(R.id.btnTestSiren)
        btnPermissions = findViewById(R.id.btnPermissions)
        tvPermissionStatus = findViewById(R.id.tvPermissionStatus)
    }

    private fun setupListeners() {
        btnPermissions.setOnClickListener {
            showLocationDisclosureAndRequest()
        }

        btnRegister.setOnClickListener {
            startActivity(Intent(this, RegistrationActivity::class.java))
        }

        switchRecovery.setOnCheckedChangeListener { _, isChecked ->
            keystoreManager.setRecoveryEnabled(isChecked)
            if (isChecked) {
                startRecoveryService()
            } else {
                stopRecoveryService()
            }
            updateUI()
        }

        btnTestSiren.setOnClickListener {
            alarmRinger.startEmergencyRing(durationSeconds = 5)
            Toast.makeText(this, "Testing Emergency Ring (5 seconds)...", Toast.LENGTH_SHORT).show()
        }

        btnUnlink.setOnClickListener {
            showUnlinkConfirmationDialog()
        }
    }

    private fun updateUI() {
        val hasPermissions = checkLocationPermissions()
        val isRegistered = keystoreManager.isRegistered()
        val isEnabled = keystoreManager.isRecoveryEnabled()

        tvPermissionStatus.text = if (hasPermissions) {
            "✓ Location & Notification Permissions Granted"
        } else {
            "⚠ Location Permissions Required for Recovery"
        }

        if (isRegistered) {
            btnRegister.visibility = View.GONE
            btnUnlink.visibility = View.VISIBLE
            switchRecovery.isEnabled = true
            switchRecovery.isChecked = isEnabled

            tvOwnerInfo.text = "Owner: ${keystoreManager.getOwnerEmail()}"
            tvDeviceId.text = "Device ID: ${keystoreManager.getDeviceId()}"

            if (isEnabled) {
                tvStatusBadge.text = "RECOVERY ACTIVE"
                tvStatusBadge.setBackgroundResource(R.drawable.bg_badge_active)
            } else {
                tvStatusBadge.text = "RECOVERY PAUSED BY OWNER"
                tvStatusBadge.setBackgroundResource(R.drawable.bg_badge_paused)
            }
        } else {
            btnRegister.visibility = View.VISIBLE
            btnUnlink.visibility = View.GONE
            switchRecovery.isEnabled = false
            switchRecovery.isChecked = false

            tvOwnerInfo.text = "Device not paired with an owner account."
            tvDeviceId.text = "Device ID: Unregistered"
            tvStatusBadge.text = "NOT REGISTERED"
            tvStatusBadge.setBackgroundResource(R.drawable.bg_badge_unlinked)
        }
    }

    private fun checkLocationPermissions(): Boolean {
        val fineGranted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val notificationGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else true

        return fineGranted && notificationGranted
    }

    private fun showLocationDisclosureAndRequest() {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.location_disclosure_title))
            .setMessage(getString(R.string.location_disclosure_body))
            .setPositiveButton("Continue & Allow") { _, _ ->
                val perms = mutableListOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    perms.add(Manifest.permission.POST_NOTIFICATIONS)
                }
                permissionLauncher.launch(perms.toTypedArray())
            }
            .setNegativeButton("Deny", null)
            .show()
    }

    private fun checkBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                AlertDialog.Builder(this)
                    .setTitle("Battery Optimization Notice")
                    .setMessage(
                        "To ensure location recovery functions reliably when your phone is lost, " +
                        "allow BD Location Assist to run without background battery restrictions."
                    )
                    .setPositiveButton("Adjust Settings") { _, _ ->
                        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                            data = Uri.parse("package:$packageName")
                        }
                        try {
                            startActivity(intent)
                        } catch (e: Exception) {
                            // Fallback to battery saver settings
                            startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
                        }
                    }
                    .setNegativeButton("Later", null)
                    .show()
            }
        }
    }

    private fun showUnlinkConfirmationDialog() {
        AlertDialog.Builder(this)
            .setTitle("Unlink Device?")
            .setMessage(getString(R.string.unlink_warning))
            .setPositiveButton("Confirm Unlink") { _, _ ->
                stopRecoveryService()
                keystoreManager.clearCredentials()
                Toast.makeText(this, "Device unlinked. Recovery credentials wiped.", Toast.LENGTH_LONG).show()
                updateUI()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun startRecoveryService() {
        if (!checkLocationPermissions()) {
            Toast.makeText(this, "Please grant location permissions first.", Toast.LENGTH_SHORT).show()
            return
        }
        val serviceIntent = Intent(this, RecoveryForegroundService::class.java).apply {
            action = RecoveryForegroundService.ACTION_START_RECOVERY
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    private fun stopRecoveryService() {
        val serviceIntent = Intent(this, RecoveryForegroundService::class.java).apply {
            action = RecoveryForegroundService.ACTION_STOP_RECOVERY
        }
        startService(serviceIntent)
    }
}
