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
# Cordova-serve Release Notes

### 4.0.1 (Jan 30, 2023)

* [GH-49](https://github.com/apache/cordova-serve/pull/49), [GH-51](https://github.com/apache/cordova-serve/pull/51), [GH-53](https://github.com/apache/cordova-serve/pull/53) chore: rebuilt package-lock.json
* [GH-52](https://github.com/apache/cordova-serve/pull/52) ci: update github action workflow
* [GH-46](https://github.com/apache/cordova-serve/pull/46) fix(main.js): color of 404 status in console logs
* [GH-45](https://github.com/apache/cordova-serve/pull/45) fix(main.js): resolve deprecation warning on Node.js 12
* [GH-44](https://github.com/apache/cordova-serve/pull/44) fix: pass mandatory args to platform API constructor
* chore(asf): Update GitHub repo metadata
* [GH-38](https://github.com/apache/cordova-serve/pull/38) ci: add node 14 to workflow
* chore(asf): update git notification settings
* Update CONTRIBUTING.md

### 4.0.0 (Apr 08, 2020)

* [GH-31](https://github.com/apache/cordova-serve/pull/31) doc(README): formatting, syntax updating, wording
* [GH-35](https://github.com/apache/cordova-serve/pull/35) refactor: transform template
* [GH-34](https://github.com/apache/cordova-serve/pull/34) refactor: transform object shorthand
* [GH-33](https://github.com/apache/cordova-serve/pull/33) refactor: transform arrow & arrow-returns
* [GH-32](https://github.com/apache/cordova-serve/pull/32) refactor: transform `var` to `let` & `const`
* [GH-30](https://github.com/apache/cordova-serve/pull/30) breaking: replace dependency `opn` w/ `open`
* [GH-29](https://github.com/apache/cordova-serve/pull/29) ci: replace existing services with GitHub Actions
* [GH-27](https://github.com/apache/cordova-serve/pull/27) chore(npm): update package & add ignore list
* [GH-28](https://github.com/apache/cordova-serve/pull/28) breaking(npm): bump dependencies
  * `@cordova/eslint-config@^3.0.0`
  * `rewire@^5.0.0`
  * `chalk@^3.0.0`
  * `compression@^1.7.4`
  * `express@^4.17.1`
  * `opn@^6.0.0`
  * `which@^2.0.2`
* [GH-25](https://github.com/apache/cordova-serve/pull/25) chore: consolidate `eslint` configs
* [GH-24](https://github.com/apache/cordova-serve/pull/24) chore: update `jasmine` dependencies & settings
* [GH-23](https://github.com/apache/cordova-serve/pull/23) refactor: `eslint` setup
* [GH-22](https://github.com/apache/cordova-serve/pull/22) chore: drop node 6 and 8 support
* [GH-20](https://github.com/apache/cordova-serve/pull/20) Spec cleanup
* [GH-19](https://github.com/apache/cordova-serve/pull/19) Improve linting
* [GH-17](https://github.com/apache/cordova-serve/pull/17) chore: remove appveyor allow node12 failure
* [GH-16](https://github.com/apache/cordova-serve/pull/16) Add Node.js 12 to CI Services
* Add or update GitHub pull request and issue template

### 3.0.0 (Dec 20, 2018)
* [CB-14198](https://issues.apache.org/jira/browse/CB-14198) (all) Fix bug when running simulate --target= under non-US **Windows** 10 (#14)
* Don't restore mocked resource prior to resolution (#15)
* Dependency updates & replacing shelljs with which
* [CB-14069](https://issues.apache.org/jira/browse/CB-14069) Drop Node 4, Add Node 10 Support
* [CB-14191](https://issues.apache.org/jira/browse/CB-14191) (android) Fix bug with module requiring (#10)

### 2.0.1 (Jun 06, 2018)
* Use `opn` module instead of deprecated `open`
* [CB-14054](https://issues.apache.org/jira/browse/CB-14054) (android) fixing `cordova-android` directory restructuring.
* [CB-14092](https://issues.apache.org/jira/browse/CB-14092) Fixing repository url
* [CB-13501](https://issues.apache.org/jira/browse/CB-13501) added support for node 8

### 2.0.0 (Aug 24, 2017)
* [CB-13188](https://issues.apache.org/jira/browse/CB-13188) set serve to use default system browser if none is provided.
* Change to `eslint` instead of `jshint`
* remove `q` dependence completely. Added `server.spec`
* added browser tests
* Convert `src/browser` to use Promise api
* Add License, Contributing, Notice, pr-template, ...
* [CB-12785](https://issues.apache.org/jira/browse/CB-12785) added travis and appveyor
* [CB-12762](https://issues.apache.org/jira/browse/CB-12762): updated common, fetch, and serve pkgJson to point pkgJson repo items to github mirrors
* [CB-12665](https://issues.apache.org/jira/browse/CB-12665) removed enginestrict since it is deprecated
* [CB-11977](https://issues.apache.org/jira/browse/CB-11977): updated engines and enginescript for common, fetch, and serve

### 1.0.1 (Jan 17, 2017)
* [CB-12284](https://issues.apache.org/jira/browse/CB-12284) Include project root as additional root for static router
* Some corrections and enhancements for cordova-serve readme.
* On Windows, verify browsers installed before launching.

### 1.0.0 (Oct 05, 2015)
* Refactor cordova-serve to use Express.

### 0.1.3 (Aug 22, 2015)
* Clean up cordova-serve console output.
* [CB-9546](https://issues.apache.org/jira/browse/CB-9546) cordova-serve.servePlatform() should provide project folders
* [CB-9545](https://issues.apache.org/jira/browse/CB-9545) Cordova-serve's 'noCache' option does not work in IE.
* Add support for --target=edge to launch app in Edge browser.

### 0.1.2 (June 15, 2015)
Initial release
