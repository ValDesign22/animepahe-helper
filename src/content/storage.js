(() => {
  console.log(
    "%c[AnimePahe Helper] Initializing storage module...",
    "color:#D5015B",
  );

  const STORAGE_KEY = "animepahe_helper_data";
  const CURRENT_VERSION = 2;

  const DATA_URL =
    "https://raw.githubusercontent.com/ValDesign22/anidb-title-dump/refs/heads/master/anidb_titles.json";
  const CACHE_NAME = "anidb_title_dump";
  const CACHE_STORE = "dumps";
  const CACHE_KEY = "anidb";
  const CACHE_TTL = 24 * 60 * 60 * 1000;

  /**
   * @typedef {Object} Anime
   * @property {string} id
   * @property {number} anidb_id
   * @property {string} title
   * @property {string} cover
   * @property {string} first_episode
   */

  /**
   * @typedef {Object} HistoryEntry
   * @property {string} anime_id
   * @property {Array<HistoryEpisode>} episodes
   */

  /**
   * @typedef {Object} HistoryEpisode
   * @property {string} episode_number
   * @property {string} video_id
   * @property {number} watched_at
   * @property {number|null} player_time
   * @property {number|null} duration
   */

  /**
   * @typedef {Object} Data
   * @property {number} version
   * @property {{[anime_id: string]: Anime}} animes
   * @property {Array<HistoryEntry>} history
   * @property {Array<string>} watchlist
   */

  const defaultData = {
    version: CURRENT_VERSION,
    animes: {},
    history: [],
    watchlist: [],
  };

  let dataCache = null;
  let saveScheduled = false;

  /**
   * @returns {Data}
   */
  function loadData() {
    if (dataCache !== null) return dataCache;

    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      dataCache = structuredClone(defaultData);
      saveData(dataCache);
      return dataCache;
    }

    try {
      const data = JSON.parse(rawData);

      if (!data.version || data.version < CURRENT_VERSION) {
        console.log("%c[AnimePahe Helper] Migrating data...", "color:#D5015B");
        if (data.version === 1) migrateV1toV2(data);
        data.version = CURRENT_VERSION;
        console.log(
          "%c[AnimePahe Helper] Migration complete.",
          "color:#D5015B",
        );
        dataCache = data;
        saveData(data);
      }

      if (!data.animes) data.animes = {};
      if (!data.history) data.history = [];
      if (!data.watchlist) data.watchlist = [];

      dataCache = data;
      return data;
    } catch (err) {
      console.error("[AnimePahe Helper] Failed to load data:", err);
      dataCache = structuredClone(defaultData);
      saveData(dataCache);
      return dataCache;
    }
  }

  /**
   * @param {Data} data
   */
  function validateData(data) {
    if (typeof data !== "object" || data === null) return false;
    if (typeof data.version !== "number") return false;
    if (typeof data.animes !== "object" || data.animes === null) return false;
    if (!Array.isArray(data.history)) return false;
    if (!Array.isArray(data.watchlist)) return false;
    if (
      data.history.some(
        (h) =>
          typeof h !== "object" ||
          h === null ||
          typeof h.anime_id !== "string" ||
          !Array.isArray(h.episodes),
      )
    )
      return false;
    if (
      data.history.some((h) =>
        h.episodes.some(
          (e) =>
            typeof e !== "object" ||
            e === null ||
            typeof e.episode_number !== "string" ||
            typeof e.video_id !== "string" ||
            typeof e.watched_at !== "number" ||
            (e.player_time !== null && typeof e.player_time !== "number") ||
            (e.duration !== null && typeof e.duration !== "number"),
        ),
      )
    )
      return false;
    if (data.watchlist.some((id) => typeof id !== "string")) return false;
    return true;
  }

  function invalidateCache() {
    dataCache = null;
  }

  /**
   * @param {Data} data
   */
  function migrateV1toV2(data) {
    data.history = data.history.map((entry) => {
      if (entry.episode && entry.video_id && entry.watched_at) {
        return {
          anime_id: entry.anime_id,
          episodes: [
            {
              episode_number: entry.episode,
              video_id: entry.video_id,
              watched_at: entry.watched_at,
              player_time: entry.player_time || null,
              duration: entry.duration || null,
            },
          ],
        };
      } else {
        return {
          anime_id: entry.anime_id,
          episodes: [],
        };
      }
    });
  }

  /**
   * @param {Data} data
   * @param {boolean} immediate
   */
  function saveData(data, immediate = false) {
    dataCache = data;

    if (immediate) {
      saveScheduled = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return;
    }

    if (saveScheduled) return;

    saveScheduled = true;
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      saveScheduled = false;
    }, 100);
  }

  function getHistory() {
    const data = loadData();
    return data.history.map((historyEntry) => ({
      ...historyEntry,
      anime: data.animes[historyEntry.anime_id],
    }));
  }

  /**
   *
   * @param {string} anime_id
   * @param {string} episode_number
   */
  function getHistoryEpisode(anime_id, episode_number) {
    const data = loadData();
    const historyEntry = data.history.find(
      (entry) => entry.anime_id === anime_id,
    );
    if (!historyEntry) return null;
    return (
      historyEntry.episodes.find(
        (ep) => ep.episode_number === episode_number,
      ) || null
    );
  }

  /**
   * @param {string} anime_id
   * @param {string} episode
   * @param {string} video_id
   * @param {number|null} player_time
   * @param {number|null} duration
   */
  function updateHistory(
    anime_id,
    episode,
    video_id,
    player_time = null,
    duration = null,
  ) {
    const data = loadData();
    const now = Date.now();
    const episodeData = {
      episode_number: episode,
      video_id,
      watched_at: now,
      player_time,
      duration,
    };

    let existing = data.history.find((entry) => entry.anime_id === anime_id);

    if (!existing) {
      existing = {
        anime_id,
        episodes: [],
      };
      data.history.unshift(existing);
    }

    const epIndex = existing?.episodes.findIndex(
      (ep) => ep.episode_number === episode,
    );
    if (epIndex !== -1) {
      const oldEpisode = existing.episodes[epIndex];
      existing.episodes[epIndex] = {
        ...episodeData,
        player_time: player_time ?? oldEpisode.player_time,
        duration: duration ?? oldEpisode.duration,
      };
    } else {
      existing.episodes.push(episodeData);
    }

    const index = data.history.indexOf(existing);
    if (index > 0) {
      data.history.splice(index, 1);
      data.history.unshift(existing);
    }

    saveData(data);
  }

  /**
   * @param {string} anime_id
   */
  function getLastWatchedEpisode(anime_id) {
    const data = loadData();
    const historyEntry = data.history.find(
      (entry) => entry.anime_id === anime_id,
    );
    if (!historyEntry || historyEntry.episodes.length === 0) return null;
    return historyEntry.episodes.reduce(
      (latest, ep) =>
        !latest || ep.watched_at > latest.watched_at ? ep : latest,
      null,
    );
  }

  /**
   * @param {string} anime_id
   * @param {string | null} episode_number
   */
  function removeFromHistory(anime_id, episode_number = null) {
    const data = loadData();

    const newHistory = [];
    for (const entry of data.history) {
      if (entry.anime_id !== anime_id) newHistory.push(entry);
      else if (episode_number) {
        const episodes = entry.episodes.filter(
          (ep) => ep.episode_number !== episode_number,
        );
        if (episodes.length > 0) newHistory.push({ ...entry, episodes });
      }
    }
    data.history = newHistory;

    cleanUnusedAnimes(data);
    saveData(data);
  }

  function clearHistory() {
    const data = loadData();
    data.history = [];
    cleanUnusedAnimes(data);
    saveData(data);
  }

  function getWatchlist() {
    const data = loadData();
    return data.watchlist.map((anime_id) => ({
      anime: data.animes[anime_id],
    }));
  }

  /**
   * @param {string} anime_id
   */
  function toggleWatchlist(anime_id) {
    const data = loadData();
    const index = data.watchlist.indexOf(anime_id);
    if (index === -1) data.watchlist.push(anime_id);
    else data.watchlist.splice(index, 1);
    cleanUnusedAnimes(data);
    saveData(data);
  }

  /**
   * @param {string} anime_id
   */
  function isInWatchlist(anime_id) {
    const data = loadData();
    return data.watchlist.includes(anime_id);
  }

  function getAnimes() {
    const data = loadData();
    return data.animes;
  }

  /**
   * @param {string} anime_id
   * @returns {Anime | null}
   */
  function getAnime(anime_id) {
    const data = loadData();
    return data.animes[anime_id] || null;
  }

  /**
   * @param {string} anime_id
   * @param {string} name
   * @param {string} cover
   */
  async function registerAnime(anime_id, name, cover, first_episode = "1") {
    const data = loadData();
    const anidb_id = await getAniDBId(name);
    data.animes[anime_id] = {
      id: anime_id,
      anidb_id: anidb_id,
      title: name,
      cover: cover,
      first_episode: first_episode,
    };
    saveData(data);
    return data.animes[anime_id];
  }

  /**
   * @param {string} anime_id
   */
  function deleteAnime(anime_id) {
    const data = loadData();
    delete data.animes[anime_id];
    saveData(data);
  }

  /**
   * @param {Data} data
   */
  function cleanUnusedAnimes(data) {
    const usedIds = new Set([
      ...data.history.map((entry) => entry.anime_id),
      ...data.watchlist,
    ]);

    for (const anime_id in data.animes) {
      if (!usedIds.has(anime_id)) {
        delete data.animes[anime_id];
      }
    }
  }

  async function loadAnimeTitleDump() {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(CACHE_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(CACHE_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const cached = await new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readonly");
      const store = tx.objectStore(CACHE_STORE);
      const getReq = store.get(CACHE_KEY);
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(null);
    });

    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    let data;
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      data = await response.json();
    } catch (err) {
      console.error("[AnimePahe Helper] Failed to fetch title dump:", err);
      return cached?.data || {};
    }

    await new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      const putReq = store.put({ timestamp: now, data }, CACHE_KEY);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });

    return data;
  }

  /**
   * @param {string} anime_title
   * @param {string} language
   */
  async function getAniDBId(anime_title, language = "en") {
    const titleDump = await loadAnimeTitleDump();
    for (const entry of Object.values(titleDump)) {
      if (
        entry.titles.find(
          (t) => t.title === anime_title && t.language === language,
        )
      ) {
        console.log(
          `%c[AnimePahe Helper] Found AniDB ID ${entry.id} for title "${anime_title}"`,
          "color:#D5015B",
        );
        return entry.id;
      }
    }
    console.log(
      `%c[AnimePahe Helper] No AniDB ID found for title "${anime_title}"`,
      "color:#D5015B",
    );
    return null;
  }

  window.AnimePaheHelperStorage = {
    loadData,
    saveData,
    validateData,
    invalidateCache,
    getHistory,
    getHistoryEpisode,
    updateHistory,
    getLastWatchedEpisode,
    removeFromHistory,
    clearHistory,
    getWatchlist,
    toggleWatchlist,
    isInWatchlist,
    getAnimes,
    getAnime,
    registerAnime,
    deleteAnime,
    cleanUnusedAnimes,
    loadAnimeTitleDump,
    getAniDBId,
  };

  console.log(
    "%c[AnimePahe Helper] Storage module initialized.",
    "color:#D5015B",
  );
})();
