(() => {
  console.log(
    "%c[AnimePahe Helper] Initializing utils module...",
    "color:#D5015B",
  );

  function parsePlayPath(path = window.location.pathname) {
    const match = path.match(/^\/play\/([\w-]+)\/([\w-]+)/);
    if (!match) return null;
    return {
      anime_id: match[1],
      video_id: match[2],
    };
  }

  function createHistoryElement(history) {
    const existingHistorySection = document.querySelector(".history-section");
    if (existingHistorySection) {
      existingHistorySection.remove();
    }

    if (history.length === 0) {
      return (document.createElement("div").className =
        "history-section empty");
    }

    const historyDiv = document.createElement("div");
    historyDiv.className = "history-section";

    const title = document.createElement("h2");
    title.textContent = "Recently Watched";

    const historyListWrapper = document.createElement("div");
    historyListWrapper.className = "history-list-wrapper";

    const historyList = document.createElement("div");
    historyList.className = "history-list row";

    history.forEach((entry) => {
      if (entry.anime) {
        const historyAnimeWrap = document.createElement("div");
        historyAnimeWrap.className = "history-anime-wrap col-12 col-sm-4";
        historyList.setAttribute("data-id", entry.anime.id);

        const historyAnime = document.createElement("div");
        historyAnime.className = "history-anime";

        const animeSnapshot = document.createElement("div");
        animeSnapshot.className = "anime-snapshot";

        const cover = document.createElement("img");
        cover.className = "ls-is-cached lazyloaded";
        cover.src = entry.anime.cover;
        cover.setAttribute("data-src", entry.anime.cover);
        cover.alt = entry.anime.title;

        const playButton = document.createElement("svg");
        playButton.className = "play-button";
        playButton.setAttribute("viewBox", "0 0 150 150");
        playButton.setAttribute("alt", "Play Video");

        const playIcon = document.createElement("polygon");
        playIcon.setAttribute("points", "20, 20, 20, 140, 120, 80");
        playIcon.setAttribute("fill", "#fff");
        playButton.appendChild(playIcon);

        const playLink = document.createElement("a");
        playLink.className = "play";
        playLink.href = `/play/${entry.anime.id}/${entry.video_id}`;

        animeSnapshot.appendChild(cover);
        animeSnapshot.appendChild(playButton);
        animeSnapshot.appendChild(playLink);

        const animeLabelWrap = document.createElement("div");
        animeLabelWrap.className = "anime-label-wrap";

        const animeLabel = document.createElement("div");
        animeLabel.className = "anime-label";

        const animeNameWrap = document.createElement("div");
        animeNameWrap.className = "anime-name-wrap";

        const animeName = document.createElement("span");
        animeName.className = "anime-name";

        const animeLink = document.createElement("a");
        animeLink.href = `/anime/${entry.anime.id}`;
        animeLink.title = entry.anime.title;
        animeLink.textContent = entry.anime.title;

        animeName.appendChild(animeLink);
        animeNameWrap.appendChild(animeName);
        animeLabel.appendChild(animeNameWrap);
        animeLabelWrap.appendChild(animeLabel);

        historyAnime.appendChild(animeSnapshot);
        historyAnime.appendChild(animeLabelWrap);

        historyAnimeWrap.appendChild(historyAnime);
        historyList.appendChild(historyAnimeWrap);
      }
    });

    historyListWrapper.appendChild(historyList);

    historyDiv.appendChild(title);
    historyDiv.appendChild(historyListWrapper);

    return historyDiv;
  }

  window.AnimePaheHelperUtils = {
    parsePlayPath,
    createHistoryElement,
  };

  console.log(
    "%c[AnimePahe Helper] Utils module initialized.",
    "color:#D5015B",
  );
})();
