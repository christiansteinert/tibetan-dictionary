SETTINGS={
    isMobileDevice: /iPhone|iPad|iPod|Android|BlackBerry|IEMobile/i.test(navigator.userAgent),
    dictListSortableJsInstance: null, 
  
    getAllDictionaries:function(flattenGroups) {
      var result = [];
      var isLocalhost = window.location && window.location.hostname && (window.location.hostname.indexOf("localhost")==0);
      var publicOnly = GLOBAL_SETTINGS.publicOnly && (!isLocalhost);
      
      dicts = flattenGroups?DICTLIST:GROUPED_DICTLIST;

      $.each(dicts,function(currentDictName,dictInfo) {
        if((dictInfo.webOnly && window.cordova)          // suppress webOnly dictionaries in mobile app
         || (publicOnly && dictInfo.public !== "true")) {  // suppress listing of private dictionaries
          return;
        }
        
        if((!publicOnly)||(publicOnly && dictInfo.public == "true")) {
          result.push(currentDictName);
        }
      });
      return result;
    },
    
    // Helper function to get all dictionary IDs inside a group
    getDictionaryIdsInGroup: function(groupId) {
      var result = [];
      var group = GROUPED_DICTLIST[groupId];
      
      if (group && group.type === 'group' && group.items) {
        $.each(group.items, function(itemId) {
          result.push(itemId);
        });
      }
      return result;
    },
    
    // Helper function to check if a group has any selected items
    isAnyDictionaryInGroupActive: function(groupId, activeDictionaries) {
      var groupDictIds = this.getDictionaryIdsInGroup(groupId);
      for (var i = 0; i < groupDictIds.length; i++) {
        if ($.inArray(groupDictIds[i], activeDictionaries) >= 0) {
          return true;
        }
      }
      return false;
    },

    getDefaultSettings:function() {
        var defaultSettings = {
          layout: 'layout_white',
          unicode: true,
          lowercase: SETTINGS.isMobileDevice, // enable this feature by default on mobile devices but not on other devices.
          activeDictionaries: this.getAllDictionaries(false),
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
          $.each(this.getAllDictionaries(true),function(index,currentDictName) {
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
        
        var processedGroups = {};
        var activeDicts = [];
        var inactiveDicts = [];
        
        
        // First, process active dictionaries in the order of settings.activeDictionaries
        $.each(settings.activeDictionaries, function(index, dictId) {
          // Skip if dictionary is not in GROUPED_DICTLIST or DICTLIST
          var dictInfo = GROUPED_DICTLIST[dictId];
          if (!dictInfo) {
            dictInfo = DICTLIST[dictId];
            if (!dictInfo) return;
          }
          
          // If this is part of a group and the group hasn't been processed yet
          var groupId = dictInfo.groupId;
          if (groupId && !processedGroups[groupId]) {
            // Add the group instead of the individual dictionary
            var groupInfo = GROUPED_DICTLIST[groupId];
            if (groupInfo) {
              groupInfo.id = groupId;
              activeDicts.push(groupInfo);
              processedGroups[groupId] = true;
            }
          } 
          // If it's not part of a group or the group has already been processed
          else if (!groupId && !processedGroups[dictId]) {
            dictInfo.id = dictId;
            activeDicts.push(dictInfo);
            processedGroups[dictId] = true;
          }
        });
        
        // Then, process inactive dictionaries and any remaining active dictionaries
        // that weren't in settings.activeDictionaries
        $.each(this.getAllDictionaries(true), function(index, dictId) {
          var dictInfo = GROUPED_DICTLIST[dictId];
          if (!dictInfo) return;
          
          // Skip if already processed
          if (processedGroups[dictId]) return;
          
          dictInfo.id = dictId;
          
          // If this is a group
          if (dictInfo.type === 'group') {
            var isActive = SETTINGS.isAnyDictionaryInGroupActive(dictId, settings.activeDictionaries);
            if (isActive && !processedGroups[dictId]) {
              activeDicts.push(dictInfo);
            } else if (!processedGroups[dictId]) {
              inactiveDicts.push(dictInfo);
            }
            processedGroups[dictId] = true;
          } 
          // If this is a regular dictionary
          else {
            if ($.inArray(dictId, settings.activeDictionaries) >= 0 && !processedGroups[dictId]) {
              activeDicts.push(dictInfo);
            } else if (!processedGroups[dictId]) {
              inactiveDicts.push(dictInfo);
            }
            processedGroups[dictId] = true;
          }
        });
        
        // Combine active and inactive dictionaries
        var dicts = activeDicts.concat(inactiveDicts);
        var dictList = '';
  
        // Generate HTML for dictionary list
        $.each(dicts, function(idx, dictInfo) {
          var checked = '';
          var currentDictName = dictInfo.id;
          
          // For regular dictionaries, check if they are in activeDictionaries
          // For groups, check if any dictionary in the group is active
          if (dictInfo.type === 'group') {
            if (SETTINGS.isAnyDictionaryInGroupActive(currentDictName, settings.activeDictionaries)) {
              checked = 'checked';
            }
          } else if ($.inArray(currentDictName, settings.activeDictionaries) >= 0) {
            checked = 'checked';
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
          handle: '.drag-handle',
          scroll: true,
          scrollSensitivity: 45,
          scrollSpeed: 10,
          bubbleScroll: true,
          forceAutoScrollFallback: true,
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
      
      // Process all checked items
      $.each($('#select-dict input:checked'), function(idx, item) {
        var dictId = $(item).attr('id').replace('dict_','');
        var dictInfo = GROUPED_DICTLIST[dictId];
        
        // If this is a group, add all its dictionaries
        if (dictInfo && dictInfo.type === 'group' && dictInfo.items) {
          // Add all dictionaries in the group
          $.each(dictInfo.items, function(itemId) {
            settings.activeDictionaries.push(itemId);
          });
        } else {
          // Add the individual dictionary
          settings.activeDictionaries.push(dictId);
        }
      });
      
      // Process all unchecked items
      $.each($('#select-dict input:not(:checked)'), function(idx, item) {
        var dictId = $(item).attr('id').replace('dict_','');
        var dictInfo = GROUPED_DICTLIST[dictId];
        
        // If this is a group, add all its dictionaries to inactive
        if (dictInfo && dictInfo.type === 'group' && dictInfo.items) {
          $.each(dictInfo.items, function(itemId) {
            settings.inactiveDictionaries.push(itemId);
          });
        } else {
          // Add the individual dictionary
          settings.inactiveDictionaries.push(dictId);
        }
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