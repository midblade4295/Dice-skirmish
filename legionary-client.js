/* Fatebound → SSH Legionary host first, Firebase fallback */
(function () {
  const SERVER = (window.LEGIONARY_SERVER || "").replace(/\/$/, "");
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

  window.Legionary = { ready: false, uid: null, playerId: null, lastError: null, server: SERVER || null };

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

  async function serverPull(pid) {
    if (!SERVER) return null;
    const res = await fetch(SERVER + "/api/save?playerId=" + encodeURIComponent(pid), { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("server GET " + res.status);
    const j = await res.json();
    return j && j.save ? j.save : null;
  }

  async function serverPush(pid, raw) {
    if (!SERVER || !raw) return false;
    const res = await fetch(SERVER + "/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: pid, save: raw }),
    });
    if (!res.ok) throw new Error("server POST " + res.status);
    return true;
  }

  async function firebaseBoot(pid) {
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
    const ref = doc(db, COLLECTION, uid);
    const snap = await getDoc(ref);
    const cloud = snap.exists() ? snap.data() : null;
    return {
      pull: async () => (cloud && cloud.save ? cloud.save : null),
      push: async (raw) => {
        if (!raw) return;
        await setDoc(ref, { playerId: pid, game: "fatebound", save: raw, updatedAt: serverTimestamp() }, { merge: true });
      },
    };
  }

  async function boot() {
    const pid = playerId();
    window.Legionary.playerId = pid;
    let pull = async () => null;
    let push = async () => {};
    if (SERVER) {
      try {
        pull = () => serverPull(pid);
        push = (raw) => serverPush(pid, raw);
        window.Legionary.ready = true;
      } catch (e) {
        window.Legionary.lastError = String(e && e.message ? e.message : e);
      }
    } else {
      try {
        const fb = await firebaseBoot(pid);
        pull = fb.pull;
        push = fb.push;
        window.Legionary.ready = true;
      } catch (e) {
        window.Legionary.lastError = String(e && e.message ? e.message : e);
      }
    }
    try {
      const cloud = await pull();
      const raw = localSaveRaw();
      if (cloud && !raw) {
        localStorage.setItem(SAVE_KEY, typeof cloud === "string" ? cloud : JSON.stringify(cloud));
      }
    } catch (e) {
      window.Legionary.lastError = String(e && e.message ? e.message : e);
    }
    async function pushCloud() {
      try { await push(localSaveRaw()); } catch (e) {
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
