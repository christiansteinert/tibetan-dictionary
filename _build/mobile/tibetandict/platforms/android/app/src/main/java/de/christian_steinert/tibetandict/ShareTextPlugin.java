package de.christian_steinert.tibetandict;

import android.content.Intent;
import android.util.Log;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

public class ShareTextPlugin extends CordovaPlugin {
    private static final String TAG = "ShareTextPlugin";
    private static String sharedText = null;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if ("getSharedText".equals(action)) {
            getSharedText(callbackContext);
            return true;
        } else if ("clearSharedText".equals(action)) {
            clearSharedText(callbackContext);
            return true;
        }
        return false;
    }

    /**
     * Check for shared text and return it if available
     */
    private void getSharedText(CallbackContext callbackContext) {
        try {
            Intent intent = cordova.getActivity().getIntent();
            String action = intent.getAction();
            String type = intent.getType();

            if (Intent.ACTION_SEND.equals(action) && type != null) {
                if (type.startsWith("text/")) {
                    String text = intent.getStringExtra(Intent.EXTRA_TEXT);
                    if (text != null && !text.trim().isEmpty()) {
                        sharedText = text.trim();
                        Log.d(TAG, "Shared text received: " + sharedText);
                        callbackContext.success(sharedText);
                        return;
                    }
                }
            }
            
            // No shared text available
            callbackContext.success((String) null);
        } catch (Exception e) {
            Log.e(TAG, "Error getting shared text", e);
            callbackContext.error("Error getting shared text: " + e.getMessage());
        }
    }

    /**
     * Clear any stored shared text
     */
    private void clearSharedText(CallbackContext callbackContext) {
        try {
            sharedText = null;
            // Clear the intent action to prevent re-processing
            Intent intent = cordova.getActivity().getIntent();
            if (intent != null && Intent.ACTION_SEND.equals(intent.getAction())) {
                intent.setAction("");
            }
            callbackContext.success("Shared text cleared");
        } catch (Exception e) {
            Log.e(TAG, "Error clearing shared text", e);
            callbackContext.error("Error clearing shared text: " + e.getMessage());
        }
    }
}