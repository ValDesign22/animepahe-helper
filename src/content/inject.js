(() => {
  const { getHistory, updateHistory, registerAnime } =
    window.AnimePaheHelperStorage;
  const { parsePlayPath, renderHistory } = window.AnimePaheHelperUtils;

  if (window.location.pathname === "/") {
    const history = getHistory();

    const searchParams = new URLSearchParams(window.location.search);
    const currentPage = parseInt(searchParams.get("history-page")) || 1;

    renderHistory(history, currentPage);

    console.log(
      "%c[AnimePaheHelper] Injected history section on homepage.",
      "color:#D5015B",
    );
    return;
  }

  if (window.location.pathname.startsWith("/play/")) {
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
    return;
  }
})();
