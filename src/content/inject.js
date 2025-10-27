(() => {
  const { getHistory, updateHistory, getWatchlist, getAnime, registerAnime } =
    window.AnimePaheHelperStorage;
  const {
    parsePlayPath,
    parseAnimePath,
    renderGrid,
    createWatchlistButton,
    createWatchedMask,
  } = window.AnimePaheHelperUtils;

  function homeHandler() {
    const watchlist = getWatchlist();
    const history = getHistory();

    const searchParams = new URLSearchParams(window.location.search);
    const currentWatchlistPage =
      parseInt(searchParams.get("watchlist-page")) || 1;
    const currentHistoryPage = parseInt(searchParams.get("history-page")) || 1;

    renderGrid(watchlist, "Watchlist", "watchlist", currentWatchlistPage);
    renderGrid(history, "Recently Watched", "history", currentHistoryPage);

    console.log(
      "%c[AnimePaheHelper] Injected home page grids.",
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

    setTimeout(() => {
      const episodeList = document.querySelector(".episode-list");
      if (episodeList) createWatchedMask(episodeList, info.anime_id);
    }, 1000);
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

  function navBar() {
    const navbar = document.getElementById("navbarNavDropdown");
    if (!navbar) return;

    // TODO: function to import/export watchlist and history
    const userDropdown =
      navbar.querySelector("#animePaheHelperDropdown") ||
      document.createElement("div");
    userDropdown.id = "animePaheHelperDropdown";
    userDropdown.className = "dropdown";

    const profileBtn =
      userDropdown.querySelector("button") || document.createElement("button");
    profileBtn.className = "btn btn-secondary dropdown-toggle";
    profileBtn.type = "button";
    profileBtn.id = "userDropdownMenuButton";
    profileBtn.setAttribute("data-toggle", "dropdown");
    profileBtn.setAttribute("aria-has-popup", "true");
    profileBtn.setAttribute("aria-expanded", "false");
    profileBtn.textContent = "AnimePaheHelper";
    userDropdown.appendChild(profileBtn);

    const dropdownMenu =
      userDropdown.querySelector(".dropdown-menu") ||
      document.createElement("div");
    dropdownMenu.className = "dropdown-menu dropdown-menu-right";
    dropdownMenu.setAttribute("aria-labelledby", "userDropdownMenuButton");

    const importItem =
      dropdownMenu.querySelector("#importData") || document.createElement("a");
    importItem.className = "dropdown-item";
    importItem.id = "importData";
    importItem.href = "#";
    importItem.textContent = "Import Data";
    importItem.addEventListener("click", () => {
      const data = prompt("Paste your exported data here:");
      if (data) {
        try {
          window.AnimePaheHelperStorage.importData(data);
          alert("Data imported successfully!");
        } catch (e) {
          alert("Failed to import data. Please check the format.");
        }
      }
    });
    dropdownMenu.appendChild(importItem);

    const exportItem =
      dropdownMenu.querySelector("#exportData") || document.createElement("a");
    exportItem.className = "dropdown-item";
    exportItem.id = "exportData";
    exportItem.href = "#";
    exportItem.textContent = "Export Data";
    exportItem.addEventListener("click", () => {
      const data = window.AnimePaheHelperStorage.exportData();
      prompt("Copy your exported data:", data);
    });
    dropdownMenu.appendChild(exportItem);

    userDropdown.appendChild(dropdownMenu);

    navbar.appendChild(userDropdown);
  }

  function handle() {
    navBar();
    const path = window.location.pathname;
    if (path === "/") return homeHandler();
    if (path.startsWith("/anime/")) return animeHandler();
    if (path.startsWith("/play/")) return playHandler();
  }

  if (document.readyState !== "loading") handle();
  else document.addEventListener("DOMContentLoaded", handle);
})();
