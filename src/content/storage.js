(() => {
  console.log(
    "%c[AnimePahe Helper] Initializing storage module...",
    "color:#D5015B",
  );

  const STORAGE_KEY = "animepahe_helper_data";
  const CURRENT_VERSION = 2;

  /**
   * @typedef {Object} Anime
   * @property {string} id
   * @property {string} title
   * @property {string} cover
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

  /**
   * @returns {Data}
   */
  function loadData() {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      saveData(defaultData);
      return structuredClone(defaultData);
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
        saveData(data);
      }

      if (!data.animes) data.animes = {};
      if (!data.history) data.history = [];
      if (!data.watchlist) data.watchlist = [];

      return data;
    } catch (err) {
      console.error("[AnimePahe Helper] Failed to load data:", err);
      saveData(defaultData);
      return structuredClone(defaultData);
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
            typeof e.watched_at !== "number",
        ),
      )
    )
      return false;
    if (data.watchlist.some((id) => typeof id !== "string")) return false;
    return true;
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
   */
  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getHistory() {
    const data = loadData();
    return data.history.map((historyEntry) => ({
      ...historyEntry,
      anime: data.animes[historyEntry.anime_id],
    }));
  }

  /**
   * @param {string} anime_id
   * @param {string} episode
   * @param {string} video_id
   */
  function updateHistory(anime_id, episode, video_id) {
    const data = loadData();
    const now = Date.now();
    const existing = data.history.find((entry) => entry.anime_id === anime_id);

    const episodeData = {
      episode_number: episode,
      video_id,
      watched_at: now,
    };

    if (existing) {
      const epIndex = existing.episodes.findIndex(
        (ep) => ep.episode_number === episode,
      );
      if (epIndex !== -1) existing.episodes[epIndex] = episodeData;
      else existing.episodes.push(episodeData);
    } else {
      data.history.push({
        anime_id,
        episodes: [episodeData],
      });
    }

    data.history.sort((a, b) => {
      const aLast = a.episodes.reduce(
        (max, ep) => (ep.watched_at > max ? ep.watched_at : max),
        0,
      );
      const bLast = b.episodes.reduce(
        (max, ep) => (ep.watched_at > max ? ep.watched_at : max),
        0,
      );
      return bLast - aLast;
    });
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
    data.history = data.history
      .map((entry) => {
        if (entry.anime_id !== anime_id) return entry;
        if (!episode_number) return null;
        const episodes = entry.episodes.filter(
          (ep) => ep.episode_number !== episode_number,
        );
        return episodes.length ? { ...entry, episodes } : null;
      })
      .filter((entry) => entry !== null);

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
   * @returns {Anime}
   */
  function registerAnime(anime_id, name, cover) {
    const data = loadData();
    data.animes[anime_id] = {
      id: anime_id,
      title: name,
      cover: cover,
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

  window.AnimePaheHelperStorage = {
    loadData,
    saveData,
    validateData,
    getHistory,
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
  };

  console.log(
    "%c[AnimePahe Helper] Storage module initialized.",
    "color:#D5015B",
  );
})();
