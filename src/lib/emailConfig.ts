/**
 * Global Email Dispatch Control
 *
 * Current Status: ALL EMAILS PAUSED
 * Instruction: "stop all escalation mails being send dont send any mails until i ask you to"
 *
 * Setting EMAILS_ENABLED to false completely stops all outbound escalation emails
 * across the CRM (48-hour inactivity emails, ignored lead emails, missed follow-up emails,
 * and cron escalation emails).
 */
export const EMAILS_ENABLED = false;
