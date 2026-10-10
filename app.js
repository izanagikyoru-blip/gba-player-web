(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const state = { file: null, romUrl: null, started: false, muted: false, volume: 75, emulatorLoaded: false, objectUrls: [] };
  const status = (label, mode = "") => {
    $("statusText").textContent = label.toUpperCase();
    $("statusDot").parentElement.className = `status ${mode}`;
  };
  const notice = (message, error = false) => {
    $("notice").textContent = message;
    $("notice").classList.toggle("error", error);
  };
  const loading = (show, message = "Preparing your game…") => {
    $("loadingOverlay").hidden = !show;
    $("loadingMessage").textContent = message;
  };
  const validExt = (name) => /\.(gba|zip)$/i.test(name);
  const maxSize = 128 * 1024 * 1024;

  function resetSession() {
    if (state.romUrl) URL.revokeObjectURL(state.romUrl);
    state.romUrl = null;
    state.file = null;
    state.started = false;
    state.emulatorLoaded = false;
    $("game").innerHTML = `<div class="screen-placeholder" id="placeholder"><div class="pixel-logo">GBA<span>+</span></div><div class="placeholder-title">READY PLAYER ONE?</div><p>Choose a ROM file to begin</p><div class="screen-scanlines"></div></div>`;
    $("gameLabel").textContent = "NO GAME SELECTED";
    $("fileLabel").textContent = "No ROM loaded";
    $("selectedFile").hidden = true;
    $("dropZone").hidden = false;
    $("startBtn").disabled = true;
    $("pauseBtn").disabled = true;
    $("restartBtn").disabled = true;
    $("fullscreenBtn").disabled = true;
    status("Ready");
  }

  function acceptFile(file) {
    if (!file) return;
    if (!validExt(file.name)) {
      notice("Unsupported file type. Choose a .gba ROM or a .zip archive containing one.", true);
      status("Error", "error");
      return;
    }
    if (!file.size || file.size > maxSize) {
      notice(file.size ? "This file is larger than the 128 MB safety limit." : "The selected file is empty.", true);
      status("Error", "error");
      return;
    }
    if (state.romUrl) URL.revokeObjectURL(state.romUrl);
    state.file = file;
    state.romUrl = URL.createObjectURL(file);
    $("selectedName").textContent = file.name;
    $("selectedMeta").textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to start`;
    $("selectedFile").hidden = false;
    $("dropZone").hidden = true;
    $("fileLabel").textContent = file.name;
    $("gameLabel").textContent = file.name.toUpperCase();
    $("startBtn").disabled = false;
    $("pauseBtn").disabled = true;
    $("restartBtn").disabled = true;
    $("fullscreenBtn").disabled = true;
    status("Ready");
    notice("ROM selected. Press Start game to initialize the mGBA core.");
  }

  function loadEngine() {
    return new Promise((resolve, reject) => {
      if (state.emulatorLoaded && window.EJS_emulator) return resolve();
      const old = document.getElementById("emulatorjs-loader");
      if (old) old.remove();
      window.EJS_player = "#game";
      window.EJS_core = "gba";
      window.EJS_gameUrl = state.romUrl;
      window.EJS_gameName = state.file.name.replace(/\.(gba|zip)$/i, "");
      window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
      window.EJS_startOnLoaded = true;
      window.EJS_volume = state.muted ? 0 : state.volume / 100;
      window.EJS_color = "#a8ff60";
      window.EJS_gameID = stableGameId(state.file);
      window.EJS_language = "en-US";
      window.EJS_onGameStart = () => {
        state.started = true;
        loading(false);
        status("Running", "running");
        $("pauseBtn").disabled = false;
        $("restartBtn").disabled = false;
        $("fullscreenBtn").disabled = false;
        notice("Game started. Use the emulator's in-game menu for pause, save files, and save states.");
      };
      window.EJS_onLoad = () => {
        state.emulatorLoaded = true;
        loading(false);
        status("Running", "running");
        $("pauseBtn").disabled = false;
        $("restartBtn").disabled = false;
        $("fullscreenBtn").disabled = false;
        notice("Emulator loaded. EmulatorJS controls and save options are available in its menu.");
        resolve();
      };
      const script = document.createElement("script");
      script.id = "emulatorjs-loader";
      script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
      script.async = true;
      script.onload = () => {
        // EmulatorJS reports initialization using its callbacks. Resolve after load event as a fallback.
        setTimeout(() => {
          if (!state.emulatorLoaded && !window.EJS_emulator) {
            // Do not claim the core is running until its callbacks fire.
            notice("The emulator loader downloaded. Waiting for the core to initialize…");
          }
        }, 500);
      };
      script.onerror = () => reject(new Error("Could not load the EmulatorJS engine. Check your internet connection or CDN access."));
      document.body.appendChild(script);
      // A ROM can be an object URL; no ROM bytes are sent to our own server.
      // EmulatorJS's loader fetches the selected object URL within the same browser.
      const timeout = setTimeout(() => {
        if (!state.emulatorLoaded && !window.EJS_emulator) {
          reject(new Error("The emulator did not initialize in time. Try a valid, uncompressed .gba ROM."));
        }
      }, 45000);
      const observer = new MutationObserver(() => {
        if (state.emulatorLoaded) { clearTimeout(timeout); observer.disconnect(); }
      });
      observer.observe($("game"), { childList: true, subtree: true });
    });
  }

  function stableGameId(file) {
    // A stable per-filename ID is adequate for EmulatorJS separation; it is not a ROM-content hash.
    let hash = 2166136261;
    const key = `${file.name}:${file.size}`;
    for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
    return Math.abs(hash >>> 0) % 2000000000 + 1;
  }

  $("romInput").addEventListener("change", (event) => acceptFile(event.target.files[0]));
  $("clearRom").addEventListener("click", () => { $("romInput").value = ""; resetSession(); notice("ROM removed. Choose another file to play."); });
  $("dropZone").addEventListener("dragover", (event) => { event.preventDefault(); $("dropZone").classList.add("dragover"); });
  $("dropZone").addEventListener("dragleave", () => $("dropZone").classList.remove("dragover"));
  $("dropZone").addEventListener("drop", (event) => {
    event.preventDefault(); $("dropZone").classList.remove("dragover");
    acceptFile(event.dataTransfer.files[0]);
  });

  $("startBtn").addEventListener("click", async () => {
    if (!state.file || !state.romUrl) return;
    if (/\.zip$/i.test(state.file.name)) {
      notice("ZIP support depends on the selected EmulatorJS loader build. If it fails, extract the archive on your device and load the .gba file.", true);
    }
    $("startBtn").disabled = true;
    status("Loading");
    loading(true, "Loading the mGBA WebAssembly core…");
    try {
      await loadEngine();
    } catch (error) {
      loading(false);
      status("Error", "error");
      notice(error.message || "Unable to start the emulator.", true);
      $("startBtn").disabled = false;
    }
  });

  // EmulatorJS keeps its transport and input APIs inside the engine. These controls use only
  // public browser fullscreen APIs; pause/reset are intentionally not faked through undocumented APIs.
  $("pauseBtn").addEventListener("click", () => {
    notice("Use the EmulatorJS in-game menu to pause or resume. The selected core does not expose a documented external pause API.", true);
  });
  $("restartBtn").addEventListener("click", () => {
    if (!state.file) return;
    if (confirm("Restart the game? Unsaved progress may be lost. Use the emulator's save feature first if needed.")) {
      $("game").innerHTML = "";
      state.emulatorLoaded = false;
      state.started = false;
      $("startBtn").disabled = false;
      $("pauseBtn").disabled = true;
      $("restartBtn").disabled = true;
      $("fullscreenBtn").disabled = true;
      notice("Session cleared. Press Start game to launch the selected ROM again.");
      status("Ready");
    }
  });
  $("fullscreenBtn").addEventListener("click", async () => {
    const target = $("game");
    try {
      if (!document.fullscreenElement) await target.requestFullscreen();
      else await document.exitFullscreen();
    } catch { notice("Fullscreen is unavailable in this browser or requires a user gesture.", true); }
  });

  $("volume").addEventListener("input", (event) => {
    state.volume = Number(event.target.value);
    $("volumeValue").textContent = `${state.volume}%`;
    if (window.EJS_emulator && typeof window.EJS_emulator.setVolume === "function") {
      window.EJS_emulator.setVolume(state.muted ? 0 : state.volume / 100);
    } else {
      notice("Volume slider updated. The current EmulatorJS build may require adjusting volume in its own menu.");
    }
  });
  $("muteBtn").addEventListener("click", () => {
    state.muted = !state.muted;
    $("muteBtn").classList.toggle("muted", state.muted);
    $("muteBtn").textContent = state.muted ? "×" : "♫";
    $("muteBtn").setAttribute("aria-label", state.muted ? "Unmute audio" : "Mute audio");
    if (window.EJS_emulator && typeof window.EJS_emulator.setVolume === "function") {
      window.EJS_emulator.setVolume(state.muted ? 0 : state.volume / 100);
    } else {
      notice("Mute preference updated. If audio continues, use the EmulatorJS in-game audio menu.");
    }
  });

  $("settingsBtn").addEventListener("click", () => $("settingsDialog").showModal());
  $("pixelPerfect").addEventListener("change", (event) => $("game").style.imageRendering = event.target.checked ? "pixelated" : "auto");
  $("showEmulatorUi").addEventListener("change", (event) => {
    notice(event.target.checked ? "Keep the EmulatorJS menu enabled to access core controls and saves." : "This setting cannot safely hide the emulator menu in the current integration.");
    if (!event.target.checked) event.target.checked = true;
  });
  window.addEventListener("beforeunload", () => { if (state.romUrl) URL.revokeObjectURL(state.romUrl); });
  window.addEventListener("blur", () => {
    // EmulatorJS handles input release internally when its canvas loses focus.
  });
})();