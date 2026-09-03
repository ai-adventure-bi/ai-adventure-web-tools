# Mix-a-Monster

A dependency-free, static flip-flap character mixer. Open `index.html` in a browser to use it; no installation or build process is needed.

## Recommended workflow: prepare, then mix

Use **Prepare a character** before adding artwork to the mixer. Upload a T-pose image and position it behind the on-screen T-pose guide with the size, left/right and up/down controls. The neck and waist cut lines can also be moved with their controls or dragged directly on the guide. The guide and lines are not included in the finished result.

From there you can either:

- choose **Add to flip-flap library** to save the standardized transparent PNG into this browser's mixer immediately; or
- choose **Save prepared PNG** to download `flip-flap-character.png`, ready to add later using the regular upload button or to place into `library/` for a shared website.

Prepared characters are standardized on a compact 800 × 800 square canvas. On export, your chosen neck and waist regions are gently fitted into the common head, torso/arms and leg bands (35.5% and 62.5%), so every prepared character still aligns reliably in the mixer.

## Add images

**Fastest:** press **Add character pictures** and pick one or more files. They stay saved in that browser (using IndexedDB), even after a refresh.

Use **Save this monster** to download the current head, torso and legs combination as a single 800 × 800 PNG.

Choose **Manage library** and press **Remove** on a character to hide it permanently from that browser's flip book. Browser-added images are also deleted from browser storage. A shared-library source file remains safely in `library/`; delete that file and run `./make-library-index.ps1` too if you want to remove it from the shared website itself.

**Shared website library:** copy image files into `library/` with any filenames, then run this from the project folder in PowerShell:

```powershell
./make-library-index.ps1
```

It automatically writes the list used by the app. Host the folder with any static host (or a small local web server) for the shared library to load. The folder needs no renaming or hand-editing.

## Artwork tips

For the most convincing combinations, use front-facing, full-body T-poses. Transparent PNGs work especially nicely; plain backgrounds also work. The preparation studio does not remove a photo background — it standardizes size and placement.
