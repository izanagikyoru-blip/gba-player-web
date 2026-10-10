# GBA PLAYER WEB

A responsive browser frontend for the real mGBA Game Boy Advance core supplied by EmulatorJS. It is a frontend integration, not a home-made emulation mockup.

## Requirements

- Node.js 18+ and npm (only needed to run the local static server below).
- A modern browser.
- Internet access to load the EmulatorJS stable runtime from `https://cdn.emulatorjs.org/`.
- `.gba` ROMs that you own or are otherwise legally permitted to use. Do not download unauthorized game copies.

## Run locally

1. Extract this project folder.
2. Open a terminal in the folder.
3. Run a local static server (one option):

   ```bash
   npx serve .
   ```

4. Open the local URL printed by the server. Avoid opening `index.html` directly with `file://`; browsers restrict WebAssembly and local object URLs in that mode.
5. Click **Load a ROM**, select a `.gba` file, then click **Start game**.
6. If the browser blocks audio autoplay, interact with the page once or use the emulator menu to enable audio.

The app selects the ROM locally and creates a browser object URL. The ROM is not posted to an application backend. The EmulatorJS JavaScript/WASM runtime is downloaded from its public CDN.

## Deploy

Upload `index.html`, `style.css`, and `app.js` to a static host that supports HTTPS and correct MIME types for JavaScript and WebAssembly. This basic EmulatorJS setup does not enable threaded SharedArrayBuffer mode, so COOP/COEP headers are not required by this frontend configuration. If you choose to enable threads later, configure:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

## Emulator integration

- Core: EmulatorJS GBA system, which uses the `mgba` core.
- Official system documentation: https://emulatorjs.org/docs/systems/nintendo-game-boy-advance/
- Official options documentation: https://emulatorjs.org/docs/options/
- Official feature overview: https://emulatorjs.org/docs/features/

The app configures `EJS_core = "gba"`, which the official EmulatorJS GBA system documentation maps to mGBA. EmulatorJS owns the emulation loop, canvas, audio pipeline, keyboard mapping, touch controls, in-game menu, and supported save/state actions.

## Feature notes and limitations

- **ROM loading:** `.gba` is the recommended format. `.zip` is accepted by the file picker, but ZIP handling depends on the runtime build; if it does not load, extract the archive locally and choose the `.gba` file.
- **Emulation, audio, keyboard and touch:** provided by EmulatorJS/mGBA, not reimplemented in this page.
- **Pause/resume:** use the built-in EmulatorJS menu. The current public docs do not provide a stable documented external pause API for this frontend, so the outer Pause/Resume button intentionally explains that limitation rather than pretending to work.
- **Restart:** the outer Restart button clears the current session and lets you launch the selected ROM again. Unsaved progress may be lost.
- **Fullscreen:** uses the browser Fullscreen API.
- **Volume/mute:** the outer controls update preferences. The integration attempts the runtime's `setVolume` method only if present; use the in-emulator menu if your runtime build does not expose it.
- **Saves and save states:** access these through the EmulatorJS in-game menu. Exact export/import formats and persistence depend on the runtime/core build and browser storage availability. This wrapper does not claim a separate IndexedDB save adapter.
- **Custom key mappings:** use the EmulatorJS control settings menu.
- **ZIP validation:** the wrapper checks extension and file size but leaves archive parsing to EmulatorJS. Prefer `.gba` files if ZIP loading is unavailable.
- **Testing:** this source has not been run against a ROM in this environment. Verify using a legally distributable homebrew ROM in your target browser before publishing.

## Privacy and security

The ROM is selected with the browser file picker and referenced using `URL.createObjectURL`. No app backend exists and no ROM upload request is implemented. The emulator runtime is a third-party dependency loaded from the official EmulatorJS CDN; if you need fully offline operation, download and self-host a reviewed release of the EmulatorJS `data/` runtime and change `EJS_pathtodata` and the loader URL in `app.js` to local paths.

## License

This frontend's original code is provided for reuse. EmulatorJS and mGBA are separate upstream projects with their own licenses; review their terms before redistributing bundled runtime files.
