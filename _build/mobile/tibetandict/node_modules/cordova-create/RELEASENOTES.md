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
# Cordova-create Release Notes

### 5.0.0 (May 13, 2023)

* [GH-82](https://github.com/apache/cordova-create/pull/82) dep!: packages upgrade & requirements
  * Bumped Packages
    * `@cordova/eslint-config@latest@5.0.0`
    * `cordova-common@5.0.0`
    * `cordova-fetch@4.0.0`
    * `fs-extra@11.1.1`
    * `jasmine@4.6.0`
    * `rewire@6.0.0`
    * `npm-package-arg@10.1.0`
  * Rebuilt `package-lock.json`
  * Bumped `node` engine requirement `>=16.13.0`

### 4.1.0 (Dec 26, 2022)

* [GH-73](https://github.com/apache/cordova-create/pull/73) dep(npm): bump dependencies to latest minor/patch & rebuild package-lock
  * `cordova-common@^4.1.0`
  * `cordova-fetch@^3.1.0`
  * `fs-extra@^10.1.0`
  * `globby@^11.1.0`
  * `jasmine@^3.99.0`
* [GH-74](https://github.com/apache/cordova-create/pull/74) ci(workflow): update node support & action dependencies

### 4.0.0 (Nov 30, 2021)

* [GH-68](https://github.com/apache/cordova-create/pull/68) dep!: update all dependencies
  * `cordova-app-hello-world@^6.0.0`
  * `cordova-common@^4.0.2`
  * `cordova-fetch@^3.0.1`
* [GH-67](https://github.com/apache/cordova-create/pull/67) chore: clean up `package.json`
* [GH-66](https://github.com/apache/cordova-create/pull/66) ci: add node 14 to workflow

### 3.0.0 (May 19, 2020)

* [GH-65](https://github.com/apache/cordova-create/pull/65) chore(`npm`): bump dependencies w/ rebuilt `package-lock`
* [GH-64](https://github.com/apache/cordova-create/pull/64) refactor: small syntax changes
* [GH-63](https://github.com/apache/cordova-create/pull/63) chore: various cleanup changes
* [GH-60](https://github.com/apache/cordova-create/pull/60) chore(`eslint`): bump package
* [GH-59](https://github.com/apache/cordova-create/pull/59) breaking(`npm`): bump dependencies
* [GH-62](https://github.com/apache/cordova-create/pull/62) ci: use GitHub Actions
* [GH-58](https://github.com/apache/cordova-create/pull/58) chore(`npm`): use short notation in `package.json`
* [GH-55](https://github.com/apache/cordova-create/pull/55) chore: `eslint` config cleanup
* [GH-53](https://github.com/apache/cordova-create/pull/53) feat: support `.gitignore` files in generated app
* [GH-54](https://github.com/apache/cordova-create/pull/54) refactor: `eslint` setup
* [GH-52](https://github.com/apache/cordova-create/pull/52) Fix `isRemoteUri`
* [GH-51](https://github.com/apache/cordova-create/pull/51) Add syntax highlighting to code samples in `README`
* [GH-48](https://github.com/apache/cordova-create/pull/48) chore: update testing (`jasmine` & `nyc`)
* [GH-40](https://github.com/apache/cordova-create/pull/40) breaking: major usability & maintainability improvements
  * Write `package.json` with indentation of 2
  * Simplify interface of main export (§1)
  * New logic for setting attributes in `package.json` & `config.xml` (§3)
  * Do not copy "missing" files from default template (§5)
  * Reduce number of supported template layouts (§7)
  * Drop support for linking (§8)
  * Use either `opts.events` or a no-op for logging (§4)
* [GH-50](https://github.com/apache/cordova-create/pull/50) chore: improve `npm` ignore list
* [GH-49](https://github.com/apache/cordova-create/pull/49) chore: bump production dependencies
* [GH-47](https://github.com/apache/cordova-create/pull/47) breaking: drop `node` 6 and 8 support
* [GH-42](https://github.com/apache/cordova-create/pull/42) chore: bump `eslint-utils` from 1.3.1 to 1.4.3
* [GH-44](https://github.com/apache/cordova-create/pull/44) chore: bump `js-yaml` from 3.12.0 to 3.13.1
* [GH-43](https://github.com/apache/cordova-create/pull/43) chore: bump `lodash` from 4.17.11 to 4.17.15
* [GH-45](https://github.com/apache/cordova-create/pull/45) chore: replace `http` URLs in `package-lock.json` w/ `https`
* [GH-41](https://github.com/apache/cordova-create/pull/41) chore: update `nyc` dev dependency
* [GH-39](https://github.com/apache/cordova-create/pull/39) chore: add Node.js 12 to CI services
* chore: remove deprecated `engineStrict` from `package.json`

### 2.0.0 (Jan 07, 2019)
* Updated Cordova Package Dependencies (#36) & (#38)
* Updated External Package Dependencies (#35) & (#38)
* Updated `package.json` bug tracker link (#37)
* Drop Q, use native promises (#33)
* Update Apache License version in test fixture (#32)
* Fix version in package-lock.json (#30)
* Commit package-lock.json (#28)
* Mark 2.0.0-dev (major update) (#27)
* Reformat & cleanup `README`
* Non-breaking cleanup & improvements (#20)
* Update nyc and ignore HTML coverage reports
* Determine code coverage during tests (#17)
* [CB-14140](https://issues.apache.org/jira/browse/CB-14140) Use fs-extra instead of shelljs (#19)
* Drop support for reading from .cordova/config.json (#18)
* Refactor tests (#16)
* Fix error messages for toExist matcher (#15)
* Major code cleanup (Remove deadcode, cleanup, refactor, update dependencies, etc.) #13
* Update node versions for CI and drop support for node 4 (#12)

### 1.1.2 (Dec 14, 2017)
* [CB-12807](https://issues.apache.org/jira/browse/CB-12807): updated error message to follow the template guide
* [CB-13674](https://issues.apache.org/jira/browse/CB-13674): updated deps
* [CB-13501](https://issues.apache.org/jira/browse/CB-13501): added support for node 8 to tests

### 1.1.1 (May 08, 2017)
* [CB-12765](https://issues.apache.org/jira/browse/CB-12765) default app `cordova-app-hello-world` is now treated like a template

### 1.1.0 (May 02, 2017)
* [CB-10681](https://issues.apache.org/jira/browse/CB-10681) templates will add `@latest` when fetching from npm when no version is specified. This will ensure an older cahced version of the template is not used
* [CB-12666](https://issues.apache.org/jira/browse/CB-12666) - Remove `node 0.x` support.
* [CB-12517](https://issues.apache.org/jira/browse/CB-12517): `package.json` `displayname` should equal `config.xml` name feild and `package.json` `name` feild should equal `config.xml` `id` feild.

### 1.0.2 (Jan 17, 2017)
* change event from `warn` to `verbose`
* Add github pull request template

### 1.0.1 (Sep 29, 2016)
* removed stripping eventlisteners

### 1.0.0 (August 23, 2016)
* [CB-11623](https://issues.apache.org/jira/browse/CB-11623) added symlinking option
* fixed jasmine custom matcher for `toExist`
* updated jasmine dep, fixed caching issue with tests
* added `travis` and `appveyor` support
* version 1.0.0 for **npm**
