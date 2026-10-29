# ZView — Native Android Document Scanner & PDF Creator

ZView is a modern, privacy-focused, offline-first native Android document scanner and multi-page PDF creator built with **Kotlin**, **Jetpack Compose**, **Material 3**, **CameraX**, **ML Kit Document Scanner**, **Room**, **DataStore**, and **Android `PdfDocument`**.

## Brand Palette
- **Jet Black**: `#0A0A0A` (Primary background)
- **Cerulean Blue**: `#007BA7` (Primary actions, navigation highlights, scanner controls)
- **Neon Rose**: `#FF2D95` (Selected accents, active scan reticles, highlights)
- **White**: `#FFFFFF` (Primary headings and content)
- **Secondary Text**: `#B8B8C2`
- **Dark Surface**: `#17171C`
- **Elevated Surface**: `#22222A`
- **Divider**: `#34343D`
- **Error**: `#FF5252`
- **Success**: `#4CAF50`

## Core Capabilities
1. **Home Screen**: ZView brand identity, Scan Document CTA, Import Images via Android Photo Picker, Recent Documents backed by Room metadata, and empty-state guidance.
2. **Document Scanner & Multi-Page Editor**:
   - Requests `android.permission.CAMERA` strictly when scanning starts.
   - Supports both custom **CameraX** live preview capture and **ML Kit Document Scanner** for automatic edge/corner detection and manual corner cropping.
   - Non-destructive background image processing (`Dispatchers.Default`) supporting **Original Color**, **Grayscale**, **Black and White**, and **Document Enhancement**, plus 90° rotation, crop, brightness, and contrast adjustments.
   - Multi-page reordering, rotation, deletion, and recapture.
3. **PDF Creation & Export**:
   - Offline multi-page PDF generation using Android's `android.graphics.pdf.PdfDocument` (`A4`, `US Letter`, `US Legal`, and `Fit to Scan Aspect`).
   - Strict filename validation (`FilenameValidator`) and overwrite protection.
   - Export via **Android Storage Access Framework (SAF)** and secure sharing via **Android Sharesheet + `FileProvider`**.
4. **Document Library & Viewer**:
   - List and Grid views, search by name, sort by Modified Date, Creation Date, or Name.
   - Missing-file detection and recovery.
   - Multi-page Document Preview with pinch-to-zoom, rename, delete confirmation, and PDF share.
5. **Settings & Personal Review & Feedback**:
   - Opens `https://zynor-view.web.app/` in a secure HTTPS **Custom Tab** (or default browser fallback + clipboard copy option).
   - Optional privacy-preserving SAF Cloud/Folder Backup sync.

## Setup, Build, and Debug APK Instructions

### Prerequisites
- **Android Studio Ladybug (2024.2.1)** or newer
- **JDK 17**
- **Android SDK 35** (minSdk 26, targetSdk 35)

### Opening in Android Studio
1. Open Android Studio and select **Open**.
2. Choose the `/android` directory (or extract `zview-android-project.zip` downloaded from the ZView Studio Workbench).
3. Allow Gradle Sync to complete.

### Building & Installing the Debug APK via CLI
From inside the `android/` directory:

```bash
# Build the debug APK
./gradlew assembleDebug

# Expected APK output location:
# app/build/outputs/apk/debug/app-debug.apk

# Install onto a connected Android device or emulator:
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Running Unit & Instrumentation Tests
```bash
# Run local JVM unit tests
./gradlew testDebugUnitTest

# Run instrumented Compose UI tests on a connected device/emulator
./gradlew connectedDebugAndroidTest
```
