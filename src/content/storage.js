(() => {
  console.log(
    "%c[AnimePahe Helper] Initializing storage module...",
    "color:#D5015B",
  );

  const STORAGE_KEY = "animepahe_helper_data";
  const CURRENT_VERSION = 1;

  /*
    data: {
      version: number,
      animes: { [anime_id: string]: Anime },
      history: Array<HistoryEntry>,
      lists: Array<AnimeList>,
    }

    Anime: {
      id: string,
      title: string,
      cover: string,
    }

    HistoryEntry: {
      anime_id: string,
      episode: number,
      video_id: string,
      watched_at: number,
    }

    AnimeList: {
      name: string,
      anime_ids: Array<string>,
    }
  */
  const defaultData = {
    version: CURRENT_VERSION,
    animes: {},
    history: [],
    lists: [],
  };

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
      if (!data.lists) data.lists = [];

      return data;
    } catch (err) {
      console.error("[AnimePahe Helper] Failed to load data:", err);
      saveData(defaultData);
      return structuredClone(defaultData);
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getHistory() {
    const data = loadData();
    return data.history.map((historyEntry) => ({
      ...historyEntry,
      anime: data.animes[historyEntry.anime_id] || null,
    }));
  }

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

  function registerAnime(anime_id, name, cover) {
    const data = loadData();
    if (!data.animes[anime_id]) {
      data.animes[anime_id] = {
        id: anime_id,
        title: name,
        cover: cover,
      };
      saveData(data);
    }
    return data.animes[anime_id];
  }

  window.AnimePaheHelperStorage = {
    loadData,
    saveData,
    getHistory,
    updateHistory,
    registerAnime,
  };

  console.log(
    "%c[AnimePahe Helper] Storage module initialized.",
    "color:#D5015B",
  );
})();
