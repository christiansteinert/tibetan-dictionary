# Cordova SQLite Storage Customizations

This directory contains customizations for the `cordova-sqlite-storage` plugin to support the prepopulated Tibetan Dictionary database.

## Purpose

The primary goal of these customizations is to ensure that the application's dictionary database is correctly installed on the Android device before the database gets opened.

## Customizations

### 1. `io.sqlc.custom.SQLitePlugin`
This class extends the original `io.sqlc.SQLitePlugin`. It intercepts the `open` action in the `execute` method to trigger the database installation process. This ensures that the database file is present and verified before the original plugin attempts to open it, avoiding the need to modify the core plugin logic.

### 2. `io.sqlc.custom.DatabaseInstaller`
A utility class responsible for:
- Searching for the database file in multiple locations (including external app folders).
- Verifying the database file size against a constant defined in `de.christian_steinert.tibetandict.Constants.DICT_SIZE()`.
- Copying the prepopulated database from the application assets inside APK to the internal data directory if it is missing or outdated.

### 3. `plugin.xml` (Patched)
The `plugin.xml` is modified to instruct Cordova to use `io.sqlc.custom.SQLitePlugin` as the entry point for the Android platform instead of the original `io.sqlc.SQLitePlugin`.

## Build Integration

These customizations are integrated into the build process via `_build/buildAndroid.sh`:
1. The patched `plugin.xml` is copied over the original plugin's configuration.
2. The custom Java classes are copied into the Android project's source tree at build time.
3. A class de.christian_steinert.tibetandict.Constants is generated which provides access to the expected file size of the dictionary DB
