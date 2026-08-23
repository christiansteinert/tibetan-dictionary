package io.sqlc.custom;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

import android.os.*;
import android.util.Log;
import android.content.*;
import android.app.*;

import java.util.zip.Inflater;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.DataFormatException;


public class DictDecompress {
    static final String ZLIB_DICT = DeflateDictionary.ZLIB_DICT;

    public static String inflateText(byte[] rawDeflateData)  {
        ByteArrayOutputStream baos = null;

        try{
            Inflater inflater = new Inflater(true);
            inflater.setInput(rawDeflateData);
            inflater.setDictionary(DeflateDictionary.ZLIB_DICT.getBytes(StandardCharsets.UTF_8));

            byte[] buf=new byte[1024];

            baos=new ByteArrayOutputStream(3*rawDeflateData.length);
            while (!inflater.finished()) {
                int count = inflater.inflate(buf);
                baos.write(buf, 0, count);
            }

            return baos.toString("UTF-8");
        } catch(DataFormatException dfe) {
            return "decompression error: " + dfe.getMessage();
        } catch(IOException ioe) {
            return "decompression error: " + ioe.getMessage();
        } finally {
            try{
                if(baos != null ) {
                    baos.close();
                }
            } catch(IOException ioe2) { }
        }
    }

}