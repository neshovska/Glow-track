// firebase-messaging-sw.js
// GlowTrack — Service Worker за push нотификации (Firebase Cloud Messaging)

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Използвай същия firebaseConfig като в index.html (проект: after-care-treatment)
firebase.initializeApp({
  apiKey: "TUK_TRYABVA_DA_E_TVOYAT_API_KEY",
  authDomain: "after-care-treatment.firebaseapp.com",
  projectId: "after-care-treatment",
  storageBucket: "after-care-treatment.appspot.com",
  messagingSenderId: "TUK_TRYABVA_DA_E_TVOYAT_SENDER_ID",
  appId: "TUK_TRYABVA_DA_E_TVOYAT_APP_ID"
});

const messaging = firebase.messaging();

// Обработва съобщения, когато таб/апп е на заден план или затворен
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message:', payload);

  const notificationTitle = payload.notification?.title || 'GlowTrack';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/glowtrack/icon-192.png',
    badge: '/glowtrack/icon-192.png',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// При клик върху нотификацията — отваря/фокусира приложението
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/glowtrack/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/glowtrack/');
      }
    })
  );
});
