SETTINGS={
    isMobileDevice: /iPhone|iPad|iPod|Android|BlackBerry|IEMobile/i.test(navigator.userAgent),
    dictListSortableJsInstance: null, 
  
    getAllDictionaries:function() {
      var result = [];
      var isLocalhost = window.location && window.location.hostname && (window.location.hostname.indexOf("localhost")==0);
      var publicOnly = GLOBAL_SETTINGS.publicOnly && (!isLocalhost);
      $.each(DICTLIST,function(currentDictName,dictInfo) {
        if((dictInfo.webOnly && window.cordova)          // suppress webOnly dictionaries in mobile app
         || (publicOnly && dictInfo.public !== "true")) {  // suppress listing of private dictionaries
          DICT.log("suppressing:", dictInfo);
          return;
        }
        
  
        if((!publicOnly)||(publicOnly && dictInfo.public == "true")) {
          result.push(currentDictName);
        }
      });
      return result;
    },
    
    getDefaultSettings:function() {
        var defaultSettings = {
          layout: 'layout_white',
          unicode: true,
          lowercase: SETTINGS.isMobileDevice, // enable this feature by default on mobile devices but not on other devices.
          activeDictionaries: this.getAllDictionaries(),
          inactiveDictionaries:[],
          listSize:10
        };
        return defaultSettings;
    },
  
    getSettings:function() {
      var settingsStr = "";
      if(window.localStorage) {
        settingsStr = localStorage.getItem("settings");
      }
      if(settingsStr) {
        try {
          settings = JSON.parse(settingsStr);
          
          if(!settings.inactiveDictionaries) {
            settings.inactiveDictionaries = [];
          }
          
          if(!settings.listSize) {
            settings.listSize = 10;
          }
  
          if(settings.listSize > 500) {
            settings.listSize = 500;
          }
          
          if(settings.unicode==='true') {
             settings.unicode=true; 
          }
          if(settings.unicode==='false') {
             settings.unicode===false;
          }
          
          
          // check if any dictionaries have been added since last time when the settings were saved by the user
          var newDictionaries = [];
          $.each(this.getAllDictionaries(),function(index,currentDictName) {
            if($.inArray(currentDictName,settings.activeDictionaries)<0 && $.inArray(currentDictName,settings.inactiveDictionaries)<0 ) {
              newDictionaries.push(currentDictName);
              DICT.log("added new dict" + currentDictName);
            }
          });
          
          
          settings.activeDictionaries = settings.activeDictionaries.concat( newDictionaries );
          
          return settings;
        } catch(e) {
          // loading of user settings failed -> return defaults
        }
      }
      
      return this.getDefaultSettings();
    },
    
    btnShowSettings:function() {
        DICT.scrollToTop();
        location.hash="settings"
  
        var settings = SETTINGS.getSettings();
        $('#setting_layout #'+settings.layout).prop('selected',true);
        
        if(settings.unicode===true || settings.unicode==='true') {
          $('#setting_unicode #setting_unicode_true').prop('selected',true);
        }
        else if(settings.unicode===false || settings.unicode==='false') {
          $('#setting_unicode #setting_unicode_false').prop('selected',true);
        }
        else if(settings.unicode==='output') {
          $('#setting_unicode #setting_unicode_output').prop('selected',true);
        }
        
        if(settings.lowercase) {
          $('#setting_lowercase #setting_lowercase_true').prop('selected',true);
        }
        
        if(settings.listSize) {
          $('#setting_list_size').val(settings.listSize);
        }
        
        var activeDicts = [];
        var inactiveDicts = [];
        $.each(settings.activeDictionaries,function(index,currentDictName) {
          var dictInfo = DICTLIST[currentDictName];
          if(dictInfo)
              activeDicts.push(dictInfo);
        });
        
        $.each(this.getAllDictionaries(),function(index,currentDictName) {
          var dictInfo = DICTLIST[currentDictName];
          
          dictInfo.id = currentDictName;
          if($.inArray(currentDictName,settings.activeDictionaries)<0) {
            inactiveDicts.push(dictInfo);
          }
        });
        var dicts = activeDicts.concat(inactiveDicts);
        var dictList = '';
  
        $.each(dicts,function(idx,dictInfo) {
          var checked = '';
          var currentDictName = dictInfo.id;
          if($.inArray(currentDictName, settings.activeDictionaries)>=0) {
            checked = 'checked';
          } else {
            checked = '';
          }

          var tooltipIcon = ""; 
          if(dictInfo.about) {
            tooltipIcon = ' <span class="tooltip dict-info" title="'+dictInfo.about+'"></span>';
          }

          dictList += '<div class="dictsettings-item" id="dict_wrap_'+currentDictName+'">';
          dictList += '<div class="dictsettings-line"><span>';
          dictList += '<span class="drag-handle" title="drag here to change the order"></span>';
          dictList += '<input type="checkbox" '+checked+' name="dict_'+currentDictName+'" id="dict_'+currentDictName+'"  />';
          dictList += '<label for="dict_'+currentDictName+'">'+dictInfo.label+'</label>' + tooltipIcon;
          dictList += '</span>';
          dictList += '</div>';
          dictList += '<div class="dictsettings-move">';
          dictList += '<a class="dict-move-up" href="javascript:SETTINGS.btnMoveDictSettingUp(\'dict_wrap_'+currentDictName+'\')"></a>';
          dictList += '<a class="dict-move-down" href="javascript:SETTINGS.btnMoveDictSettingDown(\'dict_wrap_'+currentDictName+'\')"></a>';
          dictList += '<span class="drag-handle" title="drag here to change the order"></span>';
          dictList += '</div></div>';
        });
        
        $('#mainScreen').hide();
        $('#select-dict').html(dictList);
        $('#settingsScreen').show();
        TOOLTIPS.bindTooltipHandlers();


        // ### init sorting for the list of dictionaries
        
        // destroy old Sortable instance before creating a new one 
        if(this.dictListSortableJsInstance && this.dictListSortableJsInstance.destroy) {
          this.dictListSortableJsInstance.destroy();
        }

        // make dictionary list sortable
        this.dictListSortableJsInstance = new Sortable(document.getElementById('select-dict'), {
          animation: 150, 
          //ghostClass: 'dragging',
          handle: '.drag-handle',
          scroll: true,
          scrollSensitivity: 45,
          scrollSpeed: 10,
          bubbleScroll: true,
          forceAutoScrollFallback: true,
          //delayOnTouchOnly: true,
          onEnd: function (evt) {
            evt.stopPropagation();
          }
        });
    },
    
    storeSettings:function(settings) {
      var settingsStr = JSON.stringify(settings);
      localStorage.setItem("settings", settingsStr);      
    },
    
    btnSaveSettings:function() {
      var settings={
        layout:$('#setting_layout option:selected').attr('name'),
        unicode:false,
        lowercase:$('#setting_lowercase option:selected').attr('name') == 'setting_lowercase_true',
        listSize:Number($('#setting_list_size').val()),
        activeDictionaries:[],
        inactiveDictionaries:[]
      };
      $.each($('#select-dict input:checked'), function(idx,item) {
        settings.activeDictionaries.push($(item).attr('id').replace('dict_',''));
      });
      $.each($('#select-dict input:not(:checked)'), function(idx,item) {
        settings.inactiveDictionaries.push($(item).attr('id').replace('dict_',''));
      });
      
      if($('#setting_unicode option:selected').attr('name') == 'setting_unicode_true')
        settings.unicode = 'true';
      else if($('#setting_unicode option:selected').attr('name') == 'setting_unicode_output')
        settings.unicode = 'output';
      else
        settings.unicode = 'false';
  
      this.storeSettings(settings);
      history.back();
    },
    
    btnCancelSettings:function() {
      history.back();
    },
  
    btnResetSettings:function() {
      this.storeSettings(this.getDefaultSettings());
      history.back();
    },
    
    btnMoveDictSettingDown:function(id) {
      var $el = $('#'+id);
      $el.before($($el.next()));
    },
    
    btnMoveDictSettingUp:function(id) {
      var $el = $('#'+id);
      $el.after($($el.prev()));
    }
  }