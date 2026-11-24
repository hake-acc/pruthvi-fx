const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyB33TBVHlsuLBtY4RVBmJFYdo_Wu_N1UH0",
  authDomain: "pruthvi-fx-d08e6.firebaseapp.com",
  projectId: "pruthvi-fx-d08e6",
  storageBucket: "pruthvi-fx-d08e6.firebasestorage.app",
  messagingSenderId: "288144115588",
  appId: "1:288144115588:web:1fa16a374cc6d39fdfffd1"
};

if (typeof window !== "undefined") {
  window.PRUTHVI_FIREBASE_CONFIG = DEFAULT_FIREBASE_CONFIG;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = DEFAULT_FIREBASE_CONFIG;
}
