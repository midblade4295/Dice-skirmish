# Dice Skirmish

HTML game plus Android WebView app.

- Game file: `dice-skirmish-91-5.html`
- Android project: `android/`
- Package: `com.diceskirmish.game`

## Play on the web

Open `dice-skirmish-91-5.html` in a browser.

## Build the Android APK

1. Copy the game HTML into the app assets:
   ```bash
   cp dice-skirmish-91-5.html android/app/src/main/assets/index.html
   ```
2. Open the `android` folder in Android Studio.
3. Let Gradle sync, then Run on a device or emulator.

Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
