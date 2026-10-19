package com.stelar.telecrm;

import android.Manifest;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.CallLog;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Log;
import android.view.accessibility.AccessibilityManager;
import android.accessibilityservice.AccessibilityServiceInfo;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "AndroidCallLog",
    permissions = {
        @Permission(
            alias = "callLog",
            strings = { Manifest.permission.READ_CALL_LOG }
        ),
        @Permission(
            alias = "audio",
            strings = { Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class CallLogPlugin extends Plugin {
    private static final String TAG = "CallLogPlugin";
    private static final String DEFAULT_SERVER_URL = "https://telecrm-clone.vercel.app/api/mobile/call-logs";

    private Long getLongValue(PluginCall call, String name) {
        if (call == null || call.getData() == null) return null;
        Object val = call.getData().opt(name);
        if (val == null) return null;
        if (val instanceof Number) {
            return ((Number) val).longValue();
        }
        if (val instanceof String) {
            try {
                return Long.parseLong((String) val);
            } catch (Exception ignored) {}
        }
        return null;
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        requestPermissionForAlias("callLog", call, "permissionCallback");
    }

    @PluginMethod
    public void checkAllFilesAccess(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            granted = Environment.isExternalStorageManager();
        } else {
            granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAllFilesAccess(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                } catch (Exception e) {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                }
            } else {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Cannot open storage settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkWhatsAppSyncPermissions(PluginCall call) {
        try {
            AccessibilityManager am = (AccessibilityManager) getContext().getSystemService(Context.ACCESSIBILITY_SERVICE);
            boolean accessibilityEnabled = false;
            if (am != null) {
                List<AccessibilityServiceInfo> enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK);
                if (enabledServices != null) {
                    for (AccessibilityServiceInfo s : enabledServices) {
                        if (s.getId() != null && s.getId().contains("com.stelar.telecrm")) {
                            accessibilityEnabled = true;
                            break;
                        }
                    }
                }
            }

            String flat = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
            boolean notificationEnabled = (flat != null && flat.contains("com.stelar.telecrm"));

            boolean filesAccess = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                filesAccess = Environment.isExternalStorageManager();
            }

            JSObject ret = new JSObject();
            ret.put("accessibilityEnabled", accessibilityEnabled);
            ret.put("notificationEnabled", notificationEnabled);
            ret.put("filesAccessEnabled", filesAccess);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("accessibilityEnabled", false);
            ret.put("notificationEnabled", false);
            ret.put("filesAccessEnabled", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Cannot open Accessibility Settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openNotificationListenerSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Cannot open Notification Settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Cannot open App Settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void saveActiveLead(PluginCall call) {
        try {
            String leadId = call.getString("leadId");
            String leadName = call.getString("leadName");
            String phone = call.getString("phone");
            String serverUrl = call.getString("serverUrl");

            SharedPreferences prefs = getContext().getSharedPreferences("stelar_crm_prefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            if (leadId != null) editor.putString("last_lead_id", leadId);
            if (leadName != null) editor.putString("last_lead_name", leadName);
            if (phone != null) editor.putString("last_lead_phone", phone);
            if (serverUrl != null && !serverUrl.isEmpty()) {
                editor.putString("server_url", serverUrl);
            }
            editor.putLong("last_lead_time", System.currentTimeMillis());
            editor.apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to save active lead: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getLatestCall(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("found", false);
            ret.put("error", "READ_CALL_LOG permission not granted");
            call.resolve(ret);
            return;
        }

        String targetPhone = call.getString("targetPhone");
        String contactName = call.getString("contactName");
        Long minTimestamp = getLongValue(call, "minTimestamp");

        String targetClean = "";
        if (targetPhone != null) {
            targetClean = targetPhone.replaceAll("[^0-9]", "");
            if (targetClean.length() > 10) {
                targetClean = targetClean.substring(targetClean.length() - 10);
            }
        }

        long minTime = (minTimestamp != null && minTimestamp > 0) ? minTimestamp - 15000 : 0;

        try {
            Cursor cursor = getContext().getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                new String[]{
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.DURATION,
                    CallLog.Calls.DATE,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.CACHED_NAME
                },
                null,
                null,
                CallLog.Calls.DATE + " DESC"
            );

            if (cursor != null) {
                int count = 0;
                while (cursor.moveToNext() && count < 25) {
                    count++;
                    String number = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER));
                    long duration = cursor.getLong(cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION));
                    long date = cursor.getLong(cursor.getColumnIndexOrThrow(CallLog.Calls.DATE));
                    int type = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE));
                    String cachedName = "";
                    try {
                        cachedName = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME));
                    } catch (Exception ignored) {}

                    boolean isOutgoing = (type == CallLog.Calls.OUTGOING_TYPE);
                    if (!isOutgoing) continue;

                    if (minTime > 0 && date < minTime) break;

                    String numClean = (number != null) ? number.replaceAll("[^0-9]", "") : "";
                    if (numClean.length() > 10) {
                        numClean = numClean.substring(numClean.length() - 10);
                    }

                    boolean matchesNumber = targetClean.isEmpty()
                        || numClean.equals(targetClean)
                        || (targetClean.length() >= 7 && numClean.endsWith(targetClean))
                        || (numClean.length() >= 7 && targetClean.endsWith(numClean));

                    if (matchesNumber) {
                        cursor.close();
                        String effectiveContact = (contactName != null && !contactName.isEmpty()) ? contactName : cachedName;
                        RecordingSource rec = findLatestRecording(date, number, effectiveContact, duration);

                        JSObject ret = new JSObject();
                        ret.put("found", true);
                        ret.put("number", number);
                        ret.put("duration", duration);
                        ret.put("timestamp", date);
                        ret.put("type", type);
                        ret.put("cachedName", cachedName);
                        ret.put("hasRecording", rec.found);
                        ret.put("recordingPath", rec.file != null ? rec.file.getAbsolutePath() : null);
                        ret.put("recordingUri", rec.uri != null ? rec.uri.toString() : null);
                        call.resolve(ret);
                        return;
                    }
                }
                cursor.close();
            }

            JSObject ret = new JSObject();
            ret.put("found", false);
            ret.put("message", "No matching outgoing call found in Android hardware call log");
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("found", false);
            ret.put("error", "Error reading call logs: " + e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void getRecentCalls(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("calls", new com.getcapacitor.JSArray());
            ret.put("error", "READ_CALL_LOG permission not granted");
            call.resolve(ret);
            return;
        }

        Long sinceTimestamp = getLongValue(call, "sinceTimestamp");
        long minTime = (sinceTimestamp != null && sinceTimestamp > 0)
            ? sinceTimestamp
            : (System.currentTimeMillis() - 48 * 3600 * 1000L);

        com.getcapacitor.JSArray callsArray = new com.getcapacitor.JSArray();

        try {
            Cursor cursor = getContext().getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                new String[]{
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.DURATION,
                    CallLog.Calls.DATE,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.CACHED_NAME
                },
                CallLog.Calls.DATE + " > ?",
                new String[]{ String.valueOf(minTime) },
                CallLog.Calls.DATE + " DESC"
            );

            if (cursor != null) {
                int count = 0;
                while (cursor.moveToNext() && count < 50) {
                    count++;
                    String number = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER));
                    long duration = cursor.getLong(cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION));
                    long date = cursor.getLong(cursor.getColumnIndexOrThrow(CallLog.Calls.DATE));
                    int type = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE));
                    String cachedName = "";
                    try {
                        cachedName = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME));
                    } catch (Exception ignored) {}

                    RecordingSource rec = findLatestRecording(date, number, cachedName, duration);

                    JSObject callObj = new JSObject();
                    callObj.put("number", number);
                    callObj.put("duration", duration);
                    callObj.put("timestamp", date);
                    callObj.put("type", type);
                    callObj.put("cachedName", cachedName);
                    callObj.put("hasRecording", rec.found);
                    callObj.put("recordingPath", rec.file != null ? rec.file.getAbsolutePath() : null);
                    callObj.put("recordingUri", rec.uri != null ? rec.uri.toString() : null);
                    callsArray.put(callObj);
                }
                cursor.close();
            }

            JSObject ret = new JSObject();
            ret.put("calls", callsArray);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("calls", new com.getcapacitor.JSArray());
            ret.put("error", "Error reading recent call logs: " + e.getMessage());
            call.resolve(ret);
        }
    }

    public static class RecordingSource {
        public boolean found = false;
        public File file = null;
        public Uri uri = null;
        public String fileName = "call_recording.mp3";
    }

    @PluginMethod
    public void uploadRecordingForCall(PluginCall call) {
        String phone = call.getString("phone");
        String leadId = call.getString("leadId");
        String callId = call.getString("callId");
        String leadName = call.getString("leadName");
        String notes = call.getString("notes");
        Long callTimestamp = getLongValue(call, "timestamp");
        String serverUrl = call.getString("serverUrl");
        String userId = call.getString("userId");
        Long duration = getLongValue(call, "duration");
        String recordingPath = call.getString("recordingPath");
        String recordingUri = call.getString("recordingUri");

        if (serverUrl == null || serverUrl.isEmpty()) {
            serverUrl = DEFAULT_SERVER_URL;
        }

        RecordingSource rec = new RecordingSource();
        if (recordingUri != null && !recordingUri.isEmpty()) {
            rec.found = true;
            rec.uri = Uri.parse(recordingUri);
            rec.fileName = "call_" + (phone != null ? phone.replaceAll("[^0-9]", "") : "rec") + ".mp3";
        } else if (recordingPath != null && !recordingPath.isEmpty()) {
            File f = new File(recordingPath);
            if (f.exists()) {
                rec.found = true;
                rec.file = f;
                rec.fileName = f.getName();
            }
        }

        if (!rec.found) {
            long ts = (callTimestamp != null) ? callTimestamp : System.currentTimeMillis();
            long dur = (duration != null) ? duration : 0;
            rec = findLatestRecording(ts, phone, leadName, dur);
        }

        uploadRecordingInternal(call, rec, serverUrl, phone, leadId, callId, notes, duration, userId);
    }

    @PluginMethod
    public void syncRecordingsForLead(PluginCall call) {
        String phone = call.getString("phone");
        String leadId = call.getString("leadId");
        String callId = call.getString("callId");
        String leadName = call.getString("leadName");
        Long timestamp = getLongValue(call, "timestamp");
        Long duration = getLongValue(call, "duration");
        String serverUrl = call.getString("serverUrl");
        String userId = call.getString("userId");

        if (serverUrl == null || serverUrl.isEmpty()) {
            serverUrl = DEFAULT_SERVER_URL;
        }

        long ts = (timestamp != null && timestamp > 0) ? timestamp : 0;
        long dur = (duration != null) ? duration : 0;
        RecordingSource rec = findLatestRecording(ts, phone, leadName, dur);

        if (!rec.found) {
            JSObject ret = new JSObject();
            ret.put("uploaded", false);
            ret.put("message", "No audio recording file found on device matching " + (leadName != null && !leadName.isEmpty() ? leadName : (phone != null ? phone : "lead")));
            call.resolve(ret);
            return;
        }

        uploadRecordingInternal(call, rec, serverUrl, phone, leadId, callId, "Auto-detected device recording: " + rec.fileName, duration, userId);
    }

    private void uploadRecordingInternal(
        PluginCall call,
        RecordingSource rec,
        String serverUrl,
        String phone,
        String leadId,
        String callId,
        String notes,
        Long duration,
        String userId
    ) {
        if (!rec.found || (rec.file == null && rec.uri == null)) {
            JSObject ret = new JSObject();
            ret.put("uploaded", false);
            ret.put("message", "No audio recording file found on device for this call");
            call.resolve(ret);
            return;
        }

        final RecordingSource finalRec = rec;
        final String finalServerUrl = serverUrl;

        Executors.newSingleThreadExecutor().execute(() -> {
            InputStream is = null;
            try {
                if (finalRec.uri != null) {
                    is = getContext().getContentResolver().openInputStream(finalRec.uri);
                } else if (finalRec.file != null) {
                    is = new FileInputStream(finalRec.file);
                }

                if (is == null) {
                    JSObject ret = new JSObject();
                    ret.put("uploaded", false);
                    ret.put("error", "Cannot open stream for audio recording");
                    call.resolve(ret);
                    return;
                }

                String boundary = "===" + System.currentTimeMillis() + "===";
                URL url = new URL(finalServerUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                conn.setConnectTimeout(60000);
                conn.setReadTimeout(60000);
                conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

                OutputStream os = conn.getOutputStream();
                PrintWriter writer = new PrintWriter(new OutputStreamWriter(os, "UTF-8"), true);

                if (phone != null) addFormField(writer, boundary, "phone", phone);
                if (leadId != null) addFormField(writer, boundary, "leadId", leadId);
                if (callId != null && !callId.isEmpty()) addFormField(writer, boundary, "callId", callId);
                if (duration != null) {
                    addFormField(writer, boundary, "duration", String.valueOf(duration));
                    addFormField(writer, boundary, "ringDuration", String.valueOf(duration));
                }
                if (userId != null) addFormField(writer, boundary, "userId", userId);
                addFormField(writer, boundary, "callStatus", (duration != null && duration > 0) ? "ANSWERED" : "MISSED");
                if (notes != null && !notes.isEmpty()) {
                    addFormField(writer, boundary, "notes", notes);
                } else {
                    addFormField(writer, boundary, "notes", "Auto-synced audio recording: " + finalRec.fileName);
                }

                writer.append("--").append(boundary).append("\r\n");
                writer.append("Content-Disposition: form-data; name=\"audio\"; filename=\"").append(finalRec.fileName).append("\"\r\n");
                writer.append("Content-Type: audio/mpeg\r\n\r\n");
                writer.flush();

                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = is.read(buffer)) != -1) {
                    os.write(buffer, 0, bytesRead);
                }
                os.flush();
                is.close();

                writer.append("\r\n").flush();
                writer.append("--").append(boundary).append("--\r\n").flush();
                writer.close();

                int responseCode = conn.getResponseCode();
                Log.d(TAG, "Audio upload response=" + responseCode + " for " + finalRec.fileName);
                JSObject ret = new JSObject();
                ret.put("uploaded", responseCode >= 200 && responseCode < 300);
                ret.put("fileName", finalRec.fileName);
                ret.put("responseCode", responseCode);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Audio upload error: " + e.getMessage());
                JSObject ret = new JSObject();
                ret.put("uploaded", false);
                ret.put("error", e.getMessage());
                call.resolve(ret);
            } finally {
                if (is != null) {
                    try { is.close(); } catch (Exception ignored) {}
                }
            }
        });
    }

    private void addFormField(PrintWriter writer, String boundary, String name, String value) {
        writer.append("--").append(boundary).append("\r\n");
        writer.append("Content-Disposition: form-data; name=\"").append(name).append("\"\r\n\r\n");
        writer.append(value).append("\r\n");
        writer.flush();
    }

    private RecordingSource findLatestRecording(long callTimestamp, String phone, String contactName, long duration) {
        RecordingSource result = new RecordingSource();

        String phoneClean = (phone != null) ? phone.replaceAll("[^0-9]", "") : "";
        String targetPhone = phoneClean.length() >= 10 ? phoneClean.substring(phoneClean.length() - 10) : phoneClean;
        String cleanContact = (contactName != null) ? contactName.trim().toLowerCase().replaceAll("[^a-z0-9]", "") : "";

        // Time window for this call: from 5 min before start to (callDuration + 15 min) after
        long callDurationMs = (duration > 0 ? duration : 60) * 1000L;
        long windowStart = (callTimestamp > 0) ? (callTimestamp - 5 * 60 * 1000L) : (System.currentTimeMillis() - 24 * 3600 * 1000L);
        long windowEnd = (callTimestamp > 0) ? (callTimestamp + callDurationMs + 15 * 60 * 1000L) : (System.currentTimeMillis() + 60000L);

        Log.d(TAG, "Searching recording for phone=" + targetPhone + " contact=" + cleanContact + " window=[" + windowStart + " - " + windowEnd + "]");

        // 1. Scan filesystem across all known Xiaomi/HyperOS, Samsung, OnePlus, Oppo directories
        String[] candidateDirs = new String[]{
            "MIUI/sound_recorder/call_rec",
            "MIUI/sound_recorder",
            "Recordings/MIUI/sound_recorder/call_rec",
            "Recordings/MIUI/sound_recorder",
            "Recordings/Call",
            "Recordings/Calls",
            "Recordings/Call Recordings",
            "Recordings/call_rec",
            "Recordings",
            "Music/Recordings/Call Recordings",
            "Music/Recordings",
            "Music/Recordings/call_rec",
            "Sounds/Call",
            "Sounds",
            "Call",
            "PhoneRecord",
            "call_rec",
            "Voice Recorder",
            "Audio/Recordings",
            "Audio"
        };

        File extRoot = Environment.getExternalStorageDirectory();
        File bestCandidate = null;
        int bestScore = -1;

        for (String relDir : candidateDirs) {
            File dir = new File(extRoot, relDir);
            if (dir.exists() && dir.isDirectory()) {
                File[] files = dir.listFiles();
                if (files != null) {
                    for (File f : files) {
                        if (f.isFile()) {
                            int score = evaluateAudioFile(f, targetPhone, cleanContact, contactName, callTimestamp, windowStart, windowEnd);
                            if (score > bestScore || (score == bestScore && bestCandidate != null && Math.abs(f.lastModified() - callTimestamp) < Math.abs(bestCandidate.lastModified() - callTimestamp))) {
                                bestScore = score;
                                bestCandidate = f;
                            }
                        } else if (f.isDirectory()) {
                            File[] subFiles = f.listFiles();
                            if (subFiles != null) {
                                for (File sf : subFiles) {
                                    if (sf.isFile()) {
                                        int score = evaluateAudioFile(sf, targetPhone, cleanContact, contactName, callTimestamp, windowStart, windowEnd);
                                        if (score > bestScore || (score == bestScore && bestCandidate != null && Math.abs(sf.lastModified() - callTimestamp) < Math.abs(bestCandidate.lastModified() - callTimestamp))) {
                                            bestScore = score;
                                            bestCandidate = sf;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (bestCandidate != null && bestScore >= 40) {
            Log.i(TAG, "Found recording on filesystem: " + bestCandidate.getAbsolutePath() + " (score=" + bestScore + ")");
            result.found = true;
            result.file = bestCandidate;
            result.fileName = bestCandidate.getName();
            return result;
        }

        // 2. Query MediaStore Audio ContentProvider (Scoped Storage fallback)
        try {
            // A. Query by phone or contact name in display name
            if (!targetPhone.isEmpty() || !cleanContact.isEmpty()) {
                String selection = "";
                java.util.ArrayList<String> selArgs = new java.util.ArrayList<>();
                if (!targetPhone.isEmpty()) {
                    selection += MediaStore.Audio.Media.DISPLAY_NAME + " LIKE ? OR " + MediaStore.Audio.Media.TITLE + " LIKE ?";
                    selArgs.add("%" + targetPhone + "%");
                    selArgs.add("%" + targetPhone + "%");
                }
                if (!cleanContact.isEmpty() && cleanContact.length() >= 3) {
                    if (!selection.isEmpty()) selection += " OR ";
                    selection += MediaStore.Audio.Media.DISPLAY_NAME + " LIKE ? OR " + MediaStore.Audio.Media.TITLE + " LIKE ?";
                    selArgs.add("%" + cleanContact + "%");
                    selArgs.add("%" + cleanContact + "%");
                }

                Cursor cursor = getContext().getContentResolver().query(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    new String[]{
                        MediaStore.Audio.Media._ID,
                        MediaStore.Audio.Media.DISPLAY_NAME,
                        MediaStore.Audio.Media.DATE_ADDED,
                        MediaStore.Audio.Media.DATE_MODIFIED
                    },
                    selection,
                    selArgs.toArray(new String[0]),
                    MediaStore.Audio.Media.DATE_MODIFIED + " DESC"
                );

                if (cursor != null) {
                    long bestMsDiff = Long.MAX_VALUE;
                    long bestId = -1;
                    String bestName = null;

                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID));
                        String displayName = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME));
                        long dateMod = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)) * 1000L;
                        long diff = callTimestamp > 0 ? Math.abs(dateMod - callTimestamp) : 0;
                        if (bestId == -1 || diff < bestMsDiff) {
                            bestMsDiff = diff;
                            bestId = id;
                            bestName = displayName;
                        }
                    }
                    cursor.close();

                    if (bestId != -1) {
                        Log.i(TAG, "Found recording via MediaStore name match: " + bestName);
                        result.found = true;
                        result.uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, bestId);
                        result.fileName = (bestName != null) ? bestName : "call_rec.mp3";
                        return result;
                    }
                }
            }

            // B. Query by timestamp window
            long startSec = windowStart / 1000;
            long endSec = windowEnd / 1000;
            Cursor cursor = getContext().getContentResolver().query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                new String[]{
                    MediaStore.Audio.Media._ID,
                    MediaStore.Audio.Media.DISPLAY_NAME,
                    MediaStore.Audio.Media.DATE_ADDED,
                    MediaStore.Audio.Media.DATE_MODIFIED
                },
                "(" + MediaStore.Audio.Media.DATE_ADDED + " >= ? AND " + MediaStore.Audio.Media.DATE_ADDED + " <= ?) OR (" +
                      MediaStore.Audio.Media.DATE_MODIFIED + " >= ? AND " + MediaStore.Audio.Media.DATE_MODIFIED + " <= ?)",
                new String[]{ String.valueOf(startSec), String.valueOf(endSec), String.valueOf(startSec), String.valueOf(endSec) },
                MediaStore.Audio.Media.DATE_MODIFIED + " DESC"
            );

            if (cursor != null) {
                while (cursor.moveToNext()) {
                    long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID));
                    String displayName = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME));
                    String nameLower = (displayName != null) ? displayName.toLowerCase() : "";

                    // Prioritize files containing "call", "rec", "sound", or cleanContact
                    boolean likelyCallRec = nameLower.contains("call") || nameLower.contains("rec") || (!cleanContact.isEmpty() && nameLower.contains(cleanContact));
                    if (likelyCallRec || cursor.isFirst()) {
                        cursor.close();
                        Log.i(TAG, "Found recording via MediaStore time window: " + displayName);
                        result.found = true;
                        result.uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
                        result.fileName = (displayName != null) ? displayName : "call_rec.mp3";
                        return result;
                    }
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.w(TAG, "MediaStore query error: " + e.getMessage());
        }

        // 3. Last fallback: if any file candidate was found on filesystem with lower score
        if (bestCandidate != null) {
            Log.i(TAG, "Using fallback candidate on filesystem: " + bestCandidate.getName());
            result.found = true;
            result.file = bestCandidate;
            result.fileName = bestCandidate.getName();
            return result;
        }

        Log.w(TAG, "No audio recording found on device matching call");
        return result;
    }

    private int evaluateAudioFile(File f, String targetPhone, String cleanContact, String rawContactName, long callTimestamp, long windowStart, long windowEnd) {
        String name = f.getName().toLowerCase();
        boolean isAudio = name.endsWith(".mp3") || name.endsWith(".m4a") || name.endsWith(".aac") ||
                          name.endsWith(".amr") || name.endsWith(".wav") || name.endsWith(".3gp") ||
                          name.endsWith(".ogg") || name.endsWith(".opus");
        if (!isAudio) return -1;

        int score = 0;
        String nameDigits = name.replaceAll("[^0-9]", "");

        // 1. Phone number match (+120)
        if (!targetPhone.isEmpty() && (name.contains(targetPhone) || nameDigits.contains(targetPhone))) {
            score += 120;
        }

        // 2. Contact name match (+90 for full, +60 for individual word)
        if (!cleanContact.isEmpty() && cleanContact.length() >= 3 && name.contains(cleanContact)) {
            score += 90;
        } else if (rawContactName != null && !rawContactName.trim().isEmpty()) {
            String[] words = rawContactName.toLowerCase().split("\\s+");
            for (String w : words) {
                String cw = w.replaceAll("[^a-z0-9]", "");
                if (cw.length() >= 3 && name.contains(cw)) {
                    score += 60;
                    break;
                }
            }
        }

        // 3. Date match in filename (+40)
        if (callTimestamp > 0) {
            try {
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyyMMdd", java.util.Locale.US);
                String dateStr = sdf.format(new java.util.Date(callTimestamp));
                if (name.contains(dateStr)) {
                    score += 40;
                }
            } catch (Exception ignored) {}
        }

        // 4. Time proximity match (+10 to +100)
        long mod = f.lastModified();
        if (callTimestamp > 0) {
            long diffMs = Math.abs(mod - callTimestamp);
            if (diffMs <= 5 * 60 * 1000L) { // within 5 min
                score += 100;
            } else if (diffMs <= 15 * 60 * 1000L) { // within 15 min
                score += 75;
            } else if (diffMs <= 60 * 60 * 1000L) { // within 1 hour
                score += 50;
            } else if (diffMs <= 12 * 3600 * 1000L) { // within 12 hours
                score += 25;
            } else if (diffMs <= 24 * 3600 * 1000L) { // within 24 hours
                score += 10;
            }
        } else if (mod >= windowStart && mod <= windowEnd) {
            score += 50;
        }

        // 5. Recording indicator in filename (+20)
        if (name.contains("call") || name.contains("rec") || name.contains("voice") || name.contains("sound")) {
            score += 20;
        }

        return score;
    }
}
