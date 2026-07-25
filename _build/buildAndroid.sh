#!/bin/bash
# This script builds the Android application using Cordova.
# Note: the buildDictionaries.sh script must be run first to create the database file that is needed for the app
currpath="`pwd`"
 
 
echo ANDROID_HOME: $ANDROID_HOME
echo ANDROID_TOOLS_PATH: $ANDROID_TOOLS_PATH

export JAVA_TOOL_OPTIONS="-Xmx2048m -XX:ReservedCodeCacheSize=1024m"
export CORDOVA_TELEMETRY_DISABLED=1

buildAndroidApplication() {

  # use a different Android Application ID for the private version of the app than for the public version
  local IS_PUBLIC_DICTIONARY=$1

  if (( $IS_PUBLIC_DICTIONARY )); then
    local IS_PUBLIC=true
    local DICT_TYPE="PUBLIC"  
    local ASSETS="res.normal"
    local DICT_FILE="../backend/TibetanDictionary_compressed.db"
  else
    local IS_PUBLIC=false
    local DICT_TYPE="FULL"
    local ASSETS="res.full"
    local DICT_FILE="../backend/TibetanDictionary_private_compressed.db"
  fi

  echo === Building $DICT_TYPE version ===
  
  if ! (( $IS_PUBLIC_DICTIONARY )); then
    find mobile/tibetandict/ -iname config.xml -exec sed -i 's/id="de.christian_steinert.tibetandict"/id="de.christian_steinert.tibetandict.full"/g' {} \;
  fi

  cd mobile/tibetandict
  cordova telemetry off
#  cordova platform rm android
  cordova platform add android@15.0.0

  cd ../..

  # avoid the gradlew script that is shipped with Cordova and instead use the gradle binary that is installed in the Docker image
  rm mobile/tibetandict/platforms/android/gradlew
  ln -s $GRADLE_HOME/bin/gradle mobile/tibetandict/platforms/android/gradlew


  # copy the customized classes for the cordova database plugin
  cp -r mobile/tibetandict/plugins/cordova-sqlite-storage/src/android/io/sqlc/  mobile/tibetandict/platforms/android/app/src/main/java/io/sqlc/  
  cp mobile/tibetandict/plugins/cordova-sqlite-storage-custom/plugin.xml mobile/tibetandict/plugins/cordova-sqlite-storage/plugin.xml
  cp -r mobile/tibetandict/plugins/cordova-sqlite-storage-custom/src/android/io/sqlc/custom/  mobile/tibetandict/platforms/android/app/src/main/java/io/sqlc/custom/  

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

  # Build the React app
  echo "Building React app..."
  (
    cd ../webapp
    VITE_PUBLIC_ONLY=$IS_PUBLIC BUILD_TARGET=android npm install && npm run build
  )

  # Update index.html to add cordova classes
  sed -i 's/<body class="/<body class="cordovaInitializing mobile /g' ../webapp/dist/index.html

  # Sync built assets to Cordova project
  mkdir -p mobile/tibetandict/platforms/android/app/src/main/assets/www
  
  cp -rf ../webapp/dist/* mobile/tibetandict/www/
  cp -rf ../webapp/dist/* mobile/tibetandict/platforms/android/app/src/main/assets/www/

  
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
#cordova platform rm android
cd "$currpath"