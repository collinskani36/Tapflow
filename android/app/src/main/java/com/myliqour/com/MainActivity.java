package com.myliqour.com;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Match your app's bg-background — eliminates the black flash
        WebView webView = getBridge().getWebView();
        webView.setBackgroundColor(Color.parseColor("#0a0a0a"));
    }
}