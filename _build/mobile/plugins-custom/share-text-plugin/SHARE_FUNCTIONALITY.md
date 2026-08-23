# Android Share Text Functionality

## Overview

This plugin adds the ability for the Tibetan Dictionary Android app to receive shared text from other applications. When users share text from any app on Android, they will see three separate sharing options: "Tib -> Eng", "Eng -> Tib" and "Skt -> Tib".

## Implementation Details

### Android Components

1. **Activity Aliases** (declared in `tibetandict/config.xml`):
   - activityAlias `.ShareTibetanActivity`: allows to search for Tibetan text (search direction Tib -> Eng), `searchLanguage` meta-data `tib`
   - activityAlias `.ShareEnglishActivity`: allows to search for English text (search direction Eng -> Tib), `searchLanguage` meta-data `en`
   - activityAlias `.ShareSanskritActivity`: allows to search for Sanskrit (IAST) text (search direction Skt -> Tib), `searchLanguage` meta-data `skt`

2. **ShareTextPlugin.java**: Cordova plugin that handles incoming share intents
   - `getSharedText` returns `{text, language}` for a cold start (the share intent is the activity's launch intent)
   - `onNewIntent` captures share intents delivered to an already-running app instance (Android does not reload the WebView and does not update `getActivity().getIntent()`, so the intent is stored until the web side asks for it on the next `resume`)
   - the language is read from the `searchLanguage` meta-data of the resolved alias component (fallback: alias name pattern)
   - after a successful read the intent is cleared to prevent re-processing

3. **JavaScript side** (`webapp/src/routes/handleSharedText.ts` + `webapp/src/main.tsx`):
   - queries the plugin after `deviceready` (guarantees the plugin JS is loaded) and on every `resume` event (picks up warm-start shares)
   - normalises the shared text per language and navigates to `#/search/{lang}/{term}?activeTerm={displayTerm}`, which switches the app into the matching search mode (Tibetan / English / Sanskrit)
