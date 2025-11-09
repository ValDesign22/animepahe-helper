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
      preview: "Skip Preview",
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
      const playerControls = document.querySelector(".plyr");
      if (playerControls) {
        const skipButton =
          playerControls.querySelector(".plyr__button--skip") ||
          document.createElement("button");
        skipButton.classList =
          "plyr__button plyr__button--skip plyr__button--hidden";
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
        case "skipPreview":
          setButtonAction("preview", data);
          break;
        case "hideSkipButton":
          setButtonVisibility(false);
          break;
      }
    }

    window.addEventListener("message", handleMessage);
  }
  // --- Parent Window Code ---
  else {
    const { getHistoryEpisode, updateHistory, getEpisodeTimestamps } =
      window.AnimePaheHelperStorage;

    let iframe = null;
    let currentSession = null;
    const demoTimestamps = null;

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

    async function handleMessage(event) {
      if (!iframe || event.source !== iframe.contentWindow) return;

      const { action, data } = event.data;
      const { historyEntry, anime, episodeNumber, video_id, timestamps } =
        currentSession;

      function send(action, data) {
        iframe.contentWindow.postMessage({ action, data }, "*");
      }

      switch (action) {
        case "playerReady":
          if (!data) break;
          if (historyEntry?.player_time) {
            send("seekTo", historyEntry.player_time);
            console.log(
              `%c[AnimePaheHelper] Resumed playback at ${historyEntry.player_time}s`,
              "color: #D5015B",
            );
          }
          send("getDuration", null);
          break;
        case "getVideoTime":
          historyEntry.player_time = data;

          if (!timestamps) break;

          const skipRanges = [
            ["skipRecap", timestamps.recap],
            ["skipIntro", timestamps.opening],
            ["skipOutro", timestamps.ending],
            [
              "skipPreview",
              {
                start: timestamps.preview_start,
                end: historyEntry.duration,
              },
            ],
          ];

          let didSkip = false;
          for (const [action, range] of skipRanges) {
            if (
              range.start >= 0 &&
              data >= range.start &&
              data <= (range.end || historyEntry.duration)
            ) {
              send(action, range.end || historyEntry.duration);
              didSkip = true;
              break;
            }
          }

          if (!didSkip) send("hideSkipButton", null);
          break;
        case "videoDuration":
          historyEntry.duration = data;
          break;
      }

      updateHistory(
        anime.id,
        episodeNumber,
        video_id,
        historyEntry?.player_time,
        historyEntry?.duration,
      );
    }

    async function enhancePlayer(anime, episodeNumber, video_id) {
      currentSession = {
        anime,
        episodeNumber,
        video_id,
        historyEntry: getHistoryEpisode(anime.id, episodeNumber),
        timestamps: await getEpisodeTimestamps(
          anime.anidb_id,
          parseFloat(episodeNumber) - (parseInt(anime.first_episode, 10) - 1),
        ),
      };
      console.log("%c[AnimePaheHelper] Current Session:", "color: #D5015B");
      console.log(currentSession);
      iframe = await waitForIframe();
      if (!iframe) return;

      window.addEventListener("message", handleMessage);
    }

    window.AnimePaheHelperPlayer = { enhancePlayer };
  }
})();
