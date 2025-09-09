var ShareTextPlugin = {
    /**
     * Get shared text if the app was opened via a share intent
     * @param {Function} successCallback - Called with shared text if available
     * @param {Function} errorCallback - Called on error
     */
    getSharedText: function(successCallback, errorCallback) {
        cordova.exec(successCallback, errorCallback, "ShareTextPlugin", "getSharedText", []);
    },

    /**
     * Clear any stored shared text (call after processing)
     * @param {Function} successCallback - Called on success
     * @param {Function} errorCallback - Called on error
     */
    clearSharedText: function(successCallback, errorCallback) {
        cordova.exec(successCallback, errorCallback, "ShareTextPlugin", "clearSharedText", []);
    }
};

module.exports = ShareTextPlugin;