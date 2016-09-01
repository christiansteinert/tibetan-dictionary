(function($) {
    $.fn.getCursorPosition = function() {
      try{
        var input = this.get(0);
        if (!input) return 0; // No (input) element found
        if ('selectionStart' in input) {
            // Standard-compliant browsers
            return input.selectionStart;
        } else if (document.selection) {
            // IE
            input.focus();
            var sel = document.selection.createRange();
            var selLen = document.selection.createRange().text.length;
            sel.moveStart('character', -input.value.length);
            return sel.text.length - selLen;
        }
      } catch(e) {
        return 0;
      }
    }
})(jQuery); 
