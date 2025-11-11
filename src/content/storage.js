(() => {
  console.log(
    "%c[AnimePahe Helper] Initializing storage module...",
    "color:#D5015B",
  );

  const STORAGE_KEY = "animepahe_helper_data";
  const CURRENT_VERSION = 2;

  const SYNC_PREFIX = "animepahe_sync_";
  const MAX_ITEM_BYTES = 8192;

  const TITLES_DATA_URL =
    "https://raw.githubusercontent.com/ValDesign22/anidb-title-dump/refs/heads/master/anidb_titles.json";
  const TITLES_CACHE_NAME = "anidb_title_dump";
  const TITLES_CACHE_STORE = "dumps";
  const TITLES_CACHE_KEY = "anidb";

  const TIMESTAMPS_DATA_URL =
    "https://raw.githubusercontent.com/Ellivers/open-anime-timestamps/refs/heads/master/timestamps.json";
  const TIMESTAMPS_CACHE_NAME = "anime_timestamps_cache";
  const TIMESTAMPS_CACHE_STORE = "timestamps";
  const TIMESTAMPS_CACHE_KEY = "timestamps";

  const CACHE_TTL = 24 * 60 * 60 * 1000;

  /**
   * @typedef {Object} Anime
   * @property {string} id
   * @property {number} anidb_id
   * @property {string} title
   * @property {string} cover
   * @property {number} first_episode
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
   * @property {number} updated_at
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
    dataCache = {
      ...data,
      updated_at: Date.now(),
    };

    if (immediate) {
      saveScheduled = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataCache));
      return;
    }

    if (saveScheduled) return;

    saveScheduled = true;
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataCache));
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
  async function registerAnime(anime_id, name, cover) {
    const data = loadData();
    const existing = data.animes[anime_id];
    data.animes[anime_id] = {
      id: anime_id,
      anidb_id: existing?.anidb_id || (await getAniDBId(name)),
      title: name,
      cover: cover,
      first_episode:
        existing?.first_episode || (await getFirstEpisode(anime_id)),
    };
    saveData(data);
    return data.animes[anime_id];
  }

  async function getFirstEpisode(anime_id) {
    const response = await fetch(
      `/api?m=release&sort=episode_asc&id=${anime_id}`,
    );
    const data = await response.json();
    if (data && data.data && data.data.length > 0) {
      return data.data[0].episode;
    }
    return 1;
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

  async function loadDatabase(
    data_url,
    cache_name,
    cache_store,
    cache_key,
    ttl = CACHE_TTL,
  ) {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(cache_name, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(cache_store)) {
          db.createObjectStore(cache_store);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      req.onerror = () => reject(req.error);
    });

    const cached = await new Promise((resolve, reject) => {
      const tx = db.transaction(cache_store, "readonly");
      const store = tx.objectStore(cache_store);
      const getReq = store.get(cache_key);
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(null);
    });

    const now = Date.now();
    if (cached && now - cached.timestamp < ttl) {
      return structuredClone(cached.data);
    }

    let data;
    try {
      const response = await fetch(data_url);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      data = await response.json();
    } catch (err) {
      console.error(
        `[AnimePahe Helper] Failed to fetch data from ${data_url}:`,
        err,
      );
      return cached?.data || {};
    }

    await new Promise((resolve, reject) => {
      const tx = db.transaction(cache_store, "readwrite");
      const store = tx.objectStore(cache_store);
      const putReq = store.put({ timestamp: now, data }, cache_key);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });

    return data;
  }

  async function loadAnimeTitleDump() {
    return await loadDatabase(
      TITLES_DATA_URL,
      TITLES_CACHE_NAME,
      TITLES_CACHE_STORE,
      TITLES_CACHE_KEY,
    );
  }

  async function loadTimestamps() {
    return await loadDatabase(
      TIMESTAMPS_DATA_URL,
      TIMESTAMPS_CACHE_NAME,
      TIMESTAMPS_CACHE_STORE,
      TIMESTAMPS_CACHE_KEY,
    );
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

  async function getEpisodeTimestamps(anidb_id, episode_number) {
    const timestamps = await loadTimestamps();
    return (
      timestamps[anidb_id]?.find(
        (ep) => ep.episode_number === episode_number,
      ) || null
    );
  }

  function chunkData(obj) {
    const jsonString = JSON.stringify(obj);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(jsonString);

    const chunks = [];
    let offset = 0;
    const safeMaxBytes = MAX_ITEM_BYTES - 1024;
    while (offset < encoded.length) {
      const chunk = encoded.slice(offset, offset + safeMaxBytes);
      const chunkString = new TextDecoder().decode(chunk);
      chunks.push(chunkString);
      offset += safeMaxBytes;
    }
    return chunks;
  }

  async function syncData(data) {
    try {
      const keys = await browser.storage.sync.getKeys();
      const toRemove = Object.keys(keys).filter((key) =>
        key.startsWith(SYNC_PREFIX),
      );
      if (toRemove.length > 0) {
        await browser.storage.sync.remove(toRemove);
      }

      const chunks = chunkData(data);
      const storeObj = {};
      chunks.forEach((chunk, index) => {
        storeObj[`${SYNC_PREFIX}${index}`] = chunk;
      });
      await browser.storage.sync.set(storeObj);
    } catch (err) {
      console.error(
        "%c[AnimePahe Helper] Failed to sync data:",
        "color:#D5015B",
        err,
      );
    }
  }

  async function loadSyncData() {
    try {
      const keys = await browser.storage.sync.getKeys();
      const chunkKeys = keys
        .filter((key) => key.startsWith(SYNC_PREFIX))
        .sort((a, b) => {
          const indexA = parseInt(a.slice(SYNC_PREFIX.length), 10);
          const indexB = parseInt(b.slice(SYNC_PREFIX.length), 10);
          return indexA - indexB;
        });

      if (chunkKeys.length === 0) return null;

      const storedChunks = await browser.storage.sync.get(chunkKeys);
      let combinedJson = "";
      for (const key of chunkKeys) {
        combinedJson += storedChunks[key];
      }

      return JSON.parse(combinedJson);
    } catch (err) {
      console.error(
        "%c[AnimePahe Helper] Failed to load sync data:",
        "color:#D5015B",
        err,
      );
      return null;
    }
  }

  async function startSync() {
    console.log(
      "%c[AnimePahe Helper] Starting data synchronization...",
      "color:#D5015B",
    );

    const localData = loadData();
    const remoteData = await loadSyncData();

    if (!remoteData) {
      console.log(
        "%c[AnimePahe Helper] No remote sync data found. Uploading local data...",
        "color:#D5015B",
      );
      await syncData(localData);
      console.log(
        "%c[AnimePahe Helper] Data synchronization complete.",
        "color:#D5015B",
      );
      return;
    }

    const localUpdatedAt = localData.updated_at || 0;
    const remoteUpdatedAt = remoteData.updated_at || 0;

    if (remoteUpdatedAt > localUpdatedAt) {
      console.log(
        "%c[AnimePahe Helper] Remote data is newer. Merging into local data...",
        "color:#D5015B",
      );
      saveData(remoteData, true);
    } else {
      console.log(
        "%c[AnimePahe Helper] Local data is newer. Uploading to remote storage...",
        "color:#D5015B",
      );
      await syncData(localData);
    }

    console.log(
      "%c[AnimePahe Helper] Data synchronization complete.",
      "color:#D5015B",
    );
  }

  window.AnimePaheHelperStorage = {
    loadData,
    saveData,
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
    getEpisodeTimestamps,
    startSync,
  };

  console.log(
    "%c[AnimePahe Helper] Storage module initialized.",
    "color:#D5015B",
  );
})();
