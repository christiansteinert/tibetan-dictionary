#!/bin/bash
# This script builds the Android application using Cordova.
# Note: the buildDictionaries.sh script must be run first to create the database file that is needed for the app
currpath="`pwd`"


if [ -z "$JAVA_HOME" ]
then
  export JAVA_HOME=/usr/lib/jvm/java-17/
  $JAVA_HOME/bin/javac -version
fi

if [ -z "$ANDROID_HOME" ]
then
  export ANDROID_HOME="$HOME/Android/Sdk"
fi

export ANDROID_TOOLS_VERSION=`ls -1 $ANDROID_HOME/build-tools/ |tail -n 1 `
export ANDROID_TOOLS_PATH="$ANDROID_HOME/build-tools/$ANDROID_TOOLS_VERSION"
export JAVA_TOOL_OPTIONS="-Xmx2048m -XX:ReservedCodeCacheSize=1024m"

export PATH=$ANDROID_TOOLS_PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH


echo ANDROID_HOME: $ANDROID_HOME
echo ANDROID_TOOLS_PATH: $ANDROID_TOOLS_PATH

buildAndroidApplication() {
  # use a different Android Application ID for the private version of the app than for the public version
  local IS_PUBLIC_DICTIONARY=$1

  if (( $IS_PUBLIC_DICTIONARY )); then
    local IS_PUBLIC=true
    local DICT_TYPE="PUBLIC"  
    local ASSETS="res.normal"
    local DICT_FILE="../webapp/TibetanDictionary.db"
  else
    local IS_PUBLIC=false
    local DICT_TYPE="FULL"
    local ASSETS="res.full"
    local DICT_FILE="../webapp/TibetanDictionary_private.db"
  fi

  echo === Building $DICT_TYPE version ===
  
  if ! (( $IS_PUBLIC_DICTIONARY )); then
    find mobile/tibetandict/ -iname config.xml -exec sed -i 's/id="de.christian_steinert.tibetandict"/id="de.christian_steinert.tibetandict.full"/g' {} \;
  fi

  cd mobile/tibetandict
  cordova platform rm android
  cordova platform add android
  cd ../..

  # copy the customized Java classes for the cordova database plugin
  cp mobile/tibetandict/plugins/cordova-sqlite-storage/src/android/io/sqlc/*.java  mobile/tibetandict/platforms/android/app/src/main/java/io/sqlc/  

  # copy the share text plugin Java class
  mkdir -p mobile/tibetandict/platforms/android/app/src/main/java/de/christian_steinert/tibetandict/
  cp mobile/tibetandict/plugins/share-text-plugin/src/android/ShareTextPlugin.java mobile/tibetandict/platforms/android/app/src/main/java/de/christian_steinert/tibetandict/  

  # copy dictionary db file
  cp "$DICT_FILE" mobile/tibetandict/platforms/android/app/src/main/assets/TibetanDictionary.db
                                         
  # generate a simple Java class that contains the size of the dictionary DB file as constant. This is important at runtime so that the application can 
  # check easily if the DB file has been extracted correctly onto the android device
  dbsize="`du -b "$DICT_FILE" | cut -f1`"

  classfile="mobile/tibetandict/platforms/android/app/src/main/java/de/christian_steinert/tibetandict/Constants.java"
  echo "package de.christian_steinert.tibetandict;" > $classfile
  echo "public class Constants{ public static long DICT_SIZE() { return $dbsize; } }" >> $classfile
  echo DB Size: $dbsize

  # generate a simple global settings file that tells the application which dictionaries from the dictionary list should be listed
  # in the "about" section and on the settings screen 
  echo "GLOBAL_SETTINGS={ publicOnly: $IS_PUBLIC }" > ../webapp/settings/globalsettings.js

  # copy the files of the web application into the cordova project
  # for the index page, add a cordovaInitializing class so that an init message gets shown
  # while the app initializes itself
  mkdir -p mobile/tibetandict/platforms/android/app/src/main/assets/www
  
  mkdir -p /tmp/dict
  cp -rf ../webapp/index.html /tmp/dict/index.html
  sed -i 's/<body class="/<body class="cordovaInitializing mobile /g' /tmp/dict/index.html

  cp -r /tmp/dict/index.html ../webapp/code ../webapp/settings ../webapp/lib mobile/tibetandict/www
  cp -r /tmp/dict/index.html ../webapp/code ../webapp/settings ../webapp/lib mobile/tibetandict/platforms/android/app/src/main/assets/www
  rm -rf /tmp/dict/


  mkdir -p mobile/tibetandict/www/data
  mkdir -p mobile/tibetandict/platforms/android/app/src/main/assets/www/data
  cp -r ../webapp/data/*.js mobile/tibetandict/www/data
  cp -r ../webapp/data/*.js mobile/tibetandict/platforms/android/app/src/main/assets/www/data
  
  cp -r mobile/tibetandict/platforms/android/platform_www/plugins mobile/tibetandict/platforms/android/app/src/main/assets/www/
  cp mobile/tibetandict/platforms/android/platform_www/cordova*.js mobile/tibetandict/platforms/android/app/src/main/assets/www

  cp -r ../_assets/${ASSETS}/* mobile/tibetandict/platforms/android/app/src/main/res/


  # kick off the actual cordova build process
  cd mobile/tibetandict
  
  #cordova prepare android
  cordova build android --release -- --packageType=apk

  # move and sign the APK file

  # command for generating a new self-signed key if none is present yet (Java's keytool must be in the PATH):
  #   keytool -genkey -v -keystore my-release-key.keystore -alias android_release_key -keyalg RSA -keysize 2048 -validity 10000

  cd "$currpath"
  cp mobile/tibetandict/platforms/android/app/build/outputs/apk/release/*unsigned.apk ../TibetanDictionary-${DICT_TYPE}.apk

  $ANDROID_TOOLS_PATH/zipalign 16 ../TibetanDictionary-${DICT_TYPE}.apk ../TibetanDictionary-${DICT_TYPE}_.apk

  echo $ANDROID_TOOLS_PATH/apksigner sign --verbose --ks "$currpath/my-release-key.keystore" --ks-key-alias android_release_key ../TibetanDictionary-${DICT_TYPE}_.apk
  echo xxxxxxxx|$ANDROID_TOOLS_PATH/apksigner sign --verbose --ks "$currpath/my-release-key.keystore" --ks-key-alias android_release_key ../TibetanDictionary-${DICT_TYPE}_.apk

  mv ../TibetanDictionary-${DICT_TYPE}_.apk ../TibetanDictionary-${DICT_TYPE}.apk
  rm ../*.apk.idsig

  if ! (( $IS_PUBLIC_DICTIONARY )); then
    # revert the changes to config.xml to prepare for building the public version
    find mobile/tibetandict/ -iname config.xml -exec sed -i 's/id="de.christian_steinert.tibetandict.full"/id="de.christian_steinert.tibetandict"/g' {} \;
  fi

  # clean up temporary Cordova files
  echo CLEANING UP
  cd "$currpath"
  cd mobile/tibetandict
  cordova clean
  cd $currpath
}



###############################################################################################################
#### BUILD PRIVATE VERSION IF ADDITIONAL DICTIONARIES ARE PRESENT (not available on Github, sorry!)
############################################################################################################################################
if [ -f ../webapp/TibetanDictionary_private.db ]
then
  buildAndroidApplication 0
fi

############################################################################################################################################
#### BUILD PUBLIC VERSION
############################################################################################################################################
buildAndroidApplication 1


############################################################################################################################################
#### CLEANUP
############################################################################################################################################
cd mobile/tibetandict
cordova platform rm android
cd "$currpath"