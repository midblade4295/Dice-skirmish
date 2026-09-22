# Dice Skirmish

HTML game plus Android app bundle for Google Play.

You do **not** need Android Studio.

## Get an `.aab` for Play Console

1. Open https://github.com/midblade4295/Dice-skirmish/actions
2. Click **Build Play Store AAB**
3. Click **Run workflow** → **Run workflow**
4. When it finishes, open the run → **Artifacts**
5. Download **dice-skirmish-play-aab** — that zip contains `app-release.aab`
6. In Google Play Console → your app → **Production** or **Testing** → **Create release** → upload the `.aab`

Also download **dice-skirmish-upload-keystore** and keep it. Play needs the same key for every future update.

Package name: `com.diceskirmish.game`

## Web game

`dice-skirmish-91-5.html`
