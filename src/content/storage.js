(() => {
  console.log(
    "%c[AnimePahe Helper] Initializing storage module...",
    "color:#D5015B",
  );

  const STORAGE_KEY = "animepahe_helper_data";
  const CURRENT_VERSION = 1;

  /**
   * @typedef {Object} Anime
   * @property {string} id
   * @property {string} title
   * @property {string} cover
   */

  /**
   * @typedef {Object} HistoryEntry
   * @property {string} anime_id
   * @property {string} episode
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
        // Handle migrations here if needed in the future
        data.version = CURRENT_VERSION;
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

    if (existing) {
      existing.episode = episode;
      existing.video_id = video_id;
      existing.watched_at = now;
    } else {
      data.history.push({
        anime_id,
        episode,
        video_id,
        watched_at: now,
      });
    }

    data.history.sort((a, b) => b.watched_at - a.watched_at);
    saveData(data);
  }

  /**
   * @param {string} anime_id
   */
  function removeFromHistory(anime_id) {
    const data = loadData();
    data.history = data.history.filter((entry) => entry.anime_id !== anime_id);
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
    getHistory,
    updateHistory,
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
