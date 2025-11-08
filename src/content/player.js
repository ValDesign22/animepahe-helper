(() => {
  const isIframe = window.self !== window.top;

  // --- Iframe Code ---
  if (isIframe) {
    let player = null;

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

    async function initPlayer() {
      await waitForPlayer();
      if (!player) return;

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

      switch (action) {
        case "playerReady":
          if (!data) return;
          const savedTime = getHistoryEpisode(
            currentSession.anime.anime_id,
            currentSession.episodeNumber,
          );
          if (savedTime?.player_time) {
            iframe.contentWindow.postMessage(
              { action: "seekTo", data: savedTime.player_time },
              "*",
            );
          }
          break;
        case "getVideoTime":
          updateHistory(
            currentSession.anime.anime_id,
            currentSession.episodeNumber,
            currentSession.video_id,
            data,
          );

          const aniDBId = currentSession.anime.anidb_id;
          if (!aniDBId) return;
          const aniDBEpisodeNumber =
            parseFloat(currentSession.episodeNumber) -
            (parseInt(currentSession.anime.first_episode) - 1);
          if (aniDBEpisodeNumber < 1) return;
          break;
      }
    }

    async function enhancePlayer(anime, episodeNumber, video_id) {
      currentSession = { anime, episodeNumber, video_id };
      iframe = await waitForIframe();
      if (!iframe) return;

      window.addEventListener("message", handleMessage);
    }

    window.AnimePaheHelperPlayer = { enhancePlayer };
  }
})();
