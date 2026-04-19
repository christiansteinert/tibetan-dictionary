# Tibetan-English dictionary application

This is a Tibetan <-> English dictionary application. 

You can find an online version of this application at [https://dictionary.christian-steinert.de] to understand what it does. There is also an android version of this app, available at [https://play.google.com/store/apps/details?id=de.christian_steinert.tibetandict].


The application comes in two flavors:

* as a web application 
* as an Android app 

Most of the application is written in typescript with react + vite. 

Both the web application and the android app use an SQLite database for data storage. This database is generated from vertical-bar separated CSV files during the build process. 

The Android app shares its react-based UI implementation with the web applicaton but uses a different database access layer and is packaged with Apache Cordova.


# License

Any code that is my own is licensed under GPL v2 and GPL v3 (you can choose whichever you prefer). Note that the dictionary data is not my own and thus *THE COPYRIGHT OF THE DICTIONARY DATA IS WITH THE RESPECTIVE AUTHORS*. Also note that that some of the contained code (e.g. some of the javascript libraries) is licensed unter different licenses, e.g. Apache License 2.0).


# Dictionary API

The backend exposes an API that can be used independently from the web application.
An OpenAPI specification is available at https://dict-test.christian-steinert.de/api/openapi.yaml

# Build process and local execution

The build process and local execution environment are Docker-based and defined in `docker-compose.yml`. 

There are three build services and two runtime services in the compose file:

| Service | What it does | Output |
|---|---|---|
| `build-db` | Builds the SQLite database from CSV source files | `backend/TibetanDictionary.db` |
| `build-webapp` | Compiles the Vite/React frontend and runs automated frontend tests | `webapp/dist/` |
| `build-android` | Builds the Android APK (optional, slow) | `TibetanDictionary-PUBLIC.apk` |
| `backend-dev` | Serves the web application backend for development purposes (nginx + PHP-FPM) | — |
| `frontend-dev` | Serves the web application frontend for development purposes (npm + vite) | — |

# Building and running the web app


## Checkout ewts-js submodule
The [ewts-js](https://github.com/rogerespel/ewts-js) library is added as a git submodule which points to the original repository.

After cloning this repository you must therefore once execute
```bash
git submodule update --init
``` 
to pull the external dependency. Without this, the local build will fail.

## Running the stack for local development
The app can be run locally as follows

Build the dictionary database with
```bash
docker compose run --rm build-db
```

Then start the local environment with

```bash
docker compose up -d backend-dev frontend-dev
```

The frontend is now available at http://localhost:5173. The backend is now available at http://localhost:8080/backend/api.

Shutdown can be done with `docker compose down`.

## Rebuilding during development after changes

After changing CSV dictionary files rebuild the database and restart as follows:

```bash
docker compose run --rm build-db && docker compose restart backend-dev
```

After changing frontend code (only needed if hot reload fails):

```bash
docker compose restart frontend-dev
```

## Building the Android APK (work in progress)

Requires a signing keystore at `_build/my-release-key.keystore`. Run `docker compose run --rm build-db` first, then:

```bash
docker compose run --rm build-android
```

The finished APK is written to the project root.


### Database access for Android app 

The Android app uses a local sqlite database on the Android device. This database file is baked into the Android APK. 
There is no online access from within the Android app.

 DB access in the android version is handled by a Cordova plugin that is implemented in Java to access the dictionary database. This plugin is derived from an existing Cordova database plugin but is slightly modified for this application in order to extract an existing database from the APK file onto the device upon first access and in order to allow read-only access to the database.


# Deployment

## Docker based deployment

To build a self-contained image for deployment or pushing to a registry, do the following:

```bash
docker-compose run --rm build-db
docker-compose run --rm build-webapp
docker build -f buildscripts/docker/deploy/Dockerfile -t tibetan-dict .
```

then run the image with 
```bash
docker run -p "1234:80" --rm tibetan-dict
```

This makes the frontend of the dictionary available at [http://localhost:1234] and the backend at [http://localhost:1234/backend/api/...] 

## Manual deployment to a webserver

To deploy to a webserver, first build everything with:

```bash
docker-compose run --rm build-db
docker-compose run --rm build-webapp
```

The `webapp/dist` folder will then contain the frontend application and should become the root folder of the application on the webserver. 

The `backend` folder will contain the backend components and data and should be placed in the subfolder `.../backend`  within the web root folder of the application on the webserver.

Note that the webserver must be configured in such a way that /backend/api/... points to /backend/api.php/...

For Apache webservers this should be handled by the settings in `backend/.htaccess`.

# Folder structure

* `backend/` — PHP backend (`api.php`) and the generated SQLite database (`TibetanDictionary.db`). Also holds `audio/` and `data/` assets served by the app.
* `webapp/` — Vite/React frontend (TypeScript, Tailwind CSS). `webapp/dist/` is the build output served by nginx.
* `_input/` — CSV dictionary source files and Tibetan syllable/punctuation data used by the database build.
* `buildscripts/` — Shell scripts and Docker configurations that are used for the build process.
* `_build/mobile/` — Apache Cordova project for building and android version of the dictionary app.
* `_assets/` — Source image files (xcf, xml) for app icons and store graphics.

## backend/

The web application uses a PHP backend exposes which a single endpoint (`api.php`). The PHP backend code queries a SQLite database and returns JSON results to the frontend. The database is generated by `build-db` from CSV files in `_input/dictionaries/`. Dictionary abbreviation metadata lives in `webapp/src/config/`.


## webapp/

A standard Vite + React + TypeScript application. Some important folders are:

* `src/components/` — UI components.
* `src/services/` — data access layer; switches between PHP AJAX (for web app) and the Cordova SQLite plugin (for Android aoo) at runtime.
* `src/config/dictlist.js` and `abbreviations.js` — dictionary metadata and abbreviation expansion rules, maintained by hand.


# Public and private version
In the build script you will see that two versions of the dictionary are built on my machine - a private version and a public version. The private version contains additional dictionary data that I, sadly, cannot distribute publically. The build script should recognize if only the public data is available and should then only build the public version of the app that contains fewer dictionaries. 

As far as the build process is concerned everything should be fine even if you don't have the data for the additional private version of the application. Just don't be surprised when you read the commands in the build script and see that some files that are referenced are missing and that due to that some steps in the build process are skipped.
