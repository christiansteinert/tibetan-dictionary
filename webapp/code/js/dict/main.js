var DICT={
  _offset:0,
  _lastStoredNavigationState:{},
  useUnicodeTibetan:true,
  dataTable:{},
  activeTerm:"",
  lang:"tib",
  currentListTerm:"",
  lastHomeBackButtonTime:0,

  // initialized during module loading:
  wylieConverter:null, 
  dataAccess:null,
  DefinitionFormatter:null,
  InputHandler: null, // InputHandler class reference
  inputHandler:null, // InputHandler instance

  uniToWylie:function(text) {
    if(this.useUnicodeTibetan) {
      return this.wylieConverter.uniToWylie(text);
    } else {
      return text;
    }
  },
  
  /**
   * convert a chunk of text from Wylie to Tibetan unicode, if unicode is active.
   * Otherwise, simply return the Wylie text.
   * @param text (string) a piece of text in Wylie transliteration 
   * @return the same piece of text but converted to unicode
   */
  tibetanOutput:function(text) {
    if(this.useUnicodeTibetan) {
        return this.wylieConverter.wylieToUni(text);
    } else {
      return text;
    }
  },
  
  setTibetanOutput:function(value) {
    if(value==="true")
      value = true;
    if(value==="false")
      value = false;
    if(value || (value === false))  
      this.useUnicodeTibetan = value;
      
    if(this.useUnicodeTibetan===true||this.useUnicodeTibetan==='output') {
      $('body').addClass('unicodeTib');
      if(DICT.getInputLang()=="tib") {
        $('body').addClass('sidebarTib');
      } else {
        $('body').removeClass('sidebarTib');
      }
    } else {
      $('body').removeClass('unicodeTib');
      $('body').removeClass('sidebarTib');
    }
    
    if(DICT.getInputLang()=="tib") {
      if(this.useUnicodeTibetan===true) {
        $('body').addClass('unicodeTibInput');
      } else {
        $('body').removeClass('unicodeTibInput');
      }
      
      $('body').removeClass('enInput');
    } else {
      $('body').addClass('enInput');
      $('body').removeClass('unicodeTibInput');
    }
  },
  
  getDataAccess:function() {   
    return this.dataAccess;
  },
  
  init:function($, dataAccess, wylieConverter, DefinitionFormatter, InputHandler) {
    this.dataAccess = dataAccess;
    this.wylieConverter = wylieConverter;
    this.DefinitionFormatter = DefinitionFormatter;
    this.InputHandler = InputHandler;

    if(window.cordova) {
      $('body').addClass('mobile');
    } else {
      $('body').addClass('desktop');
    }

    this.getDataAccess().initDB( function() { DICT.doInit($) } );
  },
  
  scrollToTop:function() {
    if($('body').scrollTop() > 0) {
      $('body').animate({ scrollTop: 0 }, 'fast');
    }
    if($('html').scrollTop() > 0) {
      $('html').animate({ scrollTop: 0 }, 'fast');
    }
  },
  
  initCreditsInformation:function() {
    var credits = "";
    $.each(SETTINGS.getAllDictionaries(false),function(index,currentDictName) {
        var currentDict = DICTLIST[currentDictName];
            
        if(currentDict && currentDict.listCredits === "true") {
            var title = "";
            var description = "";
                    
            if(currentDict.about) {
              title = currentDict.about.replace(/[|].*/, "");
              description = currentDict.about.replace(/^[^|]*[|]/, "");
              description = description.replace(/[|]/g,"<br />");
            } else {
              title = currentDict.label
            }
            credits += "<dt>" + title + "</dt>";
            credits += "<dd>" + description + "</dd>";
        }
    });
    $("#credits").html(credits)
    
  },

  openLink:function(href) {
    if(window.cordova && href.indexOf('http') === 0) { 
      var handle = cordova.InAppBrowser.open(href, '_system', 'location=yes');
      handle.close();

      return false;
    } else {
      return true;
    }
  },
  
  doInit:function($) {
    try{
      $('a[href^="http"]').click(
        function(){DICT.openLink($(this).attr('href'));} 
      );
    
      this.settings = SETTINGS.getSettings();
      
      // Initialize input handler for the search field
      var inputHandlerOptions = {
        useUnicodeTibetan: this.settings.unicode === true,
        lowercaseSetting: SETTINGS.getSettings().lowercase
      };
      var inputHandlerCallbacks = {
        onSearch: (loadFirstItem, saveState, offset) => {
          if(loadFirstItem) {
            DICT.scrollToTop();
          }
          DICT.search(loadFirstItem, saveState, offset)
        }
      };
      this.inputHandler = new this.InputHandler('#searchTerm', jQuery.tokenizer, inputHandlerCallbacks, inputHandlerOptions);

      if(!window.localStorage)
        $('#settingsBtn').hide();
      
      if(this.settings.layout == 'layout_black') {
      $('body').addClass('dark');
      }
      this.setTibetanOutput(this.settings.unicode);
      this.initCreditsInformation();
      $('body').removeClass('cordovaInitializing');

      // attach clear-input behavior
      $('#clearInputBtn').on('click', function(e){ e.preventDefault(); DICT.clearInput(); });

      this.dataTable = $("#wordList").DataTable({
          processing:false,
          deferRender:false,
          pagingType: "simple",
          searching: false,
          ordering: false,
          dom: 't',
          paging: false,
          columns: columnHeaders = [{"title": "Term"}],
          language: {
            emptyTable: " "
          }
      });


      // handle navigation events
      // - listen to the "back" button on android
      document.addEventListener("backbutton", function(event){

        // If we are on cordova, exit the app if the user presses back twice on the home screen
        if (window.cordova) {
          if (DICT._getCurrentHash() === '#home') {
            var now = Date.now();
            if(now - DICT.lastHomeBackButtonTime < 1500) {
              if(navigator.app && navigator.app.exitApp) {
                navigator.app.exitApp();
              }
            }
            DICT.lastHomeBackButtonTime = now;
          }

          // Prevent Cordova / Android default (which would finish the Activity)
          if (event.preventDefault) { event.preventDefault(); }
          if (event.stopPropagation) { event.stopPropagation(); }
        }

        // Navigate back inside the app if we are not already at the home state
        if(DICT._getCurrentHash() !== '#home') {
          history.back();
        }

      }, false);
      
      // - listen to changes of the URL
      var hashEventCount = 0;
      $(window).hashchange(function(event){
        hashEventCount++;
        
        if(new Date().getTime() - DICT._lastHashEvent < 300) 
          return; //ignore hashchange events that are very quick after a user action
          
        var state = DICT._getCurrentHash();

        if(state.indexOf('#') === 0) {
          state = state.substring(1);
        }
        try {
          state = decodeURIComponent(state);
        } catch(e) {
          state = '';
          console.log('Failed to decode state hash: '+e.message);
        }

        if(state === 'home') {
          // restore the homepage content
          // but don't refresh the homepage right away again when hitting the home page upon startup
          if(hashEventCount > 1) {
            location.reload();
          }
          return;
        }
        DICT.setState(state);
      });

      var sharedTextPluginAvailable = DICT.handleSharedText();     
      if (!sharedTextPluginAvailable) {
        // If the shared text plugin is not available then just trigger the hashchange event to load the state 
        // of the app from the URL hash in case somebody has opened a bookmark or reloaded the page 
        $(window).hashchange();
      }
    } catch(e) {
      alert('error initializing:'+e.message);
    }
  },
  
  prev:function() {
    if(this._getCurrentHash() === '#home') {
      return;
    }
  
    if(DICT._offset > 0) {
      if(DICT.inputHandler.getValue() === '' ) {
        if( DICT.useUnicodeTibetan === true ) {
          DICT.inputHandler.setValue(DICT.tibetanOutput(this.currentListTerm));
        } else {
          DICT.inputHandler.setValue(this.currentListTerm);
        }
      }
      var settings = SETTINGS.getSettings();
      DICT.search(false,true,DICT._offset - settings.listSize);
    }
  },

  next:function() {
    if(this._getCurrentHash() === '#home') {
      return;
    }

    if(DICT.inputHandler.getValue() === '' ) {
        if( DICT.useUnicodeTibetan === true ) {
          DICT.inputHandler.setValue(DICT.tibetanOutput(this.currentListTerm));
        } else {
          DICT.inputHandler.setValue(this.currentListTerm);
        }
    }
    
    var settings = SETTINGS.getSettings();
    DICT.search(false,true,DICT._offset + settings.listSize);
  },
  
  clearInput:function() {
    DICT.inputHandler.clear();
    DICT.inputHandler.focus();
    DICT.scrollToTop();
    DICT.search(false,true,0);
  },
  
  updateButtonState:function(disablePrev,disableNext) {
    $('#wordList_prev').prop( "disable", disablePrev );
    if(disablePrev)
      $('#wordList_prev').addClass("disabled");
    else 
      $('#wordList_prev').removeClass("disabled");
    
    
    $('#wordList_next').prop( "disable", disableNext );
    if(disableNext)
      $('#wordList_next').addClass("disabled");
    else 
      $('#wordList_next').removeClass("disabled");

  },
  
  highlightListItem:function() {
    $('.selected').removeClass('selected');
    if(DICT.getInputLang() == "en")
      var searchValue = this.activeTerm;
    else
      var searchValue = this.tibetanOutput(this.activeTerm);
      
    $('#wordList td').filter(function(){ return $(this).text() === searchValue || (DICT.getInputLang()=="en" && $(this).text().toLowerCase() === searchValue.toLowerCase() ); }).addClass('selected');
  },

  setInputLang:function(targetLang){
    // Determine the new language
    var newLang;
    if(targetLang) {
        newLang = targetLang;
    } else if(DICT.getInputLang() == "tib") {
        newLang = "en";
    } else {
        newLang = "tib";
    }

    DICT.inputHandler.setInputLang(newLang);
    DICT.setTibetanOutput(DICT.useUnicodeTibetan);
    DICT.clearInput();

    if(newLang === "en") {
        $("#switchBtnEnTib").show();
        $("#switchBtnTibEn").hide();
    } else {
        $("#switchBtnEnTib").hide();
        $("#switchBtnTibEn").show();
    }
    
  },
  
  switchInputLang:function() {
    DICT.setState(DICT.getCurrentStateAsString());
    DICT.setInputLang();
    DICT.setSidebarState(false);
    $('.leftSideBar').css('display','none');
  },
  
  getLang:function(){
    if(DICT.lang)
        return DICT.lang;
    return "tib";
  },

  getInputLang:function(){
    return DICT.inputHandler.getInputLang();
  },
  
  search:function(loadFirstItem,saveState,offset) {
    var inputText = DICT.inputHandler.getValue();
    if(DICT.getInputLang()==='tib') {
      inputText = this.uniToWylie(inputText);
      inputText = inputText.replace(/^\s+|\s*\/?\s*$/g, '');
      inputText = inputText.replace(/_/g, ' ');
      inputText = inputText.replace(/\s+/g, ' ');
      inputText = inputText.replace(/[ /]+$/g, '');
    }
    
    var settings = SETTINGS.getSettings();

    if(offset<0) {
      offset=0;
    }
    
    if(!inputText) {
      DICT.setSidebarState(true);
      return;
    }
    
    var lang = DICT.getInputLang();
      
    if(this.currentListTerm != inputText   //this term wasn't loaded yet
       || this._offset != offset           //jumping to a different offset in the result list
      ) {
      this.getDataAccess().readTermList(inputText, lang, offset, settings.listSize + 1, this.settings.activeDictionaries, function(result) {
        var lang = DICT.getInputLang();        
        var tableRows = [];
        this._offset = offset;

        // add entry to look up pages in scanned dictionaries
        if(window.Set && !window.cordova) {
          var foundTerms = new Set();
          for(var i=0;i<result.length;i++) {
            foundTerms.add(result[i][0]);
          }
          var dictList = DICT.settings.activeDictionaries;
          $.each(dictList,function(idx,currentDictName) {        
            var currentDict = DICTLIST[currentDictName];
            if(currentDict.language && lang==currentDict.language[0] && currentDict.scanId && !foundTerms.has(inputText) && !currentDict.exactPageNumbersAvailable) {                
              result.push([inputText]);
              foundTerms.add(inputText);
            }
          });
        }

        if(result.length === 0 && offset > 0 )
          return;
      
        for(var i=0;i<result.length && i<settings.listSize;i++) {
          tableRows[i]=[];
          if(lang === "en")
            tableRows[i][0]='<a href="#" data-wylie="'+result[i][0]+'">'+result[i][0]+'</a>';
          else
            tableRows[i][0]='<a href="#" data-wylie="'+result[i][0]+'">'+DICT.tibetanOutput(result[i][0])+'</a>';
        }
        
        DICT.dataTable.clear();
        $('.leftSideBar').css('display','table-cell');
        if(result.length === 0) {
          DICT.dataTable.rows.add(tableRows);
          DICT.dataTable.draw();
          $('#wordList').off('click');
          $('#wordList,.paginate').hide();
          $('.paginate_info').text('No results found.');
        } else {
          DICT.dataTable.rows.add(tableRows);
          DICT.dataTable.draw();
          $('#wordList,.paginate,#wordListContainer').show();
          $('#wordList').on('click','td', function(){
            $('.selected').removeClass('selected'); 
            $(this).addClass('selected');
            
            var wylie = $(this).children('a').attr('data-wylie');
            DICT.lang=DICT.getInputLang();
            DICT.readTerm(wylie, DICT.getInputLang(), true);
            return false;
          });
          DICT._offset = offset;
          $('.paginate_info').text('Showing results ' + (offset+1) + ' to ' + (offset+(result.length>settings.listSize?settings.listSize:result.length)) + '.');
        }
        DICT.currentListTerm = inputText;
        if(saveState) {
          if(!loadFirstItem) {
            DICT.setSidebarState(true); 
          }
          DICT.storeNavigationState();
        }
        
        if(loadFirstItem) {
          var termFound = false;
        
          for(var i=0;i<result.length;i++)
            for(var j=0;j<result[i].length;j++)
              if (result[i][j] === inputText || ( DICT.getInputLang()=="en" && result[i][j].toLowerCase() === inputText.toLowerCase() ) )
                termFound = true;
          
          if(result.length>0 && termFound) {
            DICT.readTerm(inputText, DICT.getInputLang(), saveState);
            $('#wordList tr:first-child').addClass('selected');               
          } else {
            $('#definitions').html('');
          }
        }
        DICT.highlightListItem();
        DICT.updateButtonState(offset==0,result.length<=settings.listSize);
      });
    } else if(loadFirstItem) {
      //the list in the sidebar was already loaded before but we need to activate the first term
      var $firstRow;
      $('#wordList tr td a').each(function(count, elem) {
        if($(elem).attr('data-wylie') === inputText  || ( DICT.getInputLang()=="en" && $(elem).attr('data-wylie').toLowerCase() === inputText.toLowerCase() )  )
          $firstRow = $(elem)
      });
      
      if($firstRow && $firstRow.length) {
        var firstResult = $firstRow.attr('data-wylie');
        if(firstResult.toLowerCase() === inputText.toLowerCase()) {
          $('#wordList tr:first-child').addClass('selected');
          DICT.readTerm(inputText, lang, saveState);
        }
      } else {
        $('#definitions').html('');
      }
    }
  },
  
  setSidebarState:function(visible) {
      if(visible) {
        $('body').addClass('forceLeftSideVisible');
      } else {
        $('body').removeClass('forceLeftSideVisible');
      }
  },

  getSidebarState:function() {
    return $('body').hasClass('forceLeftSideVisible');
  },
  
  isSmallScreen:function() {
    return $(window).width() <= 600;
  },
  
  getCurrentState:function() {
    var state = {
      activeTerm:this.activeTerm,
      lang:this.getLang(),
      inputLang:this.getInputLang(),
      currentListTerm:this.currentListTerm,
      forceLeftSideVisible:this.getSidebarState(),
      offset:this._offset
    };
    return state;
  },

  getCurrentStateAsString:function() {
    return JSON.stringify(this.getCurrentState());
  },

  setState:function(state) {
    if(state && state != "") {
      if(state==='settings') {
        // show settings if requested
        SETTINGS.btnShowSettings();
      } else if($('.settings').is(':visible')) {
        // close settings, if active
        if(state!=='settings') {
          location.reload(true);
          return;
        }
      } else if(state==='home') {
          // do nothing - this is handled by the hashchange event.
          return;
      } else {
        //load a term 
        if(DICT.getCurrentStateAsString() === state)
          return;
        
        var stateInfo = JSON.parse(state);

        if(stateInfo.lang)
            DICT.lang = stateInfo.lang;

        if(stateInfo.inputLang) {
            DICT.setInputLang(stateInfo.inputLang);
        }
        
        var lastUniInput;
        if( DICT.useUnicodeTibetan === true && DICT.getInputLang() === "tib") {
          lastUniInput = this.tibetanOutput(stateInfo.currentListTerm);
        } else {
          lastUniInput = stateInfo.currentListTerm;
        }
        
        DICT.inputHandler.setLastUniInput(lastUniInput);
        DICT.inputHandler.setCurrentInput(stateInfo.currentListTerm);
        
        window.mobiletextCurrentVal = lastUniInput;
        if (DICT.inputHandler.getValue() != lastUniInput) {  
          DICT.inputHandler.setValue(lastUniInput);
          console.log("input changed based on URL hash. New value: " + lastUniInput)
        }

        $('.selected').removeClass('selected');

        if(stateInfo.offset)
          this.search(false,false,stateInfo.offset);
        else
          this.search(false,false,0);

        
        if((!stateInfo.forceLeftSideVisible) || (!this.isSmallScreen()))
          this.readTerm(stateInfo.activeTerm,DICT.getLang(), false);
          
        this.setSidebarState(stateInfo.forceLeftSideVisible);
        
        if(stateInfo.definitionOnly) {
            $('body').addClass('definitionOnly');
        }
      }
    }
  },

  readTerm:function(term, lang, saveState){
    this.scrollToTop();
    this.lang = lang;
    term = this.wylieConverter.normalizeWylieWhitespace(term);
    term = decodeURIComponent(term).replace(/^\s+|\s+$/g, '');
    if(this.activeTerm != term) {
      this.getDataAccess().readTerm(term, lang, this.settings.activeDictionaries, saveState);
      this.activeTerm = term;
    } else {
      if(this.isSmallScreen() && this.getSidebarState()) {
        //hide sidebar if necessary
        this.setSidebarState(false);
      }
    }
    
  },

  _getCurrentHash:function() {
    if (window.location.hash === '' || window.location.hash === '#') {
      return '#home';
    }
    return window.location.hash;
  },
  
  storeNavigationState:function() {
    this._lastHashEvent = new Date().getTime();
    var currentState = this.getCurrentState();
    var currentHash = this._getCurrentHash();
    var previousState = this._lastStoredNavigationState;

    var newUrlHash = encodeURIComponent(JSON.stringify(currentState));


    if (this.isSmallScreen() && currentState.forceLeftSideVisible !== previousState.forceLeftSideVisible) {
      console.log("sidebbar change: setting hash");
      window.location.hash = newUrlHash;

    } else if (currentState.lang !== previousState.lang 
       || currentState.inputLang !== previousState.lang
       || currentState.activeTerm !== previousState.activeTerm
       || currentState.offset !== previousState.offset) {

      if (currentState.activeTerm || previousState.activeTerm || (currentState.inputLang !== previousState.lang)) {
        console.log("setting hash");
        window.location.hash = newUrlHash;
      }

    } else {
      var oldUrl = window.location.href;
      if(oldUrl.indexOf('#')) {
        var newUrl = oldUrl.replace(window.location.hash, '#' + newUrlHash)
      } else {
        var newUrl = oldUrl += '#' + newUrlHash;
      }
      if (currentHash !== '#home') {
        console.log("replacing url");
        window.location.replace(newUrl);
      }
    }
    this._lastStoredNavigationState = currentState;
  },

  /**
   * Activate inline Tibetan sections as clickable links
   * Called by dataAccess after checking which sections have dictionary entries
   * @param {Object} availableSections - Map of sectionId to section content in Wylie
   */
  activateInlineTibetanSections:function(availableSections) {
    var activeTerm = this.activeTerm;
    $.each(availableSections, function(sectionId, sectionInfo) {
      if (activeTerm !== sectionInfo.wylie) {
        $('#' + sectionId)
          .addClass('link')
          .attr('data-wylie', sectionInfo.wylie)
          .click(function() {
            DICT.lang = "tib";
            DICT.readTerm($(this).attr('data-wylie'), "tib", true);
          });
      }
    });
  },

  loadScannedPage:function(dictId, termId) {
    $.ajax({
      type: 'GET',
      url: "scanned/"+dictId+"/"+termId,
      cache: true,
    }).done(function(pageInfo) { 
      DICT.openScannedPage(dictId, termId, pageInfo);
    }).fail(function(xhr,msg,err) {
      alert(msg + '\n' + err);
    });
  },
  
  openScannedPage:function(dictId, termId, pageInfo) {
    if(window.openLightbox) {
      openLightbox('data/scan/'+dictId+'/', pageInfo);
    } else {
      alert('Sorry, but your web browser is too old to support this feature :-(');
    }
  },

  loadTerm:function(term,dictEntries,saveState) {
    $('#definitions *').remove();

    // Filter DICTLIST to only include active dictionaries, preserving order
    var dictList = this.settings.activeDictionaries;
    var dictionaries = {};
    for (var i = 0; i < dictList.length; i++) {
      var dictId = dictList[i];
      if (DICTLIST[dictId]) {
        dictionaries[dictId] = DICTLIST[dictId];
      }
    }

    var result = DICT.DefinitionFormatter.formatDefinitionList(dictionaries, dictEntries, term, DICT.getLang(), DICT.useUnicodeTibetan, ABBREVIATIONS);
    
    // Check for links in Tibetan sections
    if (Object.keys(result.allInlineSections).length > 0) {
      DICT.getDataAccess().checkTibetanSectionsForLinks(result.allInlineSections);
    }

    $(result.definitionTableHtml).appendTo('#definitions');
    $('#definitions').find('a[href^="http"]').click(
      function(){DICT.openLink($(this).attr('href'));} 
    );
    TOOLTIPS.bindTooltipHandlers();
    
    if(saveState) {
      DICT.setSidebarState(false); 
      DICT.storeNavigationState();
    }
    this.highlightListItem();
    this.scrollToTop();
  },

  /**
   * Handle shared text from other Android apps
   */
  handleSharedText: function() {
    if (window.cordova && window.ShareTextPlugin) {
      ShareTextPlugin.getSharedText(
        function(sharedData) {
          if (sharedData && sharedData.text && sharedData.text.trim().length > 0) {
            console.log("Shared text received: " + sharedData.text + " with language: " + sharedData.language);

            // Clean up the shared text - remove extra whitespace and limit length
            var sharedText = sharedData.text.trim();
            if (sharedText.length > 200) {
              sharedText = sharedText.substring(0, 200);
              console.log("Truncated long shared text to 200 characters");
            }
            // Use the language provided by the plugin
            var inputLang = sharedData.language || "tib"; // Default to Tibetan if not specified
            DICT.lang = inputLang;
            DICT.setInputLang(inputLang);

            // cleanup text and search for the entered term
            if(inputLang === "tib") {
              if (/.*['a-zA-Z].*/.test(sharedText) ) {
                // remember the fact that something was typed in Wylie rather than in Tibetan unicode;
                // in this case we will later convert the input back to Wylie when backspace is pressed.
                DICT.inputHandler.setWasTypedInWylie(true);
              }

              sharedText = sharedText.replace(/[\s\-\/()\[\]{},།:–—!.?]+/g, ' ');
              sharedText = DICT.uniToWylie(sharedText);
              sharedText = DICT.tibetanOutput(sharedText + ' ');            
            } else {
              sharedText = sharedText.replace(/[\.]+/g,' ');
            }
            sharedText = sharedText.trim();
            
            // Set input field value
            DICT.inputHandler.setValue(sharedText);
            DICT.inputHandler.focus();

            console.log("Set input field to shared text: " + sharedText);
            DICT.search(true,true,0);
          } else {
            console.log("No shared text found");
          }
        },
        function(error) {
          console.log("Error getting shared text: " + error);
        }
      );
      return true;
    } else {
      console.log("ShareTextPlugin not available (running in web mode or plugin not loaded)");
      return false;
    }
  },
};

/* ============== Initialization ============== */

// initialize the PWA service worker
if ('serviceWorker' in navigator && !window.cordova) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('code/js/pwa/service-worker.js')
      .catch(function(err){ console.warn('SW registration failed', err); });
  });
}

// initialize the actual app
Promise.all([
  import('../language-io/tibetanConverter.mjs'),
  import('../db/dataAccess.mjs'),
  import('../formatting/definitionFormatter.mjs'),
  import('../language-io/inputHandler.mjs')
]).then(([{ WylieConverter }, { PhpDataAccess, CordovaDataAccess }, { DefinitionFormatter }, { InputHandler }]) => {

  var wylieConverter = new WylieConverter(jQuery.tokenizer);
  DefinitionFormatter.initialize(jQuery.tokenizer);

  if(window.cordova) {
    //phonegap-based initialization for mobile app
    document.addEventListener("deviceready", function(){
        jQuery(function($){
          DICT.init($, new CordovaDataAccess(DICT), wylieConverter, DefinitionFormatter, InputHandler);        
      });
    }, false);
  } else {
    //regular initialization for web app
    jQuery(function($){
      DICT.init($, new PhpDataAccess(DICT), wylieConverter, DefinitionFormatter, InputHandler);
    });
  }
});
