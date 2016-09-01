/*
 * Copyright (c) 2012-2016: Christopher J. Brody (aka Chris Brody)
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */

package io.sqlc;

import android.annotation.SuppressLint;

import android.database.Cursor;
import android.database.CursorWindow;
import android.database.sqlite.SQLiteCursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteException;
import android.database.sqlite.SQLiteStatement;

import android.util.Base64;
import android.util.Log;

import java.io.File;
import java.lang.IllegalArgumentException;
import java.lang.Number;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.cordova.CallbackContext;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Android Database helper class
 */
class SQLiteAndroidDatabase
{
    private static final Pattern FIRST_WORD = Pattern.compile("^\\s*(\\S+)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern WHERE_CLAUSE = Pattern.compile("\\s+WHERE\\s+(.+)$",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern UPDATE_TABLE_NAME = Pattern.compile("^\\s*UPDATE\\s+(\\S+)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern DELETE_TABLE_NAME = Pattern.compile("^\\s*DELETE\\s+FROM\\s+(\\S+)",
            Pattern.CASE_INSENSITIVE);

    File dbFile;

    SQLiteDatabase mydb;

    /**
     * NOTE: Using default constructor, no explicit constructor.
     */

    /**
     * Open a database.
     *
     * @param dbfile   The database File specification
     */
    void open(File dbfile) throws Exception {
        dbFile = dbfile; // for possible bug workaround
        //mydb = SQLiteDatabase.openOrCreateDatabase(dbfile, null);
        mydb = SQLiteDatabase.openDatabase(dbfile.getPath(), null, SQLiteDatabase.OPEN_READONLY); //ChSt
    }

    /**
     * Close a database (in the current thread).
     */
    void closeDatabaseNow() {
        if (mydb != null) {
            mydb.close();
            mydb = null;
        }
    }

    void bugWorkaround() throws Exception {
        this.closeDatabaseNow();
        this.open(dbFile);
    }

    /**
     * Executes a batch request and sends the results via cbc.
     *
     * @param queryarr   Array of query strings
     * @param jsonparamsArr Array of JSON query parameters
     * @param cbc        Callback context from Cordova API
     */
    void executeSqlBatch(String[] queryarr, JSONArray[] jsonparamsArr, CallbackContext cbc) {

        if (mydb == null) {
            // not allowed - can only happen if someone has closed (and possibly deleted) a database and then re-used the database
            cbc.error("database has been closed");
            return;
        }

        int len = queryarr.length;
        JSONArray batchResults = new JSONArray();

        for (int i = 0; i < len; i++) {
            executeSqlBatchStatement(queryarr[i], jsonparamsArr[i], batchResults);
        }

        cbc.success(batchResults);
    }

    @SuppressLint("NewApi")
    private void executeSqlBatchStatement(String query, JSONArray json_params, JSONArray batchResults) {

        if (mydb == null) {
            // Should not happen here
            return;

        } else {

            int rowsAffectedCompat = 0;
            boolean needRowsAffectedCompat = false;

            JSONObject queryResult = null;
            String errorMessage = "unknown";

            try {
                boolean needRawQuery = true;

                QueryType queryType = getQueryType(query);

                if (queryType == QueryType.update || queryType == queryType.delete) {
                    if (android.os.Build.VERSION.SDK_INT >= 11) {
                        SQLiteStatement myStatement = mydb.compileStatement(query);

                        if (json_params != null) {
                            bindArgsToStatement(myStatement, json_params);
                        }

                        int rowsAffected = -1; // (assuming invalid)

                        // Use try & catch just in case android.os.Build.VERSION.SDK_INT >= 11 is lying:
                        try {
                            rowsAffected = myStatement.executeUpdateDelete();
                            // Indicate valid results:
                            needRawQuery = false;
                        } catch (SQLiteException ex) {
                            // Indicate problem & stop this query:
                            ex.printStackTrace();
                            errorMessage = ex.getMessage();
                            Log.v("executeSqlBatch", "SQLiteStatement.executeUpdateDelete(): Error=" + errorMessage);
                            needRawQuery = false;
                        } catch (Exception ex) {
                            // Assuming SDK_INT was lying & method not found:
                            // do nothing here & try again with raw query.
                        }

                        // "finally" cleanup myStatement
                        myStatement.close();

                        if (rowsAffected != -1) {
                            queryResult = new JSONObject();
                            queryResult.put("rowsAffected", rowsAffected);
                        }
                    }

                    if (needRawQuery) { // for pre-honeycomb behavior
                        rowsAffectedCompat = countRowsAffectedCompat(queryType, query, json_params, mydb);
                        needRowsAffectedCompat = true;
                    }
                }

                // INSERT:
                if (queryType == QueryType.insert && json_params != null) {
                    needRawQuery = false;

                    SQLiteStatement myStatement = mydb.compileStatement(query);

                    bindArgsToStatement(myStatement, json_params);

                    long insertId = -1; // (invalid)

                    try {
                        insertId = myStatement.executeInsert();

                        // statement has finished with no constraint violation:
                        queryResult = new JSONObject();
                        if (insertId != -1) {
                            queryResult.put("insertId", insertId);
                            queryResult.put("rowsAffected", 1);
                        } else {
                            queryResult.put("rowsAffected", 0);
                        }
                    } catch (SQLiteException ex) {
                        // report error result with the error message
                        // could be constraint violation or some other error
                        ex.printStackTrace();
                        errorMessage = ex.getMessage();
                        Log.v("executeSqlBatch", "SQLiteDatabase.executeInsert(): Error=" + errorMessage);
                    }

                    // "finally" cleanup myStatement
                    myStatement.close();
                }

                if (queryType == QueryType.begin) {
                    needRawQuery = false;
                    try {
                        //mydb.beginTransaction(); // ChSt

                        queryResult = new JSONObject();
                        queryResult.put("rowsAffected", 0);
                    } catch (SQLiteException ex) {
                        ex.printStackTrace();
                        errorMessage = ex.getMessage();
                        Log.v("executeSqlBatch", "SQLiteDatabase.beginTransaction(): Error=" + errorMessage);
                    }
                }

                if (queryType == QueryType.commit) {
                    needRawQuery = false;
                    try {
                        //mydb.setTransactionSuccessful(); // ChSt
                        //mydb.endTransaction(); // ChSt

                        queryResult = new JSONObject();
                        queryResult.put("rowsAffected", 0);
                    } catch (SQLiteException ex) {
                        ex.printStackTrace();
                        errorMessage = ex.getMessage();
                        Log.v("executeSqlBatch", "SQLiteDatabase.setTransactionSuccessful/endTransaction(): Error=" + errorMessage);
                    }
                }

                if (queryType == QueryType.rollback) {
                    needRawQuery = false;
                    try {
                        //mydb.endTransaction(); // ChSt

                        queryResult = new JSONObject();
                        queryResult.put("rowsAffected", 0);
                    } catch (SQLiteException ex) {
                        ex.printStackTrace();
                        errorMessage = ex.getMessage();
                        Log.v("executeSqlBatch", "SQLiteDatabase.endTransaction(): Error=" + errorMessage);
                    }
                }

                // raw query for other statements:
                if (needRawQuery) {
                    queryResult = this.executeSqlStatementQuery(mydb, query, json_params);

                    if (needRowsAffectedCompat) {
                        queryResult.put("rowsAffected", rowsAffectedCompat);
                    }
                }
            } catch (Exception ex) {
                ex.printStackTrace();
                errorMessage = ex.getMessage();
                Log.v("executeSqlBatch", "SQLiteAndroidDatabase.executeSql[Batch](): Error=" + errorMessage);
            }

            try {
                if (queryResult != null) {
                    JSONObject r = new JSONObject();

                    r.put("type", "success");
                    r.put("result", queryResult);

                    batchResults.put(r);
                } else {
                    JSONObject r = new JSONObject();
                    r.put("type", "error");

                    JSONObject er = new JSONObject();
                    er.put("message", errorMessage);
                    r.put("result", er);

                    batchResults.put(r);
                }
            } catch (JSONException ex) {
                ex.printStackTrace();
                Log.v("executeSqlBatch", "SQLiteAndroidDatabase.executeSql[Batch](): Error=" + ex.getMessage());
                // TODO what to do?
            }
        }
    }

    private final int countRowsAffectedCompat(QueryType queryType, String query, JSONArray json_params,
                                         SQLiteDatabase mydb) throws JSONException {
        // quick and dirty way to calculate the rowsAffected in pre-Honeycomb.  just do a SELECT
        // beforehand using the same WHERE clause. might not be perfect, but it's better than nothing
        Matcher whereMatcher = WHERE_CLAUSE.matcher(query);

        String where = "";

        int pos = 0;
        while (whereMatcher.find(pos)) {
            where = " WHERE " + whereMatcher.group(1);
            pos = whereMatcher.start(1);
        }
        // WHERE clause may be omitted, and also be sure to find the last one,
        // e.g. for cases where there's a subquery

        // bindings may be in the update clause, so only take the last n
        int numQuestionMarks = 0;
        for (int j = 0; j < where.length(); j++) {
            if (where.charAt(j) == '?') {
                numQuestionMarks++;
            }
        }

        JSONArray subParams = null;

        if (json_params != null) {
            // only take the last n of every array of sqlArgs
            JSONArray origArray = json_params;
            subParams = new JSONArray();
            int startPos = origArray.length() - numQuestionMarks;
            for (int j = startPos; j < origArray.length(); j++) {
                subParams.put(j - startPos, origArray.get(j));
            }
        }

        if (queryType == QueryType.update) {
            Matcher tableMatcher = UPDATE_TABLE_NAME.matcher(query);
            if (tableMatcher.find()) {
                String table = tableMatcher.group(1);
                try {
                    SQLiteStatement statement = mydb.compileStatement(
                            "SELECT count(*) FROM " + table + where);

                    if (subParams != null) {
                        bindArgsToStatement(statement, subParams);
                    }

                    return (int)statement.simpleQueryForLong();
                } catch (Exception e) {
                    // assume we couldn't count for whatever reason, keep going
                    Log.e(SQLiteAndroidDatabase.class.getSimpleName(), "uncaught", e);
                }
            }
        } else { // delete
            Matcher tableMatcher = DELETE_TABLE_NAME.matcher(query);
            if (tableMatcher.find()) {
                String table = tableMatcher.group(1);
                try {
                    SQLiteStatement statement = mydb.compileStatement(
                            "SELECT count(*) FROM " + table + where);
                    bindArgsToStatement(statement, subParams);

                    return (int)statement.simpleQueryForLong();
                } catch (Exception e) {
                    // assume we couldn't count for whatever reason, keep going
                    Log.e(SQLiteAndroidDatabase.class.getSimpleName(), "uncaught", e);

                }
            }
        }

        return 0;
    }

    private void bindArgsToStatement(SQLiteStatement myStatement, JSONArray sqlArgs) throws JSONException {
        for (int i = 0; i < sqlArgs.length(); i++) {
            if (sqlArgs.get(i) instanceof Float || sqlArgs.get(i) instanceof Double) {
                myStatement.bindDouble(i + 1, sqlArgs.getDouble(i));
            } else if (sqlArgs.get(i) instanceof Number) {
                myStatement.bindLong(i + 1, sqlArgs.getLong(i));
            } else if (sqlArgs.isNull(i)) {
                myStatement.bindNull(i + 1);
            } else {
                myStatement.bindString(i + 1, sqlArgs.getString(i));
            }
        }
    }

    /**
     * Get rows results from query cursor.
     *
     * @param cur Cursor into query results
     * @return results in string form
     */
    private JSONObject executeSqlStatementQuery(SQLiteDatabase mydb, String query,
                                                JSONArray paramsAsJson) throws Exception {
        JSONObject rowsResult = new JSONObject();

        Cursor cur = null;
        try {
            String[] params = null;

            params = new String[paramsAsJson.length()];

            for (int j = 0; j < paramsAsJson.length(); j++) {
                if (paramsAsJson.isNull(j))
                    params[j] = "";
                else
                    params[j] = paramsAsJson.getString(j);
            }

            cur = mydb.rawQuery(query, params);
        } catch (Exception ex) {
            ex.printStackTrace();
            String errorMessage = ex.getMessage();
            Log.v("executeSqlBatch", "SQLiteAndroidDatabase.executeSql[Batch](): Error=" + errorMessage);
            throw ex;
        }

        // If query result has rows
        if (cur != null && cur.moveToFirst()) {
            JSONArray rowsArrayResult = new JSONArray();
            String key = "";
            int colCount = cur.getColumnCount();

            // Build up JSON result object for each row
            do {
                JSONObject row = new JSONObject();
                try {
                    for (int i = 0; i < colCount; ++i) {
                        key = cur.getColumnName(i);

                        if (android.os.Build.VERSION.SDK_INT >= 11) {

                            // Use try & catch just in case android.os.Build.VERSION.SDK_INT >= 11 is lying:
                            try {
                                bindPostHoneycomb(row, key, cur, i);
                            } catch (Exception ex) {
                                bindPreHoneycomb(row, key, cur, i);
                            }
                        } else {
                            bindPreHoneycomb(row, key, cur, i);
                        }
                    }

                    rowsArrayResult.put(row);

                } catch (JSONException e) {
                    e.printStackTrace();
                }
            } while (cur.moveToNext());

            try {
                rowsResult.put("rows", rowsArrayResult);
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }

        if (cur != null) {
            cur.close();
        }

        return rowsResult;
    }

    @SuppressLint("NewApi")
    private void bindPostHoneycomb(JSONObject row, String key, Cursor cur, int i) throws JSONException {
        int curType = cur.getType(i);

        switch (curType) {
            case Cursor.FIELD_TYPE_NULL:
                row.put(key, JSONObject.NULL);
                break;
            case Cursor.FIELD_TYPE_INTEGER:
                row.put(key, cur.getLong(i));
                break;
            case Cursor.FIELD_TYPE_FLOAT:
                row.put(key, cur.getDouble(i));
                break;
            /* ** Read BLOB as Base-64 DISABLED in this branch:
            case Cursor.FIELD_TYPE_BLOB:
                row.put(key, new String(Base64.encode(cur.getBlob(i), Base64.DEFAULT)));
                break;
            // ** Read BLOB as Base-64 DISABLED to HERE. */
            case Cursor.FIELD_TYPE_STRING:
            default: /* (not expected) */
                row.put(key, cur.getString(i));
                break;
        }
    }

    private void bindPreHoneycomb(JSONObject row, String key, Cursor cursor, int i) throws JSONException {
        // Since cursor.getType() is not available pre-honeycomb, this is
        // a workaround so we don't have to bind everything as a string
        // Details here: http://stackoverflow.com/q/11658239
        SQLiteCursor sqLiteCursor = (SQLiteCursor) cursor;
        CursorWindow cursorWindow = sqLiteCursor.getWindow();
        int pos = cursor.getPosition();
        if (cursorWindow.isNull(pos, i)) {
            row.put(key, JSONObject.NULL);
        } else if (cursorWindow.isLong(pos, i)) {
            row.put(key, cursor.getLong(i));
        } else if (cursorWindow.isFloat(pos, i)) {
            row.put(key, cursor.getDouble(i));
        /* ** Read BLOB as Base-64 DISABLED in this branch:
        } else if (cursorWindow.isBlob(pos, i)) {
            row.put(key, new String(Base64.encode(cursor.getBlob(i), Base64.DEFAULT)));
        // ** Read BLOB as Base-64 DISABLED to HERE. */
        } else { // string
            row.put(key, cursor.getString(i));
        }
    }

    static QueryType getQueryType(String query) {
        Matcher matcher = FIRST_WORD.matcher(query);
        if (matcher.find()) {
            try {
                return QueryType.valueOf(matcher.group(1).toLowerCase());
            } catch (IllegalArgumentException ignore) {
                // unknown verb
            }
        }
        return QueryType.other;
    }

    static enum QueryType {
        update,
        insert,
        delete,
        select,
        begin,
        commit,
        rollback,
        other
    }
} /* vim: set expandtab : */
