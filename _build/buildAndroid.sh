#!/bin/bash
# This script builds the Android application using Cordova.
# Note: the buildDictionaries.sh script must be run first to create the database file that is needed for the app

buildpath="`pwd`"
cordovapath="$buildpath/mobile/tibetandict"
echo ANDROID_HOME: $ANDROID_HOME
echo ANDROID_TOOLS_PATH: $ANDROID_TOOLS_PATH

export JAVA_TOOL_OPTIONS="-Xmx2048m -XX:ReservedCodeCacheSize=1024m"
export CORDOVA_TELEMETRY_DISABLED=1
export ANDROID_SDK_ROOT=$ANDROID_HOME

set -e

DEBUG_BUILD=false
for arg in "$@"; do
  if [ "$arg" == "--debug" ]; then
    DEBUG_BUILD=true
  fi
done

buildAndroidApplication() {
  cd "$cordovapath"

  # Clean stale build artifacts from previous (possibly failed) runs
  # Previous Docker builds create root-owned files that interfere with subsequent builds
  #rm -rf platforms www/cordova_plugins.js


# use a different Android Application ID for the private version of the app than for the public version
  local IS_PUBLIC_DICTIONARY=$1

  if (( $IS_PUBLIC_DICTIONARY )); then
    local IS_PUBLIC=true
    local DICT_TYPE="PUBLIC"  
    local ASSETS="res.normal"
    local DICT_FILE="$buildpath/../backend/TibetanDictionary_compressed.db"
  else
    local IS_PUBLIC=false
    local DICT_TYPE="FULL"
    local ASSETS="res.full"
    local DICT_FILE="$buildpath/../backend/TibetanDictionary_private_compressed.db"
  fi

  echo === Building $DICT_TYPE version ===
  
  if ! (( $IS_PUBLIC_DICTIONARY )); then
    # Change ID for full version in the main config.xml
    sed -i 's/id="de.christian_steinert.tibetandict"/id="de.christian_steinert.tibetandict.full"/g' config.xml
  fi

  # 1. Build the React app
  echo "Building React app..."
  (
    cd "$buildpath/../webapp"

    # clean dist/ before building to remove stale files
    rm -rf dist/

    # BUILD_TARGET=android will disable the PWA mode in vite which would otherwise interfere with resource loading in the Cordova webview.
    export VITE_PUBLIC_ONLY="$IS_PUBLIC"
    export BUILD_TARGET=android
    npm install && npm run build
    cd "$cordovapath"
  )
  

  # 2. Sync web assets to the project's WWW folder
  if [ -d "$cordovapath/www/" ]; then
    echo "Deleting $cordovapath/www/"
    rm -rf "$cordovapath/www/"
  fi

  if [ -d "$cordovapath/plugins/" ]; then
    echo "Deleting $cordovapath/plugins/"
    rm -rf "$cordovapath/plugins/"
  fi

  mkdir -p "$cordovapath/plugins/"
  mkdir -p "$cordovapath/www/"
  cp -rf "$buildpath/../webapp/dist/"* "www/"
  
  # 3. Apply all HTML modifications to the WWW folder
  # Add cordova classes to body
  sed -i 's/<body>/<body class="mobile">/g' "www/index.html"

  # Inject cordova.js reference and flag for mobile build into the HTML head
  sed -i 's|</title>|</title>\n    <script>window.CORDOVA_ENABLED = true;</script>\n    <script src="cordova.js"><\/script>\n|' www/index.html

  # 4. cleanup references to our custom plugins and clear any old Android platform files
  cordova plugin rm share-test-plugin || true
  cordova plugin rm cordova-sqlite-storage-tibetandict || true
  cordova platform rm android

  # 5. Merge the original cordova-sqlite-storage plugin with our customized code and add it to the project
  # - Merge the original cordova-sqlite-storage plugin with our customized code 
  # - Rename that plugin to a customized name. 
  # - Add the combined and modified plugin to the cordova project.
  sqlite_plugin_temp=$(mktemp -d)
  
  mkdir -p "$sqlite_plugin_temp"
  cp -r "$buildpath/mobile/plugins/cordova-sqlite-storage"/* "$sqlite_plugin_temp/"
  cp -r "$buildpath/mobile/plugins-custom/cordova-sqlite-storage-custom"/* "$sqlite_plugin_temp/"


  sed -i 's|id="cordova-sqlite-storage"|id="cordova-sqlite-storage-tibetandict"|g' "$sqlite_plugin_temp/plugin.xml"
  sed -i 's|"cordova-sqlite-storage"|"cordova-sqlite-storage-tibetandict"|g' "$sqlite_plugin_temp/package.json"
  sed -i 's|"cordova-sqlite-storage"|"cordova-sqlite-storage-tibetandict"|g' "$sqlite_plugin_temp/package-lock.json"
  sed -i 's|<param name="android-package" value="io.sqlc.SQLitePlugin"/>|<param name="android-package" value="io.sqlc.custom.SQLitePlugin"/>|g' "$sqlite_plugin_temp/plugin.xml"
  for file in "$sqlite_plugin_temp"/src/android/io/sqlc/custom/*.java; do
    file=$(basename "$file")
    sed -i "s|</config-file>|</config-file><source-file src=\"src/android/io/sqlc/custom/$file\" target-dir=\"src/io/sqlc/custom\"/>|g" "$sqlite_plugin_temp/plugin.xml"
  done

  (cd "$sqlite_plugin_temp" && npm install --ignore-scripts)
  cordova plugin add --nosave "$sqlite_plugin_temp"
  rm -rf "$sqlite_plugin_temp"
  
  # 6. Add the share text plugin to the Cordova project
  cordova plugin add --nosave ../plugins-custom/share-text-plugin/

  # 7. Recreate Android platform directory and add any other required plugins
  cordova platform add android@15.1.0

  # 8. Add Constants class for the size of the database file
  cp "$DICT_FILE" platforms/android/app/src/main/assets/TibetanDictionary.db
  dbsize="`du -b "$DICT_FILE" | cut -f1`"
  classfile="platforms/android/app/src/main/java/de/christian_steinert/tibetandict/Constants.java"
  echo "package de.christian_steinert.tibetandict;" > $classfile
  echo "public class Constants{ public static long DICT_SIZE() { return $dbsize; } }" >> $classfile
  echo DB Size: $dbsize

  # 9. Final Asset sync for resources
  cp -r "$buildpath/../_assets/${ASSETS}"/* platforms/android/app/src/main/res/

  # 10. Build APK
  if [ "$DEBUG_BUILD" = true ]; then
    echo "Performing DEBUG build..."
    cordova build android --debug -- --packageType=apk
    apk_name="TibetanDictionary-${DICT_TYPE}-debug.apk"
    # Use wildcard to find the debug APK in case the filename differs (e.g. app-debug.apk or app-debug-unsigned.apk)
    cp platforms/android/app/build/outputs/apk/debug/*.apk "$buildpath/../$apk_name"
  else

    echo "Performing RELEASE build..."
    cordova build android --release -- --packageType=apk
    apk_name="TibetanDictionary-${DICT_TYPE}.apk"
    # 10. Sign and align
    cp platforms/android/app/build/outputs/apk/release/*unsigned.apk "$buildpath/../$apk_name"
    $ANDROID_TOOLS_PATH/zipalign 16 "$buildpath/../$apk_name" "$buildpath/../${apk_name}_"
    echo xxxxxxxx|$ANDROID_TOOLS_PATH/apksigner sign --verbose --ks "$buildpath/my-release-key.keystore" --ks-key-alias android_release_key "$buildpath/../${apk_name}_"
    mv "$buildpath/../${apk_name}_" "$buildpath/../$apk_name"
    rm "$buildpath/"*.apk.idsig
  fi


  if ! (( $IS_PUBLIC_DICTIONARY )); then
    sed -i 's/id="de.christian_steinert.tibetandict.full"/id="de.christian_steinert.tibetandict"/g' config.xml
  fi

  cd "$buildpath"
}

###############################################################################################################
#### BUILD PRIVATE VERSION IF ADDITIONAL DICTIONARIES ARE PRESENT (not available on Github, sorry!)
###########################################################################################################################################
if [ -f ../backend/TibetanDictionary_private_compressed.db ]
then
  buildAndroidApplication 0
fi

###########################################################################################################################################
#### BUILD PUBLIC VERSION
###########################################################################################################################################
buildAndroidApplication 1


###########################################################################################################################################
#### CLEANUP
###########################################################################################################################################
cd "$buildpath"