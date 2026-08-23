package io.sqlc.custom;

import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONObject;
import android.util.Log;
import java.io.File;

public class SQLitePlugin extends io.sqlc.SQLitePlugin {
    static final String TAG = "CustomSQLitePlugin";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext cbc) {
        Log.w(TAG, "execute() called with action: " + action);
        if ("open".equals(action)) {
            try {
                JSONObject o = args.getJSONObject(0);
                final String finalDbname = o.getString("name");
                final long finalExpectedDbSize = de.christian_steinert.tibetandict.Constants.DICT_SIZE();
                final JSONArray finalArgs = args;
                final CallbackContext finalCbc = cbc;

                Log.i(TAG, "=== Intercepting 'open' action for DB: '" + finalDbname + "' ===");
                Log.i(TAG, "Expected DB size from Constants: " + finalExpectedDbSize + " bytes");

                File dbfile = null;
                try {
                    dbfile = DatabaseInstaller.installOrGetDatabase(this, finalDbname, finalExpectedDbSize);
                } catch (Exception e) {
                    Log.e(TAG, "Database installation threw exception", e);
                }

                if (dbfile == null) {
                    Log.e(TAG, "Database installation returned null. DB is NOT ready. Proceeding with open anyway (will likely fail).");
                } else {
                    Log.i(TAG, "Database ready at: " + dbfile.getAbsolutePath() + " (size=" + dbfile.length() + ")");
                }

                cordova.getThreadPool().execute(() -> {
                    Log.i(TAG, "Dispatching super.execute('open') to thread pool for: " + finalDbname);
                    boolean result = super.execute(action, finalArgs, finalCbc);
                    Log.i(TAG, "super.execute returned: " + result);
                });
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Error parsing open args, falling back to original behavior", e);
                return super.execute(action, args, cbc);
            }
        }
        
        // BEGIN MODIFICATION FOR TIBETAN DICTIONARY
        if ("executeSqlBatch".equals(action) || "backgroundExecuteSqlBatch".equals(action)) {
            Log.i(TAG, "Intercepting " + action + " to log queries");
            try {
                JSONObject allargs = args.getJSONObject(0);
                JSONArray txargs = allargs.getJSONArray("executes");
                for (int i = 0; i < txargs.length(); i++) {
                    JSONObject a = txargs.getJSONObject(i);
                    Log.i(TAG, "Executing SQL: " + a.getString("sql"));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error logging SQL batch: " + e.getMessage());
            }
        }
        // END MODIFICATION FOR TIBETAN DICTIONARY
        
        return super.execute(action, args, cbc);
    }
}
