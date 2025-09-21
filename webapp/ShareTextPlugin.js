var ShareTextPlugin = {
    /**
     * Get shared text if the app was opened via a share intent
     * @param {Function} successCallback - Called with shared text object {text: string, language: string} if available
     * @param {Function} errorCallback - Called on error
     */
    getSharedText: function(successCallback, errorCallback) {
        cordova.exec(successCallback, errorCallback, "ShareTextPlugin", "getSharedText", []);
    }
};

//module.exports = ShareTextPlugin;