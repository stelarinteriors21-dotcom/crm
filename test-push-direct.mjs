import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const admin = await import('firebase-admin');
const serviceAccount = require('./src/lib/firebase-server-key.json');

const app = admin.default.initializeApp({ credential: admin.default.credential.cert(serviceAccount) });

const token = 'dApRmIgPQeyujVd_rXnXq4:APA91bEILG-iBRVZFOg6GwL2gcR_xtqNM_05oMd4u1RxVi9Y7W5pYG9TI-xU7zUhG8DvHJdMQb2FTkuLUyk5REiMhQA9cOOzKPmaYROU8Kl1urCAFueuYzI';

try {
  const res = await admin.default.messaging().send({
    notification: { title: 'Raw Test', body: 'Direct from server' },
    android: { priority: 'high', notification: { channelId: 'default' } },
    token
  });
  console.log('SUCCESS:', res);
} catch(err) {
  console.error('ERROR CODE:', err.code);
  console.error('ERROR MSG:', err.message);
}
process.exit(0);
