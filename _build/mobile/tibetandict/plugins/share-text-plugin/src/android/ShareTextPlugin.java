package de.christian_steinert.tibetandict;

import android.content.Intent;
import android.content.ComponentName;
import android.util.Log;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class ShareTextPlugin extends CordovaPlugin {
    private static final String TAG = "ShareTextPlugin";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        try {
            if ("getSharedText".equals(action)) {
                getSharedText(callbackContext);
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
     * Check for shared text and return it with language preference if available
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
                        
                        // Determine search language based on which activity alias was used
                        String searchLanguage = "en"; // Default to English
                        ComponentName componentName = intent.getComponent();
                        if (componentName != null) {
                            String activityName = componentName.getClassName();
                            Log.d(TAG, "Activity component: " + activityName);
                            
                            if (activityName.contains("ShareTibetanActivity")) {
                                searchLanguage = "tib";
                                Log.d(TAG, "Detected Tibetan -> English share target");
                            } else if (activityName.contains("ShareEnglishActivity")) {
                                searchLanguage = "en";
                                Log.d(TAG, "Detected English -> Tibetan share target");
                            }
                        }
                        
                        // Create JSON response with text and language
                        JSONObject result = new JSONObject();
                        result.put("text", cleanedText);
                        result.put("language", searchLanguage);
                        
                        Log.d(TAG, "Shared text found: " + cleanedText + " with language: " + searchLanguage);
                        
                        // Clear the intent immediately after reading to prevent re-processing
                        Intent newIntent = new Intent(intent);
                        newIntent.setAction(Intent.ACTION_MAIN);
                        newIntent.removeExtra(Intent.EXTRA_TEXT);
                        cordova.getActivity().setIntent(newIntent);
                        Log.d(TAG, "Cleared shared text from intent");
                        
                        callbackContext.success(result);
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
}