package com.myliqour.com;

import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private boolean splashHidden = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Match your app's bg-background — eliminates the black flash
        WebView webView = getBridge().getWebView();
        webView.setBackgroundColor(Color.parseColor("#0a0a0a"));

        // Fail-safe: if the Vercel URL takes too long or fails to load,
        // don't leave the user stuck on the splash screen forever.
        new Handler(Looper.getMainLooper()).postDelayed(this::hideSplash, 10000);

        // Hide the splash only once the remote page has actually finished loading,
        // so there's no white gap between "splash disappears" and "content appears".
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                hideSplash();
            }
        });
    }

    private void hideSplash() {
        if (splashHidden) return;
        splashHidden = true;
        runOnUiThread(() -> {
            getBridge().getWebView().evaluateJavascript(
                "if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) { window.Capacitor.Plugins.SplashScreen.hide(); }",
                null
            );
        });
    }
}