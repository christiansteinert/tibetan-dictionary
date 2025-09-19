var DICT={
  _needsBackspaceWorkaround:null,
  _touch:false,
  _offset:0,
  dataAccess:{},
  useUnicodeTibetan:true,
  wasTypedInWylie:false,
  DICTLIST:{},
  WORDLIST:[],
  ABBREV:[],
  SEPARATORLIST:[',',';','"','#','/',' ',':','_','\n','1','2','3','4','5','6','7','8','9','0','０','１','２','３','４','５','６','７','８','９','<','>','(',')','（','）','[',']','{','}','*','—','=','《','》'],
  UNICODE_SEPARATORLIST:[], 
  SYLLABLELIST:{},
  UNICODE_SYLLABLELIST:{},
  dataTable:{},
  activeTerm:"",
  currentInput:"",
  lang:"tib",
  inputLang:"tib",
  lastUniInput:"",
  currentListTerm:"",

  getAbbreviations:function(id) {
    if(!this.ABBREV[id]) {
      var abbrev = ABBREVIATIONS[id];
      var searchPattern = abbrev.match;
      var searchList = [];
      
      if ((typeof searchPattern) === "string") {
        searchPattern = [searchPattern];
      }

      for(var i in searchPattern) {
        var search = searchPattern[i];
        
        for (abbr in abbrev.items) {
          var abbrEscaped = abbr.replace(/([\[\]\.\*\+\{\}])/g,'\\$1');
          var termSearch = search.replace("TERM",abbrEscaped);

          if(!searchList[abbr])
            searchList[abbr] = [];
          
          searchList[abbr].push({
            search:new RegExp(termSearch, "mg"),
            explanation:abbrev.items[abbr]
          });
        
          if(termSearch.indexOf(' ')>-1) {
            var abbrCondensed = abbrEscaped.replace(/ /g,'');
            var termSearch2 = search.replace("TERM",abbrCondensed);
            
            var abbrNoSpace = abbr.replace(/ /g,'')
            if(!searchList[abbrNoSpace])
                searchList[abbrNoSpace] = [];
            
            searchList[abbrNoSpace].push({
              search:new RegExp(termSearch2, "mg"),
              explanation:abbrev.items[abbr]
            });
          }
        }
      }
      
      this.ABBREV[id] = searchList;
    }
    return this.ABBREV[id];
  },
  
  processAbbreviations:function(id, text) {
    var abbrevs = DICT.getAbbreviations(id);
    var changed = true;
    while(changed) {
      var t = text;
      for(var abbr in abbrevs) {
        var items = abbrevs[abbr];
      
        for(var itemIds in items) {
          var item = items[itemIds];
          var oldText = "";
          var i = 0;
          while(text != oldText) {
              oldText = text;
              text = text.replace(item.search, '$1<span class="tooltip" title="'+abbr+': '+item.explanation+'">$2</span>$3');
              if(i++>10) {
                DICT.log("trouble with replacing "+abbr+" in: "+text);
                break;
              }
          }
        }
      }
      if(t===text) {
        changed=false;
      }
    }
    return text;
  },
  
  log:function(x) {
    if(typeof console === "object" && typeof console.log === "function" ) {
      console.log(x);
    }
  },

  isValidSeparator:function(wylie) {
    return jQuery.inArray( wylie, this.SEPARATORLIST) >= 0 || jQuery.inArray( wylie, this.UNICODE_SEPARATORLIST) >= 0;  
  },

  isValidSyllable:function(wylie) {
    if(!wylie)
      return false;

    if(wylie.match(/[aeiou]'a( |$|\/)/)) // syllables ending with an a-chung should end with ' and not with 'a
      return false;

    if(wylie.match(/^[^aeiou]+'/)) // syllables with an a-chung that is not the prefix must contain another vowel before that
      return false;
      
    switch(wylie) {
      case 'm\'i':
        return false;
      case 'gans':
        return false;
      case 'dabs':
        return false;
      case 'dgas':
        return false;
      case 'dams':
        return false;
      case 'badg':
        return false;
      case 'dga':
        return false;
      case 'mna':
        return false;
      case 'bga':
        return false;
      case 'lsa':
        return false;
      case '\'ags':
        return false;
      case 'mngas':
        return false;
      case 'bgas':
        return false;
      case 'gYogs':
        return false;
      case 'ada':
        return false;
      case '\'ba':
        return false;
      case '\'ad ':
        return false;
      case 'dba':
        return false;
      case 'dda':
        return false;
      case '':
        return false;
      case 'ba\'':
        return false;
      case 'banga':
        return false;
      case 'bachu':
        return false;
      case 'bda':
        return false;
      case 'bdzra':
        return false;
      case 'gma':
        return false;
      case 'gna':
        return false;
      case 'gand':
        return false;
      case 'gsa':
        return false;
      case 'kka':
        return false;
      case '\'ma':
        return false;
      case 'mba':
        return false;
      case 'mda':
        return false;
      case 'mga':
        return false;
      case 'mnga':
        return false;
      case '\'nga':
        return false;
      case 'tta':
        return false;
      case 'uta':
        return false;
      case 'ppa':
        return false;
      case 'bngas':
        return false;
      case 'gda':
        return false;
      case 'dna':
        return false;
      case 'dma':
        return false;
      case 'kka':
        return false;
      case '\'an':
        return false;
      case 'padma':
        return true;
      case 'pad+ma':
        return true;
      case 'bsa':
        return false;
    }
    return /^[gdbm']?[rls]?(?:k|kh|g|ng|c|ch|j|ny|t|th|d|n|p|ph|b|m|ts|tsh|dz|w|zh|z|'|y|r|l|sh|s|h|)[yrlw]?[aeiou](?:'[aeiou]?)?(?:g|ng|d|n|b|m|r|l|s|)?[sd]?$/.test(wylie);  
  },

  /**
   * normalize a piece of Wylie text by fixing common mistakes
   */
  normalizeWylie:function(text) {
    text = text.replace(/v/,'w');
    text = text.replace(/[\u0009\u000B\u000C\u0020\u0085\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\u180E\u200B\u200C\u200D\u2060\uFEFF\u00B7]+/g,' ');
    text = text.replace(/\s*་\s*/g,'་');
    text = text.replace(/^ *[/]/mg,'_');
    text = text.replace(/^ +|[ _]+$/,'');
    if(text != '' && !/.*(?: |\+|\/|་|།)$/.test(text))
      text += ' '; // add a tseg at the end if the text neither ends with a tseg nor a shad
    //text = text.replace(/\s*[-=]\s*/g,' '); //remove special characters
    text = text.replace(/ *(\.\.\.|…) */g,'_…_'); //add spaces before and after "..."
    text = text.replace(/ +([\.\/,;])/g,'$1'); //prevent space before . or shad or , or ;
    text = text.replace(/([]\)}\/\.;,\-=]+) +/g,'$1_'); //space rather than tseg after certain characters
    text = text.replace(/ng\//g,'ng /'); // tseg between nga and shad
    text = text.replace(/[ _]+([-\[\(\{])/g,'_$1'); // add space before certain characters
    text = text.replace(/(\/+|[0-9]\.)[ _]*/g,'$1_'); // add space after shad and other characters
    text = text.replace(/  +/g,' _'); //two spaces -> tseg space
    text = text.replace(/([^a-zA-Z']) +([^\s])/g,'$1_$2'); //space rather than tseg between a non-syllable and a syllable
    text = text.replace(/([a-zA-Z'])([,;])/g,'$1 $2'); //tseg between syllable and various punctuation marks
    text = text.replace(/([^a-zA-Z'])[ _]+$/mg,'$1'); //prevent tsegs after non-word charcters at the end of a line
    text = text.replace(/([aeiou]')([bcdfghjklmnpqrstvwxyz])/ig,'$1a$2'); //enforce a vowel after a-chung
    text = text.replace(/\.( |\/)|\.$/g,'//$1'); //a dot at the end of a syllable cannot be part of the syllable. Convert it to a double-shad

    
    //prevent spaces after certain character combinations (this is a cleanup rule that removes some spaces 
    // that may have been introduced by one of the previous rules but are not desired)
    text = text.replace(/(\/)[ _]([\]\)}])/mg,'$1$2');

    return text;
  },

  wylieSyllableToUniSyllable:function(syllable,strictChecks) {
    if(this.SYLLABLELIST[syllable] && (!strictChecks || this.isValidSeparator(syllable) || this.isValidSyllable(syllable)) ) {
      return this.SYLLABLELIST[syllable];
    }
      
    return syllable;
  },

  /**
   * convert a chunk of text from Wylie to Tibetan unicode
   * @param text (string) a piece of text in Wylie transliteration 
   * @param strictChecks (boolean) if true, then the syllable will be 
   *        checked more thoroughly and will only be converted, if it 
   *        matches the usual Tibetan writing rules
   * @return the same piece of text but converted to unicode
   */
  wylieToUni:function(text,strictChecks) {
    result = "";
     //remove dashes that connect syllables inside of wylie chunks but keep "-i" which stands  for a reversed gigu
    text = text.replace(/([^ ])-([^ i])/g,'$1 $2');

    // Tokenize and convert each syllable / token to Unicode
    var separators = [], tokenizer;
    var squigglyBracketsActive = false;
    separators = this.SEPARATORLIST;
    separators = separators.concat(this.UNICODE_SEPARATORLIST);

    if(jQuery.inArray( text, this.SEPARATORLIST)<0)
      text = this.normalizeWylie(text);

    tokenizer = new jQuery.tokenizer( separators, function( syllable, isSeparator ) {
      result += DICT.wylieSyllableToUniSyllable(syllable,strictChecks);
    });
    tokenizer.parse(text);
    result = result.replace(/ +/g,'་');
    result = result.replace(/([༡༢༣༤༥༦༧༨༩༠།).།])་/g,'$1 ');
    return result;
  },
  
  _sktToUniChunk:function(skt) {
    transliterate = {
      'Oṃ':['oM','OM','AUM'],
      'ṛ':['RRi','R^i','R'],
      'ḷ':['LLi','L^i','lR'],
      'ch':['Ch'],
      'ñ':['J','~n','JN'],
      'ṭh':['Th'],
      'ḍh':['Dh'],
      'ṭ':['T'],
      'ḍ':['D'],
      'ṇ':['N'],
      'v':['w'],
      'ṃ':['M','\\.n','\\.m'],
      'ḥ':['H','\\.h'],
      'ṣ':['Sh','shh','S'],
      'ś':['z','sh'],
      'ṅ':['G','~N'],
      'ū':['U','uu'],
      'ī':['I','ii'],
      'ā':['A','aa'],
      'â':['\\^a'],
      'ô':['\\^o'],
      'û':['\\^u'],
      'ê':['\\^e'],
      'î':['\\^i'],
    };
  
    if(skt.toUpperCase() == skt)
      return skt; // don't adjust text that is only comprised of upper case characters
  
    $.each(transliterate,function(uni, transliterations) {
      for(i=0;i<transliterations.length;i++) {
        var transliteration = transliterations[i];
        var replacer = new RegExp(transliteration,"g");
        skt = skt.replace(replacer,uni);
      }
    });
    return skt;
  },
  
  sktToUni:function(skt) {
    var result = "";
    var separators = ['{','}','[',']', ' ', '='];
    var bracketActive;
    var currentTibChunk = "";
    
    tokenizer = new jQuery.tokenizer( separators, function( chunk, isSeparator ) {
      if(isSeparator && ( chunk === '{' || chunk === '[' ) ) {
        bracketActive = true;
      }
      if(isSeparator && ( chunk === '}' || chunk === ']' ) ) {
        bracketActive = false;
      }
        
      if(bracketActive)
        result += chunk;
      else
        result += DICT._sktToUniChunk(chunk);
    });
    tokenizer.parse(skt);
    
    return result;
  },

  uniSyllableToWylieSyllable:function(syllable) {
    syllable = this._normalizeWylieForLookup(syllable);
    if(this.UNICODE_SYLLABLELIST[syllable]) {
      var result = this.UNICODE_SYLLABLELIST[syllable];
      result = result.replace(/([aeiou]')([bcdfghjklmnpqrstvwxyz])/g,"$1a$2");
      return result;
    } else {
      return syllable;
    }
  },

  uniToWylie:function(text) {
    if(this.useUnicodeTibetan) {
      result = "";
      var tokenizer = new jQuery.tokenizer( this.UNICODE_SEPARATORLIST,
        function( syllable, isSeparator ) {
          result += DICT.uniSyllableToWylieSyllable(syllable);
        }
      );
      tokenizer.parse(text);

      return result;
    } else {
      return text;
    }
  },
  
  normalizeInlineEnglish:function(text) {
    text = text.replace(/([,\.]) */g,'$1 ');
    text = text.replace(/ *- */g,' - ');
    return text;
  },
  
  /**
   * convert a chunk of text from Wylie to Tibetan unicode, if unicode is active.
   * Otherwise, simply return the Wylie text.
   * @param text (string) a piece of text in Wylie transliteration 
   * @param strictChecks (boolean) if true, then the syllable will be 
   *        checked more thoroughly and will only be converted, if it 
   *        matches the usual Tibetan writing rules
   * @param ignoreBracketedSections don't change sections in squiggly brackets
   * @return the same piece of text but converted to unicode
   */
  tibetanOutput:function(text,ignoreBracketedSections) {
    if(this.useUnicodeTibetan) {
      if(ignoreBracketedSections) {
        var result = "";
        var bracketActive = false;
        var tokenizer = new jQuery.tokenizer( ['{','}'],
          function( syllable, isSeparator ) {
            if(syllable === '{') {
              result += ' ';
              bracketActive = true;
            } else if(syllable === '}') {
              result += ' ';
              bracketActive = false;
            } else if(bracketActive) {
              result += DICT.normalizeInlineEnglish(syllable);
            } else {
              result += DICT.wylieToUni(syllable,false);
            }
          }
        );
        tokenizer.parse(text);
        return result;
      } else {
        var result = this.wylieToUni(text,false);
        return result;
      }
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
    if(window.cordova) {
      DICT._touch = true;
      $('body').addClass('mobile');
      return CordovaDataAccess;
    } else {
      $('body').addClass('desktop');
      return PhpDataAccess;
    }
  },
  
  init:function($) {
    $.fn.selectRange = function(start, end) {
      if(end === undefined) {
          end = start;
      }
      return this.each(function() {
          if('selectionStart' in this) {
              this.selectionStart = start;
              this.selectionEnd = end;
          } else if(this.setSelectionRange) {
              this.setSelectionRange(start, end);
          } else if(this.createTextRange) {
              var range = this.createTextRange();
              range.collapse(true);
              range.moveEnd('character', end);
              range.moveStart('character', start);
              range.select();
          }
      });
    };

    $.fn.selectRangeStart = function() {
      return this.each(function() {
          if('selectionStart' in this) {
              return this.selectionStart;
          } else {
            return -1;
          }

      });
    };    

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
  
  inputToLowerIfNeeded:function(input) {
    if(SETTINGS.getSettings().lowercase && DICT.getInputLang() === "tib") {
      input = input.toLowerCase();
    }
    return input;
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

  needsBackspaceWorkaround:function() {
    // old versions of Android cannot delete Tibetan script when pressing backspace
    // in that case we need workarounds
    if(this._needsBackspaceWorkaround === null) {
      this._needsBackspaceWorkaround = /Android [1234][^0-9]/.test(navigator.userAgent)
    }
    return this._needsBackspaceWorkaround;
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
      if(!window.localStorage)
        $('#settingsBtn').hide();
      
      if(this.settings.layout == 'layout_black') {
      $('body').addClass('dark');
      }
      this.SYLLABLELIST = SYLLABLELIST;
      this.setTibetanOutput(this.settings.unicode);
      this.initCreditsInformation();
      $('#mainScreen').show();
      $('#init').hide();

      var conflicts=[];        
      $.each(this.SYLLABLELIST,function(wylie,uni){
        var existingSyllable = DICT.UNICODE_SYLLABLELIST[uni];
        if(!existingSyllable) {
          existingSyllable = uni;
        }
        var oldValid = DICT.isValidSyllable(existingSyllable);
        var newValid = DICT.isValidSyllable(wylie);
        if(DICT.isValidSeparator(wylie)
          ||DICT.isValidSyllable(wylie)
          ||(!existingSyllable && /[a-zA-Z]/.test(wylie))
          ||(oldValid == newValid && existingSyllable.length < wylie.length)                ) {
          DICT.UNICODE_SYLLABLELIST[uni] = wylie;
        }
        if(existingSyllable && oldValid == newValid) {
          conflicts.push(uni + " -> " + existingSyllable + " / " + wylie );
        }
      });
      
      DICT.log(conflicts.length + " conflicting syllables.");
    
      $.each(this.SEPARATORLIST,function(idx,value){
        DICT.UNICODE_SEPARATORLIST.push( DICT.wylieToUni(value) );
      });

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

      $('#searchTerm').on('keypress',function(event){                      
        if(event.keyCode == 13){ //enter
          // if enter is pressed in the input field then convert all syllables to unicode
          DICT.lang = DICT.getInputLang();
          var uniInput = DICT.inputToLowerIfNeeded( $('#searchTerm').val() );
          
          if(DICT.useUnicodeTibetan===true && (DICT.getInputLang() === "tib")) {
            uniInput = uniInput.replace(/[\- _/།]+/g,' ');
            uniInput = DICT.normalizeWylie(uniInput);
            var newInput = DICT.uniToWylie(uniInput);
            var inputText = DICT.tibetanOutput( newInput );

            if ( DICT.getInputLang() === "tib" && /.*['a-zA-Z].*/.test(uniInput) ) {
              // remember the fact that something was typed in Wylie rather than in Tibetan unicode;
              // in this case we will later convert the input back to Wylie when backspace is pressed.
              DICT.wasTypedInWylie = true;
            }             
          } else {
            uniInput = uniInput.replace(/[-\s\/]+/g,' ');
            var newInput = uniInput;
            var inputText = newInput;
          }
          
          $('#searchTerm').val(inputText).blur();
          DICT.scrollToTop(),
          DICT.search(true,true,0);
        }
      });
      
      $('#searchTerm').on('keyup mobiletextchange input',function(event){
        var $st = $('#searchTerm'),
            uniInput = DICT.inputToLowerIfNeeded( $st.val() ),
            lastUniInput = DICT.lastUniInput,
            newInput = uniInput,
            currentInput = DICT.currentInput,
            isCursorAtTheEnd = ($st.get(0).selectionStart == uniInput.length);

        if(event.type === "input" && !/.*['a-zA-Z].*/.test(uniInput + lastUniInput)) {
          // skip our handling of the input event if input so far has not contained wylie-relevant
          // characters because our event handling for the input event can interfere with 
          // Tibetan Unicode input on iPhones
          return;
        }

        if(DICT.getInputLang() === "tib" && DICT.useUnicodeTibetan===true) {
          newInput = DICT.uniToWylie(uniInput).replace(/_/g,' ');
        } else {
          newInput = newInput.replace(/[-\s\/]+/g,' ');
        }

        if (DICT.getInputLang() === "tib" && /.*['a-zA-Z].*/.test(uniInput)) {
          // remember the fact that something was typed in Wylie rather than in Tibetan unicode;
          // in this case we will later convert the input back to Wylie when backspace is pressed.
          DICT.wasTypedInWylie = true;
          var currentInputContainsWylie = true;
          var matchFullWylieSyllableInTheMiddleOfTibetan = uniInput.match(/(^|^[^ ]*་)([^་ ]+) ([^ ]+$|$)/);
        } else if(uniInput === "") {
          DICT.wasTypedInWylie = false;
          var currentInputContainsWylie = false;
          var matchFullWylieSyllableInTheMiddleOfTibetan = null;
        }

        if(DICT.useUnicodeTibetan===true 
          && uniInput.length > lastUniInput.length
          && matchFullWylieSyllableInTheMiddleOfTibetan) {
          // partial editing within Tibetan editing where a syllable in Wylie was added into a piece of Tibetan
          var charactersBehindCursor = newInput.length - $st.get(0).selectionStart || 0;
          var matches = matchFullWylieSyllableInTheMiddleOfTibetan;
          var insertedSyllable = DICT.normalizeWylie(matches[2]);
          insertedSyllable = DICT.wylieToUni(insertedSyllable);
          var inputText = matches[1] + insertedSyllable + matches[3];
          var newCursorPos = matches[1].length + insertedSyllable.length; 
          
          //inputText = inputText.replace(/[\-_ \/་།\s]+/g,' '); // get rid of shad; turn into tseg; prevent double-tsegs
          DICT.log(matches);
          DICT.log(inputText);

          $('#searchTerm').val(inputText);
          DICT.search(false,true,0);
          isCursorAtTheEnd = false;          
          $('#searchTerm').selectRange(newCursorPos);
  


        } else if(event.keyCode == 32 
            || (/[\- \/་།\s]$/.test(uniInput) && uniInput.startsWith(lastUniInput) && !/[a-zA-Z'].*་/.test(lastUniInput)) // syllable  end char present and no latin letters before Tibetan stuff
            || (newInput.length >= 3 && DICT.getInputLang() == 'en') ) {
          
          //space at the end of the text or typing in English
          // => convert all syllables to unicode and fill the word list
          if(DICT.useUnicodeTibetan===true && (DICT.getInputLang() === "tib")) {
            if (currentInputContainsWylie) {
              newInput = DICT.normalizeWylie(newInput);
              newInput = newInput.replace(/[\-_ \/་།\s]+/g,' '); // get rid of shad; turn into tseg; prevent double-tsegs
              var inputText = DICT.tibetanOutput( newInput );
            } else {
              var inputText = uniInput.replace(/[\-_ \/་།\s]+/g,'་'); // get rid of shad; turn into tseg; prevent double-tsegs
            }
          } else {
            var inputText = newInput;
          }
          $('#searchTerm').val(inputText);
          DICT.search(false,true,0);
                    
        } else if(event.keyCode == 8||(uniInput.length < lastUniInput.length && lastUniInput.startsWith(uniInput))) { // backspace
          var isAtEndOfSyllable = isCursorAtTheEnd && /(^|[_ /་།])[^a-zA-Z'_ /་།]+$/.test(uniInput);
          if(DICT.wasTypedInWylie && DICT.useUnicodeTibetan===true  &&  (DICT.getInputLang() === "tib") && isAtEndOfSyllable ) {
            // backspace at end of Tibetan syllable after having typed some part of the input in Wylie
            // => convert the last syllable back to Wylie
            var adjusted = DICT.uniToWylie(uniInput).replace(/[_  ]*$/, '');
            var splitPos = adjusted.lastIndexOf(' ');
            if (splitPos>0) {
                adjusted = DICT.wylieToUni(adjusted.substring(0,splitPos + 1)) + adjusted.substring(splitPos+1);
            }
            
            $('#searchTerm').val(adjusted);
            DICT.search(false,true,0);
            
          } else if(DICT.useUnicodeTibetan===true  &&  (DICT.getInputLang() === "tib") && DICT.needsBackspaceWorkaround() && isAtEndOfSyllable ) {
            // backspace at end of Tibetan syllable after having typed Tibetan directly
            // => on old devices: delete whole syllable
            var adjusted = uniInput.replace(/(^|[_ /་།])[^a-zA-Z'_ /་།]+$/,'$1');
            $('#searchTerm').val(adjusted);
            DICT.search(false,true,0);
          } else {
            // backspace in all other cases
            // => just allow regular logic: allow the last character be deleted. This may be the last Unicode character
            DICT.search(false,true,0);
          }          
        }
        DICT.lastUniInput = $('#searchTerm').val();
        DICT.currentInput = DICT.uniToWylie(DICT.lastUniInput);

        if(isCursorAtTheEnd) {
          // put cursor at the end if it was at the end before
          window.setTimeout(function(){
            $('#searchTerm').selectRange($('#searchTerm').val().length);
          },10)
        }
      });

      // handle navigation events
      // - listen to the "back" button on android
      document.addEventListener("backbutton", function(){
        if(window.location.hash !== 'home') {
          history.back();
        }
      }, false); 
      
      // - listen to changes of the URL
      var hashEventCount = 0;
      $(window).hashchange(function(){
        hashEventCount++;
        
        if(new Date().getTime() - DICT._lastHashEvent < 300) 
          return; //ignore hashchange events that are very quick after a user action
          
        var state = decodeURIComponent(location.hash);
        if(state.indexOf('#')==0) {
          state = state.substring(1);
        } else {
          state = '';
        }

        if(state === 'home') {
          if(hashEventCount > 1) {
            location.reload(); // don't reload right away again when hitting the home page upon startup 
          }
          return;
        }
        
        if(state === ''){
          DICT.log('leaving App');
          if(navigator.app && navigator.app.exitApp) {
            navigator.app.exitApp();
          }
        }

        DICT.setState(state);
      });

      // Handle shared text
      if(location.hash == '' || location.hash == '#') {
        location.hash = 'home';
      }
      
      var sharedTextPluginAvailable = DICT.handleSharedText();     
      if (!sharedTextPluginAvailable) {
        $(window).hashchange();
      }
    } catch(e) {
      alert('error initializing:'+e.message);
    }
  },
  
  prev:function() {
    if(window.location.hash === 'home') {
      return;
    }
  
    if(DICT._offset > 0) {
      if($('#searchTerm').val() === '' ) {
        if( DICT.useUnicodeTibetan === true ) {
          $('#searchTerm').val(DICT.tibetanOutput(this.currentListTerm));
        } else {
          $('#searchTerm').val(this.currentListTerm);
        }
      }
      var settings = SETTINGS.getSettings();
      DICT.search(false,true,DICT._offset - settings.listSize);
    }
  },

  next:function() {
    if(window.location.hash === 'home') {
      return;
    }

    if($('#searchTerm').val() === '' ) {
        if( DICT.useUnicodeTibetan === true ) {
          $('#searchTerm').val(DICT.tibetanOutput(this.currentListTerm));
        } else {
          $('#searchTerm').val(this.currentListTerm);
        }
    }
    
    var settings = SETTINGS.getSettings();
    DICT.search(false,true,DICT._offset + settings.listSize);
  },
  
  clearInput:function() {
    $('#searchTerm').val('');
    DICT.scrollToTop();
    DICT.search(false,true,0);
    $('#searchTerm').focus();
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
    if(targetLang)
        DICT.inputLang = targetLang;
    else if(DICT.getInputLang() == "tib")
        DICT.inputLang = "en";
    else 
        DICT.inputLang = "tib";

    DICT.setTibetanOutput(DICT.useUnicodeTibetan);
    DICT.clearInput();

    if(DICT.getInputLang()==="en") {
        $("#searchTerm").attr("placeholder","Enter an English term...")
        $("#searchTerm").attr("lang","en")
        $("#switchBtnEnTib").show();
        $("#switchBtnTibEn").hide();
    } else {
        $("#searchTerm").attr("placeholder","Enter a Tibetan term...")
        $("#searchTerm").attr("lang","bo")
        $("#switchBtnEnTib").hide();
        $("#switchBtnTibEn").show();
    }
    
  },
  
  switchInputLang:function() {
    DICT.setState(DICT.getCurrentState());
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
    if(DICT.inputLang)
        return DICT.inputLang;
    return "tib";
  },
  
  search:function(loadFirstItem,saveState,offset) {
    var inputText = $('#searchTerm').val();
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
            if(lang==currentDict.language && currentDict.scanId && !foundTerms.has(inputText)) {                
              result.push([inputText]);
              foundTerms.add(inputText);
            }
          });
        }

        if(result.length === 0 && offset > 0 )
          return;
      
        for(var i=0;i<result.length && i<settings.listSize;i++) {
          //result[i][0] = DICT.tibetanOutput(result[i][0]);
          tableRows[i]=[];
          if(lang === "en")
            tableRows[i][0]='<span data-wylie="'+result[i][0]+'">'+result[i][0]+'</span>';
          else
            tableRows[i][0]='<span data-wylie="'+result[i][0]+'">'+DICT.tibetanOutput(result[i][0])+'</span>';
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
            
            var wylie = $(this).children('span').attr('data-wylie');
            DICT.lang=DICT.getInputLang();
            DICT.readTerm(wylie, DICT.getInputLang(), true);
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
      $('#wordList tr td span').each(function(count, elem) {
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
    return JSON.stringify(state);
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
        if(DICT.getCurrentState() === state)
          return;
        
        var stateInfo = JSON.parse(state);

        if(stateInfo.lang)
            DICT.lang = stateInfo.lang;

        if(stateInfo.inputLang)
            DICT.inputLang = stateInfo.inputLang;        
        
        DICT.setInputLang( DICT.inputLang );
                    
        if( DICT.useUnicodeTibetan === true && DICT.getInputLang() === "tib") {
          DICT.lastUniInput = this.tibetanOutput(stateInfo.currentListTerm);
        } else {
          DICT.lastUniInput = stateInfo.currentListTerm;
        }
        DICT.currentInput = stateInfo.currentListTerm;
        window.mobiletextCurrentVal = DICT.lastUniInput;
        if ($('#searchTerm').val() != DICT.lastUniInput) {  
          $('#searchTerm').val(DICT.lastUniInput);
          DICT.log("input changed based on URL hash. New value: " + DICT.lastUniInput)
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
        
        this.currentInput = stateInfo.currentListTerm;
      }
    }
  },

  readTerm:function(term, saveState){
    this.scrollToTop();
    term = this._normalizeWylieForLookup(term);
    term = unescape(term).replace(/^\s+|\s+$/g, '');
    if(this.activeTerm != term) {
      this.getDataAccess().readTerm(term, DICT.getLang(), this.settings.activeDictionaries, saveState);
      this.activeTerm = term;
    } else {
      if(this.isSmallScreen() && this.getSidebarState()) {
        //hide sidebar if necessary
        this.setSidebarState(false);
      }
    }
    
  },
  
  storeNavigationState:function() {
    this._lastHashEvent = new Date().getTime();
    window.location.hash = escape(DICT.getCurrentState());
  },
  
  _escapeRegExp:function(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  },

  _normalizeWylieForLookup:function(wylie) {
    // remove unwanted characters - especially whitespace stuff
    if(wylie===' ')
      return wylie;
    wylie = wylie.replace('/',' ');
    wylie = wylie.replace(/[()]/g,' ');
    wylie = wylie.replace(/\s\s+/g,' ');
    wylie = wylie.replace(/^\s+|\s+$/g,'');
    wylie = wylie.replace(/[’‘`´]/g,"'");

    return wylie;
  },

  convertInlineTibetanSections:function(definition, definitionNr) {
    var chunks = definition.match(/[{][^{}]+[}]/g);

    if(!chunks)
      return definition;

    var sections={};
    var sectionCount=0;

    for(var i=0;i<chunks.length;i++) {
      var chunk = chunks[i];
      chunk.replace(/\\/g,"\\\\");
      var chunkContents = this.normalizeWylie(chunk).replace(/[{}]/g,'').replace(/^\s+|\s+$/g,'');
      var out = this.tibetanOutput(chunkContents,false); //,true
      var lookup = this._normalizeWylieForLookup(chunkContents);

      if((!this.useUnicodeTibetan) ||(/.*[a-z].*/.test(chunkContents) && !/^.*[a-zA-Z0-9].*$/.test(out))) {
        var sectionId = 'tibSection' + definitionNr + '_' + i;
        var title = chunk.replace(/\n/g,' ');

        out = out.replace(/\n/g,'<br />');
        out = out.replace(/\\n/g,'<br />');
        out = out.replace(/([()]|&gt;|&lt;)/g,'<span class="paren">$1</span>');

        definition = definition.replace(chunk,'<span id="'+sectionId+'" class="tib inlineTib" title="'+DICT.htmlEscapeTitle(title)+'">'+out+'</span>');

        sections[sectionId] = {
          wylie:lookup
        };
        sectionCount++;

      }
    }
    if(sectionCount>0) {
      DICT.getDataAccess().checkTibetanSectionsForLinks(sections);
    }

    return definition;
  },

  /**
   * make all Tibetan sections into "links" where we can do so...
   */
  activateInlineTibetanSections:function(availableSections) {
    $.each(availableSections,function(sectionId, sectionInfo){
      if(DICT.activeTerm != sectionInfo.wylie) {
        $('#'+sectionId)
          .addClass('link')
          .attr('data-wylie',sectionInfo.wylie)
          .click( function() { 
            DICT.lang="tib";
            DICT.readTerm( $(this).attr('data-wylie'), "tib", true );
          });
      }
    });
  },

  breakDefinitionIntoSections:function(definition) {
    if(definition.match(/([^0-9]|^)1[\.)]/)&&definition.match(/([^0-9]|^)2[\.)]/)) {
      // break before numbers like "1." or "1)"
      definition = definition.replace(/([^-0-9(])([(]?[1-9][0-9]?[\.)] ?)([^0-9])/mg,'$1\n$2 $3');
      definition = definition.replace(/^([(]?[1-9][0-9]?[\.)] ?)([^0-9])/mg,'$1 $2');
    }
    return definition;
  },

  htmlEscapeDefinition:function(definition) {
    definition = this.htmlEscape(definition);
    
    definition = definition.replace(/(https?:\/\/)([-0-9a-zA-Z\/\.#%_:&;]+)/g, '<a target="_blank" href="$1$2">$2</a>');
    definition = definition.replace(/\\+n/g,'\n'); 
    definition = definition.replace(/\\/g,''); 
    definition = definition.replace(/([a-zA-Z0-9\.]){/g,'$1 {');
    definition = definition.replace(/}([a-zA-Z0-9])/g,'} $1');
    definition = definition.replace(/:([^\/0-9])/g,': $1');
    definition = definition.replace(/ - /g,' &ndash; ');

    return '<p>' + definition + '</p>';
  },

  htmlEscapeTitle:function(title) {
    title = this.htmlEscape(title);
    title = title.replace(/{/g,'&#123;');
    title = title.replace(/}/g,'&#125;');
    title = title.replace(/\n/g,' ');
    title = title.replace(/<[^>]*>/g,' ');
    title = title.replace(/  +/g,' ');
    title = title.replace(/"/g,"&quot;");
    title = title.replace(/'/g,"&#39;");

    return title;
  },

  htmlEscapeScriptAttr:function(text) {
    text = this.htmlEscape(text);
    text = text.replace(/'/g,"\\'");        

    return text;
  },

  htmlEscape:function(text) {
    text = text.replace(/&/g,'&amp;');
    text = text.replace(/</g,'&lt;');
    text = text.replace(/>/g,'&gt;');
    text = text.replace(/"/g,'&quot;');
                   
    return text;
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
    if(DICT.getLang()==="en")
      var termUni = term;
    else
      var termUni = this.tibetanOutput( term );
    var definitionTab = '<h1 class="definitionHead definitionHead'+DICT.getLang()+'" title="'+this.htmlEscapeTitle(term)+'">'+termUni+'</h1><table id="definitionList">';
    var definitionNr = 0;
    var dictList = this.settings.activeDictionaries;

    // add "content" to look up pages in scanned dictionaries
    $.each(DICTLIST, function(dict_id, dict) {
      var currentDict = DICTLIST[dict_id];
      if(DICT.getInputLang()==currentDict.language && currentDict.scanId) {
        dictEntries[dict_id] = '<div><a href="javascript:DICT.loadScannedPage(\'' + DICT.htmlEscapeScriptAttr(currentDict.scanId) + '\',\'' + DICT.htmlEscapeScriptAttr(term) + '\')">' + currentDict.linkText+'</a></div>';
      }
    });

    $.each(dictList,function(idx,currentDictName) {        
      $.each(dictEntries,function(dictName,definition) {
        if(dictName == currentDictName) {
          var currentDict = DICTLIST[dictName];
          if(!currentDict) {
            DICT.log("received result for unknown dictionary '" +dictName+ "'. skipping");
            return;
          } 
          var defStart = "", defEnd = "";
          
          if(currentDict.mergeLines) {
              definition = definition.replace(/\n/gm,'; ');
              definition = definition.replace(/\\n/gm,'; ');
          }
          if(!currentDict.preformattedLinebreaks) {
            definition = DICT.breakDefinitionIntoSections( definition );
          }
          if(currentDict.containsOnlyTibetan) {
            // FIXME: split at various characters such as before and after: / whitespace * ( ) .   

            defStart = '<div class="tib" title="'+DICT.htmlEscapeTitle(definition)+'">';
            if (definition.indexOf("-----")) {
              // ensure that separator lines are working also in Tibetan-only dictionaries
              definition = definition.replace("-----", "}\n-----\n{");
              definition = "{" + definition + "}";
              definition = DICT.convertInlineTibetanSections( DICT.sktToUni( DICT.htmlEscapeDefinition( definition ) ), definitionNr++ );
            } else {
              definition = DICT.htmlEscapeDefinition( DICT.tibetanOutput( definition, true ) );
            }
            defEnd = '</div>';
          } else if(currentDict.containsOnlySkt) {
            defStart = '<div class="skt" title="'+DICT.htmlEscapeTitle(definition)+'">';
            definition = DICT.convertInlineTibetanSections( DICT.sktToUni( DICT.htmlEscapeDefinition( definition ) ), definitionNr++ );
            defEnd = '</div>';
          } else if(currentDict.scanId){ 
            //scanned dictionary. Do nothing because no escaping of text is needed

          } else {
            definition =  DICT.convertInlineTibetanSections( DICT.htmlEscapeDefinition(definition), definitionNr++);
          }
            
          definition = definition.replace(/\n/g,'</p>\n<p>');
          definition = definition.replace(/\\n/g,'</p>\n<p>');
          definition = definition.replace(/<p>-----<\/p>/g,'<p class="separator"></p>');
          definition = definition.replace(/; -----;/g,'</p><p class="separator"></p><p>');

          if(currentDict.highlight) {
            definition = definition.replace(new RegExp(currentDict.highlight,'g'),'<b>$1</b>');
          }

          if(currentDict.abbreviations) {             
            definition = DICT.processAbbreviations(currentDict.abbreviations,definition);
          }
          
          definition = defStart + definition + defEnd;

          var tooltipStart = "", tooltipEnd = ""; 
          if(currentDict.about) {
            tooltipStart = '<span class="tooltip" title="'+currentDict.about+'">';
            tooltipEnd   = '</span>';
          }
          definitionTab += '<tr><td class="dictName">'+tooltipStart+currentDict.label+tooltipEnd+'</td><td class="definition">'+definition+'</td></tr>';
        }
      });
    });
    definitionTab += '</table>';
    $(definitionTab).appendTo('#definitions');
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
            DICT.log("Shared text received: " + sharedData.text + " with language: " + sharedData.language);

            // Clean up the shared text - remove extra whitespace and limit length
            var sharedText = sharedData.text.trim();
            if (sharedText.length > 200) {
              sharedText = sharedText.substring(0, 200);
              DICT.log("Truncated long shared text to 200 characters");
            }
            // Use the language provided by the plugin
            var inputLang = sharedData.language || "tib"; // Default to Tibetan if not specified
            DICT.lang = inputLang;
            DICT.setInputLang(inputLang);

            // cleanup text and search for the entered term
            sharedText = sharedText.replace(/[-\s\/།()\[]{}]+,?:-/g,' ');
            if(inputLang === "tib") {
              sharedText = DICT.uniToWylie(sharedText);
              sharedText = DICT.tibetanOutput(sharedText);              
            } else {
              sharedText = sharedText.replace(/[\.]+/g,' ');
            }
            sharedText = sharedText.trim();
            $('#searchTerm').val(sharedText);

            DICT.log("Set input field to shared text: " + sharedText);
            DICT.search(true,true,0);
            $('#searchTerm').focus();
          } else {
            DICT.log("No shared text found");
          }
        },
        function(error) {
          DICT.log("Error getting shared text: " + error);
        }
      );
      return true;
    } else {
      DICT.log("ShareTextPlugin not available (running in web mode or plugin not loaded)");
      return false;
    }
  },
};


/* ============== Initialization ============== */
if(window.cordova) {
  //phonegap-based initialization for mobile app
  document.addEventListener("deviceready", function(){
      jQuery(function($){
      DICT.init($);
      
    });
  }, false);
} else {
  //regular initialization for web app
  jQuery(function($){
    DICT.init($);
  });
}
