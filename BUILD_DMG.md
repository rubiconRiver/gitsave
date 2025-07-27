# Building GitSave DMG

## Prerequisites
1. Create an icon file at `assets/icon.png` (512x512 recommended)
2. Convert to .icns format:
   ```bash
   # Install iconutil if needed
   # Create iconset
   mkdir MyIcon.iconset
   sips -z 16 16     icon.png --out MyIcon.iconset/icon_16x16.png
   sips -z 32 32     icon.png --out MyIcon.iconset/icon_16x16@2x.png
   sips -z 32 32     icon.png --out MyIcon.iconset/icon_32x32.png
   sips -z 64 64     icon.png --out MyIcon.iconset/icon_32x32@2x.png
   sips -z 128 128   icon.png --out MyIcon.iconset/icon_128x128.png
   sips -z 256 256   icon.png --out MyIcon.iconset/icon_128x128@2x.png
   sips -z 256 256   icon.png --out MyIcon.iconset/icon_256x256.png
   sips -z 512 512   icon.png --out MyIcon.iconset/icon_256x256@2x.png
   sips -z 512 512   icon.png --out MyIcon.iconset/icon_512x512.png
   iconutil -c icns MyIcon.iconset -o assets/icon.icns
   rm -rf MyIcon.iconset
   ```

## Build DMG
```bash
npm run dist:mac
```

The DMG will be in `dist-app/GitSave-1.0.0-arm64.dmg` (or x64 for Intel)

## For Your Friend

Since the app isn't code signed, your friend will need to:

1. Download the DMG
2. Open it and drag GitSave to Applications
3. **First time only**: 
   - Right-click (or Control-click) on GitSave in Applications
   - Select "Open" from the menu
   - Click "Open" in the dialog that appears
   - After this, it will open normally

## To Avoid This (Requires Apple Developer Account - $99/year)

1. Get an Apple Developer account
2. Create a Developer ID certificate
3. Add to package.json:
   ```json
   "mac": {
     "identity": "Developer ID Application: Your Name (TEAMID)",
     "notarize": {
       "teamId": "TEAMID"
     }
   }
   ```

## Quick Alternative - ZIP file

Instead of DMG, you can just zip the app:
```bash
npm run dist:mac
cd dist-app/mac
zip -r GitSave.zip GitSave.app
```

Your friend still needs to right-click → Open the first time, but no DMG mounting.