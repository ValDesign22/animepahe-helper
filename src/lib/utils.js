(() => {
  console.log(
    "%c[AnimePahe Helper] Initializing utils module...",
    "color:#D5015B",
  );

  const {
    getHistory,
    getLastWatchedEpisode,
    removeFromHistory,
    getWatchlist,
    toggleWatchlist,
    isInWatchlist,
  } = window.AnimePaheHelperStorage;

  function parsePlayPath(path = window.location.pathname) {
    const match = path.match(/^\/play\/([\w-]+)\/([\w-]+)/);
    if (!match) return null;
    return {
      anime_id: match[1],
      video_id: match[2],
    };
  }

  function parseAnimePath(path = window.location.pathname) {
    const match = path.match(/^\/anime\/([\w-]+)/);
    if (!match) return null;
    return {
      anime_id: match[1],
    };
  }

  const ITEMS_PER_PAGE = 6;

  function renderGrid(list, titleText, type, page = 1) {
    const TOTAL_PAGES = Math.ceil(list.length / ITEMS_PER_PAGE) || 1;
    if (page < 1) page = 1;
    if (page > TOTAL_PAGES) page = TOTAL_PAGES;

    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = page * ITEMS_PER_PAGE;
    const listSlice = list.slice(start, end);

    const newSection = createListElement(listSlice, titleText, type, page);

    const navigation = createNavigation(TOTAL_PAGES, page, type, (newPage) => {
      const url = new URL(window.location);
      url.searchParams.set(`${type}-page`, newPage);
      window.history.pushState({ page: newPage }, "", url.toString());
      renderGrid(list, titleText, type, newPage);
    });

    if (!newSection.classList.contains("empty")) {
      newSection.appendChild(navigation);
    }

    const existingSection = document.getElementById(`animepahe-${type}`);
    if (existingSection) existingSection.replaceWith(newSection);
    else {
      const contentWrapper = document.querySelector("section article > div");
      if (contentWrapper) {
        contentWrapper.insertBefore(newSection, contentWrapper.firstChild);
      }
    }
  }

  function createNavigation(TOTAL_PAGES, currentPage, type, onPageClick) {
    const navigation = document.createElement("nav");
    navigation.ariaLabel = "History Navigation";

    const navigationUl = document.createElement("ul");
    navigationUl.className = "pagination justify-content-center";

    function createNavItem(label, page, disabled, srLabel) {
      const li = document.createElement("li");
      li.className = `page-item${disabled ? " disabled" : ""}`;

      const link = document.createElement("a");
      link.className = "page-link";
      link.setAttribute(`data-${type}-page`, `${page}`);
      link.title = srLabel || `Go to page ${page}`;

      const srSpan = document.createElement("span");
      srSpan.className = "sr-only";
      srSpan.textContent = srLabel;
      const iconSpan = document.createElement("span");
      iconSpan.ariaHidden = "true";
      iconSpan.textContent = label;

      if (srLabel) link.appendChild(srSpan);
      link.appendChild(iconSpan);

      if (!disabled) {
        li.addEventListener("click", (e) => {
          e.preventDefault();
          onPageClick(page);
        });
      }

      li.appendChild(link);
      return li;
    }

    navigationUl.appendChild(createNavItem("«", 1, currentPage === 1, "First"));
    navigationUl.appendChild(
      createNavItem("‹", currentPage - 1, currentPage === 1, "Previous"),
    );

    const activeLi = document.createElement("li");
    activeLi.className = "page-item active";
    const activeSpan = document.createElement("span");
    activeSpan.className = "page-link";
    activeSpan.setAttribute("data-history-page", `${currentPage}`);
    activeSpan.title = `Page ${currentPage} of ${TOTAL_PAGES}`;
    activeSpan.textContent = `${currentPage}`;
    const activeSpanCurr = document.createElement("span");
    activeSpanCurr.className = "sr-only";
    activeSpanCurr.textContent = "(current)";
    activeSpan.appendChild(activeSpanCurr);
    activeLi.appendChild(activeSpan);

    navigationUl.appendChild(activeLi);

    navigationUl.appendChild(
      createNavItem("›", currentPage + 1, currentPage === TOTAL_PAGES, "Next"),
    );
    navigationUl.appendChild(
      createNavItem("»", TOTAL_PAGES, currentPage === TOTAL_PAGES, "Last"),
    );

    navigation.appendChild(navigationUl);
    return navigation;
  }

  function createListElement(listSlice, titleText, type, page) {
    if (listSlice.length === 0) {
      const empty = document.createElement("div");
      empty.id = `animepahe-${type}`;
      empty.className = "animepahe-section empty";
      return empty;
    }

    const listDiv = document.createElement("div");
    listDiv.id = `animepahe-${type}`;
    listDiv.className = "animepahe-section";

    const title = document.createElement("h2");
    title.textContent = titleText;

    if (type === "history") {
      const clearButton = document.createElement("button");
      clearButton.className = "clear-history-btn";
      clearButton.textContent = "Clear History";
      clearButton.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to clear your watch history?")) {
          window.AnimePaheHelperStorage.clearHistory();
          renderGrid([], titleText, type);
        }
      });
      title.appendChild(clearButton);
    }

    const listWrapper = document.createElement("div");
    listWrapper.className = "animepahe-list-wrapper";

    const list = document.createElement("div");
    list.className = "animepahe-list row";

    listSlice.forEach((entry) => {
      if (!entry.anime) return;
      const animeWrap = document.createElement("div");
      animeWrap.className = "animepahe-anime-wrap col-12 col-sm-4";
      animeWrap.setAttribute("data-id", entry.anime.id);

      const anime = document.createElement("div");
      anime.className = "animepahe-anime";

      const animeSnapshot = document.createElement("div");
      animeSnapshot.className = "anime-snapshot";

      const cover = document.createElement("img");
      cover.className = "ls-is-cached lazyloaded";
      cover.src = entry.anime.cover;
      cover.setAttribute("data-src", entry.anime.cover);
      cover.alt = entry.anime.title;
      animeSnapshot.appendChild(cover);

      if (type === "history") {
        const playButton = document.createElement("svg");
        playButton.className = "play-button";
        playButton.viewBox = "0 0 150 150";
        playButton.setAttribute("alt", "Play Video");
        const playIcon = document.createElement("polygon");
        playIcon.setAttribute("points", "20, 20, 20, 140, 120, 80");
        playIcon.setAttribute("fill", "#fff");
        playButton.appendChild(playIcon);
        animeSnapshot.appendChild(playButton);
      }

      const playLink = document.createElement("a");
      playLink.className = "play";
      const lastEpisode =
        type === "history" ? getLastWatchedEpisode(entry.anime.id) : null;
      playLink.href =
        type === "history"
          ? `/play/${entry.anime.id}/${lastEpisode.video_id}`
          : `/anime/${entry.anime.id}`;
      animeSnapshot.appendChild(playLink);

      const animeLabelWrap = document.createElement("div");
      animeLabelWrap.className = "anime-label-wrap";

      const animeDeleteWrap = document.createElement("div");
      animeDeleteWrap.className = "anime-delete-wrap";

      const animeDelete = document.createElement("button");
      animeDelete.className = "anime-delete-btn";
      animeDelete.title = `Remove ${entry.anime.title} from ${type}`;
      animeDelete.innerHTML = "&times;";
      animeDelete.addEventListener("click", (e) => {
        e.preventDefault();
        type === "history"
          ? removeFromHistory(entry.anime.id, lastEpisode.episode_number)
          : toggleWatchlist(entry.anime.id);
        animeWrap.remove();
        renderGrid(
          type === "history" ? getHistory() : getWatchlist(),
          titleText,
          type,
          page,
        );
      });
      animeDeleteWrap.appendChild(animeDelete);
      animeLabelWrap.appendChild(animeDeleteWrap);

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

      if (type === "history") {
        const animeNumberWrap = document.createElement("div");
        animeNumberWrap.className = "anime-number-wrap";

        const animeNumber = document.createElement("div");
        animeNumber.className = "anime-number";

        const spanEpisode = document.createElement("span");
        spanEpisode.className = "text-hide";
        spanEpisode.textContent = `${entry.anime.title} Episode`;

        animeNumber.textContent = `${lastEpisode.episode_number}`;
        animeNumber.prepend(spanEpisode);
        animeNumberWrap.appendChild(animeNumber);

        animeLabel.appendChild(animeNumberWrap);
      }

      animeLabelWrap.appendChild(animeLabel);
      anime.appendChild(animeSnapshot);
      anime.appendChild(animeLabelWrap);
      animeWrap.appendChild(anime);
      list.appendChild(animeWrap);
    });

    listWrapper.appendChild(list);
    listDiv.appendChild(title);
    listDiv.appendChild(listWrapper);

    return listDiv;
  }

  function createWatchlistButton(anime) {
    const header = document.querySelector("section article > div header > div");

    if (!header) return;

    const listButtonWrap =
      document.querySelector(".watchlist-toggle") ||
      document.createElement("h3");
    listButtonWrap.className = "watchlist-toggle";
    const listButton =
      listButtonWrap.querySelector(".watchlist-button") ||
      document.createElement("button");
    listButton.className = "watchlist-button";
    listButton.textContent = `${isInWatchlist(anime.id) ? "Remove from" : "Add to"} Watchlist`;
    listButton.title = listButton.textContent;
    listButton.addEventListener("click", (e) => {
      e.preventDefault();
      toggleWatchlist(anime.id, anime.title, anime.cover);
      listButton.textContent = `${isInWatchlist(anime.id) ? "Remove from" : "Add to"} Watchlist`;
      listButton.title = listButton.textContent;
    });

    listButtonWrap.appendChild(listButton);
    header.appendChild(listButtonWrap);
  }

  function createWatchedMask(episodeList, anime_id) {
    const history = getHistory();
    const watchedEpisodes = new Set();
    history.forEach((entry) => {
      if (entry.anime && entry.anime.id === anime_id)
        entry.episodes.forEach((ep) => watchedEpisodes.add(ep.episode_number));
    });

    const episodes = episodeList.querySelectorAll(".episode");
    const numberRegex = /Episode\s+(\d+)/i;
    episodes.forEach((episode) => {
      const episodeNumberElement = episode.querySelector(
        ".episode-label .episode-number",
      );
      if (!episodeNumberElement) return;
      const match = episodeNumberElement.textContent.trim().match(numberRegex);
      if (!match) return;
      if (watchedEpisodes.has(match[1])) {
        const labelWrap = episode.querySelector(".episode-label-wrap");
        if (labelWrap) {
          if (!labelWrap.classList.contains("watched"))
            labelWrap.classList.add("watched");

          const animeWatchWrap =
            labelWrap.querySelector(".anime-watched-wrap") ||
            document.createElement("div");
          animeWatchWrap.className = "anime-watched-wrap";

          const watchedText =
            animeWatchWrap.querySelector(".anime-watched-text") ||
            document.createElement("span");
          watchedText.className = "anime-watched-text";
          watchedText.textContent = "Watched";
          animeWatchWrap.appendChild(watchedText);

          const watchedBtn =
            animeWatchWrap.querySelector(".anime-watched-btn") ||
            document.createElement("button");
          watchedBtn.className = "anime-watched-btn";
          watchedBtn.title = "Mark as Unwatched";
          watchedBtn.innerHTML = "&times;";
          watchedBtn.addEventListener("click", (e) => {
            e.preventDefault();
            removeFromHistory(anime_id, match[1]);
            labelWrap.classList.remove("watched");
            animeWatchWrap.remove();
          });

          animeWatchWrap.appendChild(watchedBtn);
          labelWrap.prepend(animeWatchWrap);
        }
      }
    });
  }

  window.AnimePaheHelperUtils = {
    parsePlayPath,
    parseAnimePath,
    createListElement,
    renderGrid,
    createWatchlistButton,
    createWatchedMask,
  };

  console.log(
    "%c[AnimePahe Helper] Utils module initialized.",
    "color:#D5015B",
  );
})();
