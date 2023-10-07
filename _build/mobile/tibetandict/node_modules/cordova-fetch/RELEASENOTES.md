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
# Cordova-fetch Release Notes

### 4.0.0 (Apr 06, 2023)

* [GH-108](https://github.com/apache/cordova-fetch/pull/108) dep!: bumped `node` & `npm` engine requirment & dependencies w/ `package-lock` rebuild
  * Engine Requirement Update
    * Node: `>= 16.13.0`
    * npm: `>= 8.1.0`
  * Package Upgrade
    * `@npmcli/arborist@6.2.5`
    * `pacote@15.1.1`
    * `npm-package-arg@10.1.0`
    * `@cordova/eslint-config@5.0.0`
    * `fs-extra@11.1.1`
    * `cordova-common@5.0.0`
    * `jasmine@4.6.0`
* [GH-109](https://github.com/apache/cordova-fetch/pull/109) dep!: bump `which@3.0.0`
* [GH-102](https://github.com/apache/cordova-fetch/pull/102) dep(npm): update `pacote@15.0.7`
* [GH-75](https://github.com/apache/cordova-fetch/pull/75) refactor: replace `superspawn` with `execa`
* [GH-110](https://github.com/apache/cordova-fetch/pull/110) test: remove private internal method testing and `rewire`
* [GH-111](https://github.com/apache/cordova-fetch/pull/111) ci: sync `codecov-action` setup between other repos

### 3.1.0 (Dec 06, 2022)

* [GH-101](https://github.com/apache/cordova-fetch/pull/101) ci(workflow): update node 14 to use npm ^7.2
* [GH-100](https://github.com/apache/cordova-fetch/pull/100) ci(workflow): update action dependencies & node versions
* [GH-98](https://github.com/apache/cordova-fetch/pull/98) dep(npm): bump w/ latetst minor & patch releases
  * `cordova-common@^4.1.0`
  * `fs-extra@^9.1.0`
  * `npm-package-arg@^8.1.5`
  * `pacote@^11.3.5`
  * `resolve@^1.22.1`
  * `semver@^7.3.8`
  * `jasmine@^3.99.0`
  * `nyc@^15.1.0`
* [GH-97](https://github.com/apache/cordova-fetch/pull/97) chore(npm): rebuilt `package-lock` to v2
* [GH-94](https://github.com/apache/cordova-fetch/pull/94) ci(workflow): replace node 15 with node 16 (npm@7)
* [GH-93](https://github.com/apache/cordova-fetch/pull/93) chore(npm): update `package-lock`

### 3.0.1 (Feb 02, 2021)

* [GH-91](https://github.com/apache/cordova-fetch/pull/91) fix: cordova-fetch with npm@7
* [GH-89](https://github.com/apache/cordova-fetch/pull/89) refactor: use async/await where applicable
* [GH-88](https://github.com/apache/cordova-fetch/pull/88) fix: do not pack rejections from resolve in array
* [GH-90](https://github.com/apache/cordova-fetch/pull/90) fix: use POSIX-style paths for require.resolve & Co
* [GH-86](https://github.com/apache/cordova-fetch/pull/86) ci: add node 14 to workflow

### 3.0.0 (Apr 07, 2020)

* Added NOTICE & LICENSE file for release
* [GH-84](https://github.com/apache/cordova-fetch/pull/84) doc(README): fix markdown lint warning
* [GH-82](https://github.com/apache/cordova-fetch/pull/82) refactor: modernize code & update `README`
  * refactor: transform `var` to `let` & `const`
  * refactor: consolidate `cordova-common` vars
  * refactor: transform arrow functions & arrow returns
  * refactor: transform template strings
  * doc(README): update & formatting
  * chore(npm): update package repo & bugs url
  * chore: apply suggestions
  * chore: revert promise chain flattening
* [GH-83](https://github.com/apache/cordova-fetch/pull/83) breaking(npm): bump dependencies
  * `@cordova/eslint-config@^3.0.0`
  * `nyc@^15.0.0`
  * `rewire@^5.0.0`
  * `cordova-common@^3.2.1`
  * `fs-extra@^9.0.0`
  * `npm-package-arg@^8.0.1`
  * `pify@^5.0.0`
  * `resolve@^1.15.1`
  * `semver@^7.1.3`
  * `which@^2.0.2`
  * `cordova-common@4.0.0`
* [GH-79](https://github.com/apache/cordova-fetch/pull/79) feat: update package & ci services
  * ci: replace current services with gh-actions
  * ci(gh-action): update workflow
  * chore(package-lock): rebuild
  * chore(npm): drop appveyor from ignore list
  * chore(npm-script): rename cover to test:coverage
* [GH-81](https://github.com/apache/cordova-fetch/pull/81) chore: consolidate eslint configs
* [GH-70](https://github.com/apache/cordova-fetch/pull/70) refactor: eslint setup
* Save platforms and plugins to devDependencies
* [GH-72](https://github.com/apache/cordova-fetch/pull/72) chore: update `file-url` dependency to `^3.0.0`
* [GH-80](https://github.com/apache/cordova-fetch/pull/80) Drop code supporting `npm@<5`
* [GH-74](https://github.com/apache/cordova-fetch/pull/74) chore: improve npm ignore list
* [GH-73](https://github.com/apache/cordova-fetch/pull/73) chore: bump production dependencies
* [GH-71](https://github.com/apache/cordova-fetch/pull/71) chore: update `jasmine` dependencies
* [GH-69](https://github.com/apache/cordova-fetch/pull/69) chore: drop node 6 and 8 support
* [GH-68](https://github.com/apache/cordova-fetch/pull/68) chore: bump version to 3.0.0-dev
* [GH-78](https://github.com/apache/cordova-fetch/pull/78) Work around npm bug when uninstalling old cordova platforms
* [GH-77](https://github.com/apache/cordova-fetch/pull/77) chore: update `nyc` dev dependency
* [GH-63](https://github.com/apache/cordova-fetch/pull/63) Add Node.js 12 to CI Services

### 2.0.1 (Mar 18, 2019)

* [GH-61](https://github.com/apache/cordova-fetch/pull/61) Prepare Fetch 2.0.1 Patch Release
  * Bumped Dependencies
    * `cordova-common@^3.1.0`
    * `fs-extra@^7.0.1`
    * `pify@^4.0.1`
    * `resolve@^1.10.0`
    * `semver@^5.6.0`
  * Bumped Dev Dependencies
    * `eslint@^5.15.2`
    * `eslint-plugin-import@^2.16.0`
    * `eslint-plugin-node@^8.0.1`
    * `eslint-plugin-promise@^4.0.1`
    * `jasmine@^3.3.1`
    * `nyc@^13.3.0`
    * `rewire@^4.0.1`
* [GH-60](https://github.com/apache/cordova-fetch/pull/60) Properly detect npm install package name

### 2.0.0 (Dec 20, 2018)
* dependency updates (cordova-common@3, etc.)
* Collect test coverage during `npm test` (#48)
* Drop Q, use native promises (#49)
* Handle broken NODE_PATH setups gracefully (#50)
* Run test in well-defined directory (#51)
* Look for node_modules in any recursive parent directory (#44)
* Add ESLint config file for tests (#41)
* Improve and update docs (#42)
* GH-35 .ratignore ignore *.git
* GH-35 add license header to dummy-local-plugin
* dos2unix spec/support/dummy-local-plugin/plugin.xml
* eslint devDep updates (#28)
* [CB-14173](https://issues.apache.org/jira/browse/CB-14173) Fix cordova <platform|plugin> add --link (#26)
* [CB-14133](https://issues.apache.org/jira/browse/CB-14133) Avoid fetching already installed packages
* Speed up tests by about 250%
* Simplify fetch unit tests
* Move and rename some e2e tests
* Refactor fetch e2e tests
* Refactor fetch code
* Use fs.readJsonSync for reading `package.json` to avoid caching
* Replace shelljs with fs-extra and which
* Simplify tempDir setup in tests
* Don't manually delete node_modules contents
* Simplify installation location retrieval (#18)
* Handle missing options (#22)
* Add workaround for failing tests on AppVeyor/Node10
* [CB-14066](https://issues.apache.org/jira/browse/CB-14066) Drop support for Node 4
* Fix repo url in `package.json` (#20)
* Increase test timeouts to reduce spurious failures (#19)
* Isolate Q usage to prepare later removal
* Fail test if promise unexpectedly resolves
* Let jasmine handle promises
* Fix linting errors
* Lint all *.js files in the repo
* [CB-13503](https://issues.apache.org/jira/browse/CB-13503) fix trimID bug when using file:path/to/plugin
* Adding a unit test
* Enabling support for git+http

### 1.3.0 (Dec 14, 2017)
* [CB-13055](https://issues.apache.org/jira/browse/CB-13055): added workaround for when `jsonDiff` has more than one different key. 
* Support git shortlink package references

### 1.2.1 (Oct 27, 2017)
* [CB-13504](https://issues.apache.org/jira/browse/CB-13504) updating `package.json` versions for cordova-fetch 1.2.1 release
* [CB-13501](https://issues.apache.org/jira/browse/CB-13501) : added support for node 8
* [CB-13492](https://issues.apache.org/jira/browse/CB-13492) : updating opts.save and including a tests for no-save
* [CB-13380](https://issues.apache.org/jira/browse/CB-13380) Incremented package version to -dev

### 1.2.0 (Oct 04, 2017)
* [CB-13353](https://issues.apache.org/jira/browse/CB-13353) added `saveexact` as an option and updated fetch test
* [CB-13308](https://issues.apache.org/jira/browse/CB-13308), [CB-13252](https://issues.apache.org/jira/browse/CB-13252) fix issue with plugins turning into symlinks on restore
* [CB-13303](https://issues.apache.org/jira/browse/CB-13303) setting production flag to true by default during npm install
* [CB-12895](https://issues.apache.org/jira/browse/CB-12895) setting up `eslint` and removing `jshint`
* [CB-13010](https://issues.apache.org/jira/browse/CB-13010) Improve logic for searching packages which being installed from `git url`
* [CB-11980](https://issues.apache.org/jira/browse/CB-11980) fixed incorrect `appveyor` image
* [CB-12786](https://issues.apache.org/jira/browse/CB-12786) Improve logic for searching plugin id in case of module already exists in `node_modules`
* [CB-12762](https://issues.apache.org/jira/browse/CB-12762) updated `packageJson` to github mirrors
* [CB-12787](https://issues.apache.org/jira/browse/CB-12787) Fix plugin installation with `--link` option
* [CB-12738](https://issues.apache.org/jira/browse/CB-12738) Cordova ignores plugin dependency version on **windows** platform

### 1.1.0 (May 02, 2017)
* [CB-12665](https://issues.apache.org/jira/browse/CB-12665): removed `enginestrict` since it is deprecated
* added support for dealing with local path targets

### 1.0.2 (Jan 17, 2017)
* [CB-12358](https://issues.apache.org/jira/browse/cb-12358) updated cordova-common dep for cordova-fetch to 2.0.0

### 1.0.0 (May 12, 2016)
* [CB-9858](https://issues.apache.org/jira/browse/CB-9858) Added jasmine tests
* [CB-9858](https://issues.apache.org/jira/browse/CB-9858) Added `npm uninstall` method to cordova-fetch
* [CB-9858](https://issues.apache.org/jira/browse/CB-9858) Initial implementation of `cordova-fetch` module
