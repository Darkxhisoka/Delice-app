package com.delice.patisserie;

import android.os.Bundle;
import android.webkit.WebView;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "DeliceMainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // --- CRITICAL: AGGRESSIVE CACHE WIPE ---
        // This ensures the app ALWAYS loads from the APK's assets 
        // and ignores any corrupted OTA updates or server path overrides.
        try {
            // 1. Wipe ALL SharedPreferences files
            File prefsDir = new File(getApplicationInfo().dataDir, "shared_prefs");
            if (prefsDir.exists() && prefsDir.isDirectory()) {
                String[] files = prefsDir.list();
                if (files != null) {
                    for (String file : files) {
                        getSharedPreferences(file.replace(".xml", ""), MODE_PRIVATE).edit().clear().apply();
                    }
                }
            }

            // 2. Delete known Capgo and Capacitor data folders
            String[] foldersToWipe = {"capacitor-updater", "webview", "app_webview", "Cache"};
            for (String folderName : foldersToWipe) {
                File dir = new File(getFilesDir().getParent(), folderName);
                if (dir.exists()) {
                    Log.d(TAG, "Wiping folder: " + dir.getAbsolutePath());
                    deleteRecursive(dir);
                }
                
                File internalDir = new File(getFilesDir(), folderName);
                if (internalDir.exists()) {
                    Log.d(TAG, "Wiping internal folder: " + internalDir.getAbsolutePath());
                    deleteRecursive(internalDir);
                }
            }
            
            Log.d(TAG, "Nuclear cache wipe completed. Forcing app reload from assets.");
        } catch (Exception e) {
            Log.e(TAG, "Error during cache wipe", e);
        }
        // ---------------------------------------

        // Enable Chrome DevTools debugging for the WebView
        if (0 != (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }

    private void deleteRecursive(File fileOrDirectory) {
        if (fileOrDirectory.isDirectory()) {
            File[] children = fileOrDirectory.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        if (!fileOrDirectory.delete()) {
            Log.w(TAG, "Failed to delete file or directory: " + fileOrDirectory.getAbsolutePath());
        }
    }
}
