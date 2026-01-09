var DICT = {
  _lastHashEvent: 0,
  lastHomeBackButtonTime: 0,

  // initialized during module loading:
  wylieConverter: null,
  dataAccess: null,
  searchController: null,
  resultListRenderer: null,
  DefinitionFormatter: null,
  scannedDictionaryViewer: null,
  InputHandler: null, // InputHandler class reference
  inputHandler: null, // InputHandler instance
  appState: null,

  uniToWylie: function (text) {
    if (this.appState.useUnicodeTibetan) {
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
  tibetanOutput: function (text) {
    if (this.appState.useUnicodeTibetan) {
      return this.wylieConverter.wylieToUni(text);
    } else {
      return text;
    }
  },

  setTibetanOutput: function (value) {
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    if (value || value === false || value === 'output') this.appState.useUnicodeTibetan = value;

    // Update body classes
    const unicode = this.appState.useUnicodeTibetan;
    const inputLang = this.getInputLang();

    $('body').toggleClass('unicodeTib', unicode === true || unicode === 'output');
    $('body').toggleClass('sidebarTib', (unicode === true || unicode === 'output') && inputLang === 'tib');
    $('body').toggleClass('unicodeTibInput', unicode === true && inputLang === 'tib');
    $('body').toggleClass('enInput', inputLang === 'en');
  },

  getDataAccess: function () {
    return this.dataAccess;
  },

  init: function ($, dataAccess, wylieConverter, DefinitionFormatter, scannedDictionaryViewer, InputHandler, appState, searchController, resultListRenderer) {
    this.dataAccess = dataAccess;
    this.wylieConverter = wylieConverter;
    this.searchController = searchController;
    this.resultListRenderer = resultListRenderer;
    this.DefinitionFormatter = DefinitionFormatter;
    this.scannedDictionaryViewer = scannedDictionaryViewer;
    this.InputHandler = InputHandler;
    this.appState = appState;

    if (window.cordova) {
      $('body').addClass('mobile');
    } else {
      $('body').addClass('desktop');
    }

    this.getDataAccess().initDB().then(() => this.doInit($));
  },

  scrollToTop: function () {
    if ($('body').scrollTop() > 0) {
      $('body').animate({ scrollTop: 0 }, 'fast');
    }
    if ($('html').scrollTop() > 0) {
      $('html').animate({ scrollTop: 0 }, 'fast');
    }
  },

  initCreditsInformation: function () {
    var credits = "";
    for (const currentDictName of SETTINGS.getAllDictionaries(false)) {
      var currentDict = DICTLIST[currentDictName];

      if (currentDict && currentDict.listCredits === "true") {
        var title = "";
        var description = "";

        if (currentDict.about) {
          title = currentDict.about.replace(/[|].*/, "");
          description = currentDict.about.replace(/^[^|]*[|]/, "");
          description = description.replace(/[|]/g, "<br />");
        } else {
          title = currentDict.label
        }
        credits += "<dt>" + title + "</dt>";
        credits += "<dd>" + description + "</dd>";
      }
    }
    $("#credits").html(credits)

  },

  openLink: function (href) {
    if (window.cordova && href.indexOf('http') === 0) {
      var handle = cordova.InAppBrowser.open(href, '_system', 'location=yes');
      handle.close();

      return false;
    } else {
      return true;
    }
  },

  doInit: function ($) {
    try {
      $('a[href^="http"]').click(
        (event) => { this.openLink($(event.currentTarget).attr('href')); }
      );

      this.settings = SETTINGS.getSettings();
      this.appState.useUnicodeTibetan = this.settings.unicode;

      // Initialize input handler for the search field
      var inputHandlerOptions = {
        useUnicodeTibetan: this.settings.unicode === true,
        lowercaseSetting: SETTINGS.getSettings().lowercase
      };
      var inputHandlerCallbacks = {
        onInputChange: () => this.search(false, true, 0),
        onEnter: () => {
          this.scrollToTop();
          this.search(true, true, 0);
        },
      };
      this.inputHandler = new this.InputHandler('#searchTerm', inputHandlerCallbacks, inputHandlerOptions);

      if (!window.localStorage)
        $('#settingsBtn').hide();

      if (this.settings.layout == 'layout_black') {
        $('body').addClass('dark');
      }
      this.setTibetanOutput(this.settings.unicode);
      this.initCreditsInformation();
      $('body').removeClass('cordovaInitializing');

      // attach clear-input behavior
      $('#clearInputBtn').on('click', (e) => { e.preventDefault(); this.clearInput(); });

      this.resultListRenderer.initDataTable('#wordList');

      // handle navigation events
      // - listen to the "back" button on android
      document.addEventListener("backbutton", (event) => {

        // If we are on cordova, exit the app if the user presses back twice on the home screen
        if (window.cordova) {
          if (this._getCurrentHash() === '#home') {
            var now = Date.now();
            if (now - this.lastHomeBackButtonTime < 1500) {
              if (navigator.app && navigator.app.exitApp) {
                navigator.app.exitApp();
              }
            }
            this.lastHomeBackButtonTime = now;
          }

          // Prevent Cordova / Android default (which would finish the Activity)
          if (event.preventDefault) { event.preventDefault(); }
          if (event.stopPropagation) { event.stopPropagation(); }
        }

        // Navigate back inside the app if we are not already at the home state
        if (this._getCurrentHash() !== '#home') {
          history.back();
        }

      }, false);

      // - listen to changes of the URL
      var hashEventCount = 0;
      $(window).hashchange((event) => {
        hashEventCount++;

        if (new Date().getTime() - this._lastHashEvent < 300)
          return; //ignore hashchange events that are very quick after a user action

        var state = this._getCurrentHash();

        if (state.indexOf('#') === 0) {
          state = state.substring(1);
        }
        try {
          state = decodeURIComponent(state);
        } catch (e) {
          state = '';
          console.log('Failed to decode state hash: ' + e.message);
        }

        if (state === 'home') {
          // restore the homepage content
          // but don't refresh the homepage right away again when hitting the home page upon startup
          if (hashEventCount > 1) {
            location.reload();
          }
          return;
        }
        this.setState(state);
      });

      var sharedTextPluginAvailable = this.handleSharedText();
      if (!sharedTextPluginAvailable) {
        // If the shared text plugin is not available then just trigger the hashchange event to load the state 
        // of the app from the URL hash in case somebody has opened a bookmark or reloaded the page 
        $(window).hashchange();
      }
    } catch (e) {
      alert('error initializing:' + e.message);
    }
  },

  prev: function () {
    if (this._getCurrentHash() === '#home') {
      return;
    }

    if (this.appState.offset > 0) {
      if (this.inputHandler.getValue() === '') {
        if (this.appState.useUnicodeTibetan === true) {
          this.inputHandler.setValue(this.tibetanOutput(this.appState.currentListTerm));
        } else {
          this.inputHandler.setValue(this.appState.currentListTerm);
        }
      }
      var settings = SETTINGS.getSettings();
      this.search(false, true, this.appState.offset - settings.listSize);
    }
  },

  next: function () {
    if (this._getCurrentHash() === '#home') {
      return;
    }

    if (this.inputHandler.getValue() === '') {
      if (this.appState.useUnicodeTibetan === true) {
        this.inputHandler.setValue(this.tibetanOutput(this.appState.currentListTerm));
      } else {
        this.inputHandler.setValue(this.appState.currentListTerm);
      }
    }

    var settings = SETTINGS.getSettings();
    this.search(false, true, this.appState.offset + settings.listSize);
  },

  clearInput: function () {
    this.inputHandler.clear();
    this.inputHandler.focus();
    this.scrollToTop();
    this.search(false, true, 0);
  },

  setInputLang: function (targetLang) {
    // Determine the new language
    var newLang;
    if (targetLang) {
      newLang = targetLang;
    } else if (this.getInputLang() == "tib") {
      newLang = "en";
    } else {
      newLang = "tib";
    }

    this.inputHandler.setInputLang(newLang);
    this.appState.inputLang = newLang;
    this.setTibetanOutput(this.appState.useUnicodeTibetan);
    this.clearInput();

    if (newLang === "en") {
      $("#switchBtnEnTib").show();
      $("#switchBtnTibEn").hide();
    } else {
      $("#switchBtnEnTib").hide();
      $("#switchBtnTibEn").show();
    }
  },

  switchInputLang: function () {
    this.setState(this.getCurrentStateAsString());
    this.setInputLang();
    this.setSidebarState(false);
    $('.leftSideBar').css('display', 'none');
  },

  getLang: function () {
    return this.appState.lang;
  },

  getInputLang: function () {
    if (this.inputHandler) { // Guard against calling before inputHandler is initialized
      return this.inputHandler.getInputLang();
    }
    return "tib"; // Default to Tibetan before initialization
  },

  search: function (loadFirstItem, saveState, offset) {
    var inputText = this.inputHandler.getValue();
    var settings = SETTINGS.getSettings();
    var lang = this.getInputLang();

    if (offset < 0) {
      offset = 0;
    }

    var normalizedTerm = this.searchController.normalizeSearchTerm(
      inputText, lang, this.appState.useUnicodeTibetan
    );

    // Build search parameters from current state
    var searchParams = {
      searchTerm: normalizedTerm,
      lang: lang,
      offset: offset,
      maxResults: settings.listSize + 1,
      activeDictionaries: this.settings.activeDictionaries
    };

    if (!normalizedTerm) {
      this.setSidebarState(true);
      return;
    }

    // Check if we need to fetch new results into the result list
    if (this.appState.currentListTerm !== normalizedTerm || this.appState.offset !== offset) {
      this.searchController.searchTermList(searchParams).then((searchResult) => {
        this._processSearchResults(searchResult, loadFirstItem, saveState, settings);
      });
    } else if (loadFirstItem) {
      // The list in the sidebar was already loaded but we need to activate the first term
      this._activateFirstMatchingTerm(normalizedTerm, lang, saveState);
    }
  },

  /**
   * Process search results and update the UI
   * @private
   */
  _processSearchResults: function (searchResult, loadFirstItem, saveState, settings) {
    var result = searchResult.results;
    var offset = searchResult.offset;
    var inputText = searchResult.searchTerm;
    var lang = this.getInputLang();

    this.appState.offset = offset;

    if (result.length === 0 && offset > 0) {
      return;
    }

    // Render results using the ResultListRenderer
    this.resultListRenderer.renderResults({
      results: result,
      offset: offset,
      listSize: settings.listSize,
      lang: lang,
      useUnicodeTibetan: this.appState.useUnicodeTibetan
    });

    this.appState.currentListTerm = inputText;

    if (saveState) {
      if (!loadFirstItem) {
        this.setSidebarState(true);
      }
      this.storeNavigationState();
    }

    if (loadFirstItem) {
      var termFound = this._isTermInResults(result, inputText, lang);

      if (result.length > 0 && termFound) {
        this.readTerm(inputText, lang, saveState);
        this.resultListRenderer.selectFirstRow();
      } else {
        $('#definitions').html('');
      }
    }

    this.resultListRenderer.highlightTerm(this.appState.activeTerm, lang);
    this.resultListRenderer.updatePaginationButtons(offset === 0, result.length <= settings.listSize);
  },

  /**
   * Check if a search term exists in the search results list
   * @private
   */
  _isTermInResults: function (results, inputText, lang) {
    for (var i = 0; i < results.length; i++) {
      for (var j = 0; j < results[i].length; j++) {
        if (results[i][j] === inputText || 
            (lang === "en" && results[i][j].toLowerCase() === inputText.toLowerCase())) {
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Activate the first matching term in the sidebar when list is already loaded
   * @private
   */
  _activateFirstMatchingTerm: function (inputText, lang, saveState) {
    var matchedWylie = this.resultListRenderer.findMatchingTerm(inputText, lang);

    if (matchedWylie && matchedWylie.toLowerCase() === inputText.toLowerCase()) {
      this.resultListRenderer.selectFirstRow();
      this.readTerm(inputText, lang, saveState);
    } else {
      $('#definitions').html('');
    }
  },

  setSidebarState: function (visible) {
    this.appState.sidebarVisible = visible;
    $('body').toggleClass('forceLeftSideVisible', visible);
  },

  getSidebarState: function () {
    return this.appState.sidebarVisible;
  },

  isSmallScreen: function () {
    return $(window).width() <= 600;
  },

  getCurrentState: function () {
    return this.appState.getSnapshot();
  },

  getCurrentStateAsString: function () {
    return this.appState.getSnapshotAsString();
  },

  setState: function (state) {
    if (state && state != "") {
      if (state === 'settings') {
        // show settings if requested
        SETTINGS.btnShowSettings();
      } else if ($('.settings').is(':visible')) {
        // close settings, if active
        if (state !== 'settings') {
          location.reload(true);
          return;
        }
      } else if (state === 'home') {
        // do nothing - this is handled by the hashchange event.
        return;
      } else {
        //load a term 
        if (this.getCurrentStateAsString() === state)
          return;

        var stateInfo = JSON.parse(state);

        if (stateInfo.lang)
          this.appState.lang = stateInfo.lang;

        if (stateInfo.inputLang) {
          this.setInputLang(stateInfo.inputLang);
        }

        var lastUniInput;
        if (this.appState.useUnicodeTibetan === true && this.getInputLang() === "tib") {
          lastUniInput = this.tibetanOutput(stateInfo.currentListTerm);
        } else {
          lastUniInput = stateInfo.currentListTerm;
        }

        this.inputHandler.setLastUniInput(lastUniInput);
        this.inputHandler.setCurrentInput(stateInfo.currentListTerm);

        window.mobiletextCurrentVal = lastUniInput;
        if (this.inputHandler.getValue() != lastUniInput) {
          this.inputHandler.setValue(lastUniInput);
          console.log("input changed based on URL hash. New value: " + lastUniInput)
        }

        $('.selected').removeClass('selected');

        if (stateInfo.offset)
          this.search(false, false, stateInfo.offset);
        else
          this.search(false, false, 0);


        if ((!stateInfo.forceLeftSideVisible) || (!this.isSmallScreen()))
          this.readTerm(stateInfo.activeTerm, this.getLang(), false);

        this.setSidebarState(stateInfo.forceLeftSideVisible);

        if (stateInfo.definitionOnly) {
          $('body').addClass('definitionOnly');
        }
      }
    }
  },

  readTerm: function (term, lang, saveState) {
    this.scrollToTop();
    this.appState.lang = lang;
    if (!term) {
      return; // Don't process undefined/null terms
    }
    term = this.wylieConverter.normalizeWylieWhitespace(term);
    term = decodeURIComponent(term).replace(/^\s+|\s+$/g, '');
    if (this.appState.activeTerm != term) {
      this.getDataAccess().readTerm(term, lang, this.settings.activeDictionaries)
        .then(result => {
          this.loadTerm(result.term, result.definitions, saveState);
        });
      this.appState.activeTerm = term;
    } else {
      if (this.isSmallScreen() && this.getSidebarState()) {
        //hide sidebar if necessary
        this.setSidebarState(false);
      }
    }
  },

  _getCurrentHash: function () {
    if (window.location.hash === '' || window.location.hash === '#') {
      return '#home';
    }
    return window.location.hash;
  },

  storeNavigationState: function () {
    this._lastHashEvent = new Date().getTime();
    var currentState = this.getCurrentState();
    var currentHash = this._getCurrentHash();
    var previousState = this.appState.getLastStoredState();

    var newUrlHash = encodeURIComponent(JSON.stringify(currentState));

    if (this.isSmallScreen() && currentState.forceLeftSideVisible !== previousState.forceLeftSideVisible) {
      console.log("sidebar change: setting hash");
      window.location.hash = newUrlHash;

    } else if (currentState.lang !== previousState.lang
      || currentState.inputLang !== previousState.inputLang
      || currentState.activeTerm !== previousState.activeTerm
      || currentState.offset !== previousState.offset) {

      if (currentState.activeTerm || previousState.activeTerm || (currentState.inputLang !== previousState.inputLang)) {
        console.log("setting hash");
        window.location.hash = newUrlHash;
      }

    } else {
      var oldUrl = window.location.href;
      if (oldUrl.indexOf('#')) {
        var newUrl = oldUrl.replace(window.location.hash, '#' + newUrlHash)
      } else {
        var newUrl = oldUrl += '#' + newUrlHash;
      }
      if (currentHash !== '#home') {
        console.log("replacing url");
        window.location.replace(newUrl);
      }
    }
    this.appState.markStateAsStored();
  },

  /**
   * Activate inline Tibetan sections as clickable links
   * Called by dataAccess after checking which sections have dictionary entries
   * @param {Object} availableSections - Map of sectionId to section content in Wylie
   */
  activateInlineTibetanSections: function (availableSections) {
    var activeTerm = this.appState.activeTerm;
    for (const [sectionId, sectionInfo] of Object.entries(availableSections)) {
      if (activeTerm !== sectionInfo.wylie) {
        $('#' + sectionId)
          .addClass('link')
          .attr('data-wylie', sectionInfo.wylie)
          .click((event) => { this.readTerm($(event.currentTarget).attr('data-wylie'), "tib", true); });
      }
    }
  },

  openScannedPage: function (dictId, termId, pageInfo) {
    this.scannedDictionaryViewer.viewScan('data/scan/' + dictId + '/', pageInfo);
  },

  loadTerm: function (term, dictEntries, saveState) {
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

    var result = this.DefinitionFormatter.formatDefinitionList(dictionaries, dictEntries, term, this.getLang(), this.appState.useUnicodeTibetan, ABBREVIATIONS);

    // Check for links in Tibetan sections
    if (Object.keys(result.allInlineSections).length > 0) {
      this.getDataAccess().checkTibetanSectionsForLinks(result.allInlineSections)
        .then(availableSections => this.activateInlineTibetanSections(availableSections));
    }

    $(result.definitionTableHtml).appendTo('#definitions');
    $('#definitions').find('a[href^="http"]').click(
      (event) => { this.openLink($(event.currentTarget).attr('href')); }
    );
    TOOLTIPS.bindTooltipHandlers();

    if (saveState) {
      this.setSidebarState(false);
      this.storeNavigationState();
    }
    this.resultListRenderer.highlightTerm(term, this.getLang());
    this.scrollToTop();
  },

  /**
   * Handle shared text from other Android apps
   */
  handleSharedText: function () {
    if (window.cordova && window.ShareTextPlugin) {
      ShareTextPlugin.getSharedText(
        (sharedData) => {
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
            this.appState.lang = inputLang;
            this.setInputLang(inputLang);

            // cleanup text and search for the entered term
            if (inputLang === "tib") {
              if (/.*['a-zA-Z].*/.test(sharedText)) {
                // remember the fact that something was typed in Wylie rather than in Tibetan unicode;
                // in this case we will later convert the input back to Wylie when backspace is pressed.
                this.inputHandler.setWasTypedInWylie(true);
              }

              sharedText = sharedText.replace(/[\s\-\/()\[\]{},།:–—!.?]+/g, ' ');
              sharedText = this.uniToWylie(sharedText);
              sharedText = this.tibetanOutput(sharedText + ' ');
            } else {
              sharedText = sharedText.replace(/[\.]+/g, ' ');
            }
            sharedText = sharedText.trim();

            // Set input field value
            this.inputHandler.setValue(sharedText);
            this.inputHandler.focus();

            console.log("Set input field to shared text: " + sharedText);
            this.search(true, true, 0);
          } else {
            console.log("No shared text found");
          }
        },
        (error) => {
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
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('code/js/pwa/service-worker.js')
      .catch((err) => { console.warn('SW registration failed', err); });
  });
}

// initialize the actual app
Promise.all([
  import('../language-io/wylieConverter.mjs'),
  import('../db/dataAccess.mjs'),
  import('../db/searchController.mjs'),
  import('../ui/definitionFormatter.mjs'),
  import('../ui/scannedDictionaryViewer.mjs'),
  import('../ui/resultListRenderer.mjs'),
  import('../language-io/inputHandler.mjs'),
  import('./appState.mjs'),
]).then(([{ WylieConverter }, { PhpDataAccess, CordovaDataAccess }, { SearchController }, { DefinitionFormatter }, { ScannedDictionaryViewer }, { ResultListRenderer }, { InputHandler }, { AppState }]) => {

  var appState = new AppState();
  var wylieConverter = new WylieConverter();
  var scanViewer = new ScannedDictionaryViewer(jQuery);
  DefinitionFormatter.initialize();

  var resultListRenderer = new ResultListRenderer(jQuery, {
    onTermSelected: (wylie, lang) => {
      DICT.appState.lang = lang;
      DICT.readTerm(wylie, lang, true);
    }
  });

  if (window.cordova) {
    //phonegap-based initialization for mobile app
    document.addEventListener("deviceready", () => {
      jQuery(($) => {
        var dataAccess = new CordovaDataAccess();
        var searchController = new SearchController(dataAccess);
        DICT.init($, dataAccess, wylieConverter, DefinitionFormatter, scanViewer, InputHandler, appState, searchController, resultListRenderer);
      });
    }, false);
  } else {
    //regular initialization for web app
    jQuery(($) => {
      var dataAccess = new PhpDataAccess();
      var searchController = new SearchController(dataAccess);
      DICT.init($, dataAccess, wylieConverter, DefinitionFormatter, scanViewer, InputHandler, appState, searchController, resultListRenderer);
    });
  }
});
