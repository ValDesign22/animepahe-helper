(() => {
  const {
    loadData,
    saveData,
    validateData,
    getHistory,
    updateHistory,
    getWatchlist,
    getAnime,
    registerAnime,
    invalidateCache,
  } = window.AnimePaheHelperStorage;
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
      // Optimize: Use querySelector instead of XPath
      const titleElement = document.querySelector(
        "section article > div header > div h1 span",
      );
      const coverElement = document.querySelector(
        "section article > div header > div > div > div > a > img",
      );
      const title = titleElement
        ? titleElement.textContent.trim()
        : "Unknown Title";
      const cover = coverElement ? coverElement.getAttribute("src") : "";
      anime = registerAnime(info.anime_id, title, cover);
    }
    createWatchlistButton(anime);

    // Optimize: Check for episode list with retry logic
    // Maximum 10 retries (1 second total) to avoid infinite polling
    let retryCount = 0;
    const maxRetries = 10;
    const checkEpisodeList = () => {
      const episodeList = document.querySelector(".episode-list");
      if (episodeList) {
        createWatchedMask(episodeList, info.anime_id);
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(checkEpisodeList, 100);
      }
    };

    // Start checking after a shorter initial delay
    if (document.readyState === "complete") {
      checkEpisodeList();
    } else {
      window.addEventListener("load", checkEpisodeList);
    }
  }

  function playHandler() {
    const info = parsePlayPath();
    if (info) {
      const { anime_id, video_id } = info;

      // Optimize: Use querySelector instead of XPath
      const titleElement = document.querySelector(
        "section article > div > div > div:nth-child(4) > a",
      );
      const anime_title = titleElement
        ? titleElement.getAttribute("title")
        : "Unknown Title";

      const coverElement = document.querySelector(
        "section article > div > div > div:nth-child(4) > a > img",
      );
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
      dropdownMenu.querySelector("#importData") ||
      document.createElement("input");
    importItem.id = "importData";
    importItem.setAttribute("type", "file");
    importItem.setAttribute("accept", "application/json");
    importItem.style.display = "none";
    importItem.textContent = "Import Data";
    importItem.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          if (!validateData(importedData)) {
            throw new Error("Invalid data format.");
          }
          invalidateCache();
          saveData(importedData, true);
          alert("Data imported successfully!");
          window.location.reload();
        } catch (err) {
          alert("Failed to import data: " + err.message);
        } finally {
          importItem.value = "";
        }
      };
      reader.readAsText(file);
    });
    dropdownMenu.appendChild(importItem);

    const importButton =
      document.querySelector("#importDataButton") ||
      document.createElement("button");
    importButton.className = "dropdown-item";
    importButton.id = "importDataButton";
    importButton.textContent = "Import Data";
    importButton.addEventListener("click", () => {
      const importItem = document.getElementById("importData");
      if (importItem) importItem.click();
    });
    dropdownMenu.appendChild(importButton);

    const exportItem =
      dropdownMenu.querySelector("#exportData") ||
      document.createElement("button");
    exportItem.className = "dropdown-item";
    exportItem.id = "exportData";
    exportItem.textContent = "Export Data";
    exportItem.addEventListener("click", () => {
      const data = loadData();
      const dataBlob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(dataBlob);
      const dlElement = document.createElement("a");
      dlElement.href = url;
      dlElement.download = "animepahe_helper_data.json";
      document.body.appendChild(dlElement);
      dlElement.click();
      document.body.removeChild(dlElement);
      URL.revokeObjectURL(url);
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
