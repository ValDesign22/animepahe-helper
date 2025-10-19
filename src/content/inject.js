(() => {
  const { getHistory, updateHistory, registerAnime } =
    window.AnimePaheHelperStorage;
  const { parsePlayPath, createHistoryElement } = window.AnimePaheHelperUtils;

  if (window.location.pathname === "/") {
    const history = getHistory();
    console.log("%c[AnimePaheHelper] User history:", "color:#D5015B", history);

    const contentWrapper = document.evaluate(
      "/html/body/section/article/div",
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;

    if (contentWrapper) {
      const historyElement = createHistoryElement(history);
      contentWrapper.insertBefore(historyElement, contentWrapper.firstChild);
    }

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
        registerAnime(anime_id, anime_title, anime_cover);
        updateHistory(anime_id, episodeMenu.textContent.trim(), video_id);

        console.log(
          `%c[AnimePaheHelper] Updated history for ${anime_title} - Episode ${episodeMenu.textContent.trim()}`,
          "color:#D5015B",
        );
      }
    }
    return;
  }
})();
