var PhpDataAccess={
    readTerm:function(term, lang, dictionaries, saveState) {
      $.ajax({
        type: 'POST',
        url: "dict.php",
        dataType: 'json',
        data: {
          term:term,
          lang:lang,
          dictionaries:dictionaries
        },
        cache: true,
      }).done(function(data) { 
        DICT.loadTerm(term, data, saveState);
      }).fail(function(xhr,msg,err) {
        alert(msg + '\n' + err);
      });
    },
    
    readTermList:function(inputText, lang, offset, maxResults, dictionaries, callback){        
      $.ajax({
        type: 'POST',
        url: 'dict.php',
        dataType: 'json',
        data: {
          search:inputText,
          lang:lang,
          offset:offset,
          maxresults:maxResults,
          dictionaries:dictionaries
        },
        cache: true,
      }).done(function(data) { 
        callback( data );
      }).fail(function(xhr,msg,err) {
        alert(msg + '\n' + err);
      });
    },
    
    checkTibetanSectionsForLinks:function( sections ) {
      var availableSections={};
      $.ajax({
        type: 'POST',
        url: 'dict.php',
        dataType: 'json',
        data: {
          checkTerms:sections
        },
        cache: true,
      }).done(function(data) {
        DICT.activateInlineTibetanSections(data);
      }).fail(function(xhr,msg,err) {
        alert(msg + '\n' + err);
      });
    },
    
    initDB:function(callback) {
      callback(); // no need to initialize the DB if the PHP backend on the server is used for data accesss. The app is ready right away
    },
  };




var CordovaDataAccess={
    DB_NAME:"TibetanDictionary",
    db:null,
    
    _openDB:function() {
      try{
        if(!this.db) {
          var db = window.sqlitePlugin.openDatabase({  
              name:this.DB_NAME,
              location:'default',
              androidDatabaseImplementation:2 // use built-in Database class of Android rather than alternative plugin with native lib
          }, function(db) { //success
              // do nothing
          }, function(msg) { // error
              cordova.exec(function(msg){ 
                var errorMsg = "<h1>Sorry, there was an error while initializing the database - the app is unable to continue :-(</h1><p>The app could not copy the dictionary database onto your device and is therefore unable to function. Check if you have enough internal memory available on your device (100MB or more). Please send the following information to the following email address: dictionary@christian-steinert.de</p><p>THANK YOU!</p><p>&nbsp;</p><h1>Error log:</h1><ul style=\"text-align:left\"><li>" + msg.replace(/\n/g,"</li><li>") + "</li></ul>";
                $('#init').html(errorMsg);
              }, function(){}, "SQLitePlugin", "getLog", []);
             
          });
          
          this.db = db;
        }
        return this.db;
      } catch(e) {
        alert('error while opening DB:'+e.message);
      }
    },

    /** build an SQL WHERE-clause for an array of values */
    _mergeOrClauses:function(paramName, paramValues) {
        var clauses=[];
        $.each(paramValues,function(index,value){
          var sqlEscape = value.replace(/"/g, '""' ).replace(/\\/g,'\\\\');
          clauses.push( paramName+'="' + sqlEscape + '"' );
        });
        return '('+clauses.join(' OR ')+')';
    },
    
    readTerm:function(term, lang, dictionaries, saveState) {
      var db = this._openDB();
      db.transaction(function(tx) {
        try{
          var tab = CordovaDataAccess.getTabName(lang);
          var tabLang = "";
          if(lang=="en")
              tabLang = "en";
          else 
              tabLang = "bo";
          
          tx.executeSql('SELECT '+tab+'.term as term, '+tab+'.definition as definition, DICTNAMES.name as dictionary FROM '+tab+' inner join DICTNAMES on '+tab+'.dictionary = DICTNAMES.id and DICTNAMES.language = "'+tabLang+'" WHERE term=?', [term], function(tx, results) {
            var len=results.rows.length;
            var definitions={};
            for(var i=0; i<len; i++) {
              var row = results.rows.item(i);
              
              if(definitions[row.dictionary]) {
                definitions[row.dictionary]+='\\n'+row.definition;
              } else {
                definitions[row.dictionary]=row.definition;
              }
            }
            try {
//                db.close();
            } catch (ex) {}

            DICT.loadTerm(term,definitions,saveState);

          }, function(tx, error){
            alert('SQL error while reading term "'+term+'" from DB:'+error.message);
            try {
//                db.close();
            } catch (ex) {}
          });
        } catch(e) {
          alert('error while reading term "'+term+'" from DB:'+e.message);
        }
      });
    },

    checkTibetanSectionsForLinks:function(sections){
      setTimeout( function(){
        var wylieSections=[];
        $.each(sections, function(sectionId, sectionInfo){
          wylieSections.push(sectionInfo.wylie);
        });
        var termQuery = CordovaDataAccess._mergeOrClauses('term', wylieSections);
        var db = CordovaDataAccess._openDB();
        db.transaction(function(tx) {
          try{
            tx.executeSql('SELECT DISTINCT term FROM DICT WHERE ' + termQuery, [], function(tx, results) {
              var availableSections={};
              var len=results.rows.length;
              for(var i=0; i<len; i++) {
                var row = results.rows.item(i);
                $.each(sections,function(sectionId,sectionInfo){
                  if(sectionInfo.wylie === row.term) {
                    availableSections[sectionId] = sectionInfo;
                  }
                });
              }
              try {
//                    db.close();
              } catch (ex) {}
              DICT.activateInlineTibetanSections(availableSections);
            }, function(tx, error) {
              alert('SQL error while checking existence of terms:'+error.message);
              try {
//                  db.close();
              } catch (ex) {}
            });
          } catch(e) {
            alert('error while checking existence of terms:'+e.message);
          }
        });
      }, 10 );
    },

    initDB:function(callback) {
      setTimeout(function() {
        // open the db to make sure that it is available by selecting one record from it.
        var db = CordovaDataAccess._openDB();
        db.transaction(function(tx) {
          try{
            tx.executeSql('SELECT * FROM DICT WHERE term="chos" LIMIT 1', [], function(tx, results) {
              if(results.rows.length) {
                try {
//                    db.close();
                } catch (ex) {}
                callback();
              }
            }, function(tx, error){
              alert('SQL error while trying to read from the database:'+error.message);
              try {
//                    db.close();
              } catch (ex) {}
            });
          } catch(e) {
            alert('error while trying to read from the database:'+e.message);
          }
        });
      },100);
    },
    
    getTabName:function(lang) {
      if (lang === 'en' )
          return 'DICT_EN';
      else 
          return 'DICT';      
    },
    
    readTermList:function(term, lang, offset, maxResults, dictionaries, callback) {
      var db = this._openDB();
      var term = term.replace(/\s*[/]\s*$/,'');
      
      db.transaction(function(tx) {
        try{          
          var dictQuery = CordovaDataAccess._mergeOrClauses('DICTNAMES.name',dictionaries);
          var tab = CordovaDataAccess.getTabName(lang);
          
          if(term.indexOf("*") >= 0) { // wildcard search
            var likeSearch = term.replace(/[*]/g,'%') + '%';

            if ( lang === "tib" )
              var langId = "bo";
            else 
              var langId = "en";
          
            query = 'SELECT DISTINCT '+tab+'.term as term FROM '+tab+' inner join DICTNAMES on '+tab+'.dictionary = DICTNAMES.id and DICTNAMES.language = "'+langId+'" WHERE ( ( term LIKE ? ) AND ( '+dictQuery+' ) ) GROUP BY term ORDER BY lower(term), term LIMIT '+ maxResults +' OFFSET ' + offset;
            
            queryParams = [likeSearch];
          
          } else if ( lang === "tib" ) { // regular Tibetan search
            var termSearch1 = term + ' ';
            var termSearch2 = term + ' zzzzz';

            query = 'SELECT DISTINCT '+tab+'.term as term FROM '+tab+' inner join DICTNAMES on '+tab+'.dictionary = DICTNAMES.id and DICTNAMES.language = "bo" WHERE ( (( term = ? ) OR ( term > ? AND term < ? )) AND '+dictQuery+' ) GROUP BY term ORDER BY lower(term), term LIMIT '+ maxResults +' OFFSET ' + offset;
            queryParams = [term,termSearch1,termSearch2];
          } else { // regular English search
            var termSearch1 = term;
            var termSearch2 = term + 'zzzzz';

            query = 'SELECT DISTINCT '+tab+'.term as term FROM '+tab+' inner join DICTNAMES on '+tab+'.dictionary = DICTNAMES.id and DICTNAMES.language = "en" WHERE ( (( term = ? COLLATE NOCASE ) OR ( term > ? COLLATE NOCASE AND term < ?  COLLATE NOCASE )) AND '+dictQuery+' ) GROUP BY term ORDER BY lower(term), term LIMIT '+ maxResults +' OFFSET ' + offset;
            queryParams = [term,termSearch1,termSearch2];
          }
          
          tx.executeSql(query, queryParams, function(tx, results) {
            var result = [];
            var len=results.rows.length;
             for(var i=0; i<len; i++) {
              var row = results.rows.item(i);
              result.push([ row.term ]);
            }
            try {
//                db.close();
            } catch (ex) {}
            callback(result);
          }, function(tx, error){
            alert('SQL error while reading termlist for input "'+term+'" from DB:'+error.message);
            try {
//                db.close();
            } catch (ex) {}
          });
        } catch(e) {
          alert('error while reading termlist for input "'+term+'" from DB:'+e.message);
        }
      });
    }
};
