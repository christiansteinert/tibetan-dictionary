/**
 * Cordova backend for the Tibetan Dictionary app.
 *
 * Talks directly to the embedded SQLite database via the Cordova SQLite plugin.
 */

export class CordovaDictionaryApi {
  private DB_NAME = 'TibetanDictionary';
  private db: any = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private openDB(): any {
    if (this.db) return this.db;

    const sqlitePlugin = (window as any).sqlitePlugin;
    if (!sqlitePlugin) {
      throw new Error('Cordova SQLite plugin is not available');
    }

    this.db = sqlitePlugin.openDatabase(
      {
        name: this.DB_NAME,
        location: 'default',
        androidDatabaseImplementation: 2,
      },
      () => {
        // success
      },
      (msg: unknown) => {
        console.error('SQLite open error', msg);
      }
    );

    return this.db;
  }

  private mergeOrClauses(paramName: string, paramValues: string[]): string {
    const clauses: string[] = [];
    for (const value of paramValues) {
      const sqlEscape = value.replace(/"/g, '""').replace(/\\/g, '\\\\');
      clauses.push(`${paramName}="${sqlEscape}"`);
    }
    return `(${clauses.join(' OR ')})`;
  }

  private getTabName(lang: string) {
    return lang === 'en' ? 'DICT_EN' : 'DICT';
  }

  async readTerm(term: string, lang: string, dictionaries: string[]) {
    return new Promise<{ term: string; definitions: Record<string, string> }>((resolve, reject) => {
      const db = this.openDB();

      db.transaction((tx: any) => {
        try {
          const tab = this.getTabName(lang);
          const tabLang = lang === 'en' ? 'en' : 'bo';
          const query =
            'SELECT ' +
            tab +
            '.term as term, ' +
            tab +
            '.definition as definition, DICTNAMES.name as dictionary FROM ' +
            tab +
            ' inner join DICTNAMES on ' +
            tab +
            '.dictionary = DICTNAMES.id and DICTNAMES.language = "' +
            tabLang +
            '" WHERE term=?';
          tx.executeSql(
            query,
            [term],
            function (_tx: any, results: any) {
              const len = results.rows.length;
              const definitions: Record<string, string> = {};
              for (let i = 0; i < len; i += 1) {
                const row = results.rows.item(i);
                if (definitions[row.dictionary]) {
                  definitions[row.dictionary] += '\n-----\n' + row.definition;
                } else {
                  definitions[row.dictionary] = row.definition;
                }
              }
              resolve({ term, definitions });
            },
            function (_tx: any, error: any) {
              reject(new Error('SQL error while reading term "' + term + '" from DB: ' + error.message));
            }
          );
        } catch (e: any) {
          reject(new Error('Error while reading term "' + term + '" from DB: ' + (e?.message ?? e)));
        }
      });
    });
  }

  async readTermList(
    term: string,
    lang: string,
    offset: number,
    maxResults: number,
    dictionaries: string[]
  ) {
    return new Promise<string[][]>((resolve, reject) => {
      term = term.replace(/\s*[\/]\s*$/, '');
      const db = this.openDB();

      db.transaction((tx: any) => {
        try {
          const dictQuery = this.mergeOrClauses('DICTNAMES.name', dictionaries);
          const tab = this.getTabName(lang);
          let query: string;
          let queryParams: any[];

          if (term.indexOf('*') >= 0) {
            const likeSearch = term.replace(/\*/g, '%') + '%';
            const langId = lang === 'tib' ? 'bo' : 'en';
            query =
              'SELECT DISTINCT ' +
              tab +
              '.term as term FROM ' +
              tab +
              ' inner join DICTNAMES on ' +
              tab +
              '.dictionary = DICTNAMES.id and DICTNAMES.language = "' +
              langId +
              '" WHERE ( ( term LIKE ? ) AND ( ' +
              dictQuery +
              ' ) ) GROUP BY term ORDER BY lower(term), term LIMIT ' +
              maxResults +
              ' OFFSET ' +
              offset;
            queryParams = [likeSearch];
          } else if (lang === 'tib') {
            const termSearch1 = term + ' ';
            const termSearch2 = term + ' zzzzz';
            query =
              'SELECT DISTINCT ' +
              tab +
              '.term as term FROM ' +
              tab +
              ' inner join DICTNAMES on ' +
              tab +
              '.dictionary = DICTNAMES.id and DICTNAMES.language = "bo" WHERE ( (( term = ? ) OR ( term > ? AND term < ? )) AND ' +
              dictQuery +
              ' ) GROUP BY term ORDER BY lower(term), term LIMIT ' +
              maxResults +
              ' OFFSET ' +
              offset;
            queryParams = [term, termSearch1, termSearch2];
          } else {
            const termSearch1 = term;
            const termSearch2 = term + 'zzzzz';
            query =
              'SELECT DISTINCT ' +
              tab +
              '.term as term FROM ' +
              tab +
              ' inner join DICTNAMES on ' +
              tab +
              '.dictionary = DICTNAMES.id and DICTNAMES.language = "en" WHERE ( (( term = ? COLLATE NOCASE ) OR ( term > ? COLLATE NOCASE AND term < ?  COLLATE NOCASE )) AND ' +
              dictQuery +
              ' ) GROUP BY term ORDER BY lower(term), term LIMIT ' +
              maxResults +
              ' OFFSET ' +
              offset;
            queryParams = [term, termSearch1, termSearch2];
          }

          tx.executeSql(
            query,
            queryParams,
            function (_tx: any, results: any) {
              const result: string[][] = [];
              const len = results.rows.length;
              for (let i = 0; i < len; i += 1) {
                const row = results.rows.item(i);
                result.push([row.term]);
              }
              resolve(result);
            },
            function (_tx: any, error: any) {
              reject(new Error('SQL error while reading termlist for input "' + term + '" from DB: ' + error.message));
            }
          );
        } catch (e: any) {
          reject(new Error('Error while reading termlist for input "' + term + '" from DB: ' + (e?.message ?? e)));
        }
      });
    });
  }

  async checkTibetanSectionsForLinks(sections: Record<string, unknown>) {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      setTimeout(() => {
        const wylieSections: string[] = [];
        for (const sectionInfo of Object.values(sections)) {
          if (sectionInfo && typeof sectionInfo === 'object' && 'wylie' in sectionInfo) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            wylieSections.push((sectionInfo as any).wylie);
          }
        }
        const termQuery = this.mergeOrClauses('term', wylieSections);
        const db = this.openDB();

        db.transaction((tx: any) => {
          try {
            tx.executeSql(
              'SELECT DISTINCT term FROM DICT WHERE ' + termQuery,
              [],
              function (_tx: any, results: any) {
                const availableSections: Record<string, unknown> = {};
                const len = results.rows.length;
                for (let i = 0; i < len; i += 1) {
                  const row = results.rows.item(i);
                  for (const [sectionId, sectionInfo] of Object.entries(sections)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if ((sectionInfo as any).wylie === row.term) {
                      availableSections[sectionId] = sectionInfo;
                    }
                  }
                }
                resolve(availableSections);
              },
              function (_tx: any, error: any) {
                reject(new Error('SQL error while checking existence of terms: ' + error.message));
              }
            );
          } catch (e: any) {
            reject(new Error('Error while checking existence of terms: ' + (e?.message ?? e)));
          }
        });
      }, 10);
    });
  }

  /**
   * Initialize the database connection.
   *
   * Ensures the SQLite database is open and readable by running a simple query.
   */
  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const db = this.openDB();
        db.transaction(
          (tx: any) => {
            try {
              tx.executeSql(
                'SELECT * FROM DICT WHERE term="chos" LIMIT 1',
                [],
                function (_tx: any, results: any) {
                  if (results.rows.length) {
                    resolve();
                  } else {
                    resolve();
                  }
                },
                function (_tx: any, error: any) {
                  reject(new Error('SQL error while trying to read from the database: ' + error.message));
                }
              );
            } catch (e: any) {
              reject(new Error('Error while trying to read from the database: ' + (e?.message ?? e)));
            }
          },
          (err: any) => {
            reject(err);
          }
        );
      }, 100);
    });
  }

  /**
   * Fulltext search — not yet implemented for the Cordova backend.
   * The mobile app uses the compressed database which has no FTS5 tables.
   */
  async fulltextSearch(
    _query: string,
    _lang: string,
    _offset: number,
    _maxResults: number,
    _dictionaries: string[]
  ): Promise<{ term: string; dictionary: string; dictionaryId: number; snippet: string }[]> {
    console.warn('fulltextSearch is not available in the Cordova backend');
    return [];
  }
}
