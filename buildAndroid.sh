#!/bin/dash
export ANDROID_HOME=/home/christian/Android/Sdk
cd _build/; ./buildAndroid.sh; cd ..


APP_VERSION=`cat _build/mobile/tibetandict/config.xml |grep '<widget' | sed  's#.* version="\([^"]*\)".*#\1#'`
LANG=en_us_88591
cp TibetanDictionary-PUBLIC.apk "old releases/${APP_VERSION} (`date +"%B %Y"`, Android 4.4+).apk"
