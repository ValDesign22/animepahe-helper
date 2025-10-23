(() => {
  const { getHistory, updateHistory, getWatchlist, getAnime, registerAnime } =
    window.AnimePaheHelperStorage;
  const { parsePlayPath, parseAnimePath, renderGrid, createWatchlistButton } =
    window.AnimePaheHelperUtils;

  function homeHandler() {
    const watchlist = getWatchlist();
    console.log(watchlist);
    const history = getHistory();

    const searchParams = new URLSearchParams(window.location.search);
    const currentWatchlistPage =
      parseInt(searchParams.get("watchlist-page")) || 1;
    const currentHistoryPage = parseInt(searchParams.get("history-page")) || 1;

    renderGrid(watchlist, "Watchlist", "watchlist", currentWatchlistPage);
    renderGrid(history, "Recently Watched", "history", currentHistoryPage);

    console.log(
      "%c[AnimePaheHelper] Injected history section on homepage.",
      "color:#D5015B",
    );
  }

  function animeHandler() {
    const info = parseAnimePath();
    if (!info) return;

    let anime = getAnime(info.anime_id);
    if (!anime) {
      const titleElement = document.evaluate(
        "/html/body/section/article/div[1]/header/div/h1/span",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue;
      const coverElement = document.evaluate(
        "/html/body/section/article/div[1]/header/div/div/div/a/img",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue;
      const title = titleElement
        ? titleElement.textContent.trim()
        : "Unknown Title";
      const cover = coverElement ? coverElement.getAttribute("src") : "";
      anime = registerAnime(info.anime_id, title, cover);
    }
    createWatchlistButton(anime);
  }

  function playHandler() {
    const info = parsePlayPath();
    if (info) {
      const { anime_id, video_id } = info;

      const titleElement = document.evaluate(
        "/html/body/section/article/div/div/div[4]/a",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue;
      const anime_title = titleElement
        ? titleElement.getAttribute("title")
        : "Unknown Title";

      const coverElement = document.evaluate(
        "/html/body/section/article/div/div/div[4]/a/img",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue;
      let anime_cover = coverElement ? coverElement.getAttribute("src") : "";
      if (anime_cover.endsWith(".th.jpg")) {
        anime_cover = anime_cover.replace(".th.jpg", ".jpg");
      }

      const episodeMenu = document.getElementById("episodeMenu");
      if (episodeMenu) {
        const episodeNumber = episodeMenu.textContent
          .trim()
          .replace("Episode ", "")
          .trim();
        registerAnime(anime_id, anime_title, anime_cover);
        updateHistory(anime_id, episodeNumber, video_id);

        console.log(
          `%c[AnimePaheHelper] Updated history for ${anime_title} - Episode ${episodeNumber}`,
          "color:#D5015B",
        );
      }
    }
  }

  function handle() {
    const path = window.location.pathname;
    if (path === "/") return homeHandler();
    if (path.startsWith("/anime/")) return animeHandler();
    if (path.startsWith("/play/")) return playHandler();
  }

  if (document.readyState !== "loading") handle();
  else document.addEventListener("DOMContentLoaded", handle);
})();
