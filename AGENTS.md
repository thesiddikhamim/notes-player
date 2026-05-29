# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing any code.

# VideoNotePlayer Agent Instructions

## Project Overview
A React Native + Expo mobile application for playing local videos, taking markdown-formatted notes, and viewing synchronized SRT/VTT transcripts.

## Tech Stack
- **Framework:** React Native + Expo (SDK 55)
- **Navigation:** `@react-navigation/native-stack` + `@react-navigation/bottom-tabs` (Dark theme focused)
- **Media & Playback:** `expo-av` (Video player and background Audio playback)
- **File & Storage:** `@react-native-async-storage/async-storage`, `expo-file-system` (legacy import path), `expo-document-picker`
- **UI Libraries:** `react-native-markdown-display`, `react-native-draggable-flatlist`, `expo-video-thumbnails`

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
  - Keys used: `video_folder` (selected SAF directory URI), `added_videos` (URIs of individually picked videos persisted under `documentDirectory/videos/`), `video_order` (custom dragged library sorting), `notes_[video_id]` (markdown notes), `transcript_[video_id]` (saved subtitles), `watched_videos` (history).
- **File-System APIs**
  - Import from `expo-file-system/legacy` for `documentDirectory`, `getInfoAsync`, `copyAsync`, `readDirectoryAsync`, and `StorageAccessFramework.*`. The new modular `expo-file-system` API is not used in this project.
  - Persistent app storage lives under `FileSystem.documentDirectory`. Picked videos are stored in `documentDirectory/videos/`.
- **Styling**
  - **Dark Mode Only**: Background `#000000`, Surface `#0F0F0F`, Cards `#1A1A1A`, Borders `#2A2A2A`.
  - **Accents**: Primary `#E63946` (Red), Secondary `#4DA8DA` (Blue).
  - Component Sizing: Video player `aspectRatio: 16/9`, max content width `maxWidth: 800`.
- **Platform Specifics**
  - **Background Playback**: Background audio operates via `Audio.setAudioModeAsync({ staysActiveInBackground: true })` masked by an absolute overlay instead of unmounting the `<Video>` player (which crashes `expo-av` internally).
  - **Layout Constraints**: The application uses a single root `<GestureHandlerRootView>` defined in `App.js`. Ensure nested components do not inject duplicate root providers (e.g. `SafeAreaProvider` or Gesture Handlers) avoiding overlap glitches.

## Storage & Picker Rules (must follow)
- **Never persist URIs from the cache directory.** `DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })` returns a path under the OS cache, which Android may wipe at any time (after reboot, low storage, etc). After picking, always `FileSystem.copyAsync` the file into `documentDirectory/videos/` and persist that URI in `added_videos`.
- **Prune stale `file://` URIs on load.** When reading `added_videos`, `getInfoAsync` each `file://` entry and drop the ones that no longer exist. Leave `content://` SAF URIs untouched.
- **Folder access uses SAF.** Folder URIs from `StorageAccessFramework.requestDirectoryPermissionsAsync()` start with `content://` and must be read via `StorageAccessFramework.readDirectoryAsync`. Plain `file://` folder paths fall through to `FileSystem.readDirectoryAsync`.

## Thumbnail & List Rendering Rules (must follow)
- **Never call `VideoThumbnails.getThumbnailAsync` for every video at once.** Doing `Promise.all(videos.map(getThumbnailAsync))` overwhelms the native thumbnail decoder when folders are large and can leave the entire list unrendered.
- **Render the list first, then fill thumbnails progressively** with a bounded concurrency (currently `THUMB_CONCURRENCY = 3` per screen). Update items by id as each thumbnail resolves.
- **Guard async updates with a `loadIdRef`** so that a re-entry of `loadVideos` (e.g. on tab focus) cancels stale `setVideos` calls from the previous run.

## Guidelines for AI Agents
- **Prefer Expo Libraries:** If a new system feature is needed, look for the corresponding `expo-*` SDK package first before turning to 3rd-party React Native libraries.
- **File modifications:** If implementing UI changes, adhere strictly to the dark theme color palette.
- **Dependencies:** Never add a dependency without running it through `npx expo install <package>` first to ensure SDK version compatibility.
