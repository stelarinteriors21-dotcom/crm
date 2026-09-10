import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccount = require("./firebase-server-key.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error("Firebase admin initialization error", error);
  }
}

export const sendPushNotification = async (token: string, title: string, body: string, data?: any) => {
  try {
    const message = {
      notification: { title, body },
      token,
      data: data || {}
    };
    await admin.messaging().send(message);
    return { success: true };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error };
  }
};

export default admin;

