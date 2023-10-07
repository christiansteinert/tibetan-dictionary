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

# cordova-create

[![NPM](https://nodei.co/npm/cordova-create.png)](https://nodei.co/npm/cordova-create/)

[![Node CI](https://github.com/apache/cordova-create/workflows/Node%20CI/badge.svg?branch=master)](https://github.com/apache/cordova-create/actions?query=branch%3Amaster)
[![codecov.io](https://codecov.io/github/apache/cordova-create/coverage.svg?branch=master)](https://codecov.io/github/apache/cordova-create?branch=master)

This module is used for creating Cordova style projects. It also incudes support for [Cordova App Templates](http://cordova.apache.org/docs/en/latest/guide/cli/template.html). It can fetch templates from npm and git.

## Usage

```js
const create = require('cordova-create');
await create(dest, opts);
```

### Parameters

#### `dest`

_Required_. Path to the destination where the project will be created. Must be an empty dir if it exists.

#### `opts`

_Optional_. Supports following properties.

```js
{
    // Attributes to be set in package.json & config.xml
    id: String,
    name: String,
    version: String,

    // The path/url/package-name to the template that should be used
    template: String,

    // An EventEmitter instance that will be used for logging purposes
    // (actually it only needs to implement a compatible `emit` method)
    events: EventEmitter
}
```
