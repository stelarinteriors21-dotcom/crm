package com.stelar.telecrm;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

public class WhatsAppNotificationListener extends NotificationListenerService {
    private static final String TAG = "WANotificationListener";

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.i(TAG, "WhatsAppNotificationListener connected and listening for incoming messages!");
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            if (sbn == null || sbn.getNotification() == null) return;
            String pkg = sbn.getPackageName() != null ? sbn.getPackageName().toLowerCase() : "";
            if (!pkg.contains("whatsapp")) return;

            WhatsAppSyncClient.processIncomingNotification(getApplicationContext(), sbn.getNotification());
        } catch (Exception e) {
            Log.e(TAG, "Error handling notification: " + e.getMessage(), e);
        }
    }
}
