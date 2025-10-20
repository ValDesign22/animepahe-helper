(() => {
  console.log(
    "%c[AnimePahe Helper] Initializing utils module...",
    "color:#D5015B",
  );

  const { getHistory, removeFromHistory, createList, addToList } =
    window.AnimePaheHelperStorage;

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

  function renderHistory(history, page = 1) {
    const TOTAL_PAGES = Math.ceil(history.length / ITEMS_PER_PAGE) || 1;
    if (page < 1) page = 1;
    if (page > TOTAL_PAGES) page = TOTAL_PAGES;

    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = page * ITEMS_PER_PAGE;
    const historySlice = history.slice(start, end);

    const newHistorySection = createHistoryElement(historySlice);

    const navigation = createNavigation(TOTAL_PAGES, page, (newPage) => {
      renderHistory(history, newPage);
    });

    newHistorySection
      .querySelector(".history-list-wrapper")
      .appendChild(navigation);

    const existingHistorySection = document.querySelector(".history-section");
    if (existingHistorySection) {
      existingHistorySection.replaceWith(newHistorySection);
    } else {
      const contentWrapper = document.evaluate(
        "/html/body/section/article/div",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue;
      if (contentWrapper) {
        contentWrapper.insertBefore(
          newHistorySection,
          contentWrapper.firstChild,
        );
      }
    }
  }

  function createNavigation(TOTAL_PAGES, currentPage, onPageClick) {
    const navigation = document.createElement("nav");
    navigation.ariaLabel = "History Navigation";

    const navigationUl = document.createElement("ul");
    navigationUl.className = "pagination justify-content-center";

    function createNavItem(label, page, disabled, srLabel) {
      const li = document.createElement("li");
      li.className = `page-item${disabled ? " disabled" : ""}`;

      const link = document.createElement("a");
      link.className = "page-link";
      link.setAttribute("data-history-page", page);
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

          const url = new URL(window.location);
          url.searchParams.set("history-page", page);
          window.history.pushState({ page }, "", url.toString());

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

  function createHistoryElement(historySlice) {
    if (historySlice.length === 0) {
      return (document.createElement("div").className =
        "history-section empty");
    }

    const historyDiv = document.createElement("div");
    historyDiv.className = "history-section";

    const title = document.createElement("h2");
    title.textContent = "Recently Watched";

    const clearButton = document.createElement("button");
    clearButton.className = "clear-history-btn";
    clearButton.textContent = "Clear History";
    clearButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Are you sure you want to clear your watch history?")) {
        window.AnimePaheHelperStorage.clearHistory();
        renderHistory([]);
      }
    });
    title.appendChild(clearButton);

    const historyListWrapper = document.createElement("div");
    historyListWrapper.className = "history-list-wrapper";

    const historyList = document.createElement("div");
    historyList.className = "history-list row";

    historySlice.forEach((entry) => {
      if (!entry.anime) return;
      const historyAnimeWrap = document.createElement("div");
      historyAnimeWrap.className = "history-anime-wrap col-12 col-sm-4";
      historyAnimeWrap.setAttribute("data-id", entry.anime.id);

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
      playButton.viewBox = "0 0 150 150";
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

      const animeDeleteWrap = document.createElement("div");
      animeDeleteWrap.className = "anime-delete-wrap";

      const animeDelete = document.createElement("button");
      animeDelete.className = "anime-delete-btn";
      animeDelete.title = "Remove from History";
      animeDelete.innerHTML = "&times;";
      animeDelete.addEventListener("click", (e) => {
        e.preventDefault();
        removeFromHistory(entry.anime.id);
        historyAnimeWrap.remove();
        renderHistory(getHistory());
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

      const animeNumberWrap = document.createElement("div");
      animeNumberWrap.className = "anime-number-wrap";

      const animeNumber = document.createElement("div");
      animeNumber.className = "anime-number";

      const spanEpisode = document.createElement("span");
      spanEpisode.className = "text-hide";
      spanEpisode.textContent = `${entry.anime.title} Episode`;

      animeNumber.textContent = `${entry.episode}`;
      animeNumber.prepend(spanEpisode);
      animeNumberWrap.appendChild(animeNumber);

      animeLabel.appendChild(animeNameWrap);
      animeLabel.appendChild(animeNumberWrap);
      animeLabelWrap.appendChild(animeLabel);

      historyAnime.appendChild(animeSnapshot);
      historyAnime.appendChild(animeLabelWrap);

      historyAnimeWrap.appendChild(historyAnime);
      historyList.appendChild(historyAnimeWrap);
    });

    historyListWrapper.appendChild(historyList);
    historyDiv.appendChild(title);
    historyDiv.appendChild(historyListWrapper);

    return historyDiv;
  }

  function createAddToListButton(anime) {
    const navUl = document.evaluate(
      "/html/body/section/article/div[2]/div[1]/nav/ul",
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;

    if (!navUl) return;

    const listButtonLi =
      document.getElementById("add-to-list") || document.createElement("li");
    listButtonLi.id = "add-to-list";
    listButtonLi.className = "col";
    listButtonLi.innerHTML = "";

    const listButtonLink = document.createElement("a");
    listButtonLink.setAttribute("data-tab", "add-to-list");
    listButtonLink.title = "Add to List";
    listButtonLink.textContent = "Add to List";
    listButtonLink.addEventListener("click", (e) => {
      e.preventDefault();
    });

    listButtonLi.appendChild(listButtonLink);

    navUl.appendChild(listButtonLi);
  }

  window.AnimePaheHelperUtils = {
    parsePlayPath,
    parseAnimePath,
    renderHistory,
    createAddToListButton,
  };

  console.log(
    "%c[AnimePahe Helper] Utils module initialized.",
    "color:#D5015B",
  );
})();
