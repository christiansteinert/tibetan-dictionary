/*
 * Copyright (c) 2012-2016: Christopher J. Brody (aka Chris Brody)
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */

package io.sqlc;

import io.sqlc.ExternalStorage;

import android.annotation.SuppressLint;
import android.graphics.Point;
import android.view.WindowManager;
import android.util.Log;

import java.io.File;
import java.lang.IllegalArgumentException;
import java.lang.Number;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.Locale;
import java.util.Map;


import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.IOException;

public class SQLitePlugin extends CordovaPlugin {
    static StringBuilder log = new StringBuilder();

    static void logError(String msg, Exception e) {
      Log.e(SQLitePlugin.class.getSimpleName(), msg, e);
      log.append("Error: " + msg + " "+ e + "\n");
    }

    static void logError(String msg) {
      Log.e(SQLitePlugin.class.getSimpleName(), msg);
      log.append("Error: " + msg + "\n");
    }
    
    
    static void logInfo(String msg) {
      Log.i(SQLitePlugin.class.getSimpleName(), msg);
      log.append(msg + "\n");
    }

    static void logVerbose(String msg) {
      Log.v(SQLitePlugin.class.getSimpleName(), msg);
      log.append(msg + "\n");
    }
    
    
    /**
     * Multiple database runner map (static).
     * NOTE: no public static accessor to db (runner) map since it would not work with db threading.
     * FUTURE put DBRunner into a public class that can provide external accessor.
     */
    static ConcurrentHashMap<String, DBRunner> dbrmap = new ConcurrentHashMap<String, DBRunner>();

    /**
     * NOTE: Using default constructor, no explicit constructor.
     */

    /**
     * Executes the request and returns PluginResult.
     *
     * @param actionAsString The action to execute.
     * @param args   JSONArry of arguments for the plugin.
     * @param cbc    Callback context from Cordova API
     * @return       Whether the action was valid.
     */
    @Override
    public boolean execute(String actionAsString, JSONArray args, CallbackContext cbc) {

        Action action;
        try {
            action = Action.valueOf(actionAsString);
        } catch (IllegalArgumentException e) {
            // shouldn't ever happen
            logError("unexpected error", e);
            return false;
        }

        try {
            return executeAndPossiblyThrow(action, args, cbc);
        } catch (JSONException e) {
            // TODO: signal JSON problem to JS
            logError("unexpected error", e);
            return false;
        }
    }

    private boolean executeAndPossiblyThrow(Action action, JSONArray args, CallbackContext cbc)
            throws JSONException {

        boolean status = true;
        JSONObject o;
        String echo_value;
        String dbname;

        switch (action) {
            case echoStringValue:
                o = args.getJSONObject(0);
                echo_value = o.getString("value");
                cbc.success(echo_value);
                break;

            case open:
                o = args.getJSONObject(0);
                dbname = o.getString("name");
                // open database and start reading its queue
                this.startDatabase(dbname, o, cbc);
                break;

            case getLog:
                cbc.success(log.toString());
                break;
                
                
            case close:
                o = args.getJSONObject(0);
                dbname = o.getString("path");
                // put request in the q to close the db
                this.closeDatabase(dbname, cbc);
                break;

            case delete:
                o = args.getJSONObject(0);
                dbname = o.getString("path");

                deleteDatabase(dbname, cbc);

                break;

            case executeSqlBatch:
            case backgroundExecuteSqlBatch:
                JSONObject allargs = args.getJSONObject(0);
                JSONObject dbargs = allargs.getJSONObject("dbargs");
                dbname = dbargs.getString("dbname");
                JSONArray txargs = allargs.getJSONArray("executes");

                if (txargs.isNull(0)) {
                    cbc.error("missing executes list");
                } else {
                    int len = txargs.length();
                    String[] queries = new String[len];
                    JSONArray[] jsonparams = new JSONArray[len];

                    for (int i = 0; i < len; i++) {
                        JSONObject a = txargs.getJSONObject(i);
                        queries[i] = a.getString("sql");
                        jsonparams[i] = a.getJSONArray("params");
                    }

                    // put db query in the queue to be executed in the db thread:
                    DBQuery q = new DBQuery(queries, jsonparams, cbc);
                    DBRunner r = dbrmap.get(dbname);
                    if (r != null) {
                        try {
                            r.q.put(q);
                        } catch(Exception e) {
                            logError("couldn't add to queue", e);
                            cbc.error("couldn't add to queue");
                        }
                    } else {
                        cbc.error("database not open");
                    }
                }
                break;
        }

        return status;
    }

    /**
     * Clean up and close all open databases.
     */
    @Override
    public void onDestroy() {
        while (!dbrmap.isEmpty()) {
            String dbname = dbrmap.keySet().iterator().next();

            this.closeDatabaseNow(dbname);

            DBRunner r = dbrmap.get(dbname);
            try {
                // stop the db runner thread:
                r.q.put(new DBQuery());
            } catch(Exception e) {
                logError("couldn't stop db thread", e);
            }
            dbrmap.remove(dbname);
        }
    }

    // --------------------------------------------------------------------------
    // LOCAL METHODS
    // --------------------------------------------------------------------------

    private void startDatabase(String dbname, JSONObject options, CallbackContext cbc) {
        // TODO: is it an issue that we can orphan an existing thread?  What should we do here?
        // If we re-use the existing DBRunner it might be in the process of closing...
        DBRunner r = dbrmap.get(dbname);

        // Brody TODO: It may be better to terminate the existing db thread here & start a new one, instead.
        if (r != null) {
            // don't orphan the existing thread; just re-open the existing database.
            // In the worst case it might be in the process of closing, but even that's less serious
            // than orphaning the old DBRunner.
            cbc.success();
        } else {
            r = new DBRunner(dbname, options, cbc);
            dbrmap.put(dbname, r);
            this.cordova.getThreadPool().execute(r);
        }
    }
    
    private void deleteFileIfSizeDiffers(File file, long expectedSize) { //ChSt
        if (file.exists()) {
            long fileSize = file.length();

            if( fileSize != expectedSize ) {
                logInfo("DB file has the size " + fileSize + " instead of the expected size " + expectedSize + ". File will be deleted and copied again.");                
                file.delete();
            } else {
                logVerbose("DB file has the expected size " + fileSize);
            }
        }
    }    

    
    

    /**
     * If a prepopulated DB file exists in the assets folder it is copied to the dbPath.
     * Only runs the first time the app runs.
     */
    private void copyPrepopulatedDatabase(String completeDBName, File dbfile) { //ChSt
        InputStream in = null;
        OutputStream out = null;
        try {
            in = this.cordova.getActivity().getAssets().open(completeDBName);
            String dbPath = dbfile.getAbsolutePath();
            dbPath = dbPath.substring(0, dbPath.lastIndexOf("/") + 1);
            File dbPathFile = new File(dbPath);
            if (!dbPathFile.exists())
                dbPathFile.mkdirs();

            File newDbFile = new File(dbPath + completeDBName);
            out = new FileOutputStream(newDbFile);

            byte[] buf = new byte[1024];
            int len;
            while ((len = in.read(buf)) > 0)
                out.write(buf, 0, len);

            logInfo("Copied prepopulated DB content to: " + newDbFile.getAbsolutePath());
        } catch (IOException e) {
            logError("No prepopulated DB found or error encountered", e);
        } finally {
            if (in != null) {
                try {
                    in.close();
                } catch (IOException ignored) {
                }
            }

            if (out != null) {
                try {
                    out.close();
                } catch (IOException ignored) {
                }
            }
        }
    }
    
    
    
    
    /**
     * copy the prepopulated database to an external folder
     * @return true if copying succeeded
     */
    private boolean copyDbFileToFolder(String completeDBName, File dbfile, long expectedDbSize) {
        boolean externalCardOk;
    
        deleteFileIfSizeDiffers(dbfile,expectedDbSize);
        
        if(!dbfile.exists())
                copyPrepopulatedDatabase(completeDBName, dbfile);

        // write failed silently -> Try internal SD card
        if(dbfile.exists() ) {
            if(dbfile.length() != expectedDbSize) {
                logError("Wrong file size. Copied file is " + dbfile.length() + " bytes big instead of expected " +expectedDbSize+ "bytes! Not enough memory on device? Deleting file again.");
                dbfile.delete();
                externalCardOk = false;
            } else {
                logVerbose("Success. File copied.");
                externalCardOk = true;
            }
        } else {
                logError("Error. Copy failed.");
                externalCardOk = false;
        }
    
        return externalCardOk;
    }
    
    /** 
     * check a number of possible database locations to see if a db file with the right size exists there already 
     */
    private File searchForExistingDbFile(long expectedDbSize, File... candidates) {
        logVerbose("Checking for existing DB.");    
        // clean up old stuff having the wrong size
        for(File dbfile:candidates) {
            if(dbfile!=null) {
                if(dbfile.exists()) {
                    deleteFileIfSizeDiffers(dbfile,expectedDbSize);        
                }
            }
        }
        
        // check if there is anything left
        for(File dbfile:candidates) {
            if(dbfile!=null) {
                if(dbfile.exists()) {
                    logVerbose("Suitable file found at: " + dbfile.getAbsolutePath() + " (size: "+dbfile.length()+")");    
                    return dbfile;
                }
            }
        }
        
        logVerbose("No suitable file found.");
        return null;
    }
    
    
    
    /**
     * Open a database.
     *
     * @param dbName   The name of the database file
     */
    private SQLiteAndroidDatabase openDatabase(String dbname, CallbackContext cbc, boolean old_impl) throws Exception { //ChSt
        try {
            // ASSUMPTION: no db (connection/handle) is already stored in the map
            // [should be true according to the code in DBRunner.run()]

            String completeDBName = dbname + ".db";

            long expectedDbSize = de.christian_steinert.tibetandict.Constants.DICT_SIZE();
            boolean externalCardOk = false;
            File dbfile;
            
            logVerbose("Initializing database.");
            
            try{
                String deviceInfo="Device information:";
                deviceInfo += "\n OS Version: " + System.getProperty("os.version") + "(" + android.os.Build.VERSION.INCREMENTAL + ")";
                deviceInfo += "\n OS API Level: " + android.os.Build.VERSION.SDK_INT;
                deviceInfo += "\n Device: " + android.os.Build.DEVICE;
                deviceInfo += "\n Manufacturer: " + android.os.Build.MANUFACTURER;
                deviceInfo += "\n Model (and Product): " + android.os.Build.MODEL + " ("+ android.os.Build.PRODUCT + ")";
                deviceInfo += "\n Language: " + Locale.getDefault().getDisplayLanguage() + " (Locale:" +Locale.getDefault().getISO3Country() + ")";
                
                logVerbose(deviceInfo);
            } catch(Exception e) {
            }
            
            
            // DB Location 1 (outdated): Try to determine the location of the external SD card and write there directly if possible (allowed until Android 4.3)
            Map<String, File> externalLocations = ExternalStorage.getAllStorageLocations(this.cordova.getActivity());
            File externalSdCard = externalLocations.get(ExternalStorage.EXTERNAL_SD_CARD);
            File customPath = new File(externalSdCard, dbname);
            File dbfile1 = new File(customPath, completeDBName);

            try {
		// delete old DB file from a location where previous versions of the app put it - it is better to use the app-specific folders rather than going to the external SD card directly
		if(dbfile1.exists()) {
		    dbfile1.delete();
		    logInfo("Deleted old DB file from external memory card location");
		}
            } catch (Exception e) {
		logError("Error while trying to delete file from old file location");
            }


            // DB Location 2: Use external data directory (MIGHT be on external SD card or on emulated SD card)
            File externalAppFolder = this.cordova.getActivity().getExternalFilesDir(null);
            File dbfile2 = null;
            if(externalAppFolder!=null) {
                if(externalAppFolder!=null) {
                    dbfile2 = new File(externalAppFolder, completeDBName);
                }
            }
            
            // DB Location 3: User default database path for the application (usually on internal memory)
            File dbfile3 = this.cordova.getActivity().getDatabasePath(completeDBName);

            
            // --- CHECK IF THE DB FILE WAS ALREADY EXTRACTED ---
            dbfile = searchForExistingDbFile(expectedDbSize, dbfile2, dbfile3);
	    
            if(dbfile != null) {
                externalCardOk = true; // DB found - no more copying necessary
            }
            
            /*
            // --- COPY DB FILE IF NECESSARY ---
            if(dbfile1 != null && !externalCardOk) {
                try {
                        
                        logVerbose("Trying to copy sqlite db from "+completeDBName+" to: " + dbfile1.getAbsolutePath());
                        externalCardOk = copyDbFileToFolder(completeDBName, dbfile1, expectedDbSize);
                        if(externalCardOk) {
                            dbfile = dbfile1;
                        }
                        
                                
                } catch (Exception e) {
                        // access to external sd card failed. Try internal SD card
                        logError("Caught exception while trying to copy file. Trying other locations.");
                }
            }
            */



            // if write failed silently -> continue trying
            // for Android 4.4 and higher: application directory which MIGHT be on external SD
            if(dbfile2 != null && !externalCardOk) {
                    try{
                            logVerbose("2nd attempt: Trying to copy sqlite db from "+completeDBName+" to: " + dbfile2.getAbsolutePath());
                            externalCardOk = copyDbFileToFolder(completeDBName, dbfile2, expectedDbSize);
                            if(externalCardOk) {
                                dbfile = dbfile2;
                            }

                            
                    } catch(Exception e) {
                            // access to external sd card failed. Try internal SD card
                            logError("Caught exception while trying to copy file. Trying other locations.");
                    }
                    
            }


            // if write failed silently -> continue trying
            // final fallback: store the database in the DB folder for our app, which will almost certainly be on the internal, simulated "SD" card
            if(dbfile3 != null && !externalCardOk) {
                    // external SD card access failed. Use internal sd card location!
                    logVerbose("Fallback (3rd and final attempt): Trying to copy sqlite db from " + completeDBName + " to: " + dbfile3.getAbsolutePath());
                    externalCardOk = copyDbFileToFolder(completeDBName, dbfile3, expectedDbSize);
                    if(externalCardOk) {
                      dbfile = dbfile3;
                    }
                            
            }
            
            // --- IF COPYING SUCCESSFUL: OPEN DB ---
            if(externalCardOk) {
                logVerbose("Open sqlite db: " + dbfile.getAbsolutePath());

                SQLiteAndroidDatabase mydb = old_impl ? new SQLiteAndroidDatabase() : new SQLiteConnectorDatabase();
                mydb.open(dbfile);

                if (cbc != null) // XXX Android locking/closing BUG workaround
                    cbc.success(log.toString());

                logVerbose("DB opened successful: " + dbfile.getAbsolutePath());

                return mydb;
                
            } else {
                logError("Error opening db: " + dbfile.getAbsolutePath());
                cbc.error(log.toString());
                
                return null;
            }
                
        } catch (Exception e) {
            logError("Error opening db: " + e);
            if (cbc != null) // XXX Android locking/closing BUG workaround
                cbc.error(log.toString());
            return null;
        }
    }

    /**
     * Close a database (in another thread).
     *
     * @param dbName   The name of the database file
     */
    private void closeDatabase(String dbname, CallbackContext cbc) {
        DBRunner r = dbrmap.get(dbname);
        if (r != null) {
            try {
                r.q.put(new DBQuery(false, cbc));
            } catch(Exception e) {
                if (cbc != null) {
                    cbc.error("couldn't close database" + e);
                }
                logError("couldn't close database", e);
            }
        } else {
            if (cbc != null) {
                cbc.success();
            }
        }
    }

    /**
     * Close a database (in the current thread).
     *
     * @param dbname   The name of the database file
     */
    private void closeDatabaseNow(String dbname) {
        DBRunner r = dbrmap.get(dbname);

        if (r != null) {
            SQLiteAndroidDatabase mydb = r.mydb;

            if (mydb != null)
                mydb.closeDatabaseNow();
        }
    }

    private void deleteDatabase(String dbname, CallbackContext cbc) {
        DBRunner r = dbrmap.get(dbname);
        if (r != null) {
            try {
                r.q.put(new DBQuery(true, cbc));
            } catch(Exception e) {
                if (cbc != null) {
                    cbc.error("couldn't close database" + e);
                }
                logError("couldn't close database", e);
            }
        } else {
            boolean deleteResult = this.deleteDatabaseNow(dbname);
            if (deleteResult) {
                cbc.success();
            } else {
                cbc.error("couldn't delete database " + dbname);
            }
        }
    }

    /**
     * Delete a database.
     *
     * @param dbName   The name of the database file
     *
     * @return true if successful or false if an exception was encountered
     */
    private boolean deleteDatabaseNow(String dbname) {
        File dbfile = this.cordova.getActivity().getDatabasePath(dbname);

        try {
            return cordova.getActivity().deleteDatabase(dbfile.getAbsolutePath());
        } catch (Exception e) {
            logError("couldn't delete database", e);
            return false;
        }
    }

    private class DBRunner implements Runnable {
        final String dbname;
        private boolean oldImpl;
        private boolean bugWorkaround;

        final BlockingQueue<DBQuery> q;
        final CallbackContext openCbc;

        SQLiteAndroidDatabase mydb;

        DBRunner(final String dbname, JSONObject options, CallbackContext cbc) {
            this.dbname = dbname;
            this.oldImpl = options.has("androidOldDatabaseImplementation");
            logVerbose("Android db implementation: built-in android.database.sqlite package");
            this.bugWorkaround = this.oldImpl && options.has("androidBugWorkaround");
            if (this.bugWorkaround)
                logVerbose("Android db closing/locking workaround applied");

            this.q = new LinkedBlockingQueue<DBQuery>();
            this.openCbc = cbc;
        }

        public void run() {
            try {
                this.mydb = openDatabase(dbname, this.openCbc, this.oldImpl);
            } catch (Exception e) {
                logError("unexpected error, stopping db thread", e);
                dbrmap.remove(dbname);
                return;
            }

            DBQuery dbq = null;

            try {
                dbq = q.take();

                while (!dbq.stop) {
                    mydb.executeSqlBatch(dbq.queries, dbq.jsonparams, dbq.cbc);

                    if (this.bugWorkaround && dbq.queries.length == 1 && dbq.queries[0] == "COMMIT")
                        mydb.bugWorkaround();

                    dbq = q.take();
                }
            } catch (Exception e) {
                logError("unexpected error", e);
            }

            if (dbq != null && dbq.close) {
                try {
                    closeDatabaseNow(dbname);

                    dbrmap.remove(dbname); // (should) remove ourself

                    if (!dbq.delete) {
                        dbq.cbc.success();
                    } else {
                        try {
                            boolean deleteResult = deleteDatabaseNow(dbname);
                            if (deleteResult) {
                                dbq.cbc.success();
                            } else {
                                dbq.cbc.error("couldn't delete database");
                            }
                        } catch (Exception e) {
                            logError("couldn't delete database", e);
                            dbq.cbc.error("couldn't delete database: " + e);
                        }
                    }                    
                } catch (Exception e) {
                    logError("couldn't close database", e);
                    if (dbq.cbc != null) {
                        dbq.cbc.error("couldn't close database: " + e);
                    }
                }
            }
        }
    }

    private final class DBQuery {
        // XXX TODO replace with DBRunner action enum:
        final boolean stop;
        final boolean close;
        final boolean delete;
        final String[] queries;
        final JSONArray[] jsonparams;
        final CallbackContext cbc;

        DBQuery(String[] myqueries, JSONArray[] params, CallbackContext c) {
            this.stop = false;
            this.close = false;
            this.delete = false;
            this.queries = myqueries;
            this.jsonparams = params;
            this.cbc = c;
        }

        DBQuery(boolean delete, CallbackContext cbc) {
            this.stop = true;
            this.close = true;
            this.delete = delete;
            this.queries = null;
            this.jsonparams = null;
            this.cbc = cbc;
        }

        // signal the DBRunner thread to stop:
        DBQuery() {
            this.stop = true;
            this.close = false;
            this.delete = false;
            this.queries = null;
            this.jsonparams = null;
            this.cbc = null;
        }
    }

    private static enum Action {
        echoStringValue,
        getLog,
        open,
        close,
        delete,
        executeSqlBatch,
        backgroundExecuteSqlBatch,
    }
}

/* vim: set expandtab : */
