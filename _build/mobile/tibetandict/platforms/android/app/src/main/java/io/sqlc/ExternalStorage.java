package io.sqlc;

import java.io.*;
import java.util.*;

import android.os.*;
import android.util.Log;
import android.content.*;
import android.app.*;

public class ExternalStorage {

    public static final String SD_CARD = "sdCard";
    public static final String EXTERNAL_SD_CARD = "externalSdCard";

    /**
     * @return True if the external storage is available. False otherwise.
     */
    public static boolean isAvailable() {
        String state = Environment.getExternalStorageState();
        if (Environment.MEDIA_MOUNTED.equals(state) || Environment.MEDIA_MOUNTED_READ_ONLY.equals(state)) {
            return true;
        }
        return false;
    }

    public static String getSdCardPath() {
        return Environment.getExternalStorageDirectory().getPath() + "/";
    }

    /**
     * @return True if the external storage is writable. False otherwise.
     */
    public static boolean isWritable() {
        String state = Environment.getExternalStorageState();
        if (Environment.MEDIA_MOUNTED.equals(state)) {
            return true;
        }
        return false;

    }

    /**
     * @return A map of all storage locations available
     */
    public static Map<String, File> getAllStorageLocations(Context context) {
        Map<String, File> map = new HashMap<String, File>(10);

        List<String> mMounts = new ArrayList<String>(10);
        List<String> mVold = new ArrayList<String>(10);
        mMounts.add("/mnt/sdcard");
        mVold.add("/mnt/sdcard");
        
        try{
		File externalAppFolder = null;
		
		if(context!=null)
			externalAppFolder = context.getExternalFilesDir(null);
		
		if(externalAppFolder!=null) {
			mMounts.add(externalAppFolder.getAbsolutePath());
		}
        } catch(Exception e) {
		// application-specific directory on SD card not found
        }
	
        try {
            File mountFile = new File("/proc/mounts");
            if(mountFile.exists()){
                Scanner scanner = new Scanner(mountFile);
                while (scanner.hasNext()) {
                    String line = scanner.nextLine();
                    if (line.startsWith("/dev/block/vold/")) {
                        String[] lineElements = line.split(" ");
                        String element = lineElements[1];

                        // don't add the default mount path
                        // it's already in the list.
                        if (!element.equals("/mnt/sdcard")) {
                            mMounts.add(element);
                            Log.v("info", "found mount point: " + element);
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
/*
        try {
            File voldFile = new File("/system/etc/vold.fstab");
            if(voldFile.exists()){
                Scanner scanner = new Scanner(voldFile);
                while (scanner.hasNext()) {
                    String line = scanner.nextLine();
                    if (line.startsWith("dev_mount")) {
                        String[] lineElements = line.split(" ");
                        String element = lineElements[2];

                        if (element.contains(":"))
                            element = element.substring(0, element.indexOf(":"));
                        if (!element.equals("/mnt/sdcard"))
                            mVold.add(element);
                        Log.v("info", "found fstab entry: " + element);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
*/
        Log.v("info", "--- filtering file systems ---");            

        for (int i = 0; i < mMounts.size(); i++) {
            String mount = mMounts.get(i);
            String mountLc = mount.toLowerCase();
            if ((!mountLc.contains("ext")) && (!mountLc.contains("sdcard2")) && (!mountLc.contains("removable")) && (!mVold.contains(mount))) {
                mMounts.remove(i--);
                Log.v("info", "removing fstab entry: " + mount);
            } else {
                // entry was listed in fstab -OR- entry contains the letter sequence "ext" in the path name
                Log.v("info", "keeping fstab entry: " + mount);            
            }
        }
        mVold.clear();

        List<String> mountHash = new ArrayList<String>(10);

        for(String mount : mMounts){
            File root = new File(mount);
            if (root.exists() && root.isDirectory() && root.canWrite()) {
                Log.v("info", "found writable directory: " + mount);            
            
                File[] list = root.listFiles();
                String hash = "[";
                if(list!=null){
                    for(File f : list){
                        hash += f.getName().hashCode()+":"+f.length()+", ";
                    }
                }
                hash += "]";
                if(!mountHash.contains(hash)){
                    String key = SD_CARD + "_" + map.size();
                    if (map.size() == 0) {
                        key = SD_CARD;
			Log.v("info", "internal SD card: " + mount);
                    } else if (map.size() == 1) {
                        key = EXTERNAL_SD_CARD;
			Log.v("info", "external SD card: " + mount);
                    }
                    mountHash.add(hash);
                    map.put(key, root);
                } else {
                  Log.v("info", "mount hash found for: " + mount + ". Skipping.");
                }
            }
        }

        mMounts.clear();

        if(map.isEmpty()){
		 Log.v("info", "no suitable mount point found. Using device's externalStorageDirectory: " + Environment.getExternalStorageDirectory());
                 map.put(SD_CARD, Environment.getExternalStorageDirectory());
        }
        if(!map.containsKey(EXTERNAL_SD_CARD)) {
		map.put(EXTERNAL_SD_CARD, Environment.getExternalStorageDirectory());
        }
        return map;
    }
}