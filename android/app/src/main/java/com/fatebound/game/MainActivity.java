package com.fatebound.game;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @SuppressLint({"SetJavaScriptEnabled", "deprecation"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // Edge-to-edge: content draws behind status/nav bars (immersive hides them).
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        hideSystemBars();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0A1015"));
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setClickable(true);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        // Explicit MATCH_PARENT — zero-size / wrap content would eat all taps.
        setContentView(webView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                view.evaluateJavascript(
                    "(function(){function kick(){try{if(typeof renderHub==='function')renderHub();if(typeof renderDayLogin==='function')renderDayLogin();if(typeof paintHome==='function')paintHome();if(window.__touchUnblock){/* watchdog armed */}var o=document.querySelector('body>#clashSpellWrap,body>#clashSpellCoach');if(o)o.remove();}catch(e){}}kick();setTimeout(kick,400);setTimeout(kick,1500);setTimeout(kick,4000);}())",
                    null);
            }
        });

        // Fatebound is fully bundled so the complete art/hero scene renders identically offline.
        // The separate Fatebound save client still syncs progress to the SSH host.
        webView.loadUrl("file:///android_asset/index.html");
    }

    @SuppressLint("deprecation")
    private void hideSystemBars() {
        WindowInsetsControllerCompat c =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (c != null) {
            c.hide(WindowInsetsCompat.Type.statusBars());
            c.hide(WindowInsetsCompat.Type.navigationBars());
            c.setSystemBarsBehavior(
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
        // Legacy immersive sticky for API 24–29 WebView reliability.
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemBars();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
