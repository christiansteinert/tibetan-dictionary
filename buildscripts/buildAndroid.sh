#!/bin/dash
# Change to the project root (one level up from this script's directory)
cd "$(dirname "$0")/.."

# Pass all arguments to the actual build script
cd _build/; ./buildAndroid.sh "$@"; cd ..

# Only copy to old releases if not a debug build
DEBUG_BUILD=false
for arg in "$@"; do
  if [ "$arg" = "--debug" ]; then
    DEBUG_BUILD=true
  fi
done

if [ "$DEBUG_BUILD" = false ]; then
    APP_VERSION=`cat _build/mobile/tibetandict/config.xml |grep '<widget' | sed  's#.* version="\([^"]*\)".*#\1#'`
    LANG=en_us_88591
    echo cp TibetanDictionary-PUBLIC.apk "old releases/${APP_VERSION} (`date +"%B %Y"`, Android 7.0+).apk"
    cp TibetanDictionary-PUBLIC.apk "old releases/${APP_VERSION} (`date +"%B %Y"`, Android 7.0+).apk"
fi
