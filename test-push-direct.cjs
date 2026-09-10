const { initializeApp, cert, getApps, messaging } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const serviceAccount = require('./src/lib/firebase-server-key.json');

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const token = 'dApRmIgPQeyujVd_rXnXq4:APA91bEILG-iBRVZFOg6GwL2gcR_xtqNM_05oMd4u1RxVi9Y7W5pYG9TI-xU7zUhG8DvHJdMQb2FTkuLUyk5REiMhQA9cOOzKPmaYROU8Kl1urCAFueuYzI';

getMessaging().send({
  notification: { title: 'Raw Test', body: 'Direct from server' },
  android: { priority: 'high', notification: { channelId: 'default' } },
  token
}).then(res => {
  console.log('SUCCESS:', res);
  process.exit(0);
}).catch(err => {
  console.error('ERROR CODE:', err.code);
  console.error('ERROR MSG:', err.message);
  process.exit(1);
});
