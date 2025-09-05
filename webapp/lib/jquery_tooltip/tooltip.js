var TOOLTIPS={
  isTouchScreen:false,
  bindTooltipHandlers:function() {
    var $tooltips = $(".tooltip");
    var $bdy = $("body");
    var $wnd = $(window);

    var handleOver = function(e){
      if(window.cordova || TOOLTIPS.isTouchScreen) { 
        return; //ignore hover events on touch devices.
      }
      if(!e || !e.target) {
        return;
      }
        
      var offsY        =16,    //how far below the mouse should the tooltip appear
          ttTimeout    =200,   //delay after which the tooltip should be shown

          $eventTarget = $(e.target),
          titleAttr,
          tooltipHead,
          tooltipBdy,
          colonPos,

          scrollTop   = $wnd.scrollTop(),
          wndHeight   = $wnd.height(),
          bdyWidth    = $bdy.width(),

          $tooltip,
          toolHeight,
          toolWidth,
          remainingTopSpace,
          remainingBottomSpace;

      while(!$eventTarget.hasClass("tooltip")) {
        $eventTarget = $($eventTarget.parent());
      }
      titleAttr = $eventTarget.attr("title");

      //change to "link" mouse cursor to indicate that the term is clickable (which will bring users to the glossary page)
      $eventTarget.css("cursor","pointer");

      //remember original title and remove the title attribute from the element
      //  so that the browser will not show its own tooltip
      $eventTarget.data("originalTitle", titleAttr);  
      $eventTarget.attr("title","");

      //if the title attribute contains a ":" then
      //this separates the tooltip head from the tooltip body.
      //otherwise, the tooltip head is identical to the text of the sectipon to which
      //the tooltip is attached and the title attribute contains only the tooltip body
      titleAttr = titleAttr.replace(/[|]/g,"<br>");
      tooltipBdy = titleAttr;
      
      //create and adjust tooltip
      $tooltip = $('<div id="tooltip">'+tooltipBdy+'<'+'/div>');
      $bdy.append($tooltip);

      toolWidth  = $tooltip.width();

      // make tooltip wider if it contains a lot but make sure that the width still fits on the page
      if(toolWidth>350) {
        toolWidth=350+(titleAttr.length)/2;
      }

      if(toolWidth>0.9*bdyWidth) {
        toolWidth=0.9*bdyWidth;
      }

      $tooltip.css("width",toolWidth+"px");
      toolHeight = $tooltip.height();

      //if the tooltop does not fit on the screen below the mous 
      //  and if there is more scren space left above the mouse than below 
      //  then show the tooltip above the mouse rathern than below
      remainingTopSpace = e.pageY-scrollTop-toolHeight-30;
      remainingBottomSpace = wndHeight+scrollTop-e.pageY-toolHeight-25;

      if(remainingBottomSpace<0 && remainingTopSpace>remainingBottomSpace) {
        offsY = -toolHeight-25;
      }

      //cause tooltip to follow the mouse and cause the tooltip to become visible after a short delay
      // (tooltip will not be shown, if mouse is moved further before it has appeared.)
      var moveTT=function(e){
        if(e.pageX + toolWidth > bdyWidth - 15) {
          e.pageX = bdyWidth - toolWidth - 15;
        }

        $tooltip.css({top:(e.pageY+offsY)+"px", left:e.pageX+"px"});
  
        //mouse has moved - set new delay for the tooltip to be shown (if the Tooltip is visible, 
        //  then the new timeout won't matter; the tooltip will follow the mouse as long as the 
        //  mouse stays somewhere over the current word/phrase)
        tooltipShowTime = ( (new Date()).getTime() ) + ttTimeout;
      };
      moveTT(e);
      $('#tooltip').fadeTo('5',1);
      
      $eventTarget.mousemove(moveTT); //attach a mouse move handler for the span that the mouse is currently over
    };
    
    var handleOut = function(e){
      if(window.cordova || TOOLTIPS.isTouchScreen) { 
        return; //ignore hover events on touch devices.
      }
      if(!e || !e.target) {
        return;
      }
      
      tooltipShowTime  = 0;             //prevent a possibly waiting tooltip from still being shown

      var $eventTarget  = $(e.target),
          originalTitle;

      while(!$eventTarget.hasClass("tooltip")) {
        $eventTarget = $($eventTarget.parent());
      }
      originalTitle = $eventTarget.data("originalTitle");

      //restore the value of the title attribute
      if(originalTitle) {
        $eventTarget.attr("title", originalTitle);
      }

      //destroy tooltip markup and detach mouse move handler
      $("#tooltip").remove();
      $eventTarget.unbind("mousemove");
    }
    var handleClick = function(e){
      if(!e || !e.target) {
        return;
      }

      var $eventTarget           = $(e.target);

      while(!$eventTarget.hasClass("tooltip")) {
        $eventTarget = $($eventTarget.parent());
      }
      var titleAttr = $eventTarget.attr("title");
      if(!titleAttr) {
        titleAttr = $eventTarget.data("originalTitle");
      }
      //alert(titleAttr.replace(/[|]/g,"\n"));
      $('body').append('<div id="tooltip-container"><div id="tooltip-background"><div id="tooltip-fullscreen-text">'+titleAttr.replace(/[|]/g,"<br>")+'<br><br><a href="#" onclick="jQuery(\'#tooltip-container\').remove();return false;">OK</a></div></div></div>');
      
      handleOut(); //hide tooltip!
    };
    
    $tooltips.on("click",handleClick);

    $tooltips.on("mouseover",handleOver);
    
    $tooltips.on("mouseout", handleOut);
  }
}

// Listen for a touch event to see if the current device is a touch device
window.addEventListener('touchstart', function setHasTouch () {
    TOOLTIPS.isTouchScreen = true;
    // Remove event listener once fired, otherwise it'll kill scrolling performance
    window.removeEventListener('touchstart', setHasTouch);
}, false);

