// === GlowTrack Push Notifications: registration ===
// Изисква: <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js"></script>
// вече включен заедно с firebase-app и firebase-firestore в index.html

async function initPushNotifications(userId) {
  try {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.log('Push нотификациите не се поддържат на това устройство/браузър.');
      return null;
    }

    // Регистрира service worker-а специално за messaging
    const registration = await navigator.serviceWorker.register('/glowtrack/firebase-messaging-sw.js');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Потребителят отказа разрешение за нотификации.');
      return null;
    }

    const messaging = firebase.messaging();

    // VAPID key от Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
    const token = await messaging.getToken({
      vapidKey: 'TUK_TRYABVA_DA_E_TVOYAT_VAPID_KEY',
      serviceWorkerRegistration: registration
    });

    if (token && userId) {
      // Записва token-а в Firestore, обвързан с потребителя
      await firebase.firestore().collection('users').doc(userId).set(
        { fcmToken: token, fcmTokenUpdatedAt: new Date().toISOString() },
        { merge: true }
      );
      console.log('FCM token записан успешно.');
    }

    // Съобщения, докато приложението е отворено (foreground)
    messaging.onMessage((payload) => {
      console.log('Съобщение получено на преден план:', payload);
      // Тук може да покажеш собствен in-app toast/banner вместо системна нотификация
    });

    return token;
  } catch (err) {
    console.error('Грешка при инициализация на push нотификации:', err);
    return null;
  }
}

// Извиква се напр. след login или при отваряне на настройки за нотификации:
// initPushNotifications(currentUser.uid);
