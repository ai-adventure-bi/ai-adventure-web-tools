# AI Adventure Web Tools

This folder is the editable master copy of the teacher tools hub.

## Open everything locally

Double-click `START-WEB-TOOLS.cmd`. The hub opens at `http://localhost:8080` once both parts are ready.

On this computer the launcher will reuse the existing working Quake Quest installation when available, avoiding a second large dependency copy.

Keep the PowerShell window open while using Quake Quest. Press Enter in that window when you want to stop the local sites.

## Add another simple web tool

1. Put the new tool's folder beside `index.html`.
2. Make sure the tool's opening page is named `index.html`.
3. Open the master `index.html` and add one object to the `tools` list near the bottom.
4. Commit and push the changes to GitHub. GitHub Pages will update automatically when it is configured to publish the main branch.

## Quake Quest

Quake Quest is different from the other activities because it has a small server component that retrieves the current BGS earthquake and station feeds. Its source is stored in `quake-quest`, but the online hub links to the separately deployed live app.

## Publishing

The hub's static tools can be hosted by GitHub Pages. Quake Quest should remain on an app-capable host, with the hub linking to its public address. This keeps the project inexpensive, easy to update and able to use live BGS data.

### First upload

1. Sign in to GitHub and create a new empty repository. Do not add a README or template there.
2. Copy the repository's HTTPS address.
3. Right-click `PUBLISH-TO-GITHUB.ps1`, choose **Run with PowerShell**, and paste that address.
4. On the repository page, open **Settings → Pages**. Choose **Deploy from a branch**, `main`, and `/(root)`.

### Later updates

Run `PUBLISH-TO-GITHUB.ps1` again. It records and uploads only the changed files; GitHub Pages then refreshes the public hub automatically.
