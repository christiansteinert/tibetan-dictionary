/**
 * Data access module for the Tibetan Dictionary
 * Provides two implementations:
 * - PhpDataAccess: AJAX calls to PHP backend (web deployment)
 * - CordovaDataAccess: Direct SQLite access via Cordova plugin (Android)
 * 
 * All methods return Promises for consistent async handling.
 */

export class PhpDataAccess {
    /**
     * Serialize an object to URL-encoded form data
     * @param {Object} obj - The object to serialize
     * @param {string} [prefix] - Prefix for nested keys
     * @returns {string} URL-encoded string
     */
    #serialize(obj, prefix = '') {
        const params = [];
        for (const [key, value] of Object.entries(obj)) {
            const paramKey = prefix ? `${prefix}[${key}]` : key;
            if (Array.isArray(value)) {
                for (const item of value) {
                    params.push(encodeURIComponent(paramKey + '[]') + '=' + encodeURIComponent(item));
                }
            } else if (typeof value === 'object' && value !== null) {
                params.push(this.#serialize(value, paramKey));
            } else {
                params.push(encodeURIComponent(paramKey) + '=' + encodeURIComponent(value));
            }
        }
        return params.join('&');
    }

    /**
     * Send a POST request and return a Promise with the JSON response
     * @param {Object} data - The data to send
     * @returns {Promise<any>}
     */
    #post(data) {
        const body = this.#serialize(data);
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'dict.php', true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            };
            xhr.onerror = function() {
                reject(new Error('Network error'));
            };
            xhr.send(body);
        });
    }

    /**
     * Read definitions for a term
     * @param {string} term - The term to look up
     * @param {string} lang - Language ('tib' or 'en')
     * @param {string[]} dictionaries - List of dictionary IDs to search
     * @returns {Promise<{term: string, definitions: Object}>}
     */
    readTerm(term, lang, dictionaries) {
        return this.#post({ term, lang, dictionaries })
            .then(data => ({ term, definitions: data }));
    }

    /**
     * Search for terms matching input
     * @param {string} inputText - Search text
     * @param {string} lang - Language ('tib' or 'en')
     * @param {number} offset - Pagination offset
     * @param {number} maxResults - Maximum results to return
     * @param {string[]} dictionaries - List of dictionary IDs to search
     * @returns {Promise<Array>} Array of matching terms
     */
    readTermList(inputText, lang, offset, maxResults, dictionaries) {
        return this.#post({
            search: inputText,
            lang,
            offset,
            maxresults: maxResults,
            dictionaries
        });
    }

    /**
     * Check which Tibetan sections have dictionary entries
     * @param {Object} sections - Map of sectionId to section info
     * @returns {Promise<Object>} Map of available sections
     */
    checkTibetanSectionsForLinks(sections) {
        return this.#post({ checkTerms: sections });
    }

    /**
     * Initialize the database connection
     * @returns {Promise<void>}
     */
    initDB() {
        // No initialization needed for PHP backend
        return Promise.resolve();
    }
}


export class CordovaDataAccess {
    constructor() {
        this.DB_NAME = "TibetanDictionary";
        this.db = null;
    }

    #openDB() {
        try {
            if (!this.db) {
                const db = window.sqlitePlugin.openDatabase({
                    name: this.DB_NAME,
                    location: 'default',
                    androidDatabaseImplementation: 2 // use built-in Database class of Android rather than alternative plugin with native lib
                }, function(db) { //success
                    // do nothing
                }, function(msg) { // error
                    cordova.exec(function(msg) {
                        const errorMsg = "<h1>Sorry, there was an error while initializing the database - the app is unable to continue :-(</h1><p>The app could not copy the dictionary database onto your device and is therefore unable to function. Check if you have enough internal memory available on your device (100MB or more). Please send the following information to the following email address: dictionary@christian-steinert.de</p><p>THANK YOU!</p><p>&nbsp;</p><h1>Error log:</h1><ul style=\"text-align:left\"><li>" + msg.replace(/\n/g, "</li><li>") + "</li></ul>";
                        $('#init').html(errorMsg);
                    }, function() {}, "SQLitePlugin", "getLog", []);
                });

                this.db = db;
            }
            return this.db;
        } catch (e) {
           throw 'error while opening DB:' + e.message;
        }
    }

    /** build an SQL WHERE-clause for an array of values */
    #mergeOrClauses(paramName, paramValues) {
        const clauses = [];
        for (const value of paramValues) {
            const sqlEscape = value.replace(/"/g, '""').replace(/\\/g, '\\\\');
            clauses.push(paramName + '="' + sqlEscape + '"');
        }
        return '(' + clauses.join(' OR ') + ')';
    }

    #getTabName(lang) {
        if (lang === 'en')
            return 'DICT_EN';
        else
            return 'DICT';
    }

    /**
     * Read definitions for a term
     * @param {string} term - The term to look up
     * @param {string} lang - Language ('tib' or 'en')
     * @param {string[]} dictionaries - List of dictionary IDs to search
     * @returns {Promise<{term: string, definitions: Object}>}
     */
    readTerm(term, lang, dictionaries) {
        return new Promise((resolve, reject) => {
            try {
                const db = this.#openDB();
            } catch (e) {
                reject(new Error(e.message));
                return;
            }

            db.transaction((tx) => {
                try {
                    const tab = this.#getTabName(lang);
                    const tabLang = (lang === "en") ? "en" : "bo";
                    tx.executeSql(
                        'SELECT ' + tab + '.term as term, ' + tab + '.definition as definition, DICTNAMES.name as dictionary FROM ' + tab + ' inner join DICTNAMES on ' + tab + '.dictionary = DICTNAMES.id and DICTNAMES.language = "' + tabLang + '" WHERE term=?',
                        [term],
                        function(tx, results) {
                            const len = results.rows.length;
                            const definitions = {};
                            for (let i = 0; i < len; i++) {
                                const row = results.rows.item(i);
                                if (definitions[row.dictionary]) {
                                    definitions[row.dictionary] += '\\n-----\\n' + row.definition;
                                } else {
                                    definitions[row.dictionary] = row.definition;
                                }
                            }
                            resolve({ term, definitions });
                        },
                        function(tx, error) {
                            alert('SQL error while reading term "' + term + '" from DB:' + error.message);
                            reject(new Error('SQL error while reading term "' + term + '" from DB: ' + error.message));
                        }
                    );
                } catch (e) {
                    alert('error while checking existence of terms:' + e.message);
                    reject(new Error('Error while reading term "' + term + '" from DB: ' + e.message));
                }
            });
        });
    }


    /**
     * Check which Tibetan sections have dictionary entries
     * @param {Object} sections - Map of sectionId to section info
     * @returns {Promise<Object>} Map of available sections
     */
    checkTibetanSectionsForLinks(sections) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const wylieSections = [];
                for (const [sectionId, sectionInfo] of Object.entries(sections)) {
                    wylieSections.push(sectionInfo.wylie);
                }
                const termQuery = this.#mergeOrClauses('term', wylieSections);
                const db = this.#openDB();

                db.transaction(function(tx) {
                    try {
                        tx.executeSql('SELECT DISTINCT term FROM DICT WHERE ' + termQuery, [], function(tx, results) {
                            const availableSections = {};
                            const len = results.rows.length;
                            for (let i = 0; i < len; i++) {
                                const row = results.rows.item(i);
                                for (const [sectionId, sectionInfo] of Object.entries(sections)) {
                                    if (sectionInfo.wylie === row.term) {
                                        availableSections[sectionId] = sectionInfo;
                                    }
                                }
                            }
                            resolve(availableSections);
                        }, function(tx, error) {
                            reject(new Error('SQL error while checking existence of terms: ' + error.message));
                        });
                    } catch (e) {
                        reject(new Error('Error while checking existence of terms: ' + e.message));
                    }
                });
            }, 10);
        });
    }


    /**
     * Initialize the database connection
     * @returns {Promise<void>}
     */
    initDB() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // open the db and make sure that it is available by selecting one record from it.
                const db = this.#openDB();
                db.transaction(function(tx) {
                    try {
                        tx.executeSql('SELECT * FROM DICT WHERE term="chos" LIMIT 1', [], function(tx, results) {
                            if (results.rows.length) {
                                resolve();
                            }
                        }, function(tx, error) {
                            reject(new Error('SQL error while trying to read from the database: ' + error.message));
                        });
                    } catch (e) {
                        reject(new Error('Error while trying to read from the database: ' + e.message));
                    }
                });
            }, 100);
        });
    }

    /**
     * Search for terms matching input
     * @param {string} term - Search text
     * @param {string} lang - Language ('tib' or 'en')
     * @param {number} offset - Pagination offset
     * @param {number} maxResults - Maximum results to return
     * @param {string[]} dictionaries - List of dictionary IDs to search
     * @returns {Promise<Array>} Array of matching terms
     */
    readTermList(term, lang, offset, maxResults, dictionaries) {
        return new Promise((resolve, reject) => {
            const db = this.#openDB();
            term = term.replace(/\s*[/]\s*$/, '');

            db.transaction((tx) => {
                try {
                    const dictQuery = this.#mergeOrClauses('DICTNAMES.name', dictionaries);
                    const tab = this.#getTabName(lang);
                    let query;
                    let queryParams;

                    if (term.indexOf("*") >= 0) { // wildcard search
                        const likeSearch = term.replace(/[*]/g, '%') + '%';
                        const langId = (lang === "tib") ? "bo" : "en";

                        query = 'SELECT DISTINCT ' + tab + '.term as term FROM ' + tab + ' inner join DICTNAMES on ' + tab + '.dictionary = DICTNAMES.id and DICTNAMES.language = "' + langId + '" WHERE ( ( term LIKE ? ) AND ( ' + dictQuery + ' ) ) GROUP BY term ORDER BY lower(term), term LIMIT ' + maxResults + ' OFFSET ' + offset;
                        queryParams = [likeSearch];

                    } else if (lang === "tib") { // regular Tibetan search
                        const termSearch1 = term + ' ';
                        const termSearch2 = term + ' zzzzz';

                        query = 'SELECT DISTINCT ' + tab + '.term as term FROM ' + tab + ' inner join DICTNAMES on ' + tab + '.dictionary = DICTNAMES.id and DICTNAMES.language = "bo" WHERE ( (( term = ? ) OR ( term > ? AND term < ? )) AND ' + dictQuery + ' ) GROUP BY term ORDER BY lower(term), term LIMIT ' + maxResults + ' OFFSET ' + offset;
                        queryParams = [term, termSearch1, termSearch2];

                    } else { // regular English search
                        const termSearch1 = term;
                        const termSearch2 = term + 'zzzzz';

                        query = 'SELECT DISTINCT ' + tab + '.term as term FROM ' + tab + ' inner join DICTNAMES on ' + tab + '.dictionary = DICTNAMES.id and DICTNAMES.language = "en" WHERE ( (( term = ? COLLATE NOCASE ) OR ( term > ? COLLATE NOCASE AND term < ?  COLLATE NOCASE )) AND ' + dictQuery + ' ) GROUP BY term ORDER BY lower(term), term LIMIT ' + maxResults + ' OFFSET ' + offset;
                        queryParams = [term, termSearch1, termSearch2];
                    }

                    tx.executeSql(query, queryParams, function(tx, results) {
                        const result = [];
                        const len = results.rows.length;
                        for (let i = 0; i < len; i++) {
                            const row = results.rows.item(i);
                            result.push([row.term]);
                        }
                        resolve(result);
                    }, function(tx, error) {
                        reject(new Error('SQL error while reading termlist for input "' + term + '" from DB: ' + error.message));
                    });
                } catch (e) {
                    reject(new Error('Error while reading termlist for input "' + term + '" from DB: ' + e.message));
                }
            });
        });
    }
}
