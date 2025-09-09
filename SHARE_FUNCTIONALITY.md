# Android Share Text Functionality

## Overview

This implementation adds the ability for the Tibetan Dictionary Android app to receive shared text from other applications. When users share text from any app on Android, they will see "Search in Tibetan Dictionary" as an option.

## Features

- **Intent Filter Registration**: The app registers itself as a target for `ACTION_SEND` intents with `text/plain` MIME type
- **Automatic Language Detection**: Intelligently detects whether shared text is Tibetan/Wylie or English
- **URL Hash Navigation**: Automatically constructs the correct hash URL format for dictionary searches
- **Clean Integration**: Seamlessly integrates with existing Cordova application architecture

## Implementation Details

### Android Components

1. **Intent Filter** (`AndroidManifest.xml`):
   ```xml
   <intent-filter android:label="Search in Tibetan Dictionary">
       <action android:name="android.intent.action.SEND" />
       <category android:name="android.intent.category.DEFAULT" />
       <data android:mimeType="text/plain" />
   </intent-filter>
   ```

2. **ShareTextPlugin.java**: Cordova plugin that handles incoming share intents
   - Extracts shared text from Android Intent
   - Provides JavaScript interface via `cordova.exec()`
   - Handles error cases gracefully

3. **Cordova Configuration**: Plugin properly registered in `config.xml` and `res/xml/config.xml`

### JavaScript Components

1. **ShareTextPlugin.js**: JavaScript interface for the native plugin
   - `getSharedText()`: Retrieves shared text from native layer
   - `clearSharedText()`: Clears processed text to prevent re-processing

2. **Enhanced main.js**: Added functions to handle shared text workflow
   - `handleSharedText()`: Called on app startup to check for shared text
   - `showShareSearchOptions()`: Detects language and chooses search type
   - `searchSharedText()`: Creates proper hash URL for dictionary navigation

### Language Detection Logic

The app uses a conservative approach to detect text language:

- **Tibetan Unicode**: Checks for Tibetan Unicode characters (U+0F00-U+0FFF)
- **Wylie Transliteration**: Looks for distinctive patterns:
  - Common Tibetan terms: `sngags`, `rdzogs`, `byang`, `phyogs`, etc.
  - Tibetan consonant clusters: `tsh`, `dz`, `zh`
  - Syllable patterns typical of Tibetan transliteration
- **English**: Default fallback for ambiguous cases

### Hash URL Format

Generated hash URLs follow the expected format from the issue:

**For Tibetan text:**
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

**For English text:**
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

1. **Share Tibetan Unicode Text**:
   - Open any app with Tibetan text (e.g., browser, notes)
   - Select Tibetan text like "རིན་པོ་ཆེ།"
   - Tap "Share" → Choose "Search in Tibetan Dictionary"
   - App should open and search as Tibetan term

2. **Share Wylie Text**:
   - Select text like "byang chub" or "rdzogs chen"
   - Share → "Search in Tibetan Dictionary"
   - Should be detected as Tibetan and searched accordingly

3. **Share English Text**:
   - Select English text like "enlightenment" or "meditation"
   - Share → "Search in Tibetan Dictionary"
   - Should be detected as English and search English→Tibetan

4. **Share Mixed/Ambiguous Text**:
   - Text that could be either language
   - Should default to English search (conservative approach)

### Expected Behavior

1. When sharing text, "Search in Tibetan Dictionary" appears in the share menu
2. Selecting it opens the Tibetan Dictionary app
3. The app automatically navigates to search results for the shared text
4. The sidebar visibility and search direction depend on detected language
5. No manual language selection required (auto-detection)

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
├── plugin.xml                 # Plugin configuration
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

- **App doesn't appear in share menu**: Check that intent filter is properly added to AndroidManifest.xml
- **Share doesn't work**: Verify ShareTextPlugin.java is compiled and plugin is registered in config.xml
- **Wrong language detection**: Review the text patterns - may need refinement of detection logic
- **Navigation issues**: Check that hash URL format matches expected structure in main.js

## Future Enhancements

- Manual language selection dialog for ambiguous text
- Support for multiple share entries (separate Tibetan/English options)
- Improved Wylie detection patterns
- Share history or recent shared terms
- Custom share result formatting