/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

var isWP8 = /IEMobile/.test(navigator.userAgent); // Matches WP(7/8/8.1)
var isWindows = /Windows /.test(navigator.userAgent); // Windows (8.1)
var isAndroid = !isWindows && /Android/.test(navigator.userAgent);

// NOTE: In the common storage-master branch there is no difference between the
// default implementation and implementation #2. But the test will also apply
// the androidLockWorkaround: 1 option in the case of implementation #2.
var pluginScenarioList = [
  isAndroid ? 'Plugin-implementation-default' : 'Plugin',
  'Plugin-implementation-2'
];

var pluginScenarioCount = isAndroid ? 2 : 1;

// simple tests:
var mytests = function() {

  for (var i=0; i<pluginScenarioCount; ++i) {

    describe(pluginScenarioList[i] + ': BATCH SQL test(s)', function() {
      var scenarioName = pluginScenarioList[i];
      var suiteName = scenarioName + ': ';
      var isImpl2 = (i === 1);

      // NOTE: MUST be defined in function scope, NOT outer scope:
      var openDatabase = function(name, ignored1, ignored2, ignored3) {
        if (isImpl2) {
          return window.sqlitePlugin.openDatabase({
            // prevent reuse of database from default db implementation:
            name: 'i2-'+name,
            androidDatabaseImplementation: 2,
            androidLockWorkaround: 1,
            location: 1
          });
        } else {
          return window.sqlitePlugin.openDatabase({name: name, location: 0});
        }
      }

      describe(pluginScenarioList[i] + ': Basic sql batch test(s)', function() {

        it(suiteName + 'Single-column batch sql test', function(done) {
          var db = openDatabase('Single-column-batch-sql-test.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.sqlBatch([
            'DROP TABLE IF EXISTS MyTable',
            'CREATE TABLE MyTable (SampleColumn)',
            [ 'INSERT INTO MyTable VALUES (?)', ['test-value'] ],
          ], function() {
            db.executeSql('SELECT * FROM MyTable', [], function (res) {
              expect(res.rows.item(0).SampleColumn).toBe('test-value');
              done();
            });
          }, function(error) {
            expect(true).toBe(false);
            done();
          });
        }, MYTIMEOUT);

        it(suiteName + 'batch sql with syntax error', function(done) {
          var db = openDatabase('batch-sql-syntax-error-test.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.sqlBatch([
            'DROP TABLE IF EXISTS MyTable',
            // syntax error below:
            'CRETE TABLE MyTable (SampleColumn)',
            [ 'INSERT INTO MyTable VALUES (?)', ['test-value'] ],
          ], function() {
            // not expected:
            expect(true).toBe(false);
            done();
          }, function(error) {
            // expected:
            expect(true).toBe(true);
            done();
          });
        }, MYTIMEOUT);

        it(suiteName + 'batch sql failure-safe semantics', function(done) {
          var db = openDatabase('batch-sql-failure-safe-test.db', '1.0', 'Test', DEFAULT_SIZE);

          expect(db).toBeDefined();

          db.executeSql('DROP TABLE IF EXISTS MyTable');
          db.executeSql('CREATE TABLE MyTable (SampleColumn)');
          db.executeSql('INSERT INTO MyTable VALUES (?)', ['test-value'], function() {
            db.sqlBatch([
              'DELETE FROM MyTable',
              // syntax error below:
              [ 'INSRT INTO MyTable VALUES (?)', 'test-value' ]
            ], function() {
              // not expected:
              expect(true).toBe(false);
              done();
            }, function(error) {
              // check integrity:
              db.executeSql('SELECT * FROM MyTable', [], function (res) {
                expect(res.rows.item(0).SampleColumn).toBe('test-value');
                done();
              });
            });

          }, function(error) {
            expect(true).toBe(false);
            done();
          });
        }, MYTIMEOUT);

      });

    });
  }
}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
