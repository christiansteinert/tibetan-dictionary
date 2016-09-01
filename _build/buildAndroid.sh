currpath="`pwd`"

if [ -z "$ANDROID_HOME" ]
then
  # Default path for ANDROID_HOME if the variable is not set
  export ANDROID_HOME="/home/christian/bin/android-sdk/sdk/"
fi
export JAVA_TOOL_OPTIONS="-Xmx2048m -XX:ReservedCodeCacheSize=1024m"

echo ANDROID_HOME: $ANDROID_HOME

# copy the customized Java class for the cordova database plugin
#cp mobile/tibetandict/plugins/cordova-sqlite-storage/src/android/io/sqlc/SQLitePlugin.java mobile/tibetandict/platforms/android/src/com/phonegap/plugin/sqlitePlugin/
cp mobile/tibetandict/plugins/cordova-sqlite-storage/src/android/io/sqlc/SQLitePlugin.java  mobile/tibetandict/platforms/android/src/io/sqlc/  


############################################################################################################################################
#### BUILD PRIVATE VERSION IF ADDITIONAL DICTIONARIES ARE PRESENT (not available on Github, sorry!)
############################################################################################################################################
if [ -f ../webapp/TibetanDictionary_private.db ]
then

echo === Building full version ===
# copy dictionary
cp ../webapp/TibetanDictionary_private.db mobile/tibetandict/platforms/android/assets/TibetanDictionary.db

# generate a simple Java class that contains the size of the dictionary DB file as constant. This is important at runtime so that the application can 
# check easily if the DB file has been extracted correctly onto the android device
dbsize="`du -b mobile/tibetandict/platforms/android/assets/TibetanDictionary.db | cut -f1`"
classfile="mobile/tibetandict/platforms/android/src/de/christian_steinert/tibetandict/Constants.java"
echo "package de.christian_steinert.tibetandict;" > $classfile
echo "public class Constants{ public static long DICT_SIZE() { return $dbsize; } }" >> $classfile
echo DB Size: $dbsize

# generate a simple global settings file that tells the application which dictionaries from the dictionary list should be listed
# in the "about" section and on the settings screen 
echo "GLOBAL_SETTINGS={ publicOnly: false }" > ../webapp/settings/globalsettings.js



# copy the files of the web application into the cordova project
cp -r ../webapp/index.html ../webapp/code ../webapp/data ../webapp/settings ../webapp/lib mobile/tibetandict/www
cp -r ../webapp/index.html ../webapp/code ../webapp/data ../webapp/settings ../webapp/lib mobile/tibetandict/platforms/android/assets/www

# use a different Android Application ID for the private version of the app than for the public version
find mobile/tibetandict/ -iname AndroidManifest.xml -exec sed -i 's/package="de.christian_steinert.tibetandict"/package="de.christian_steinert.tibetandict.full"/' {} \;

# touch all java files to force recompiling
find mobile/tibetandict/platforms/android/src/ -iname *.java -exec touch {} \;

# kick of the actual cordova build process
cd mobile/tibetandict/platforms/android/cordova
./build --release




# move and sign the APK file


# command for generating a new self-signed key if none is present yet (Java's keytool must be in the PATH):
#   keytool -genkey -v -keystore my-release-key.keystore -alias android_release_key -keyalg RSA -keysize 2048 -validity 10000

cd "$currpath"
cp mobile/tibetandict/platforms/android/build/outputs/apk/*unsigned.apk ../TibetanDictionary-FULL.apk
echo xxxxxxxx|jarsigner -verbose -sigalg MD5withRSA -digestalg SHA1 -keystore "$currpath/my-release-key.keystore" ../TibetanDictionary-FULL.apk android_release_key
zipalign -v 4 ../TibetanDictionary-FULL.apk ../TibetanDictionary-FULL_.apk
mv ../TibetanDictionary-FULL_.apk ../TibetanDictionary-FULL.apk

fi #end of build process for private version


############################################################################################################################################
#### BUILD PUBLIC VERSION
############################################################################################################################################
echo === Building public version ===

cd "$currpath"


cp ../webapp/TibetanDictionary.db mobile/tibetandict/platforms/android/assets/TibetanDictionary.db

# generate a simple Java class that contains the size of the dictionary DB file as constant. This is important at runtime so that the application can 
# check easily if the DB file has been extracted correctly onto the android device
dbsize="`du -b mobile/tibetandict/platforms/android/assets/TibetanDictionary.db | cut -f1`"
classfile="mobile/tibetandict/platforms/android/src/de/christian_steinert/tibetandict/Constants.java"
echo "package de.christian_steinert.tibetandict;" > $classfile
echo "public class Constants{ public static long DICT_SIZE() { return $dbsize; } }" >> $classfile
echo DB Size: $dbsize

# generate a simple global settings file that tells the application which dictionaries from the dictionary list should be listed
# in the "about" section and on the settings screen 
echo "GLOBAL_SETTINGS={ publicOnly: true }" > ../webapp/settings/globalsettings.js

cp -r ../webapp/index.html ../webapp/code ../webapp/data ../webapp/settings ../webapp/lib mobile/tibetandict/www
cp -r ../webapp/index.html ../webapp/code ../webapp/data ../webapp/settings ../webapp/lib mobile/tibetandict/platforms/android/assets/www

# use a different Android Application ID for the public version of the app than for the private version
find mobile/tibetandict/ -iname AndroidManifest.xml -exec sed -i 's/package="de.christian_steinert.tibetandict.full"/package="de.christian_steinert.tibetandict"/' {} \;


# touch all java files to force recompiling
find mobile/tibetandict/platforms/android/src/ -iname *.java -exec touch {} \;

# kick of the actual cordova build process
cd mobile/tibetandict/platforms/android/cordova
./build --release


# move and sign the APK file


# command for generating a new self-signed key if none is present yet (Java's keytool must be in the PATH):
#   keytool -genkey -v -keystore my-release-key.keystore -alias android_release_key -keyalg RSA -keysize 2048 -validity 10000
cd "$currpath"
cp mobile/tibetandict/platforms/android/build/outputs/apk/*unsigned.apk ../TibetanDictionary-PUBLIC.apk
echo xxxxxxxx|jarsigner -verbose -sigalg MD5withRSA -digestalg SHA1 -keystore "$currpath/my-release-key.keystore" ../TibetanDictionary-PUBLIC.apk android_release_key
zipalign -v 4 ../TibetanDictionary-PUBLIC.apk ../TibetanDictionary-PUBLIC_.apk
mv ../TibetanDictionary-PUBLIC_.apk ../TibetanDictionary-PUBLIC.apk


# clean up temporary Cordova files
echo CLEANING UP
cd "$currpath"
cd mobile/tibetandict
cordova clean
cd $currpath

