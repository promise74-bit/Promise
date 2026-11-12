// Web-push keys, hard-coded as requested. The private key and shared secret live in the repo,
// so keep this repository private. To rotate them: generate a new pair (npx web-push generate-vapid-keys),
// update this file AND the SQL trigger, and ask customers to re-enable notifications.
export const VAPID_PUBLIC_KEY = 'BLWrydIIJmQc6vg7gpy0qABNQ0t50yAUiOxMseC-wBm19hMccK8sExvPUvo43sa2velnWwP6whjo9cFyYzPoPXw';
export const VAPID_PRIVATE_KEY = 'MbqeaZSsZWB3NqrEy_bZSW4vootrEStqsUduaqa7UIs';
export const VAPID_SUBJECT = 'mailto:promisecomputerresearch@gmail.com';
// Shared secret between the database trigger and /api/push/send.
export const PUSH_SECRET = 'e6c9aeebace54fa21a80f0c20984cbb0f212cac7d1acd5c9';
export const SITE_URL = 'https://promisecomputerresearch.com.ng';
