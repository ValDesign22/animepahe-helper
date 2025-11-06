const firebaseAppPromise = (async () => {
  const { initializeApp } = await import(
    "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js"
  );
  const {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
  } = await import(
    "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js"
  );
  const { getFirestore } = await import(
    "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js"
  );

  const firebaseConfig = {
    apiKey: "AIzaSyAj6wsGDuuuOVh7lV1q7rvepXqbXhNbubM",
    authDomain: "animepahehelper.firebaseapp.com",
    projectId: "animepahehelper",
    storageBucket: "animepahehelper.firebasestorage.app",
    messagingSenderId: "896187742893",
    appId: "1:896187742893:web:5e8959a738d4246ecae424",
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  async function loginOrRegister(username, password) {
    let user = null;
    signInWithEmailAndPassword(auth, username, password)
      .then((userCredential) => {
        user = userCredential.user;
      })
      .catch((error) => {
        if (error.code === "auth/user-not-found") {
          createUserWithEmailAndPassword(auth, username, password)
            .then((userCredential) => {
              user = userCredential.user;
            })
            .catch((error) => {
              console.error("Registration error:", error);
            });
        } else {
          console.error("Login error:", error);
        }
      });
    return user;
  }

  return {
    app,
    auth,
    db,
    loginOrRegister,
  };
})();
