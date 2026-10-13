# FixIt Salone mobile app

Cross-platform Android/iOS starter built with Expo and React Native. It reuses the existing Express API and PostgreSQL data through the deployed backend; it does not create a second backend.

## Run locally

1. Install Node.js LTS and Expo Go on your phone.
2. In a terminal, run `cd mobile` then `npm install`.
3. Run `npx expo start` and scan the QR code with Expo Go (Android) or the iPhone Camera app.
4. To run on a simulator, use `npm run android` or `npm run ios` with the relevant development tools installed.

## Current starter features

- Customer and provider sign-in / registration using existing API endpoints.
- Provider directory.
- Customer request list and provider incoming-request list.
- API base URL configuration via `app.json` (`expo.extra.apiBaseUrl`).

This is an initial MVP scaffold. Native photo selection/upload, push notifications, quote decision screens, app-store signing, and production QA are follow-up tasks. Do not commit credentials or tokens.
