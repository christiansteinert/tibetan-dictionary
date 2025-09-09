package de.christian_steinert.tibetandict;

import android.content.Intent;
import android.util.Log;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

public class ShareTextPlugin extends CordovaPlugin {
    private static final String TAG = "ShareTextPlugin";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        try {
            if ("getSharedText".equals(action)) {
                getSharedText(callbackContext);
                return true;
            } else if ("clearSharedText".equals(action)) {
                clearSharedText(callbackContext);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error executing action: " + action, e);
            callbackContext.error("Error executing action: " + action + " - " + e.getMessage());
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

            Log.d(TAG, "Checking intent - Action: " + action + ", Type: " + type);

            if (Intent.ACTION_SEND.equals(action) && type != null) {
                if (type.startsWith("text/")) {
                    String text = intent.getStringExtra(Intent.EXTRA_TEXT);
                    if (text != null && !text.trim().isEmpty()) {
                        String cleanedText = text.trim();
                        Log.d(TAG, "Shared text found: " + cleanedText);
                        callbackContext.success(cleanedText);
                        return;
                    } else {
                        Log.d(TAG, "Intent contains no text content");
                    }
                } else {
                    Log.d(TAG, "Intent type is not text: " + type);
                }
            } else {
                Log.d(TAG, "Intent is not ACTION_SEND or has no type");
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
            // Clear the intent action to prevent re-processing
            Intent intent = cordova.getActivity().getIntent();
            if (intent != null && Intent.ACTION_SEND.equals(intent.getAction())) {
                // Create a new intent to replace the current one
                Intent newIntent = new Intent(intent);
                newIntent.setAction(Intent.ACTION_MAIN);
                newIntent.removeExtra(Intent.EXTRA_TEXT);
                cordova.getActivity().setIntent(newIntent);
                Log.d(TAG, "Cleared shared text from intent");
            }
            callbackContext.success("Shared text cleared");
        } catch (Exception e) {
            Log.e(TAG, "Error clearing shared text", e);
            callbackContext.error("Error clearing shared text: " + e.getMessage());
        }
    }
}