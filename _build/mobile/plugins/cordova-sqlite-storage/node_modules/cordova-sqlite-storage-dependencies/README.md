# Cordova sqlite storage dependencies

**AUTHOR:** Christopher J. Brody

**LICENSE:** MIT (for `sql-asm-memory-growth.js` built from fork of [`sql-js/sql.js`](https://github.com/sql-js/sql.js)); public domain for other artifacts

Contains source and object code built from:
- [`storesafe/sql.js`](https://github.com/storesafe/sql.js) - fork of [`sql-js/sql.js`](https://github.com/sql-js/sql.js) (MIT license)
- SQLite3 from [sqlite.org](http://sqlite.org/) (public domain)
- [`brodybits/android-sqlite-native-ndk-connector`](https://github.com/brodybits/android-sqlite-native-ndk-connector) (Unlicense, public domain)
- [`brodybits/android-sqlite-ndk-native-driver`](https://github.com/brodybits/android-sqlite-ndk-native-driver) (Unlicense, public domain)

This project provides the following dependencies needed to build [`storesafe/cordova-sqlite-storage`](https://github.com/storesafe/cordova-sqlite-storage):
- `sql-asm-memory-growth.js` - built from [`storesafe/sql.js`](https://github.com/storesafe/sql.js) (fork of [`sql-js/sql.js`](https://github.com/sql-js/sql.js)) with SQLite `3.22.3` for `browser` platform
- `sqlite3.h`, `sqlite3.c` - SQLite `3.40.0` amalgamation needed to build iOS, macOS, and Windows platforms
- `libs` - JAR libraries built from [`github:brodybits/android-sqlite-ndk-native-driver` - `sqlite-storage-ndk-native-driver` branch](https://github.com/brodybits/android-sqlite-ndk-native-driver/tree/sqlite-storage-ndk-native-driver) and [`brodybits/android-sqlite-native-ndk-connector`](https://github.com/brodybits/android-sqlite-native-ndk-connector), minimum API level 24 (Android 7.0), built with SQLite amalgamation, with the following flags:
  - `-DSQLITE_THREADSAFE=1`
  - `-DSQLITE_DEFAULT_SYNCHRONOUS=3`
  - `-DSQLITE_DEFAULT_MEMSTATUS=0`
  - `-DSQLITE_OMIT_DECLTYPE`
  - `-DSQLITE_OMIT_DEPRECATED`
  - `-DSQLITE_OMIT_PROGRESS_CALLBACK`
  - `-DSQLITE_OMIT_SHARED_CACHE`
  - `-DSQLITE_TEMP_STORE=2`
  - `-DSQLITE_OMIT_LOAD_EXTENSION`
  - `-DSQLITE_ENABLE_FTS3`
  - `-DSQLITE_ENABLE_FTS3_PARENTHESIS`
  - `-DSQLITE_ENABLE_FTS4`
  - `-DSQLITE_ENABLE_RTREE`
  - `-DSQLITE_DEFAULT_PAGE_SIZE=4096`
  - `-DSQLITE_DEFAULT_CACHE_SIZE=-2000`
