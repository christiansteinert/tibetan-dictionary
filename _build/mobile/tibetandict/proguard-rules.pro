# Keep Apache Cordova Plugin framework and interfaces
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin

# Preserve JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve WebKit interfaces used by Cordova
-keep class android.webkit.** { *; }