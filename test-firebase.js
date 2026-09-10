
const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const serviceAccount = require("./src/lib/firebase-server-key.json");

initializeApp({
  credential: cert(serviceAccount)
});

async function test() {
  const token = "fR-N2dLMSwGFIDO2Sk1LhL:APA91bF_j2dvJ_VUi2yGBtUjX34B2aEs4RvvXKaDcWD3WK0-Kb8MQSfvoBjpwGV-CvAeV-rYx3U5ZpAeAs_ykeyOcXNxIqpmb9VJ-sRV55BM1x_2IAOxUZs";
  
  const message = {
    notification: { title: "TEST", body: "BODY" },
    token,
    android: { 
      priority: "high", 
      notification: { 
        channelId: "default",
        sound: "default",
        defaultSound: true,
        defaultVibrateTimings: true
      } 
    }
  };

  try {
    const res = await getMessaging().send(message);
    console.log("Success:", res);
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}
test();

