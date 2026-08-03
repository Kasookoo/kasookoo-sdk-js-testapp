/**
 * Kasookoo SDK — Firebase messaging service worker.
 *
 * Copy this file AS-IS into your app's public/static folder so it is served
 * from your site root as `/firebase-messaging-sw.js`, e.g.:
 *
 *   cp node_modules/kasookoo-sdk/firebase-messaging-sw.js public/
 *
 * It is required by browser push: the FCM device token cannot be created
 * without a service worker, and it displays notifications for pushes that
 * arrive while your app's tab is closed or in the background.
 *
 * The Firebase config below is Kasookoo's public web config — do not replace
 * it with your own Firebase project.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDTDZBk0Zjolfb_qBbXJfRTAsAn44AdZ-w",
    authDomain: "kasookoo-sdk-f7f3f.firebaseapp.com",
    databaseURL: "https://kasookoo-sdk-f7f3f-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "kasookoo-sdk-f7f3f",
    storageBucket: "kasookoo-sdk-f7f3f.firebasestorage.app",
    messagingSenderId: "385695188894",
    appId: "1:385695188894:web:55b70c7f9ae91e37f4b88f",
    measurementId: "G-QVD0JRWHK0"
});

const messaging = firebase.messaging();

// Bumped whenever this file changes, so the SDK can warn about a stale copy.
const KASOOKOO_SW_VERSION = 2;

// Fires only when no page of your app is visible — a minimised browser, or the
// user on another tab. The page itself is still alive in both cases, so hand it
// the payload as well as showing the notification: that is what lets the SDK
// raise the call window and emit message events while you are away.
messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = payload.notification?.title || data.title || 'Kasookoo';
    const body = payload.notification?.body || data.body || '';

    self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
            for (const client of clients) {
                client.postMessage({
                    source: 'kasookoo-sdk',
                    version: KASOOKOO_SW_VERSION,
                    type: 'push',
                    data,
                });
            }
        })
        .catch(() => {
            // Best effort — the notification below is still shown either way.
        });

    self.registration.showNotification(title, {
        body,
        tag: data.room_name || data.conversation_id || undefined,
        data,
    });
});

// Version handshake — lets the SDK detect an out-of-date copy of this file.
self.addEventListener('message', (event) => {
    if (event.data && event.data.source === 'kasookoo-sdk' && event.data.type === 'ping') {
        const reply = { source: 'kasookoo-sdk', version: KASOOKOO_SW_VERSION, type: 'pong' };
        if (event.source) event.source.postMessage(reply);
    }
});


self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ('focus' in client) return client.focus();
            }
            return self.clients.openWindow('/');
        })
    );
});
