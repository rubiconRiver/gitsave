# Code Signing Setup for Intentional

## Prerequisites
1. Apple Developer Account ($99/year)
2. Developer ID Application certificate installed in Keychain

## Find Your Identity
```bash
  
```
Look for "Developer ID Application: Your Name (TEAMID)"

## Update package.json
Add to the "mac" section:
```json
"identity": "Developer ID Application: Your Name (TEAMID)",
"notarize": {
  "teamId": "YOUR_TEAM_ID"
}
```

## Environment Variables for Notarization
Create `.env` file:
```
APPLE_ID=your.apple.id@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=YOURTEAMID
```

To generate app-specific password:
1. Go to https://appleid.apple.com/account/manage
2. Sign in → Security → App-Specific Passwords
3. Generate one for "Intentional"

## Build Signed & Notarized DMG
```bash
npm run dist:mac
```

## The app will be:
- Code signed with your Developer ID
- Notarized by Apple (takes 5-10 minutes)
- Ready to distribute without any security warnings!

Your users can download and run immediately - no right-click workarounds needed.
