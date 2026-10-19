package com.stelar.telecrm;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import org.json.JSONObject;
import android.app.Notification;
import android.os.Bundle;
import android.database.Cursor;
import android.provider.ContactsContract;
import androidx.core.content.ContextCompat;
import android.Manifest;
import android.content.pm.PackageManager;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

public class WhatsAppSyncClient {
    private static final String TAG = "WhatsAppSyncClient";
    private static final java.util.concurrent.ExecutorService sExecutor = Executors.newFixedThreadPool(4);
    private static String sLastSyncedKey = "";
    private static long sLastSyncedTime = 0;
    public static final String DEFAULT_SERVER_URL = "https://bullet-lounge-ccd-tri.trycloudflare.com";
    public static final String LAN_SERVER_URL = "http://192.168.1.2:3000";
    private static final String PREF_NAME = "stelar_crm_prefs";
    private static final String KEY_SERVER_URL = "server_url";

    public static String getServerUrl(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            return prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL);
        } catch (Exception e) {
            return DEFAULT_SERVER_URL;
        }
    }

    public static void setServerUrl(Context context, String url) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_SERVER_URL, url).apply();
        } catch (Exception ignored) {}
    }

    public static void syncMessage(Context context, String contact, String phone, String message, String direction) {
        if (message == null || message.trim().isEmpty()) return;

        // Fallback: Check if last active lead was stored in prefs
        String finalContact = (contact != null) ? contact.trim() : "";
        String finalPhone = (phone != null) ? phone.trim() : "";

        // 1. Try resolving phone from contact name via device contacts provider
        if (finalPhone.length() < 7 && !finalContact.isEmpty() && !finalContact.equals("WhatsApp Contact")) {
            String resolved = resolvePhoneNumberFromName(context, finalContact);
            if (resolved != null && !resolved.isEmpty()) {
                finalPhone = resolved;
            }
        }

        // 2. Only fallback to last active lead's phone if contactName matches last lead OR contactName is unknown
        if (finalPhone.length() < 7) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
                long time = prefs.getLong("last_lead_time", 0);
                if (System.currentTimeMillis() - time < 6 * 3600 * 1000L) {
                    String fbName = prefs.getString("last_lead_name", "");
                    String fbPhone = prefs.getString("last_lead_phone", "");
                    boolean isMatchingLead = !fbName.isEmpty() && !finalContact.isEmpty() && 
                        (finalContact.toLowerCase().contains(fbName.toLowerCase()) || fbName.toLowerCase().contains(finalContact.toLowerCase()));
                    if (finalContact.isEmpty() || finalContact.equals("WhatsApp Contact") || isMatchingLead) {
                        if (finalContact.isEmpty() || finalContact.equals("WhatsApp Contact")) finalContact = fbName;
                        if (!fbPhone.isEmpty()) finalPhone = fbPhone;
                    }
                }
            } catch (Exception ignored) {}
        }

        if (finalContact.isEmpty() && finalPhone.isEmpty()) {
            Log.w(TAG, "Cannot sync WhatsApp message: no contact or phone resolved");
            return;
        }

        final String reqContact = finalContact;
        final String reqPhone = finalPhone;
        final String reqMessage = message.trim();
        final String reqDirection = direction;

        sExecutor.execute(() -> {
            List<String> urlsToTry = new ArrayList<>();
            // Always try the primary public cloudflare tunnel first
            urlsToTry.add(DEFAULT_SERVER_URL);
            String preferred = getServerUrl(context);
            if (preferred != null && !preferred.isEmpty() && !urlsToTry.contains(preferred)) {
                urlsToTry.add(preferred);
            }
            if (!urlsToTry.contains(LAN_SERVER_URL)) {
                urlsToTry.add(LAN_SERVER_URL);
            }

            boolean success = false;
            for (String baseUrl : urlsToTry) {
                if (baseUrl.endsWith("/")) {
                    baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
                }
                HttpURLConnection conn = null;
                try {
                    URL url = new URL(baseUrl + "/api/mobile/whatsapp-sync");
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                    conn.setConnectTimeout(4000);
                    conn.setReadTimeout(4000);
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    payload.put("contactName", reqContact);
                    payload.put("phone", reqPhone);
                    payload.put("message", reqMessage);
                    payload.put("direction", reqDirection);
                    payload.put("timestamp", String.valueOf(System.currentTimeMillis()));

                    byte[] postData = payload.toString().getBytes("UTF-8");
                    OutputStream os = conn.getOutputStream();
                    os.write(postData);
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    Log.d(TAG, "Synced " + reqDirection + " WA msg to " + baseUrl + " code=" + code + " contact=" + reqContact + " text=" + reqMessage);
                    if (code >= 200 && code < 300) {
                        success = true;
                        setServerUrl(context, baseUrl);
                        break;
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Failed syncing to " + baseUrl + ": " + e.getMessage());
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }

            if (!success) {
                Log.e(TAG, "Failed to sync WhatsApp message across all server endpoints");
            }
        });
    }

    public static synchronized void processIncomingNotification(Context context, Notification n) {
        if (n == null || context == null) return;
        Bundle extras = n.extras;
        if (extras == null) return;

        try {
            // 1. Extract Title (Sender Name or Contact Phone Number)
            CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
            if (titleCs == null || titleCs.length() == 0) {
                titleCs = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE);
            }
            if (titleCs == null || titleCs.length() == 0) {
                titleCs = extras.getCharSequence("android.title");
            }
            if (titleCs == null || titleCs.length() == 0) {
                titleCs = extras.getCharSequence(Notification.EXTRA_TITLE_BIG);
            }
            if (titleCs == null || titleCs.length() == 0) {
                titleCs = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
            }

            String title = (titleCs != null) ? titleCs.toString().trim() : "";
            if (!title.isEmpty()) {
                title = title.replaceAll("\\s*\\(\\d+\\s*(messages?|new messages?)?\\)", "").trim();
            }

            // 2. Extract Message Text
            String text = "";
            Object messagesObj = extras.get("android.messages");
            if (messagesObj instanceof Object[]) {
                Object[] msgs = (Object[]) messagesObj;
                if (msgs.length > 0) {
                    Object lastMsg = msgs[msgs.length - 1];
                    if (lastMsg instanceof Bundle) {
                        Bundle msgBundle = (Bundle) lastMsg;
                        CharSequence msgText = msgBundle.getCharSequence("text");
                        if (msgText != null && msgText.length() > 0) {
                            text = msgText.toString().trim();
                        }
                    }
                }
            } else if (messagesObj instanceof List) {
                List<?> msgs = (List<?>) messagesObj;
                if (!msgs.isEmpty()) {
                    Object lastMsg = msgs.get(msgs.size() - 1);
                    if (lastMsg instanceof Bundle) {
                        Bundle msgBundle = (Bundle) lastMsg;
                        CharSequence msgText = msgBundle.getCharSequence("text");
                        if (msgText != null && msgText.length() > 0) {
                            text = msgText.toString().trim();
                        }
                    }
                }
            }

            if (text.isEmpty()) {
                CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
                if (textCs != null) text = textCs.toString().trim();
            }
            if (text.isEmpty()) {
                CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
                if (bigTextCs != null) text = bigTextCs.toString().trim();
            }
            if (text.isEmpty()) {
                CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
                if (lines != null && lines.length > 0) {
                    CharSequence lastLine = lines[lines.length - 1];
                    if (lastLine != null) text = lastLine.toString().trim();
                }
            }

            if (title.isEmpty() || text.isEmpty()) return;

            // 3. Filter out system / generic WhatsApp notifications
            String lowerTitle = title.toLowerCase();
            String lowerText = text.toLowerCase();
            if (lowerTitle.equals("whatsapp") ||
                lowerTitle.equals("whatsapp business") ||
                lowerTitle.contains("web is currently active") ||
                lowerText.contains("checking for new messages") ||
                lowerText.contains("backup in progress") ||
                lowerText.contains("whatsapp web") ||
                lowerText.contains("incoming voice call") ||
                lowerText.contains("incoming video call") ||
                lowerText.contains("missed voice call") ||
                lowerText.contains("missed video call") ||
                lowerText.contains("ongoing voice call") ||
                lowerText.contains("ongoing video call") ||
                lowerText.contains("calling...") ||
                lowerText.equals("new messages") ||
                lowerText.matches("^\\d+\\s+new\\s+messages?$")) {
                return;
            }

            // 4. Deduplicate notifications triggered repeatedly for the same message within 4 seconds
            long now = System.currentTimeMillis();
            String dedupKey = title + "::" + text;
            if (dedupKey.equals(sLastSyncedKey) && (now - sLastSyncedTime < 4000)) {
                return;
            }
            sLastSyncedKey = dedupKey;
            sLastSyncedTime = now;

            Log.i(TAG, "Incoming WA notification from '" + title + "': " + text);

            // 5. Resolve phone number if title is a phone or resolve from contacts
            String phoneGuess = title.replaceAll("[^0-9+]", "");
            if (phoneGuess.length() < 7) {
                String resolvedPhone = resolvePhoneNumberFromName(context, title);
                if (resolvedPhone != null && !resolvedPhone.isEmpty()) {
                    phoneGuess = resolvedPhone;
                }
            }

            syncMessage(context, title, phoneGuess, text, "INBOUND");
        } catch (Exception e) {
            Log.e(TAG, "Error handling notification: " + e.getMessage(), e);
        }
    }

    public static String resolvePhoneNumberFromName(Context context, String name) {
        if (name == null || name.trim().isEmpty() || context == null) return "";
        try {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
                return "";
            }
            Cursor cursor = context.getContentResolver().query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                new String[]{ContactsContract.CommonDataKinds.Phone.NUMBER},
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " = ? OR " +
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ?",
                new String[]{name, "%" + name + "%"},
                null
            );
            if (cursor != null) {
                try {
                    if (cursor.moveToFirst()) {
                        String num = cursor.getString(0);
                        if (num != null) return num.replaceAll("[^0-9+]", "");
                    }
                } finally {
                    cursor.close();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Contact lookup failed: " + e.getMessage());
        }
        return "";
    }
}
