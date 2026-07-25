package io.sqlc.custom;

import android.util.Log;
import org.apache.cordova.CordovaPlugin;
import java.io.*;
import java.util.Map;

public class DatabaseInstaller {

    public static File installOrGetDatabase(CordovaPlugin plugin, String dbname, long expectedDbSize) throws Exception {
        String completeDBName = dbname + ".db";
        boolean externalCardOk = false;
        File dbfile = null;

        Log.v("DatabaseInstaller", "Initializing database installation/search.");

        // Try to find the file in multiple locations
        File dbfile2 = null;
        File externalAppFolder = plugin.cordova.getActivity().getExternalFilesDir(null);
        if (externalAppFolder != null) {
            dbfile2 = new File(externalAppFolder, completeDBName);
        }
        File dbfile3 = plugin.cordova.getActivity().getDatabasePath(completeDBName);

        dbfile = searchForExistingDbFile(expectedDbSize, dbfile2, dbfile3);

        if (dbfile != null) {
            externalCardOk = true;
        } else {
            // Try to copy the database if not found
            if (dbfile2 != null && !externalCardOk) {
                if (copyDbFileToFolder(plugin, completeDBName, dbfile2, expectedDbSize)) {
                    dbfile = dbfile2;
                    externalCardOk = true;
                }
            }
            if (!externalCardOk && dbfile3 != null) {
                if (copyDbFileToFolder(plugin, completeDBName, dbfile3, expectedDbSize)) {
                    dbfile = dbfile3;
                    externalCardOk = true;
                }
            }
        }

        if (externalCardOk) {
            Log.v("DatabaseInstaller", "Database ready at: " + dbfile.getAbsolutePath());
            return dbfile;
        } else {
            Log.e("DatabaseInstaller", "Error opening db: " + dbname);
            return null;
        }
    }

    private static boolean copyDbFileToFolder(CordovaPlugin plugin, String completeDBName, File dbfile, long expectedDbSize) {
        deleteFileIfSizeDiffers(dbfile, expectedDbSize);
        if (!dbfile.exists())
                copyPrepopulatedDatabase(plugin, completeDBName, dbfile);

        if (dbfile.exists()) {
            if (dbfile.length() != expectedDbSize) {
                Log.e("DatabaseInstaller", "Wrong file size. Copied file is " + dbfile.length() + " bytes big instead of expected " + expectedDbSize + " bytes! Not enough memory on device? Deleting file again.");
                dbfile.delete();
                return false;
            } else {
                Log.v("DatabaseInstaller", "Success. File copied.");
                return true;
            }
        } else {
            Log.e("DatabaseInstaller", "Error. Copy failed.");
            return false;
        }
    }

    private static void deleteFileIfSizeDiffers(File file, long expectedSize) {
        if (file.exists()) {
            long fileSize = file.length();
            if (fileSize != expectedSize) {
                Log.i("DatabaseInstaller", "DB file has the size " + fileSize + " instead of the expected size " + expectedSize + ". File will be deleted and copied again.");
                file.delete();
            } else {
                Log.v("DatabaseInstaller", "DB file has the expected size " + fileSize);
            }
        }
    }

    private static File searchForExistingDbFile(long expectedDbSize, File... candidates) {
        for (File dbfile : candidates) {
            if (dbfile != null) {
                if (dbfile.exists()) {
                    deleteFileIfSizeDiffers(dbfile, expectedDbSize);
                }
            }
        }
        for (File dbfile : candidates) {
            if (dbfile != null) {
                if (dbfile.exists()) {
                    Log.v("DatabaseInstaller", "Suitable file found at: " + dbfile.getAbsolutePath() + " (size: " + dbfile.length() + ")");
                    return dbfile;
                }
            }
        }
        Log.v("DatabaseInstaller", "No suitable file found.");
        return null;
    }

    private static void copyPrepopulatedDatabase(CordovaPlugin plugin, String completeDBName, File dbfile) {
        InputStream in = null;
        OutputStream out = null;
        try {
            in = plugin.cordova.getActivity().getAssets().open(completeDBName);
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

            Log.v("DatabaseInstaller", "Copied prepopulated DB content to: " + newDbFile.getAbsolutePath());
        } catch (IOException e) {
            Log.e("DatabaseInstaller", "No prepopulated DB found or error encountered");
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
}
