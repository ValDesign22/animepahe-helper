(() => {
  const isIframe = window.self !== window.top;

  // --- Iframe Code ---
  if (isIframe) {
    let player = null;

    const skipActions = {
      default: "Skip Section",
      recap: "Skip Recap",
      intro: "Skip Intro",
      outro: "Skip Outro",
    };

    function waitForPlayer() {
      return new Promise((resolve) => {
        const checkPlayer = () => {
          player = document.querySelector("#kwikPlayer");
          if (player) resolve(player);
          else setTimeout(checkPlayer, 100);
        };
        checkPlayer();
      });
    }

    function createSkipButton() {
      const playerControls = document.querySelector(".plyr__controls");
      if (playerControls) {
        const skipButton =
          playerControls.querySelector(".plyr__button--skip") ||
          document.createElement("button");
        skipButton.classList =
          "plyr__control plyr__button plyr__button--skip plyr__button--hidden";
        skipButton.setAttribute("plyr", "skip");
        skipButton.setAttribute("type", "button");
        skipButton.setAttribute("aria-label", "Skip Intro/Recap/Outro");

        // Thanks lucide icons for the SVG paths! https://lucide.dev/icons/skip-forward
        skipButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon--not-pressed"><path d="M21 4v16"/><path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"/></svg>`;

        const spanText =
          skipButton.querySelector("span") || document.createElement("span");
        spanText.textContent = skipActions["default"];

        if (!skipButton.querySelector("span")) skipButton.appendChild(spanText);
        if (!skipButton.parentNode) playerControls.appendChild(skipButton);
      }
    }

    function setButtonVisibility(visible) {
      const skipButton = document.querySelector(".plyr__button--skip");
      if (skipButton) {
        skipButton.classList.toggle("plyr__button--hidden", !visible);
      }
    }

    function setButtonAction(action, timestamp) {
      const skipButton = document.querySelector(".plyr__button--skip");
      if (skipButton) {
        setButtonVisibility(true);
        const spanText = skipButton.querySelector("span");
        spanText.textContent = skipActions[action];
        skipButton.removeEventListener("click", skipButton._skipListener);
        skipButton._skipListener = () => {
          player.currentTime = timestamp;
          setButtonVisibility(false);
        };
        skipButton.addEventListener("click", skipButton._skipListener);
      }
    }

    async function initPlayer() {
      await waitForPlayer();
      if (!player) return;

      createSkipButton();

      player.addEventListener("loadeddata", () => {
        window.parent.postMessage({ action: "playerReady", data: true }, "*");
      });

      player.addEventListener("timeupdate", () => {
        window.parent.postMessage(
          { action: "getVideoTime", data: player.currentTime },
          "*",
        );
      });
    }

    initPlayer();

    function handleMessage(event) {
      if (!player || event.source !== window.parent) return;

      const { action, data } = event.data;

      switch (action) {
        case "seekTo":
          player.currentTime = data;
          break;
        case "getDuration":
          window.parent.postMessage(
            { action: "videoDuration", data: player.duration },
            "*",
          );
          break;
        case "skipRecap":
          setButtonAction("recap", data);
          break;
        case "skipIntro":
          setButtonAction("intro", data);
          break;
        case "skipOutro":
          setButtonAction("outro", data);
          break;
      }
    }

    window.addEventListener("message", handleMessage);
  }
  // --- Parent Window Code ---
  else {
    const { getHistoryEpisode, updateHistory } = window.AnimePaheHelperStorage;

    let iframe = null;
    let currentSession = null;

    async function waitForIframe() {
      return new Promise((resolve) => {
        const checkIframe = () => {
          iframe = document.querySelector(".embed-responsive-item");
          if (iframe && iframe.length !== 0 && iframe.src) resolve(iframe);
          else setTimeout(checkIframe, 100);
        };
        checkIframe();
      });
    }

    function handleMessage(event) {
      if (!iframe || event.source !== iframe.contentWindow) return;

      const { action, data } = event.data;
      const { historyEntry } = currentSession;

      switch (action) {
        case "playerReady":
          if (!data) return;
          if (historyEntry?.player_time) {
            console.log(historyEntry.player_time);
            iframe.contentWindow.postMessage(
              { action: "seekTo", data: historyEntry.player_time },
              "*",
            );
          }
          iframe.contentWindow.postMessage(
            { action: "getDuration", data: null },
            "*",
          );
          break;
        case "getVideoTime":
          historyEntry.player_time = data;

          const aniDBId = currentSession.anime.anidb_id;
          if (!aniDBId) return;
          const aniDBEpisodeNumber =
            parseFloat(currentSession.episodeNumber) -
            (parseInt(currentSession.anime.first_episode) - 1);
          if (aniDBEpisodeNumber < 1) return;
          break;
        case "videoDuration":
          historyEntry.duration = data;
          break;
      }

      updateHistory(
        currentSession.anime.id,
        currentSession.episodeNumber,
        currentSession.video_id,
        historyEntry?.player_time,
        historyEntry?.duration,
      );
    }

    async function enhancePlayer(anime, episodeNumber, video_id) {
      currentSession = { anime, episodeNumber, video_id };
      currentSession.historyEntry = getHistoryEpisode(anime.id, episodeNumber);
      iframe = await waitForIframe();
      if (!iframe) return;

      window.addEventListener("message", handleMessage);
    }

    window.AnimePaheHelperPlayer = { enhancePlayer };
  }
})();
