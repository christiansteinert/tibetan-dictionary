<!--
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
-->

# cordova-serve

[![NPM](https://nodei.co/npm/cordova-serve.png)](https://nodei.co/npm/cordova-serve/)

[![Node CI](https://github.com/apache/cordova-serve/workflows/Node%20CI/badge.svg?branch=master)](https://github.com/apache/cordova-serve/actions?query=branch%3Amaster)

This module provides a JavaScript API to serve up a Cordova application in the browser.

**API Example:**

```js
const cordovaServe = require('cordova-serve')();

cordovaServe.launchServer(options);
cordovaServe.servePlatform(platform, options);
cordovaServe.launchBrowser(options);
```

## API Methods

### `launchServer()`

Launches a local HTTP server.

**Code Example:**

```js
const cordovaServe = require('cordova-serve')();

cordovaServe.launchServer(options).then(function () {
    const { server, port, root } = cordovaServe;
    ...
}, error => {
    console.log(`An error occurred: ${error}`);
});
```

**Parameters:**

* **options**: described below in the following section "**launchServer & servePlatform Options**".

**Return:**

Returns a resolved or rejected promise depending on if the server had launched successfully.

On a fulfilled promise, the following properties are available on the returned object:

Property | Description
-|-
`serve` | The Node `http.Server` instance.
`root` | The `root` that was specified, or `cwd` if none specified.
`port` | The port that was used. (Either the requested port, the default port of `8000`, or the incremented value of the chosen port when the chosen port is already in use).

## `servePlatform()`

Launches a server that serves up any Cordova platform (e.g. `browser`, `android`, etc) from the current project.

**Code Example:**

```js
const cordovaServe = require('cordova-serve')();

cordovaServe.servePlatform(platform, options).then(() => {
    const { server, port, projectRoot, root } = cordovaServe;
    ...
}, error => {
    console.log(`An error occurred: ${error}`);
});
```

**Parameters:**

* **options**: described below in the following section "**launchServer & servePlatform Options**".

**Return:**

Note that for `servePlatform()`, the `root` value should be a Cordova project's root folder or any folder within it. `servePlatform()` will replace it with the platform's `www_dir` folder. If this value is not specified, the *cwd* will be used.

Returns a resolved or rejected promise depending on if the server had launched successfully.

On a fulfilled promise, the following properties are available on the returned object:

Property | Description
-|-
`serve` | The Node `http.Server` instance.
`root` | The requested platform's `www` folder.
`projectRoot` | The root folder of the Cordova project.
`port` | The used port. requested port, the default port `8000`, or incremented value of the chosen port when already in use).

### `launchBrowser()`

Launches a browser window pointing to the specified URL.

**Code Example:**

```js
const cordovaServe = require('cordova-serve')();

cordovaServe.launchBrowser(options).then(
  stdout => {
    console.log(`Browser was launched successfully: ${stdout}`);
  },
  error => {
    console.log(`An error occurred: ${error}`);
  }
);
```

**Parameters:**

* **options** (optional):

Options | Description
-|-
`url` | The URL to open in the browser.
`target` | The browser identifier to launch. **Valid identifier**: `chrome`, `chromium`, `firefox`, `ie`, `opera`, `safari`. (**Default:** `chrome`.)

**Return:**

Returns a resolved or rejected promise depending on if the browser had launched successfully.

## launchServer & servePlatform Options

The `options` object passed to `launchServer()` and `servePlatform()` supports the following values (all optional):

Options | Description
-|-
`root` | The file path on the local file system that is used as the root for the server, for default mapping of URL path to the local file system path.
`port` | The port for the server. Note that if this port is already in use, it will be incremented until a free port is found.
`router` | An `ExpressJS` router. If provided, this will be attached *before* default static handling.
`noLogOutput` | If true, all log output will be turned off.
`noServerInfo` | If `true`, the `Static file server running on...` message will not be outputed.
`events` | An `EventEmitter` to use for logging. If provided, logging will be output using `events.emit('log', msg)`. If not provided, `console.log()` will be used. Note that nothing will be output in either case if `noLogOutput` is `true`.
