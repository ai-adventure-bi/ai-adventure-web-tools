# Importing HeyOtto games

Restart `Start Studio.cmd` after updating, then refresh the page.

1. Open a website, expand **Advanced settings**, then choose **Import**.
2. Choose the `.jsx` or `.html` file exported by HeyOtto. The file picker selects its code type automatically. If pasting, select React JSX or HTML yourself.
3. Review the import and apply it, then test using **Fullscreen preview**. Save the draft and publish when ready.

Three.js 0.186.0 is bundled locally with React, React DOM, the React JSX runtime and lucide-react. JSX can use `import * as THREE from 'three'`. Self-contained HTML exports containing React ES modules are also supported: their supported imports are compiled to the local runtime, and their import maps are discarded. Plain inline HTML JavaScript still works. Source files are not rewritten on disk.

Large HeyOtto rewrites can take a while. The local server waits up to three minutes; the Vercel adapter defaults to 105 seconds to leave room within its configured 120-second function duration. `HEYOTTO_TIMEOUT_MS` can override the wait (up to 180000 ms), but on hosted deployments it must stay below the hosting request limit with room for key retrieval and response handling. A timeout does not cancel work already underway at HeyOtto. Check the reply in HeyOtto history before resending. You can import its JSX code block manually; omit the separate teaching JSON block. Selecting a smaller code section can reduce the size of the requested reply. Failed calls are not automatically retried.

This does not support every npm package, arbitrary external JavaScript, Three.js addons, separate source files, remote model fetches, arbitrary server APIs or multiplayer networking. Studio now provides its own optional leaderboard API; see LEADERBOARDS-AND-LINKS.md. Unsupported imports produce an error explaining which library is missing. Generated games run in the existing opaque-origin sandbox with no access to Studio accounts, cookies, keys or database APIs. Bundling a game library does not grant network or account access. External web fonts may fall back to system fonts.

For iPad controls, ask HeyOtto: “Keep this game in one JSX file, using React and Three.js only. Add an on-screen movement joystick and action buttons, drag-to-look controls, and support landscape iPad Safari. Do not require a keyboard or pointer lock.” A game loading correctly does not guarantee that its controls or graphics performance suit every iPad.

Local checks used copies of Surreal Void Walkway.jsx, Creature-Card-Battle.html and Among-Us-3D-Kestrel-Station(1).html in the separate demonstration database. All compiled; card battle started, station progressed into a meeting, and the walkway displayed its 3D scene after keyboard movement. Physical iPad play, full game completion, audio output and production hosting were not verified.

## Code search and optional CSS

Open **Advanced settings**, then use **Find** beside the code tabs, or Ctrl+F / Cmd+F while the editor has focus. Search highlights matches and supports next/previous, case matching and replacement. Search applies to the active code tab.

The styles.css tab is optional, but functional. Its CSS is injected into both the preview and published page, so it can hold reusable colours, fonts, spacing and layout rules. Many generated games already use Tailwind classes or styles inside JSX and can leave this tab empty.
