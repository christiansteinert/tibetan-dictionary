# Android Share Text Functionality

## Overview

This plugin adds the ability for the Tibetan Dictionary Android app to receive shared text from other applications. When users share text from any app on Android, they will see two separate sharing options: "Tib -> Eng" and "Eng -> Tib".

## Implementation Details

### Android Components

1. **Activity Aliases** (`plugin.xml`):
   - activityAlias `.ShareTibetanActivity`: allows to search for Tibetan text (search direction Tib -> Eng)
   - activityAlias `.ShareEnglishActivity`: allows to search for Tibetan text (search direction Eng -> Tib)

2. **ShareTextPlugin.java**: Cordova plugin that handles incoming share intents
   - receives sharing intents, stores the text, and makes it available to the web part of the paplication

