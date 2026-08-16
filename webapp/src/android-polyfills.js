// Polyfills for older Android webview versions
(function() {
    // add polyfill for Object.fromEntries if it doesn't exist
    if (!Object.fromEntries) {
        Object.fromEntries = function (iterable) {
            return [...iterable].reduce(function (obj, pair) {
            obj[pair[0]] = pair[1];
            return obj;
            }, {});
        };
    }

    if (typeof globalThis === 'undefined') {
        var g = typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {};
        g.globalThis = g;
    }

    // Polyfill for RegExp 's' (dotAll) flag - strip the 's' flag as it is not supported in older Android webview versions
    var OriginalRegExp = window.RegExp;
    window.RegExp = function(pattern, flags) {
      if (typeof flags === 'string' && flags.indexOf('s') !== -1) {
        flags = flags.replace('s', '');
      }
      return new OriginalRegExp(pattern, flags);
    };
    window.RegExp.prototype = OriginalRegExp.prototype;
})();