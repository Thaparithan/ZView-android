# Z Scan: PDF Maker — Native Android Document Scanner & PDF Creator

**Z Scan: PDF Maker** (short launcher label: `Z Scan`, package ID: `com.zynor.zview`) is a privacy-focused, offline-first native Android document scanner and multi-page PDF creator built with **Kotlin**, **Jetpack Compose**, **Material 3**, **CameraX**, **ML Kit Document Scanner**, **Room**, **DataStore**, **Android `PdfDocument`**, and **Android `PdfRenderer`**.

## Brand Palette & Theme Modes
- **Jet Black**: `#0A0A0A` (Primary Dark Mode background)
- **Cerulean Blue**: `#007BA7` (Primary actions, navigation highlights, scanner controls)
- **Neon Rose**: `#FF2D95` (Selected accents, active scan reticles, highlights)
- **Complete Theme System**: Supports **System Default**, **Light Mode** (clean light surfaces with dark high-contrast text), and **Dark Mode** (`#0A0A0A` Jet Black canvas), persisted via Jetpack DataStore (`SettingsRepository`).

## Core Capabilities
1. **Home Screen**: Official **Z Scan: PDF Maker** brand identity, **Scan Document** CTA, **Import Images** via Android Photo Picker, **Recent Documents** backed by Room metadata with real page thumbnails, and empty-state guidance.
2. **In-App Multi-Page PDF Viewer (`DocumentPreviewScreen.kt` + `PdfPageRenderer.kt`)**:
   - Renders actual PDF pages using Android's `android.graphics.pdf.PdfRenderer` from both filesystem paths and `content://` / `file://` URIs.
   - Supports multi-page vertical scrolling, interactive page thumbnail strip, pinch-to-zoom and zoom buttons, loading/empty/error states, and deterministic `ParcelFileDescriptor` + `PdfRenderer` cleanup via `DisposableEffect` when the viewer closes.
3. **Document Scanner & Multi-Page Editor**:
   - Requests `android.permission.CAMERA` strictly when scanning starts.
   - Supports both custom **CameraX** live preview capture and **ML Kit Document Scanner** for automatic edge/corner detection and manual corner cropping.
   - Non-destructive background image processing (`Dispatchers.Default`) supporting **Original Color**, **Grayscale**, **Black and White**, and **Document Enhancement**, plus 90° rotation, crop, brightness, and contrast adjustments.
4. **PDF Creation & Export**:
   - Offline multi-page PDF generation using Android's `android.graphics.pdf.PdfDocument` (`A4`, `US Letter`, `US Legal`, and `Fit to Scan Aspect`).
   - Strict filename validation (`FilenameValidator`) and overwrite protection.
   - Export via **Android Storage Access Framework (SAF)** and secure sharing via **Android Sharesheet + `FileProvider`**.
5. **Settings & Personal Review & Feedback**:
   - **Appearance & Theme Mode**: Instant switching between **System Default**, **Light Mode**, and **Dark Mode**.
   - **Personal Review & Feedback**: Opens `https://zynor-view.web.app/` in a secure HTTPS **Custom Tab** (or default browser fallback + clipboard copy option).

## Setup, Build, and Debug APK Instructions

### Prerequisites
- **Android Studio Ladybug (2024.2.1)** or newer
- **JDK 17**
- **Android SDK 35** (minSdk 26, targetSdk 35)

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
