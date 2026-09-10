
const admin = require("firebase-admin");
const serviceAccount = require("./src/lib/firebase-server-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const token = "ebTlkiRSReuDqquk-Ee1-n:APA91bFtqxuluPuaYZf7fxlKeaIp4Jfkd68LX2mvqF7zr7srz4W_v4yXj8sWZubGk1N82qxsN2UaeNPQh4gBnvu_i5Ep8AFeCOxmJEfwN0ZrejROidOECgg";

admin.messaging().send({
  notification: { title: "Test Push", body: "This is a test push from the server" },
  token: token
}).then(res => {
  console.log("Success:", res);
  process.exit(0);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

