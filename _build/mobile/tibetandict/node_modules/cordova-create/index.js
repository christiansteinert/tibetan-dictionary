/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');
const npa = require('npm-package-arg');
const globby = require('globby');
const isObject = require('isobject');
const pathIsInside = require('path-is-inside');
const requireFresh = require('import-fresh');
const validateIdentifier = require('valid-identifier');
const fetch = require('cordova-fetch');
const { CordovaError, ConfigParser } = require('cordova-common');

module.exports = cordovaCreate;

/**
 * Creates a new cordova project in the given directory.
 *
 * @param {string} dest         directory where the project will be created.
 * @param {Object} [opts={}]    options to be used for creating the project.
 * @returns {Promise}           Resolves when project creation has finished.
 */
function cordovaCreate (dest, opts = {}) {
    let emit;
    // TODO this is to avoid having a huge diff. Remove later.
    let dir = dest;

    return Promise.resolve().then(() => {
        if (!dir) {
            throw new CordovaError('Directory not specified. See `cordova help`.');
        }

        if (!isObject(opts)) {
            throw new CordovaError('Given options must be an object');
        }

        // Shallow copy opts
        opts = Object.assign({}, opts);

        emit = getEventEmitter(opts);
        emit('verbose', 'Using detached cordova-create');

        // Make absolute.
        dir = path.resolve(dir);

        if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
            throw new CordovaError('Path already exists and is not empty: ' + dir);
        }

        if (opts.id && !validateIdentifier(opts.id)) {
            throw new CordovaError('App id contains a reserved word, or is not a valid identifier.');
        }

        if (!opts.template) {
            opts.template = require.resolve('cordova-app-hello-world');
        }

        // Ensure that the destination is outside the template location
        if (pathIsInside(dir, opts.template)) {
            throw new CordovaError(
                `Cannot create project "${dir}" inside the template used to create it "${opts.template}".`
            );
        }
    })
        .then(() => {
            // Finally, Ready to start!
            emit('log', 'Creating a new cordova project.');

            // Use cordova-fetch to obtain npm or git templates
            if (needsToBeFetched(opts.template)) {
                const target = opts.template;
                emit('verbose', 'Using cordova-fetch for ' + target);
                return fetch(target, getSelfDestructingTempDir(), {});
            } else {
                // If assets are not online, resolve as a relative path on local computer
                return path.resolve(opts.template);
            }
        })
        .then(templatePath => {
            let import_from_path;

            try {
                import_from_path = requireFresh(templatePath).dirname;
            } catch (e) {
                throw new CordovaError(templatePath + ' is not a valid template');
            }

            if (!fs.existsSync(import_from_path)) {
                throw new CordovaError('Could not find directory: ' +
                    import_from_path);
            }

            const dirAlreadyExisted = fs.existsSync(dir);
            if (!dirAlreadyExisted) {
                fs.mkdirSync(dir);
            }

            try {
                // Copy files from template to project
                emit('verbose', 'Copying assets.');
                fs.copySync(import_from_path, dir);
            } catch (e) {
                if (!dirAlreadyExisted) {
                    fs.removeSync(dir);
                }
                throw e;
            }

            // It is impossible to deploy .gitignore files via npm packages.
            // Instead, Cordova templates should include gitignore files that we
            // rename to .gitignore here. For more details see
            // https://github.com/apache/cordova-discuss/issues/69
            globby.sync(['**/gitignore'], { cwd: dir, absolute: true })
                .forEach(f =>
                    fs.moveSync(f, path.join(path.dirname(f), '.gitignore'))
                );

            // Write out id, name and version to config.xml
            const configPath = path.join(dir, 'config.xml');
            const conf = new ConfigParser(configPath);

            conf.setPackageName(opts.id || conf.packageName() || 'com.example.cordova.app');
            conf.setName(opts.name || conf.name() || 'Cordova Example App');
            conf.setVersion(opts.version || conf.version() || '1.0.0');

            conf.write();

            // Copy values from config.xml to package.json
            const pkgJsonPath = path.join(dir, 'package.json');
            if (fs.existsSync(pkgJsonPath)) {
                const pkgJson = requireFresh(pkgJsonPath);

                Object.assign(pkgJson, {
                    name: conf.packageName().toLowerCase(),
                    displayName: conf.name(),
                    version: conf.version()
                });

                fs.writeJsonSync(pkgJsonPath, pkgJson, { spaces: 2 });
            }
        });
}

function getEventEmitter ({ events }) {
    return events
        ? (...args) => events.emit(...args)
        : () => {};
}

// Creates temp dir that is deleted on process exit
function getSelfDestructingTempDir () {
    return tmp.dirSync({
        prefix: 'cordova-create-',
        unsafeCleanup: true
    }).name;
}

function needsToBeFetched (uri) {
    return npa(uri).type !== 'directory';
}
