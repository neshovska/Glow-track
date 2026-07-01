// functions/index.js
// GlowTrack — Cloud Function: ежедневна проверка за наближаващи процедури
// Деплой: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Интервали по зона (в дни) — според заключената терминология на проекта
const INTERVALS = {
  face: { min: 30, max: 40, label: 'Лице' },
  torso: { min: 45, max: 60, label: 'Торс' },
  legs: { min: 60, max: 90, label: 'Крака' }
};

// Пуска се веднъж дневно в 09:00 (Europe/Sofia)
exports.checkUpcomingProcedures = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('Europe/Sofia')
  .onRun(async (context) => {
    const now = new Date();
    const usersSnapshot = await db.collection('users').get();

    const notifications = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;
      if (!fcmToken) continue;

      const entriesSnapshot = await db
        .collection('users').doc(userDoc.id)
        .collection('diaryEntries')
        .orderBy('date', 'desc')
        .limit(1)
        .get();

      if (entriesSnapshot.empty) continue;

      const lastEntry = entriesSnapshot.docs[0].data();
      const lastDate = new Date(lastEntry.date);
      const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

      const zone = lastEntry.zone; // 'face' | 'torso' | 'legs'
      const interval = INTERVALS[zone];
      if (!interval) continue;

      // Известява когато навлезе в минималния прозорец на интервала
      if (daysSince === interval.min) {
        notifications.push({
          token: fcmToken,
          notification: {
            title: 'GlowTrack напомняне',
            body: `Наближава време за следваща процедура — ${interval.label}.`
          },
          data: { zone, type: 'procedure_reminder' }
        });
      }
    }

    if (notifications.length > 0) {
      const response = await admin.messaging().sendEach(notifications);
      console.log(`Изпратени ${response.successCount}/${notifications.length} нотификации.`);
    } else {
      console.log('Няма потребители за напомняне днес.');
    }

    return null;
  });
