#!/bin/dash
if [ -z "$ANDROID_HOME" ]
then
  # Default path for ANDROID_HOME if the variable is not set
  #export ANDROID_HOME="/home/christian/bin/android-sdk/sdk/"
  export ANDROID_HOME="$HOME/Android/Sdk/"
  export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
  export PATH=$ANDROID_HOME/build-tools/33.0.2:$PATH
fi

cd _build/; ./buildAndroid.sh; cd ..


APP_VERSION=`cat _build/mobile/tibetandict/config.xml |grep '<widget' | sed  's#.* version="\([^"]*\)".*#\1#'`
LANG=en_us_88591
cp TibetanDictionary-PUBLIC.apk "old releases/${APP_VERSION} (`date +"%B %Y"`, Android 7.0+).apk"
