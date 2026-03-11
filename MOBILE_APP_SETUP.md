# Thrifty Curator Mobile App Setup Guide

This guide will help you build and deploy your Thrifty Curator app for iOS and Android with push notifications.

## Overview

Your app is configured with:
- **Capacitor** - Wraps your web app in a native shell
- **Firebase Admin SDK** - Push notifications for Android & iOS
- **Apple Push Notification Service (APNs)** - iOS push notifications via FCM

## ✅ Firebase Setup - COMPLETED!

Your Firebase credentials are already configured:
- Project: `thrifty-curator`
- Credentials file: `/app/backend/firebase-credentials.json`

---

## Step 1: Add Apps in Firebase Console

### Add Android App
1. Go to [Firebase Console](https://console.firebase.google.com) → Your project
2. Click **"Add app"** → Select **Android** icon
3. Enter:
   - Package name: `com.thriftycurator.app`
   - App nickname: `Thrifty Curator`
4. Click **Register app**
5. Download `google-services.json` (save it for later)
6. Skip the remaining steps, click **Continue to console**

### Add iOS App
1. Click **"Add app"** → Select **iOS** icon  
2. Enter:
   - Bundle ID: `com.thriftycurator.app`
   - App nickname: `Thrifty Curator`
3. Click **Register app**
4. Download `GoogleService-Info.plist` (save it for later)
5. Skip the remaining steps, click **Continue to console**

---

## Step 2: Apple Developer Setup ($99/year)

1. Go to [Apple Developer](https://developer.apple.com)
2. Enroll in the Apple Developer Program ($99/year)
3. Once approved (can take 24-48 hours):

### Create App ID
1. Go to **Certificates, Identifiers & Profiles**
2. Click **Identifiers** → **+** button
3. Select **App IDs** → **App**
4. Description: `Thrifty Curator`
5. Bundle ID (Explicit): `com.thriftycurator.app`
6. Enable **Push Notifications** capability
7. Click **Register**

### Create APNs Key (for Firebase)
1. Go to **Keys** → **+** button
2. Name: `Thrifty Curator Push`
3. Enable **Apple Push Notifications service (APNs)**
4. Click **Continue** → **Register**
5. Download the `.p8` key file (save it securely!)
6. Note the **Key ID**
7. Note your **Team ID** (found in top right of developer portal)

### Upload APNs Key to Firebase
1. In Firebase Console → Project settings → Cloud Messaging
2. Under "Apple app configuration", click **Upload**
3. Upload your `.p8` file
4. Enter your Key ID and Team ID
5. Save

---

## Step 3: Build the Mobile Apps

### Prerequisites
- Node.js 18+ installed
- Xcode (for iOS) - Mac only
- Android Studio (for Android)

### Build Commands

```bash
# Navigate to frontend
cd /app/frontend

# Build the web app
yarn build

# Add native platforms
npx cap add android
npx cap add ios

# Copy web assets to native projects
npx cap sync
```

### For Android

1. Open in Android Studio:
   ```bash
   npx cap open android
   ```

2. Copy `google-services.json` to `android/app/`

3. Build APK/AAB:
   - Build → Generate Signed Bundle/APK
   - Follow wizard to create signing key
   - Build release version

### For iOS (Mac only)

1. Open in Xcode:
   ```bash
   npx cap open ios
   ```

2. Copy `GoogleService-Info.plist` to the App folder in Xcode

3. Configure signing:
   - Select your Team
   - Set Bundle Identifier: `com.thriftycurator.app`

4. Build archive:
   - Product → Archive
   - Distribute to App Store or TestFlight

---

## Step 4: App Store Submission

### Google Play Store ($25 one-time)
1. Create account at [Google Play Console](https://play.google.com/console)
2. Pay $25 registration fee
3. Create new app → Upload AAB file
4. Complete store listing, content rating, pricing
5. Submit for review (usually 1-3 days)

### Apple App Store ($99/year - included in developer account)
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app
3. Upload build from Xcode
4. Complete app information, screenshots
5. Submit for review (usually 1-7 days)

---

## Push Notification Events

Your app will send push notifications for:

| Event | Title | When |
|-------|-------|------|
| Clock In | "Employee Clocked In" | Employee starts shift |
| Clock Out | "Employee Clocked Out" | Employee ends shift |
| W-9 Submitted | "W-9 Submitted" | Employee uploads W-9 |
| Job Application | "New Job Application" | New job applicant |
| Consignment Inquiry | "Consignment Inquiry" | New inquiry |
| Consignment Agreement | "New Consignment Agreement" | Agreement signed |
| Payment Change | "Payment Method Updated" | Client updates payment |
| Items Added | "Items Added" | Client adds items |
| New Message | "New Message" | New contact message |

---

## Testing Push Notifications

Once Firebase is configured, you can test from the admin dashboard:

1. Login to admin
2. Go to browser console
3. Call: `await fetch('/api/push/test', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Test', body: 'Hello!' }) })`

Or use Firebase Console → Cloud Messaging → Send test message

---

## Troubleshooting

### Push notifications not working?
1. Check `FIREBASE_SERVER_KEY` is set in backend `.env`
2. Verify device token is registered (`/api/push/status`)
3. Check Firebase Console for delivery reports

### iOS notifications not appearing?
1. Ensure APNs key is uploaded to Firebase
2. Check app has notification permissions
3. Verify Bundle ID matches exactly

### Android notifications not appearing?
1. Check `google-services.json` is in `android/app/`
2. Ensure app is not in battery saver mode
3. Check notification channel settings

---

## Files Reference

| File | Purpose |
|------|---------|
| `/app/frontend/capacitor.config.json` | Capacitor configuration |
| `/app/frontend/src/hooks/usePushNotifications.js` | Push notification hook |
| `/app/backend/app/services/push_notifications.py` | FCM service |
| `/app/backend/app/routers/push_notifications.py` | API endpoints |
| `/app/backend/app/services/notification_helper.py` | Notification creation helpers |

---

## Need Help?

If you get stuck on any step, share where you are and I can help troubleshoot!
