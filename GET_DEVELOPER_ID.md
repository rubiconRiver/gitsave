# Getting Developer ID Certificate for Distribution

You currently have: Apple Development certificate (for testing)
You need: Developer ID Application certificate (for distribution)

## Steps to Get Developer ID Certificate

1. **Open Xcode** → Preferences → Accounts
   - Or go to https://developer.apple.com/account/resources/certificates

2. **Create Developer ID Application Certificate**:
   - Click "+" → "Developer ID Application"
   - Follow the steps to create a Certificate Signing Request (CSR)
   - Download and install the certificate

3. **Verify Installation**:
   ```bash
   security find-identity -v -p codesigning
   ```
   You should see something like:
   ```
   "Developer ID Application: Garett Gelsinger (TEAMID)"
   ```

## For Now - Test Build Without Notarization

Update package.json temporarily:
```json
"mac": {
  "identity": "Apple Development: garett.gelsinger@gmail.com (QL2HMQ7Y63)",
  "hardenedRuntime": false,
  "gatekeeperAssess": false,
  ...
}
```

This will create a DMG that:
- Works on YOUR Mac
- Your friend can install with right-click → Open
- Won't have full notarization

## Once You Have Developer ID Certificate

Update package.json:
```json
"mac": {
  "identity": "Developer ID Application: Garett Gelsinger (YOUR_TEAM_ID)",
  "hardenedRuntime": true,
  "notarize": {
    "teamId": "YOUR_TEAM_ID"
  }
}
```

Then the app will install without any warnings!