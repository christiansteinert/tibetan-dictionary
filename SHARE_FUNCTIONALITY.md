# Android Share Text Functionality

## Overview

This implementation adds the ability for the Tibetan Dictionary Android app to receive shared text from other applications. When users share text from any app on Android, they will see two separate sharing options: "Tibetan -> English" and "English -> Tibetan".

## Features

- **Separate Share Targets**: Two distinct sharing options in Android's share menu
- **No Auto-Detection**: The language direction is determined by user choice, not automatic text analysis
- **Immediate Text Clearing**: Shared text is cleared automatically after being read to prevent re-processing
- **Language Specification**: The plugin provides both the shared text and the selected language direction
- **Clean Integration**: Seamlessly integrates with existing Cordova application architecture

## Implementation Details

### Android Components

1. **Activity Aliases** (`plugin.xml`):
   ```xml
   <activity-alias android:name=".ShareTibetanActivity"
                  android:targetActivity="MainActivity"
                  android:exported="true"
                  android:label="Tibetan -> English">
       <intent-filter android:label="Tibetan -> English">
           <action android:name="android.intent.action.SEND" />
           <category android:name="android.intent.category.DEFAULT" />
           <data android:mimeType="text/plain" />
       </intent-filter>
       <meta-data android:name="searchLanguage" android:value="tib" />
   </activity-alias>
   <activity-alias android:name=".ShareEnglishActivity"
                  android:targetActivity="MainActivity"
                  android:exported="true"
                  android:label="English -> Tibetan">
       <intent-filter android:label="English -> Tibetan">
           <action android:name="android.intent.action.SEND" />
           <category android:name="android.intent.category.DEFAULT" />
           <data android:mimeType="text/plain" />
       </intent-filter>
       <meta-data android:name="searchLanguage" android:value="en" />
   </activity-alias>
   ```

2. **ShareTextPlugin.java**: Cordova plugin that handles incoming share intents
   - Detects which activity alias was used based on component name
   - Extracts shared text from Android Intent
   - Returns JSON object with both text and language: `{text: string, language: string}`
   - Automatically clears shared text after reading to prevent re-processing
   - Handles error cases gracefully

3. **Cordova Configuration**: Plugin properly registered in `config.xml` and `res/xml/config.xml`

### JavaScript Components

1. **ShareTextPlugin.js**: JavaScript interface for the native plugin
   - `getSharedText()`: Retrieves shared text and language from native layer
   - No `clearSharedText()` function needed (handled automatically in Java)

2. **Enhanced main.js**: Simplified shared text workflow
   - `handleSharedText()`: Called on app startup to check for shared text
   - Removed `showShareSearchOptions()`: No more auto-detection logic
   - `searchSharedText()`: Creates proper hash URL for dictionary navigation using provided language

### Language Handling

The app no longer attempts to detect the language of shared text. Instead:

- **User Choice**: Language direction is determined by which sharing option the user selects
- **"Tibetan -> English"**: Text is treated as Tibetan/Wylie input (`inputLang: "tib"`)
- **"English -> Tibetan"**: Text is treated as English input (`inputLang: "en"`)

### Hash URL Format

Generated hash URLs follow the expected format:

**For Tibetan -> English search:**
```json
{
  "activeTerm": "<TERM>",
  "lang": "tib",
  "inputLang": "tib", 
  "currentListTerm": "<TERM>",
  "forceLeftSideVisible": false,
  "offset": 0
}
```

**For English -> Tibetan search:**
```json
{
  "activeTerm": "<TERM>",
  "lang": "tib",
  "inputLang": "en",
  "currentListTerm": "<TERM>", 
  "forceLeftSideVisible": true,
  "offset": 0
}
```

## Testing the Functionality

### Prerequisites
- Android device or emulator with API level 24+
- Built and installed Tibetan Dictionary APK with share functionality

### Test Scenarios

1. **Share Any Text for Tibetan Search**:
   - Open any app with text (e.g., browser, notes)
   - Select any text
   - Tap "Share" → Choose "Tibetan -> English"
   - App should open and search the text as Tibetan input

2. **Share Any Text for English Search**:
   - Select any text from any app
   - Share → "English -> Tibetan"
   - App should open and search the text as English input

3. **Multiple Options Available**:
   - Both "Tibetan -> English" and "English -> Tibetan" should appear in the share menu
   - Each option should work correctly regardless of the actual text content

### Expected Behavior

1. When sharing text, both "Tibetan -> English" and "English -> Tibetan" appear in the share menu
2. Selecting either option opens the Tibetan Dictionary app
3. The app automatically navigates to search results using the selected language direction
4. The sidebar visibility depends on the selected option (visible for English searches)
5. No language detection occurs - user choice determines search behavior

## Build Integration

The implementation includes modifications to `buildAndroid.sh`:

```bash
# Copy the share text plugin Java class
mkdir -p mobile/tibetandict/platforms/android/app/src/main/java/de/christian_steinert/tibetandict/
cp mobile/tibetandict/plugins/share-text-plugin/src/android/ShareTextPlugin.java mobile/tibetandict/platforms/android/app/src/main/java/de/christian_steinert/tibetandict/
```

This ensures the plugin is properly included in both public and private builds.

## File Structure

```
_build/mobile/tibetandict/plugins/share-text-plugin/
├── plugin.xml                 # Plugin configuration with activity aliases
├── package.json              # NPM package metadata
├── src/android/
│   └── ShareTextPlugin.java  # Native Android implementation
└── www/
    └── ShareTextPlugin.js    # JavaScript interface

webapp/
├── ShareTextPlugin.js        # Plugin JS copied for web builds
├── index.html               # Updated to include plugin
└── code/js/dict/main.js     # Enhanced with share handling
```

## Troubleshooting

- **App doesn't appear in share menu**: Check that activity aliases are properly added to AndroidManifest.xml
- **Only one option appears**: Verify both activity aliases have unique names and labels
- **Share doesn't work**: Verify ShareTextPlugin.java is compiled and plugin is registered in config.xml
- **Navigation issues**: Check that hash URL format matches expected structure in main.js

## Changes from Previous Version

1. **Removed auto-detection**: No longer attempts to detect whether text is Tibetan or English
2. **Separate share targets**: Two distinct options in the Android share menu
3. **Automatic text clearing**: Shared text is cleared immediately when read, eliminating the need for `clearSharedText()`
4. **Language in response**: Plugin now returns both text and language preference
5. **Simplified workflow**: Removed `showShareSearchOptions()` function and associated logic