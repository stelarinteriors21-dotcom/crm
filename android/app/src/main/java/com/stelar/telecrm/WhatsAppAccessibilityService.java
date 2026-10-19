package com.stelar.telecrm;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Rect;
import android.os.Parcelable;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.util.Log;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class WhatsAppAccessibilityService extends AccessibilityService {
    private static final String TAG = "WAAccessibilityService";

    private static final String PREFS_DEDUPE = "stelar_wa_dedupe";
    // Deduplication set: stores key in format "contact::direction::message"
    private static final Set<String> sSyncedMessageKeys = Collections.synchronizedSet(new LinkedHashSet<String>());
    // Buffer of recently drafted texts by the user in WhatsApp input box
    private static final Map<String, Long> sRecentDrafts = Collections.synchronizedMap(new LinkedHashMap<String, Long>());

    private String lastDraftText = "";
    private long lastDraftTime = 0;
    private String currentChatTitle = "";

    private void recordDraftText(String text) {
        if (text == null || text.trim().isEmpty()) return;
        long now = System.currentTimeMillis();
        sRecentDrafts.put(text.trim(), now);
        // prune older than 2 minutes
        Iterator<Map.Entry<String, Long>> it = sRecentDrafts.entrySet().iterator();
        while (it.hasNext()) {
            if (now - it.next().getValue() > 120000) it.remove();
        }
    }

    private boolean isRecentOutboundDraft(String text) {
        if (text == null) return false;
        Long t = sRecentDrafts.get(text.trim());
        return t != null && (System.currentTimeMillis() - t < 120000);
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        try {
            SharedPreferences sp = getSharedPreferences(PREFS_DEDUPE, Context.MODE_PRIVATE);
            sSyncedMessageKeys.addAll(sp.getAll().keySet());
        } catch (Exception ignored) {}

        try {
            AccessibilityServiceInfo info = new AccessibilityServiceInfo();
            info.eventTypes = AccessibilityEvent.TYPES_ALL_MASK;
            info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
            info.flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
                       | AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
                       | AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;
            info.notificationTimeout = 50;
            info.packageNames = new String[]{"com.whatsapp", "com.whatsapp.w4b"};
            setServiceInfo(info);
            Log.i(TAG, "WhatsAppAccessibilityService onServiceConnected: Ready and listening strictly for chat events!");
        } catch (Exception e) {
            Log.e(TAG, "Error in onServiceConnected: " + e.getMessage());
        }
    }

    private boolean isKeyAlreadySynced(String key) {
        if (sSyncedMessageKeys.contains(key)) return true;
        try {
            SharedPreferences sp = getSharedPreferences(PREFS_DEDUPE, Context.MODE_PRIVATE);
            return sp.contains(key);
        } catch (Exception e) {
            return false;
        }
    }

    private void markKeySynced(String key) {
        sSyncedMessageKeys.add(key);
        if (sSyncedMessageKeys.size() > 500) {
            Iterator<String> it = sSyncedMessageKeys.iterator();
            if (it.hasNext()) {
                it.next();
                it.remove();
            }
        }
        try {
            SharedPreferences sp = getSharedPreferences(PREFS_DEDUPE, Context.MODE_PRIVATE);
            sp.edit().putBoolean(key, true).apply();
        } catch (Exception ignored) {}
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        try {
            if (event == null || event.getPackageName() == null) return;
            String pkg = event.getPackageName().toString().toLowerCase();
            if (!pkg.contains("whatsapp")) return;

            int eventType = event.getEventType();

            // 0. Catch notification events delivered directly through accessibility
            if (eventType == AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED) {
                Parcelable p = event.getParcelableData();
                if (p instanceof Notification) {
                    WhatsAppSyncClient.processIncomingNotification(getApplicationContext(), (Notification) p);
                }
            }

            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root == null && event.getSource() != null) {
                root = event.getSource();
            }
            if (root == null) return;

            // STRICT GUARD: Must be verified inside an active 1-on-1 or group chat screen.
            // If the user is on the Status/Updates tab, Chats list, Fingerprint prompt, or Settings,
            // isInsideChatConversation returns false and we NEVER scrape or sync text!
            if (!isInsideChatConversation(root)) {
                currentChatTitle = "";
                lastDraftText = "";
                return;
            }

            // Resolve contact name strictly from the chat conversation header
            String chatTitle = extractChatTitle(root);
            if (chatTitle != null && !chatTitle.trim().isEmpty() && !isMetadataString(chatTitle)) {
                currentChatTitle = chatTitle.trim();
            }

            // Only proceed if we have a positively identified chat title (never fallback to guessing for scraping)
            if (currentChatTitle == null || currentChatTitle.trim().isEmpty() || isMetadataString(currentChatTitle)) {
                return;
            }

            // 1b. Inspect on-screen chat bubbles (both INBOUND and OUTBOUND)
            if (eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED 
             || eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED 
             || eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
                scrapeChatBubbles(root);
            }

            // 2. Track text being drafted in the message input box
            if (eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
                String typed = "";
                if (event.getText() != null && !event.getText().isEmpty()) {
                    StringBuilder sb = new StringBuilder();
                    for (CharSequence cs : event.getText()) {
                        sb.append(cs);
                    }
                    typed = sb.toString().trim();
                }
                if (!typed.isEmpty()) {
                    lastDraftText = typed;
                    lastDraftTime = System.currentTimeMillis();
                    recordDraftText(typed);
                } else if (!lastDraftText.isEmpty() && (System.currentTimeMillis() - lastDraftTime < 60000)) {
                    // Text transitioned to empty (user tapped Send or Enter)
                    syncMessageIfNew(currentChatTitle, lastDraftText, "OUTBOUND");
                    lastDraftText = "";
                }
            }

            // 3. Read active EditText in current view tree
            AccessibilityNodeInfo editTextNode = findEditTextNode(root);
            if (editTextNode != null && editTextNode.getText() != null) {
                String currentText = editTextNode.getText().toString().trim();
                if (!currentText.isEmpty()) {
                    lastDraftText = currentText;
                    lastDraftTime = System.currentTimeMillis();
                    recordDraftText(currentText);
                }
            }

            // 4. Detect when "Send" button is tapped
            if (eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
                AccessibilityNodeInfo source = event.getSource();
                if (isSendButton(source) || isSendButtonInTree(root)) {
                    if (!lastDraftText.isEmpty()) {
                        syncMessageIfNew(currentChatTitle, lastDraftText, "OUTBOUND");
                        lastDraftText = "";
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Accessibility error: " + e.getMessage());
        }
    }

    private boolean isInsideChatConversation(AccessibilityNodeInfo root) {
        if (root == null) return false;

        int screenHeight = getResources().getDisplayMetrics().heightPixels;
        if (screenHeight <= 0) screenHeight = 2400;

        // 1. Must NOT be on the Home tabs (Chats, Updates/Status, Calls, Communities)
        List<AccessibilityNodeInfo> tabs = root.findAccessibilityNodeInfosByViewId("com.whatsapp:id/tabs");
        if (tabs != null && !tabs.isEmpty()) return false;
        tabs = root.findAccessibilityNodeInfosByViewId("com.whatsapp.w4b:id/tabs");
        if (tabs != null && !tabs.isEmpty()) return false;

        List<AccessibilityNodeInfo> fab = root.findAccessibilityNodeInfosByViewId("com.whatsapp:id/fab");
        if (fab != null && !fab.isEmpty()) return false;
        fab = root.findAccessibilityNodeInfosByViewId("com.whatsapp.w4b:id/fab");
        if (fab != null && !fab.isEmpty()) return false;

        // 2. An active chat conversation MUST have an active EditText in the bottom 45% of the screen
        AccessibilityNodeInfo editText = findEditTextNode(root);
        if (editText == null) return false;

        Rect editRect = new Rect();
        editText.getBoundsInScreen(editRect);
        // The "Type a message" / "Message" box is strictly in the bottom portion of the screen
        if (editRect.top < screenHeight * 0.55) {
            // It's in the upper half (e.g. search bar in chat list), NOT a chat conversation!
            return false;
        }

        return true;
    }

    private synchronized void syncMessageIfNew(String contact, String text, String direction) {
        if (text == null) return;
        text = text.trim();
        if (text.isEmpty() || isMetadataString(text) || isTimestampOrDate(text)) return;

        if (contact == null || contact.trim().isEmpty() || contact.equals("WhatsApp Contact")) {
            contact = currentChatTitle;
        }
        if (contact == null || contact.trim().isEmpty() || contact.equals("WhatsApp Contact")) {
            contact = getFallbackLeadName();
        }
        if (contact.isEmpty()) {
            contact = "WhatsApp Contact";
        }

        String phoneGuess = contact.replaceAll("[^0-9+]", "");
        if (phoneGuess.length() < 7 && !contact.equalsIgnoreCase("WhatsApp Contact")) {
            String resolved = WhatsAppSyncClient.resolvePhoneNumberFromName(getApplicationContext(), contact);
            if (resolved != null && !resolved.isEmpty()) {
                phoneGuess = resolved;
            }
        }
        if (phoneGuess.length() < 7) {
            String fbName = getFallbackLeadName();
            String fbPhone = getFallbackLeadPhone();
            if (!fbName.isEmpty() && (contact.equalsIgnoreCase("WhatsApp Contact") || contact.toLowerCase().contains(fbName.toLowerCase()) || fbName.toLowerCase().contains(contact.toLowerCase()))) {
                if (fbPhone != null && !fbPhone.isEmpty()) {
                    phoneGuess = fbPhone;
                }
            }
        }

        String key = contact + "::" + direction + "::" + text;
        if (isKeyAlreadySynced(key)) {
            return; // Already synced! Never duplicate!
        }

        // If this message was already synced as OUTBOUND, never let it be re-synced as INBOUND!
        if ("INBOUND".equals(direction)) {
            String outboundKey = contact + "::OUTBOUND::" + text;
            if (isKeyAlreadySynced(outboundKey)) {
                return;
            }
        }

        markKeySynced(key);

        Log.i(TAG, "Syncing " + direction + " WA message for '" + contact + "' (" + phoneGuess + "): " + text);
        WhatsAppSyncClient.syncMessage(getApplicationContext(), contact, phoneGuess, text, direction);
    }

    private synchronized void scrapeChatBubbles(AccessibilityNodeInfo root) {
        if (root == null) return;
        if (currentChatTitle == null || currentChatTitle.trim().isEmpty() || isMetadataString(currentChatTitle)) {
            return;
        }

        Rect rootBounds = new Rect();
        root.getBoundsInScreen(rootBounds);
        int screenWidth = rootBounds.width();
        int screenHeight = rootBounds.height();
        if (screenWidth <= 0) screenWidth = getResources().getDisplayMetrics().widthPixels;
        if (screenHeight <= 0) screenHeight = getResources().getDisplayMetrics().heightPixels;
        if (screenWidth <= 0) screenWidth = 1080;
        if (screenHeight <= 0) screenHeight = 2400;

        List<AccessibilityNodeInfo> msgNodes = new ArrayList<>();

        // Primary: Find by known message and document view IDs
        String[] bubbleIds = new String[]{
            "com.whatsapp:id/message_text",
            "com.whatsapp.w4b:id/message_text",
            "com.whatsapp:id/conversation_text",
            "com.whatsapp.w4b:id/conversation_text",
            "com.whatsapp:id/text_content",
            "com.whatsapp.w4b:id/text_content",
            "com.whatsapp:id/caption",
            "com.whatsapp:id/document_title",
            "com.whatsapp.w4b:id/document_title",
            "com.whatsapp:id/file_name",
            "com.whatsapp.w4b:id/file_name",
            "com.whatsapp:id/primary_title",
            "com.whatsapp.w4b:id/primary_title",
            "com.whatsapp:id/media_name",
            "com.whatsapp.w4b:id/media_name"
        };

        for (String id : bubbleIds) {
            List<AccessibilityNodeInfo> found = root.findAccessibilityNodeInfosByViewId(id);
            if (found != null && !found.isEmpty()) {
                msgNodes.addAll(found);
            }
        }

        // Fallback: If view IDs are obfuscated, recursively collect TextViews inside the message area
        if (msgNodes.isEmpty()) {
            findMessageTextViewsInCanvas(root, msgNodes, screenHeight);
        }

        if (msgNodes.isEmpty()) return;

        // Inspect the visible message nodes (up to 15)
        int start = Math.max(0, msgNodes.size() - 15);
        Rect bounds = new Rect();
        for (int i = start; i < msgNodes.size(); i++) {
            AccessibilityNodeInfo node = msgNodes.get(i);
            if (node == null || node.getText() == null) continue;
            String text = node.getText().toString().trim();
            if (text.isEmpty() || isMetadataString(text) || isTimestampOrDate(text)) continue;

            node.getBoundsInScreen(bounds);
            // Must be within middle canvas (strictly below top toolbar at 220px, strictly above bottom input bar)
            if (bounds.top < 220 || bounds.bottom > screenHeight - 140) continue;

            boolean isOutbound = isNodeOutbound(node, screenWidth);
            syncMessageIfNew(currentChatTitle, text, isOutbound ? "OUTBOUND" : "INBOUND");
        }
    }

    private boolean isNodeOutbound(AccessibilityNodeInfo node, int screenWidth) {
        if (node == null) return false;

        // 1. If user recently drafted and sent this text within the last 2 minutes, it is 100% OUTBOUND
        CharSequence textSeq = node.getText();
        if (textSeq != null) {
            String text = textSeq.toString().trim();
            if (isRecentOutboundDraft(text)) {
                return true;
            }
        }

        // 2. Inspect parent / bubble layout for status icon (checkmarks are EXCLUSIVELY on outbound messages in WhatsApp)
        AccessibilityNodeInfo parent = node.getParent();
        if (parent != null) {
            if (hasStatusView(parent)) return true;
            AccessibilityNodeInfo grandParent = parent.getParent();
            if (grandParent != null && hasStatusView(grandParent)) return true;

            // Check parent bubble alignment
            Rect pBounds = new Rect();
            parent.getBoundsInScreen(pBounds);
            if (pBounds.width() > 0 && screenWidth > 0) {
                int pDistToRight = screenWidth - pBounds.right;
                int pDistToLeft = pBounds.left;
                // Outbound bubble sits against right screen edge (right margin < 140px, left margin > 80px)
                if (pDistToRight < 140 && pDistToLeft > 80) {
                    return true;
                }
                // Inbound bubble sits against left screen edge (left margin < 100px, right margin > 80px)
                if (pDistToLeft < 100 && pDistToRight > 80) {
                    return false;
                }
            }
        }

        // 3. Fallback: check node's own screen bounds
        Rect bounds = new Rect();
        node.getBoundsInScreen(bounds);
        if (screenWidth > 0) {
            int distToRight = screenWidth - bounds.right;
            int distToLeft = bounds.left;
            // Outbound text is shifted to the right half of the screen
            if (bounds.right >= screenWidth * 0.70 && bounds.left > 80) {
                return true;
            }
            if (bounds.left <= 80 && bounds.right < screenWidth * 0.85) {
                return false;
            }
            return distToRight < distToLeft;
        }

        return false;
    }

    private boolean hasStatusView(AccessibilityNodeInfo container) {
        if (container == null) return false;
        String[] statusIds = new String[]{
            "com.whatsapp:id/status",
            "com.whatsapp.w4b:id/status",
            "com.whatsapp:id/msg_status",
            "com.whatsapp.w4b:id/msg_status",
            "com.whatsapp:id/status_icon"
        };
        for (String id : statusIds) {
            List<AccessibilityNodeInfo> list = container.findAccessibilityNodeInfosByViewId(id);
            if (list != null && !list.isEmpty()) return true;
        }
        int count = container.getChildCount();
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo child = container.getChild(i);
            if (child != null) {
                CharSequence desc = child.getContentDescription();
                if (desc != null) {
                    String d = desc.toString().toLowerCase();
                    if (d.contains("sent") || d.contains("delivered") || d.contains("read") || d.contains("seen") || d.contains("pending") || d.contains("भेजा")) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private void findMessageTextViewsInCanvas(AccessibilityNodeInfo node, List<AccessibilityNodeInfo> out, int screenHeight) {
        if (node == null) return;
        if ("android.widget.TextView".equals(node.getClassName()) && node.getText() != null) {
            Rect r = new Rect();
            node.getBoundsInScreen(r);
            // Between top header and bottom input bar
            if (r.top > 200 && r.bottom < (screenHeight - 160) && r.width() > 40 && r.height() > 20) {
                String t = node.getText().toString().trim();
                if (!t.isEmpty() && !isMetadataString(t) && !isTimestampOrDate(t)) {
                    out.add(node);
                }
            }
        }
        int childCount = node.getChildCount();
        for (int i = 0; i < childCount; i++) {
            findMessageTextViewsInCanvas(node.getChild(i), out, screenHeight);
        }
    }

    private boolean isTimestampOrDate(String s) {
        if (s == null) return true;
        String lower = s.trim().toLowerCase();
        // Time format e.g. 12:43 pm, 9:05 AM, 15:30, 4:35 pm, 10:05 am, 11:14 am, 1:05 pm
        if (lower.matches("^\\d{1,2}:\\d{2}(\\s*[ap]m)?$")) return true;
        // Common single word dates
        if (lower.equals("today") || lower.equals("yesterday")) return true;
        // Day names e.g. "Monday", "Saturday", "Sunday"
        if (lower.equals("monday") || lower.equals("tuesday") || lower.equals("wednesday") ||
            lower.equals("thursday") || lower.equals("friday") || lower.equals("saturday") || lower.equals("sunday")) {
            return true;
        }
        // Date formats e.g. 17 October 2026, 17/10/2026
        if (lower.matches("^\\d{1,2}\\s+[a-z]{3,9}(\\s+\\d{4})?$")) return true;
        if (lower.matches("^\\d{1,2}/\\d{1,2}/\\d{2,4}$")) return true;
        // File sizes & duration labels e.g. "92 kB · PNG", "103 kB · PNG", "1.2 MB"
        if (lower.matches("^\\d+(\\.\\d+)?\\s*(kb|mb|gb|b|bytes)(\\s*·\\s*[a-z0-9]+)?$")) return true;
        return false;
    }

    private boolean isSendButtonInTree(AccessibilityNodeInfo root) {
        if (root == null) return false;
        List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId("com.whatsapp:id/send");
        if (nodes != null && !nodes.isEmpty()) return true;
        nodes = root.findAccessibilityNodeInfosByViewId("com.whatsapp.w4b:id/send");
        if (nodes != null && !nodes.isEmpty()) return true;
        nodes = root.findAccessibilityNodeInfosByViewId("com.whatsapp:id/btn_send");
        return nodes != null && !nodes.isEmpty();
    }

    private boolean isSendButton(AccessibilityNodeInfo node) {
        if (node == null) return false;

        // Check content description
        CharSequence desc = node.getContentDescription();
        if (desc != null) {
            String d = desc.toString().toLowerCase();
            if (d.contains("send") || d.contains("भेजें") || d.contains("അയക്കുക") || d.contains("sent") || d.contains("enviar")) {
                return true;
            }
        }

        // Check view id
        CharSequence viewId = node.getViewIdResourceName();
        if (viewId != null) {
            String v = viewId.toString().toLowerCase();
            if (v.contains("send") || v.contains("btn_send") || v.contains("send_container") || v.contains("entry_send")) {
                return true;
            }
        }

        // Check parent
        AccessibilityNodeInfo parent = node.getParent();
        if (parent != null) {
            CharSequence pDesc = parent.getContentDescription();
            if (pDesc != null) {
                String pd = pDesc.toString().toLowerCase();
                if (pd.contains("send") || pd.contains("भेजें") || pd.contains("അയക്കുക")) return true;
            }
            CharSequence pViewId = parent.getViewIdResourceName();
            if (pViewId != null) {
                String pv = pViewId.toString().toLowerCase();
                if (pv.contains("send")) return true;
            }
        }

        return false;
    }

    private AccessibilityNodeInfo findEditTextNode(AccessibilityNodeInfo node) {
        if (node == null) return null;
        if ("android.widget.EditText".equals(node.getClassName())) {
            return node;
        }
        int childCount = node.getChildCount();
        for (int i = 0; i < childCount; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            AccessibilityNodeInfo match = findEditTextNode(child);
            if (match != null) return match;
        }
        return null;
    }

    private String extractChatTitle(AccessibilityNodeInfo root) {
        if (root == null) return null;

        String[] knownIds = new String[]{
            "com.whatsapp:id/conversation_contact_name",
            "com.whatsapp.w4b:id/conversation_contact_name",
            "com.whatsapp:id/conversation_title",
            "com.whatsapp.w4b:id/conversation_title",
            "com.whatsapp:id/action_bar_title",
            "com.whatsapp.w4b:id/action_bar_title",
            "com.whatsapp:id/title",
            "com.whatsapp:id/chat_title"
        };

        for (String id : knownIds) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId(id);
            if (nodes != null && !nodes.isEmpty()) {
                for (AccessibilityNodeInfo n : nodes) {
                    CharSequence title = n.getText();
                    if (title != null && !title.toString().trim().isEmpty() && !isMetadataString(title.toString())) {
                        return title.toString().trim();
                    }
                }
            }
        }

        // Fallback: Search top action bar / toolbar area (top 260px strictly above conversation bubbles)
        Rect rect = new Rect();
        return findTitleInTopBar(root, rect);
    }

    private String findTitleInTopBar(AccessibilityNodeInfo node, Rect rect) {
        if (node == null) return null;
        if ("android.widget.TextView".equals(node.getClassName()) && node.getText() != null) {
            node.getBoundsInScreen(rect);
            // Header contact name is strictly in top 260px of the screen and not the left back arrow (left >= 70)
            if (rect.top >= 0 && rect.bottom <= 260 && rect.left >= 70) {
                String text = node.getText().toString().trim();
                if (!text.isEmpty() && !isMetadataString(text) && !isTimestampOrDate(text)) {
                    return text;
                }
            }
        }
        int childCount = node.getChildCount();
        for (int i = 0; i < childCount; i++) {
            String match = findTitleInTopBar(node.getChild(i), rect);
            if (match != null) return match;
        }
        return null;
    }

    private boolean isMetadataString(String str) {
        if (str == null) return true;
        String s = str.trim().toLowerCase();
        return s.isEmpty() ||
            s.equals("whatsapp") ||
            s.equals("whatsapp business") ||
            s.equals("chats") ||
            s.equals("updates") ||
            s.equals("calls") ||
            s.equals("communities") ||
            s.equals("status") ||
            s.equals("channels") ||
            s.contains("muted updates") ||
            s.contains("viewed updates") ||
            s.contains("recent updates") ||
            s.contains("touch the fingerprint") ||
            s.contains("fingerprint") ||
            s.contains("cancel") ||
            s.contains("use pin") ||
            s.contains("use password") ||
            s.contains("search") ||
            s.equals("online") ||
            s.equals("typing...") ||
            s.equals("today") ||
            s.equals("yesterday") ||
            s.contains("last seen") ||
            s.contains("unread message") ||
            s.contains("messages are end-to-end") ||
            s.contains("uses ai from meta") ||
            s.contains("meta ai") ||
            s.contains("tap here for contact info") ||
            s.contains("disappearing messages") ||
            s.contains("end-to-end encrypted") ||
            s.contains("business account") ||
            s.contains("message yourself") ||
            s.contains("whatsapp locked") ||
            s.contains("unlock to use whatsapp") ||
            s.contains("recent chats") ||
            s.contains("system apps") ||
            s.contains("more apps") ||
            s.contains("tucson-queen-supplement-olive") ||
            s.contains("thoughts-capabilities-marshall-les") ||
            s.equals("skingorpy") ||
            s.equals("hdugbfyfv") ||
            s.equals("kdfhvfldbnvlsdbv") ||
            s.equals("kdfhvfdlbnvlsd6v") ||
            s.equals("jbdwfuh") ||
            s.equals("gshuvdhu") ||
            s.equals("diujbsdhub") ||
            s.equals("sjbdhvbde]") ||
            s.equals("jdbhdv") ||
            s.equals("idejdjd") ||
            s.equals("oishshsdkxix") ||
            s.equals("ggng") ||
            (s.length() <= 8 && s.contains(":") && (s.contains("am") || s.contains("pm")));
    }

    private String getFallbackLeadName() {
        try {
            SharedPreferences prefs = getSharedPreferences("stelar_crm_prefs", Context.MODE_PRIVATE);
            long time = prefs.getLong("last_lead_time", 0);
            // Within last 6 hours
            if (System.currentTimeMillis() - time < 6 * 3600 * 1000L) {
                String name = prefs.getString("last_lead_name", "");
                if (!name.isEmpty()) return name;
                String phone = prefs.getString("last_lead_phone", "");
                if (!phone.isEmpty()) return phone;
            }
        } catch (Exception ignored) {}
        return "";
    }

    private String getFallbackLeadPhone() {
        try {
            SharedPreferences prefs = getSharedPreferences("stelar_crm_prefs", Context.MODE_PRIVATE);
            long time = prefs.getLong("last_lead_time", 0);
            if (System.currentTimeMillis() - time < 6 * 3600 * 1000L) {
                return prefs.getString("last_lead_phone", "");
            }
        } catch (Exception ignored) {}
        return "";
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Accessibility Service interrupted");
    }
}
