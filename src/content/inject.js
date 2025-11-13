(async () => {
  const {
    loadData,
    saveData,
    invalidateCache,
    getHistory,
    updateHistory,
    getWatchlist,
    getAnime,
    registerAnime,
    syncData,
    loadSyncData,
  } = window.AnimePaheHelperStorage;
  const {
    parsePlayPath,
    parseAnimePath,
    renderGrid,
    createWatchlistButton,
    createWatchedMask,
  } = window.AnimePaheHelperUtils;
  const { enhancePlayer } = window.AnimePaheHelperPlayer;

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

  async function animeHandler() {
    const info = parseAnimePath();
    if (!info) return;

    let retryCount = 0;
    const maxRetries = 10;
    const checkLoaded = async () => {
      const episodeList = document.querySelector(".episode-list");
      if (episodeList && episodeList.children.length > 0) {
        let anime = getAnime(info.anime_id);
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
        anime = await registerAnime(info.anime_id, title, cover);
        createWatchlistButton(anime);

        createWatchedMask(episodeList, info.anime_id);
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(checkLoaded, 100);
      }
    };

    if (document.readyState !== "loading") await checkLoaded();
    else window.addEventListener("DOMContentLoaded", checkLoaded);
  }

  async function playHandler() {
    const info = parsePlayPath();
    if (info) {
      const { anime_id, video_id } = info;

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
        const anime = await registerAnime(anime_id, anime_title, anime_cover);
        updateHistory(anime_id, episodeNumber, video_id);

        console.log(
          `%c[AnimePaheHelper] Updated history for ${anime_title} - Episode ${episodeNumber}`,
          "color:#D5015B",
        );

        await enhancePlayer(anime, episodeNumber, video_id);
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
    profileBtn.className = "dropdown-toggle";
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

    const loadSyncItem =
      dropdownMenu.querySelector("#loadSyncData") ||
      document.createElement("button");
    loadSyncItem.className = "dropdown-item";
    loadSyncItem.id = "loadSyncData";
    loadSyncItem.textContent = "Load Sync Data (Cloud)";
    loadSyncItem.addEventListener("click", async () => {
      const syncDataContent = await loadSyncData();
      if (syncDataContent) {
        invalidateCache();
        saveData(syncDataContent, true);
        alert("Sync data loaded successfully!");
        window.location.reload();
      } else {
        alert("No sync data found in the cloud.");
      }
    });
    dropdownMenu.appendChild(loadSyncItem);

    const syncItem =
      dropdownMenu.querySelector("#syncData") ||
      document.createElement("button");
    syncItem.className = "dropdown-item";
    syncItem.id = "syncData";
    syncItem.textContent = "Sync Data (Cloud)";
    syncItem.addEventListener("click", async () => {
      const data = loadData();
      await syncData(data);
      alert("Data synced to the cloud successfully!");
    });
    dropdownMenu.appendChild(syncItem);

    userDropdown.appendChild(dropdownMenu);

    navbar.prepend(userDropdown);
  }

  async function handle() {
    navBar();
    const path = window.location.pathname;
    if (path === "/") return homeHandler();
    if (path.startsWith("/anime/")) return await animeHandler();
    if (path.startsWith("/play/")) return await playHandler();
  }

  if (document.readyState !== "loading") await handle();
  else document.addEventListener("DOMContentLoaded", handle);
})();
