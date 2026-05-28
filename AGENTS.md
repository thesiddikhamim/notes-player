# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing any code.

# VideoNotePlayer Agent Instructions

## Project Overview
A React Native + Expo mobile application for playing local videos, taking markdown-formatted notes, and viewing synchronized SRT/VTT transcripts.

## Tech Stack
- **Framework:** React Native + Expo
- **Navigation:** `@react-navigation/native-stack` (Dark theme focused)
- **Media & Playback:** `expo-av` (Video player and background Audio playback)
- **File & Storage:** `@react-native-async-storage/async-storage`, `expo-file-system`, `expo-document-picker`
- **UI Libraries:** `react-native-markdown-display`, `react-native-draggable-flatlist`

## Common Commands
- **Start bundler:** `npx expo start`
- **Linting:** `npx expo lint`
- **Check Bundling:** `npx expo export`
- **EAS Build (Android):** `eas build --platform android`

## Architecture & Conventions
- **Component Boundaries (`src/`)**
  - **`screens/`**: Container views for navigation (`LibraryScreen`, `PlayerScreen`, `SettingsScreen`).
  - **`components/`**: Modular logic and UI pieces (`VideoPlayer`, `NotePanel`, `TranscriptionPanel`).
  - **`utils/`**: Helper methods like `srtParser.js` for custom logic.
- **Data Persistence Strategy**
  - All local data utilizes `AsyncStorage`.
  - Keys used: `video_folder` (selected directory), `video_order` (custom dragged library sorting), and `notes_[video_id]` (for markdown notes).
- **Styling**
  - **Dark Mode Only**: Background `#0d0d0d`, Surface `#1a1a1a`, Accent `#4CAF50`. Do not implement light mode variants.
- **Platform Specifics**
  - **Background Playback**: Background audio is enabled via `Audio.setAudioModeAsync({ staysActiveInBackground: true })`. For Android, this relies on `FOREGROUND_SERVICE` and `WAKE_LOCK` defined in `app.json`. Ensure `expo-keep-awake` dictates the screen-off playback status.

## Guidelines for AI Agents
- **Prefer Expo Libraries:** If a new system feature is needed, look for the corresponding `expo-*` SDK package first before turning to 3rd-party React Native libraries.
- **File modifications:** If implementing UI changes, adhere strictly to the dark theme color palette. 
- **Dependencies:** Never add a dependency without running it through `npx expo install <package>` first to ensure SDK version compatibility.
