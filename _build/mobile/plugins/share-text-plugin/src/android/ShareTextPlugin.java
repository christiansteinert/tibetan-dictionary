package de.christian_steinert.tibetandict;

import android.content.Intent;
import android.content.ComponentName;
import android.util.Log;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;

public class ShareTextPlugin extends CordovaPlugin {
    private static final String TAG = "ShareTextPlugin";
    private static final String CAT_TIB = "de.christian_steinert.tibetandict.CATEGORY_SHARE_LANG_TIB";
    private static final String CAT_EN  = "de.christian_steinert.tibetandict.CATEGORY_SHARE_LANG_EN";
    private static final String CAT_SKT = "de.christian_steinert.tibetandict.CATEGORY_SHARE_LANG_SKT";

    /**
     * Share intent captured via onNewIntent() for an already-running activity
     * instance. When the app is in the background, Android delivers a new
     * share intent to the existing instance (launchMode singleTop) without
     * reloading the WebView, and it does NOT update getActivity().getIntent().
     * Without capturing the intent here, the share would be invisible to JS.
     */
    private Intent pendingShareIntent;

    @Override
    public void onNewIntent(Intent intent) {
        if (isShareTextIntent(intent)) {
            Log.d(TAG, "Capturing share intent delivered to running instance");
            pendingShareIntent = intent;
        }
    }

    /** True if the intent carries shared plain text (ACTION_SEND + text/*) */
    private boolean isShareTextIntent(Intent intent) {
        return intent != null
            && Intent.ACTION_SEND.equals(intent.getAction())
            && intent.getType() != null
            && intent.getType().startsWith("text/")
            && intent.getStringExtra(Intent.EXTRA_TEXT) != null;
    }

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

    /** Strip trailing URLs and wrapping quotes */
    private String normalizeSharedText(String input) {
        if (input == null) return null;
        String result = input.trim();
        // Remove one or more trailing URLs appended by browsers (e.g. Chrome)
        // Loop in case there are multiple appended URLs
        while (result.matches("(?s).*(\\s+)https?://\\S+\\s*$")) {
            result = result.replaceFirst("(\\s+)https?://\\S+\\s*$", "").trim();
        }

        // remove everything after a line break
        result = result.replaceAll("[\\r\\n].*", "");

        // remove all quote characters
        result = result.replaceAll("[\"“”]", "").trim();
        return result;
    }

    private String detectLanguageFromIntent(Intent intent) {
        // Prefer reading meta-data from the resolved (alias) component
        try {
            PackageManager pm = cordova.getContext().getPackageManager();
            ComponentName comp = intent.getComponent();
            if (comp == null) {
                ResolveInfo ri = pm.resolveActivity(intent, 0);
                if (ri != null) {
                    comp = new ComponentName(ri.activityInfo.packageName, ri.activityInfo.name);
                }
            }
            if (comp != null) {
                ActivityInfo ai = pm.getActivityInfo(comp, PackageManager.GET_META_DATA);
                if (ai != null && ai.metaData != null) {
                    String lang = ai.metaData.getString("searchLanguage");
                    if (lang != null) return lang;
                }
                // Fallback on alias name pattern
                String cls = comp.getClassName();
                if (cls.contains("ShareTibetanActivity")) return "tib";
                if (cls.contains("ShareEnglishActivity")) return "en";
                if (cls.contains("ShareSanskritActivity")) return "skt";
            }
        } catch (Exception e) {
            Log.w(TAG, "Unable to detect language from intent meta-data", e);
        }
        return "tib"; // default
    }

    /**
     * Check for shared text and return it with language preference if available
     */
    private void getSharedText(CallbackContext callbackContext) {
        try {
            // Prefer the intent captured via onNewIntent() 
            // (this is relevant for warm starts when the app was already running before the current intent was triggered)
            Intent intent = pendingShareIntent;
            pendingShareIntent = null;
            if (intent == null) {
                // fall back to the activity's intent (initial intent that is relevant during a cold start).
                intent = cordova.getActivity().getIntent();
            }
            String action = intent.getAction();
            String type = intent.getType();

            Log.d(TAG, "Checking intent - Action: " + action + ", Type: " + type);

            if (Intent.ACTION_SEND.equals(action) && type != null) {
                if (type.startsWith("text/")) {
                    String text = intent.getStringExtra(Intent.EXTRA_TEXT);
                    if (text != null && !text.trim().isEmpty()) {
                        String cleanedText = normalizeSharedText(text);
                        if (cleanedText == null || cleanedText.isEmpty()) {
                            Log.d(TAG, "Shared text became empty after normalization");
                            callbackContext.success((String) null);
                            return;
                        }
                        
                        // Use intent categories to detect language
                        String searchLanguage = detectLanguageFromIntent(intent);
                        
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