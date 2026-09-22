/* Fatebound → same Firebase project as Shardfall / LEGIONARY */
(function () {
  const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/11.0.2";
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBrshZSUS5J-HBQuV_pOa1Bz3P384EOCA0",
    authDomain: "shardfall-5f5de.firebaseapp.com",
    projectId: "shardfall-5f5de",
    storageBucket: "shardfall-5f5de.firebasestorage.app",
    messagingSenderId: "461435887743",
    appId: "1:461435887743:web:b35cba3931c1ccfbb9df4a",
  };
  const PLAYER_ID_KEY = "shardfall.playerId";
  const SAVE_KEY = "fatebound-save";
  const OLD_SAVE_KEY = "dice-skirmish-save";
  const COLLECTION = "fatebound_saves";

  window.Legionary = { ready: false, uid: null, playerId: null, lastError: null };

  function playerId() {
    let id = null;
    try { id = localStorage.getItem(PLAYER_ID_KEY); } catch (e) {}
    if (!id) {
      const abc = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
      const block = (n) =>
        Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => abc[b % abc.length]).join("");
      id = "SF-" + block(4) + "-" + block(4);
      try { localStorage.setItem(PLAYER_ID_KEY, id); } catch (e) {}
    }
    return id;
  }

  function localSaveRaw() {
    try {
      return localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY);
    } catch (e) {
      return null;
    }
  }

  async function boot() {
    const pid = playerId();
    window.Legionary.playerId = pid;
    const [{ initializeApp }, { getAuth, signInAnonymously }, { getFirestore, doc, getDoc, setDoc, serverTimestamp }] =
      await Promise.all([
        import(FIREBASE_SDK + "/firebase-app.js"),
        import(FIREBASE_SDK + "/firebase-auth.js"),
        import(FIREBASE_SDK + "/firebase-firestore.js"),
      ]);
    const app = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    const cred = await signInAnonymously(auth);
    const uid = cred.user.uid;
    const db = getFirestore(app);
    window.Legionary.uid = uid;
    window.Legionary.ready = true;

    const ref = doc(db, COLLECTION, uid);
    try {
      const snap = await getDoc(ref);
      const cloud = snap.exists() ? snap.data() : null;
      const raw = localSaveRaw();
      if (cloud && cloud.save && !raw) {
        localStorage.setItem(SAVE_KEY, typeof cloud.save === "string" ? cloud.save : JSON.stringify(cloud.save));
      }
    } catch (e) {
      window.Legionary.lastError = String(e && e.message ? e.message : e);
    }

    async function pushCloud() {
      const raw = localSaveRaw();
      if (!raw) return;
      try {
        await setDoc(
          ref,
          { playerId: pid, game: "fatebound", save: raw, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (e) {
        window.Legionary.lastError = String(e && e.message ? e.message : e);
      }
    }

    let t = null;
    const orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      orig(k, v);
      if (k === SAVE_KEY || k === OLD_SAVE_KEY) {
        clearTimeout(t);
        t = setTimeout(pushCloud, 1500);
      }
    };
    pushCloud();
  }

  boot().catch((e) => {
    window.Legionary.lastError = String(e && e.message ? e.message : e);
  });
})();
