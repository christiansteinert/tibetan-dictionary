# Tibetan-English dictionary application
This application is written mostly in Javascript. 
It currently comes in two flavors:
* as a web application with a simple PHP backend for data retrieval
* as an android app that is packaged with Apache Cordova. In that case data retrieval is done through a Cordova plugin that is implemented in Java. This plugin is derived from an existing Cordova database plugin but is slightly modified for this application in order to extract an existing database from the APK file onto the device upon first access and in order to allow read-only access to the database.

Both the web application and the android app use an SQLite database for data storage. This database is generated from vertical-bar separated CSV files during the build process


Any code that is my own is licensed under GPL v2 and GPL v3 (you can choose whichever you prefer). Note that the dictionary data is not my own and thus *THE COPYRIGHT OF THE DICTIONARY DATA IS WITH THE RESPECTIVE AUTHORS*. Also note that that some of the contained code (e.g. some of the javascript libraries) is licensed unter different licenses, e.g. Apache License 2.0).

You may also be interested in my homepage www.christian-steinert.de where you can find a running version of the web application.

# Build process
The build process is somewhat messy and will only run in a Linux environment. The main build scripts are buildDictionaries.sh which generates the dictionary database file and buildAndroid.sh which expects the database file to be present already and generates an android APK file containing the Android app.

These two scripts call other helper scripts along the way.


## Building the dictionaries
The script buildDictionaries.sh generates the dictionary database file that is used both by the web applicatipon and the android app (i.e., the sqlite database file at webapp/TibetanDictionary.db).

For this process it uses CSV files as input that are located in the folder _input/dictionaries. These files are expected to have a term in Wylie-transliterated Tibetan in the first column and a dictionary entry for that term in the second column. It is permitted that a single CSV file contains more than one entry for the same term.

While building the dictionary database from the CSV files a list of Tibetan syllables is also extracted. These Tibetan syllables are then used to generate a Wylie-to-Tibetan-Unicode lookup table for all syllables that are relevant for the included dictionaries. This is done in order to keep the application logic simple: The application does not have any logic to do actual Wylie-to-Unicode conversion - it simply uses a syllable-by-syllable lookup table. For generating the Wylie lookup table the Lingua-BO-Wylie perl package is used which is available from http://www.digitaltibetan.org/cgi-bin/wylie.pl.


## Building the Android application (APK file)
The script buildAndroid.sh builds the Apache Cordova project and thereby generates the APK file for the android app. For this it copies the application data and dictionary database from the webapp/ folder into the cordova project and then triggers the actual build process.


## Build dependencies
Apart from the things that are inside the project folder the following dependencies are required for the build process. It could well be that the following list is incomplete (did I mention yet that the build process is a bit of a mess?)

The respective tools must all be included in the PATH variable
* the following unix command line tools:
    * bash, grep, sed, cat, paste, sort, uniq, etc.
    * perl 5
* Apache Cordova which itself again requires node JS and npm to be installed
* java and a current version of the Android SDK
* sqlite 3 (more specifically, the sqlite3 commandline program)
* python 3

Furthermore, the JAVA_HOME and ANDROID_HOME environment variables should be set.



# Folder structure
* webapp/ This folder contains all code that is needed to run the dictionary as a web application. In order to use the web application the sqlite dictionary db (file webapp/TibetanDictionary.db) must have been generated before by the script buildDictionaries.sh. Other than that the web application folder is self-contained and should run on any server that supports PHP5 or PHP6 togetherwith the SQLite module for PHP. 
* _assets: a few images that have been created for this project
* _build/util/Lingua-BO-Wylie perl library for converting Tibetan text with Wylie transliteration into Unicode. This library is used to generate the lookup table that is used for converting from Wylie to Unicode
* _build/mobile This folder contains the Cordova project for generating the Android app. As usual with Cordova projects this folder is a mix of source code, configuration and intermediate build artifacts. The buildAndroid.sh script automatically copies the web application files and the dictionary database from the webapp/ folder into the correct location inside of the Cordova project folder so that these resources are packaged into the Android application
* _input This folder contains dictionary data that serves as basis for generating the dictionary DB

# Application structure (folder webapp/)
Since the application is implemented almost exclusively in Javascript, the application code for the web application and the android application is identical.
* The main application code is contained in the file index.html
* cordova.js and SQLiteplugin.js are only dummy files if the application is run as a web application but will be replaced with the real cordova code if the application is packaged into an android app.
* dict.php this file offers a simple PHP backend which allows the application to query the database if it is run as a web application
* TibetanDictionary.db is the sqlite 3 database file
* code/ folder
    * code/css This folder contains css files, icons and a Tibetan web font
    * code/js/wylie.js This is a javascript-based converter between Wylie transliteration and Unicode. Note: this code is not currently used by the application!
* data/ folder
    * data/syllablelist.js this is a lookup table for mapping Tibetan Syllables between Wylie and Tibetan Unicode. This file is automatically generated by the buildDictionaries.sh script
* settings/ folder 
    * settings/abbreviations.js contains the abbreviations and search patterns for applying them to the text for various dictionaries. The content of this file is maintained by hand, i.e., it is not auto-generated. The settings in this file are referenced by settings/dictlist.js since one set of abbreviations may be referenced by more than one dictionary
    * settings/dictlist.js contains the list of known dictionaries together with some settings. Note that not all dictionaries are publically available.
    * settings/globalsettings.js contains a flag that tells the application should list all dictionaries or only those that are publically available. This file is auto-generated by the build process
* lib/ folder - this folder contains javascript libraries
    * lib/datatables/ a jQuery plugin for tabular data output
    * lib/jquery/ the jQuery javascript library 
    * lib/jquery_bbq/ a jQuery plugin for detecting and handling the use of the back- and forward- button of the browser
    * lib/jquery_inputposition/ a jQuery plugin for getting the cursor plugin in an input field
    * lib/jquery_textchange/ a jQuery plugin for handling typing events in an input field
    * lib/jquery_textchange/ a self-written set of functions (not really a jQuery plugin although it uses jQuery) for showing floating tooltips that move around with the mouse
    * lib/tokenizer/ a jQuery plugin for tokenizing text


# Public and private version
In the build script you will see that two versions of the dictionary are built on my machine - a private version and a public version. The private version contains additional dictionary data that I, sadly, cannot distribute publically. The build script should recognize if only the public data is available and should then only build the public version of the app that contains fewer dictionaries. 

So as far as the build process is concerned everything should be fine even if you don't have the data for the additional private version of the application. Just don't be surprised when you read the commands in the build script and see that some files that are referenced are missing and that due to that some steps in the build process are skipped.
