package io.sqlc.custom;

import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONObject;
import android.util.Log;

public class SQLitePlugin extends io.sqlc.SQLitePlugin {
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext cbc) {
        // If the action is "open", we want to ensure that the database file gets extracted from the APK 
        // into the file system into the before opening it
        if ("open".equals(action)) {
            try {
                JSONObject o = args.getJSONObject(0);
                String dbname = o.getString("name");
                
                // Use the custom Installer to ensure the file is in place
                long expectedDbSize = de.christian_steinert.tibetandict.Constants.DICT_SIZE();
                Log.v("custom.SQLitePlugin", "Ensuring database is prepopulated before opening.");
                DatabaseInstaller.installOrGetDatabase(this, dbname, expectedDbSize);
            } catch (Exception e) {
                Log.e("custom.SQLitePlugin", "Prepopulation failed, falling back to original behavior", e);
            }
        }
        // Delegate all actual logic (including opening the DB file) to the original SQLite plugin implementation
        return super.execute(action, args, cbc);
    }
}
