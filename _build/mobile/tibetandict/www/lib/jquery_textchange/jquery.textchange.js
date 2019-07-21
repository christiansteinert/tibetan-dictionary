/* for Android: add a custom event that will fire when text fields change because the keyup / keydown events are unreliable there*/
jQuery(function($) {
  if ("documentElement" in document && "ontouchstart" in document.documentElement) { // if it's a touch device
    var checkInterval = null;
    var $inputElements = $('input');
    window.mobiletextCurrentVal='';
    
    $inputElements.focus(function(e) {
      var $input = $(e.target);
      window.mobiletextCurrentVal = $input.val();
      if(checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
      checkInterval = setInterval(function() {
        var oldVal = window.mobiletextCurrentVal;
        var currentVal = $input.val();
        window.mobiletextCurrentVal = currentVal;
        if (oldVal != currentVal) {
          var event = jQuery.Event('mobiletextchange');
          event.which = event.keyCode = (currentVal && currentVal.length > 0) ? currentVal.charCodeAt(currentVal.length - 1) : '';
          $input.trigger(event);
        }
      }, 100);
    });
    
    $inputElements.blur(function() {
      if(checkInterval) {
        clearInterval(checkInterval);
      }
    });
  }
});