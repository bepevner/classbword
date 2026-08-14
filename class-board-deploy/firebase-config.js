// Firebase 콘솔(console.firebase.google.com) > 프로젝트 설정 > 웹 앱 추가에서
// 발급받은 값을 아래에 그대로 붙여넣으세요.
const firebaseConfig = {
  apiKey: "여기에_API_KEY",
  authDomain: "여기에_PROJECT_ID.firebaseapp.com",
  projectId: "여기에_PROJECT_ID",
  storageBucket: "여기에_PROJECT_ID.appspot.com",
  messagingSenderId: "여기에_SENDER_ID",
  appId: "여기에_APP_ID",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
