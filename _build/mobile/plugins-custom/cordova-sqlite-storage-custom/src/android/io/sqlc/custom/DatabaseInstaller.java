package io.sqlc.custom;

import android.content.Context;
import android.database.Cursor;
import android.os.Build;
import android.util.Log;
import org.apache.cordova.CordovaPlugin;
import java.io.*;

public class DatabaseInstaller {

    static final String TAG = "DatabaseInstaller";
    static final int BUFFER_SIZE = 65536;

    public static File installOrGetDatabase(CordovaPlugin plugin, String dbname, long expectedDbSize) throws Exception {
        Context ctx = plugin.cordova.getActivity();
        String completeDBName = dbname + ".db";

        Log.i(TAG, "=== DATABASE INSTALL START ===");
        Log.i(TAG, "DB name (raw): '" + dbname + "'");
        Log.i(TAG, "DB name (with ext): '" + completeDBName + "'");
        Log.i(TAG, "Expected DB size: " + expectedDbSize + " bytes");

        File externalFilesTarget = null;
        File databaseDirTarget = null;

        File externalAppFolder = ctx.getExternalFilesDir(null);
        if (externalAppFolder != null) {
            externalFilesTarget = new File(externalAppFolder, completeDBName);
            Log.i(TAG, "External files target: " + externalFilesTarget.getAbsolutePath() + " (exists=" + externalFilesTarget.exists() + ", size=" + externalFilesTarget.length() + ")");
        } else {
            Log.w(TAG, "getExternalFilesDir returned null");
        }

        databaseDirTarget = ctx.getDatabasePath(completeDBName);
        Log.i(TAG, "Database dir target: " + databaseDirTarget.getAbsolutePath() + " (exists=" + databaseDirTarget.exists() + ", size=" + (databaseDirTarget.exists() ? databaseDirTarget.length() : 0) + ")");

        File dbfile = searchForExistingDbFile(expectedDbSize, externalFilesTarget, databaseDirTarget);

        if (dbfile != null) {
            Log.i(TAG, "Found valid existing DB at: " + dbfile.getAbsolutePath());
            return ensureDbAtRunnerPath(ctx, dbname, dbfile, expectedDbSize);
        }

        Log.i(TAG, "No valid existing DB found. Attempting to extract from assets...");

        if (databaseDirTarget != null) {
            if (copyDbFileToFolder(plugin, completeDBName, databaseDirTarget, expectedDbSize)) {
                Log.i(TAG, "Successfully extracted DB to database directory: " + databaseDirTarget.getAbsolutePath());
                return ensureDbAtRunnerPath(ctx, dbname, databaseDirTarget, expectedDbSize);
            }
        }

        if (externalFilesTarget != null) {
            if (copyDbFileToFolder(plugin, completeDBName, externalFilesTarget, expectedDbSize)) {
                Log.i(TAG, "Successfully extracted DB to external files dir: " + externalFilesTarget.getAbsolutePath());
                return ensureDbAtRunnerPath(ctx, dbname, externalFilesTarget, expectedDbSize);
            }
        }

        Log.e(TAG, "=== DATABASE INSTALL FAILED: Could not install database ===");
        return null;
    }

    private static File ensureDbAtRunnerPath(Context ctx, String dbname, File sourceFile, long expectedDbSize) {
        File runnerPath = ctx.getDatabasePath(dbname);
        Log.i(TAG, "Runner will look for DB at: " + runnerPath.getAbsolutePath() + " (exists=" + runnerPath.exists() + ")");

        if (runnerPath.exists()) {
            if (runnerPath.length() == expectedDbSize) {
                Log.i(TAG, "Runner path already has valid DB, returning: " + runnerPath.getAbsolutePath());
                return runnerPath;
            } else {
                Log.w(TAG, "Runner path exists but has wrong size (" + runnerPath.length() + " != " + expectedDbSize + "). Deleting and copying.");
                runnerPath.delete();
            }
        }

        try {
            copyFile(sourceFile, runnerPath);
            if (runnerPath.exists() && runnerPath.length() == expectedDbSize) {
                Log.i(TAG, "Copied DB to runner path: " + runnerPath.getAbsolutePath() + " (size=" + runnerPath.length() + ")");
                return runnerPath;
            } else {
                Log.e(TAG, "Failed to copy DB to runner path. Result: exists=" + runnerPath.exists() + ", size=" + (runnerPath.exists() ? runnerPath.length() : -1));
                return sourceFile;
            }
        } catch (IOException e) {
            Log.e(TAG, "Error copying to runner path", e);
            return sourceFile;
        }
    }

    private static boolean copyDbFileToFolder(CordovaPlugin plugin, String completeDBName, File targetFile, long expectedDbSize) {
        Log.i(TAG, "Attempting to copy asset '" + completeDBName + "' to " + targetFile.getAbsolutePath());
        deleteFileIfSizeDiffers(targetFile, expectedDbSize);

        if (!targetFile.exists()) {
            boolean success = copyPrepopulatedDatabase(plugin, completeDBName, targetFile);
            if (!success) {
                Log.e(TAG, "copyPrepopulatedDatabase returned false for target: " + targetFile.getAbsolutePath());
                return false;
            }
        }

        if (targetFile.exists()) {
            long actualSize = targetFile.length();
            if (actualSize != expectedDbSize) {
                Log.e(TAG, "Size mismatch after copy: got " + actualSize + ", expected " + expectedDbSize + ". Deleting corrupted file.");
                targetFile.delete();
                return false;
            }
            Log.i(TAG, "Copy verified: " + targetFile.getAbsolutePath() + " (" + actualSize + " bytes)");
            return true;
        } else {
            Log.e(TAG, "Target file does not exist after copy attempt: " + targetFile.getAbsolutePath());
            return false;
        }
    }

    private static void deleteFileIfSizeDiffers(File file, long expectedSize) {
        if (file.exists()) {
            long fileSize = file.length();
            if (fileSize != expectedSize) {
                Log.i(TAG, "Existing file has wrong size (" + fileSize + " != " + expectedSize + "). Deleting and will re-copy.");
                boolean deleted = file.delete();
                Log.i(TAG, "Delete result: " + deleted);
            } else {
                Log.i(TAG, "Existing file has correct size: " + fileSize);
            }
        }
    }

    private static File searchForExistingDbFile(long expectedDbSize, File... candidates) {
        for (File candidate : candidates) {
            if (candidate != null && candidate.exists()) {
                deleteFileIfSizeDiffers(candidate, expectedDbSize);
            }
        }
        for (File candidate : candidates) {
            if (candidate != null && candidate.exists()) {
                Log.i(TAG, "Valid existing DB found: " + candidate.getAbsolutePath() + " (size: " + candidate.length() + ")");
                return candidate;
            }
        }
        Log.i(TAG, "No valid existing DB found in candidate locations.");
        return null;
    }

    private static boolean copyPrepopulatedDatabase(CordovaPlugin plugin, String completeDBName, File targetFile) {
        InputStream in = null;
        OutputStream out = null;
        try {
            Log.i(TAG, "Opening asset: " + completeDBName);
            in = plugin.cordova.getActivity().getAssets().open(completeDBName);

            String dbPathDir = targetFile.getParent();
            if (dbPathDir != null) {
                File dbPathFile = new File(dbPathDir);
                if (!dbPathFile.exists()) {
                    boolean mkdirsResult = dbPathFile.mkdirs();
                    Log.i(TAG, "Created directory " + dbPathDir + ": " + mkdirsResult);
                }
            }

            out = new FileOutputStream(targetFile);
            byte[] buf = new byte[BUFFER_SIZE];
            long totalBytes = 0;
            int len;
            long startTime = System.currentTimeMillis();

            while ((len = in.read(buf)) > 0) {
                out.write(buf, 0, len);
                totalBytes += len;
            }
            out.flush();

            long elapsed = System.currentTimeMillis() - startTime;
            Log.i(TAG, "Asset copy complete: " + totalBytes + " bytes in " + elapsed + "ms to " + targetFile.getAbsolutePath());
            return true;
        } catch (FileNotFoundException e) {
            Log.e(TAG, "Asset not found: '" + completeDBName + "'. Make sure the DB is packaged in assets.", e);
            return false;
        } catch (IOException e) {
            Log.e(TAG, "IO error during asset copy", e);
            return false;
        } finally {
            closeQuietly(in);
            closeQuietly(out);
        }
    }

    private static void copyFile(File src, File dst) throws IOException {
        InputStream in = null;
        OutputStream out = null;
        try {
            in = new FileInputStream(src);
            out = new FileOutputStream(dst);
            byte[] buf = new byte[BUFFER_SIZE];
            int len;
            while ((len = in.read(buf)) > 0) {
                out.write(buf, 0, len);
            }
            out.flush();
        } finally {
            closeQuietly(in);
            closeQuietly(out);
        }
    }

    private static void closeQuietly(Closeable closable) {
        if (closable != null) {
            try {
                closable.close();
            } catch (IOException ignored) {
            }
        }
    }
}
