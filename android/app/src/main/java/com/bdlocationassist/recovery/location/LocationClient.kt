package com.bdlocationassist.recovery.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.os.Looper
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * FusedLocationProviderClient wrapper adhering to modern Google Play location policies.
 * Supports standard power-balanced periodic updates and high-accuracy burst mode on-demand.
 */
class LocationClient(private val context: Context) {

    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    @SuppressLint("MissingPermission")
    suspend fun getLastKnownLocation(): Location? {
        return suspendCancellableCoroutine { continuation ->
            fusedLocationClient.lastLocation
                .addOnSuccessListener { location ->
                    continuation.resume(location)
                }
                .addOnFailureListener {
                    continuation.resume(null)
                }
        }
    }

    /**
     * Obtains continuous location updates flow.
     * @param highAccuracy If true, uses GPS Priority.PRIORITY_HIGH_ACCURACY during active recovery.
     *                     If false, uses balanced power accuracy to preserve battery.
     */
    @SuppressLint("MissingPermission")
    fun getLocationUpdates(highAccuracy: Boolean = false): Flow<Location> = callbackFlow {
        val priority = if (highAccuracy) {
            Priority.PRIORITY_HIGH_ACCURACY
        } else {
            Priority.PRIORITY_BALANCED_POWER_ACCURACY
        }

        val intervalMillis = if (highAccuracy) 10_000L else 60_000L // 10s during alarm/locate, 1min idle
        val minUpdateIntervalMillis = if (highAccuracy) 5_000L else 30_000L

        val locationRequest = LocationRequest.Builder(priority, intervalMillis)
            .setMinUpdateIntervalMillis(minUpdateIntervalMillis)
            .setMaxUpdateDelayMillis(intervalMillis * 2)
            .setWaitForAccurateLocation(highAccuracy)
            .build()

        val locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    trySend(location)
                }
            }
        }

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )

        awaitClose {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
    }
}
