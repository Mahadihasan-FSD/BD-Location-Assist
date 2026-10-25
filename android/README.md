# BD Location Assist - Native Android Lost-Phone Recovery Module

Native Kotlin application enabling verified owners to locate, ring, and secure their registered Android devices.

## Architectural Overview & Non-Stealth Design
- **Authenticated Device Registration**: Devices can only be enrolled after authenticated account pairing.
- **Android 14+ Foreground Service**: Uses `FOREGROUND_SERVICE_LOCATION` with a persistent status notification (`BDLocationAssistApp.CHANNEL_RECOVERY_SERVICE`).
- **Hardware-Backed Keystore**: Secure credentials stored via `EncryptedSharedPreferences` and MasterKey AES256-GCM.
- **Tamper-Resistant Signatures**: HMAC-SHA256 request headers guarantee payload authenticity.
- **Immediate Revocation**: Unlinking a device on the Web Console sends a revocation signal that invalidates local Keystore secrets and halts tracking.

## Android Permissions
- `ACCESS_FINE_LOCATION`: GNSS / GPS satellite positioning.
- `ACCESS_COARSE_LOCATION`: Cell tower and Wi-Fi triangulation fallback.
- `FOREGROUND_SERVICE_LOCATION`: Android 14 (API 34+) compliant foreground service execution.
- `POST_NOTIFICATIONS`: Android 13+ runtime notification requirement.
- `RECEIVE_BOOT_COMPLETED`: Resumes recovery monitoring upon phone restart if enabled.

## Google Play Console Policy Checklist
1. **Location in the Background**: Because BD Location Assist employs a continuous, non-dismissible Foreground Service with explicit notification, it complies with Google Play Foreground Service Location declarations without requiring hidden background access (`ACCESS_BACKGROUND_LOCATION`).
2. **Prominent In-App Disclosure**: Displayed prior to triggering system runtime location prompts.
3. **Anti-Stalkerware Declaration**: Prohibits covert monitoring; includes on-device controls to pause recovery or unlink at any time.
