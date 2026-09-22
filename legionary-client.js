/* Fatebound SSH save client */
(function () {
  const SERVER = (window.FATEBOUND_SERVER || "https://136-113-125-3.sslip.io/fatebound").replace(/\/$/, "");
  const PLAYER_ID_KEY = "fatebound.playerId";
  const SAVE_KEY = "fatebound-save";

  window.Fatebound = {
    ready: false,
    playerId: null,
    lastError: null,
    server: SERVER
  };

  function playerId() {
    let id = null;
    try { id = localStorage.getItem(PLAYER_ID_KEY); } catch (e) {}
    if (!id) {
      const abc = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      const block = (start) =>
        Array.from(bytes.slice(start, start + 4), (b) => abc[b % abc.length]).join("");
      id = "FB-" + block(0) + "-" + block(4);
      try { localStorage.setItem(PLAYER_ID_KEY, id); } catch (e) {}
    }
    return id;
  }

  function localSaveRaw() {
    try { return localStorage.getItem(SAVE_KEY); }
    catch (e) { return null; }
  }

  async function serverPull(pid) {
    const res = await fetch(SERVER + "/api/save?playerId=" + encodeURIComponent(pid), {
      cache: "no-store"
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("save GET " + res.status);
    const data = await res.json();
    return data && data.save ? data.save : null;
  }

  async function serverPush(pid, raw) {
    if (!raw) return false;
    const res = await fetch(SERVER + "/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: pid, save: raw })
    });
    if (!res.ok) throw new Error("save POST " + res.status);
    return true;
  }

  async function boot() {
    const pid = playerId();
    window.Fatebound.playerId = pid;

    try {
      const cloud = await serverPull(pid);
      const local = localSaveRaw();
      if (cloud && !local) {
        localStorage.setItem(SAVE_KEY, typeof cloud === "string" ? cloud : JSON.stringify(cloud));
        location.reload();
        return;
      }

      window.Fatebound.ready = true;

      let timer = null;
      const originalSetItem = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function (key, value) {
        originalSetItem(key, value);
        if (key === SAVE_KEY) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            serverPush(pid, localSaveRaw()).catch((e) => {
              window.Fatebound.lastError = String(e && e.message ? e.message : e);
            });
          }, 1200);
        }
      };

      const raw = localSaveRaw();
      if (raw) await serverPush(pid, raw);
    } catch (e) {
      window.Fatebound.lastError = String(e && e.message ? e.message : e);
    }
  }

  boot().catch((e) => {
    window.Fatebound.lastError = String(e && e.message ? e.message : e);
  });
})();