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
  - **`screens/`**: Container views for navigation (`LibraryScreen`, `PlayerScreen`, `SettingsScreen`, `WatchedScreen`).
  - **`components/`**: Modular logic and UI pieces (`VideoPlayer`, `NotePanel`, `TranscriptionPanel`).
  - **`utils/`**: Helper methods like `srtParser.js` for custom logic.
- **Data Persistence Strategy**
  - All local data utilizes `AsyncStorage`.
  - Keys used: `video_folder` (selected directory), `video_order` (custom dragged library sorting), `notes_[video_id]` (for markdown notes), `transcript_[video_id]` (saved subtitles), and `watched_videos` (history).
- **Styling**
  - **Dark Mode Only**: Background `#000000`, Surface `#0F0F0F`, Cards `#1A1A1A`, Borders `#2A2A2A`.
  - **Accents**: Primary `#E63946` (Red), Secondary `#4DA8DA` (Blue).
  - Component Sizing: Video player `aspectRatio: 16/9`, max content width `maxWidth: 800`.
- **Platform Specifics**
  - **Background Playback**: Background audio operates via `Audio.setAudioModeAsync({ staysActiveInBackground: true })` masked by an absolute overlay overlay instead of unmounting the `<Video>` player (which crashes `expo-av` internally). 
  - **Layout Constraints**: The application uses a single root `<GestureHandlerRootView>` defined in `App.js`. Ensure nested components do not inject duplicate root providers (e.g. `SafeAreaProvider` or Gesture Handlers) avoiding overlap glitches.

## Guidelines for AI Agents
- **Prefer Expo Libraries:** If a new system feature is needed, look for the corresponding `expo-*` SDK package first before turning to 3rd-party React Native libraries.
- **File modifications:** If implementing UI changes, adhere strictly to the dark theme color palette. 
- **Dependencies:** Never add a dependency without running it through `npx expo install <package>` first to ensure SDK version compatibility.
