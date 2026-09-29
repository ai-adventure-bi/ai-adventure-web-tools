import {
  forms,
  formNotes
} from './themes.js';

import * as THREE from 'three';

import {
  palette
} from './design.js';


export function installStudio(api) {

  const panel =
    document.createElement('section');


  panel.className = 'studio';

  panel.setAttribute(
    'aria-label',
    'TopBot design studio'
  );


  panel.innerHTML = `

    <h2>Make it yours</h2>

    <!--
      THEME SELECTOR

      This deliberately sits OUTSIDE the expandable
      Design section so Atlantis / Galactic / Terra are
      always visible.
    -->

    <div
      class="theme-tabs theme-tabs-main"
      role="tablist"
      aria-label="Design theme"
    >

      <button
        type="button"
        role="tab"
        data-theme="atlantis"
      >
        Atlantis
      </button>

      <button
        type="button"
        role="tab"
        data-theme="galactic"
      >
        Galactic
      </button>

      <button
        type="button"
        role="tab"
        data-theme="terra"
      >
        Terra
      </button>

    </div>


    <!-- DESIGN -->

    <details
      id="designSection"
      class="studio-section"
      name="settings-box"
    >

      <summary>
        Design
      </summary>


      <!-- GALACTIC / TERRA CONTROLS -->

      <div
        id="themeFields"
        hidden
      >

        <label>
          Form
          <select id="themeForm"></select>
        </label>


        <label class="fill-shape-toggle">
          <input
            id="structureFilled"
            type="checkbox"
          >

          <span>
            <strong>Fill shape</strong>
            <small>Make the inside solid</small>
          </span>
        </label>


        <label>
          Radial width

          <output
            id="radialScaleValue"
          ></output>

          <input
            id="radialScale"
            type="range"
            min="0.7"
            max="1.3"
            step="0.05"
          >
        </label>


        <label>

          <span id="detailLabel">
            Form fullness
          </span>

          <output
            id="radialDepthValue"
          ></output>

          <input
            id="radialDepth"
            type="range"
            min="0"
            max="8"
            step="1"
          >

        </label>


        <label>
          Repeated features

          <output
            id="radialCountValue"
          ></output>

          <input
            id="radialCount"
            type="range"
            min="4"
            max="12"
            step="1"
          >
        </label>


        <label>
          Profile height

          <output
            id="profileHeightValue"
          ></output>

          <input
            id="profileHeight"
            type="range"
            min="0.7"
            max="1.3"
            step="0.05"
          >
        </label>


        <!--
          STRUCTURE THICKNESS

          Increased from 2.8–5 mm to 4.5–8 mm.
        -->

        <label>
          Strut thickness (mm)

          <output
            id="structureWallValue"
          ></output>

          <input
            id="structureWall"
            type="range"
            min="4.5"
            max="8"
            step="0.25"
          >
        </label>


        <label>
          Layer spacing

          <output
            id="structureGapValue"
          ></output>

          <input
            id="structureGap"
            type="range"
            min="0.65"
            max="1.35"
            step="0.05"
          >
        </label>


        <label>
          Growth / sweep

          <output
            id="structureTwistValue"
          ></output>

          <input
            id="structureTwist"
            type="range"
            min="-1"
            max="1"
            step="0.05"
          >
        </label>


        <label>
          Layers / branches

          <output
            id="structureLayersValue"
          ></output>

          <input
            id="structureLayers"
            type="range"
            min="2"
            max="4"
            step="1"
          >
        </label>


        <p
          id="formNote"
          class="fine-print"
        ></p>


        <p class="fine-print">
          Open structures need supports.
          Strut thickness is measured in millimetres.
          Filled mode keeps the outer structure but adds
          a single joined interior body.
        </p>

      </div>

    </details>


    <!-- JSON -->

    <details
      id="jsonSection"
      class="studio-section"
      name="settings-box"
    >

      <summary>
        JSON
      </summary>

    </details>


    <!-- COLOURS -->

    <details
      id="colourSection"
      class="studio-section"
    >

      <summary>
        Colours &amp; Paint
      </summary>


      <div class="studio-row">

        <label>
          Our filament

          <select id="filament">

            <option value="white">
              White PLA
            </option>

            <option value="pastelRainbow">
              Glow in the dark rainbow filament
            </option>

            <option value="vividRainbow">
              Vivid Rainbow PLA
            </option>

          </select>

        </label>


        <button
          id="rainbow"
          class="purple"
        >
          🌈 Randomise Rainbow
        </button>

      </div>


      <p
        id="legacyColourNote"
        class="fine-print"
      >
        Original recipe colour is shown until you choose a filament.
      </p>


      <p class="fine-print">
        Rainbow previews use a fixed sequence with a random
        starting colour. Real printed bands will vary.
      </p>


      <details id="paintPanel">

        <summary>
          🎨 Paint your top
        </summary>


        <p>
          Choose Paint to brush.
          Choose Rotate to reach another side.
        </p>


        <div class="studio-row">

          <button
            id="paintToggle"
            aria-pressed="false"
          >
            Paint
          </button>

          <button
            id="rotatePaint"
            aria-pressed="true"
          >
            Rotate
          </button>

        </div>


        <div class="studio-row">

          <label>
            Colour

            <input
              id="paintColour"
              type="color"
              value="#ff784e"
            >
          </label>


          <label>
            Brush size

            <input
              id="paintSize"
              type="range"
              min=".5"
              max="12"
              step=".5"
              value="3"
            >
          </label>

        </div>


        <div
          class="swatches"
          id="swatches"
        ></div>


        <div class="studio-row">

          <button
            id="erasePaint"
            aria-pressed="false"
          >
            Eraser
          </button>

          <button id="undoPaint">
            Undo stroke
          </button>

          <button id="clearPaint">
            Clear paint
          </button>

          <button id="paintGuide">
            ↓ Painting guide
          </button>

        </div>


        <p id="paintStatus">
          Painting is saved in the design file,
          never in STL geometry.
        </p>

      </details>

    </details>


    <!-- SAVE / LOAD -->

    <div class="studio-row">

      <button id="saveDesign">
        ↓ Save design
      </button>


      <label class="file-button">

        Open design

        <input
          id="loadDesign"
          type="file"
          accept=".json,application/json"
        >

      </label>

    </div>
  `;


  const control =
    document.querySelector('.control');


  control.prepend(panel);


  const $ =
    id =>
      panel.querySelector(
        '#' + id
      );


  const get =
    () =>
      api.get();


  /* =======================================================
     THEME BUTTONS
     ======================================================= */

  $('designSection').append(
    document.querySelector(
      '#controlsEditor'
    )
  );


  for (
    const button
    of panel.querySelectorAll(
      '[data-theme]'
    )
  ) {

    button.onclick = () => {

      const p = get();

      const oldTheme =
        p.theme;


      p.theme =
        button.dataset.theme;


      p.experimentalEnabled =
        false;


      /*
       * Only reset the form when actually moving into a
       * different non-Atlantis theme.
       *
       * This prevents clicking an already-selected theme
       * from unnecessarily destroying the current form.
       */
      if (
        p.theme !== 'atlantis' &&
        oldTheme !== p.theme
      ) {
        p.form =
          forms[p.theme][0];

        if (p.structureFilled === undefined) {
          p.structureFilled = true;
        }
      }


      api.set(p);
    };
  }


  $('themeForm').onchange =
    e => {

      const p = get();

      p.form =
        e.target.value;

      api.set(p);
    };


  $('structureFilled').onchange =
    e => {

      const p = get();

      p.structureFilled =
        e.target.checked;

      api.set(p);
    };


  /* =======================================================
     GALACTIC / TERRA SLIDERS
     ======================================================= */

    /*
   * Galactic / Terra interactive preview.
   *
   * Dragging uses the cheaper temporary geometry.
   * Releasing the slider generates the proper 0.6 mm model.
   *
   * The short debounce also prevents dozens of expensive
   * rebuilds being queued while a finger moves across an iPad.
   */
  let themePreviewTimer = null;


  for (
    const key
    of [
      'radialScale',
      'radialDepth',
      'radialCount',
      'profileHeight',
      'structureWall',
      'structureGap',
      'structureTwist',
      'structureLayers'
    ]
  ) {

    const input = $(key);


    input.oninput =
      e => {

        const p = get();

        p[key] =
          Number(
            e.target.value
          );


        /*
         * Update the number immediately even before the
         * expensive 3D preview has finished rebuilding.
         */
        const output =
          $(key + 'Value');

        if (output) {
          output.textContent =
            Number(
              p[key].toFixed(2)
            );
        }


        clearTimeout(
          themePreviewTimer
        );


        themePreviewTimer =
          setTimeout(
            () => {

              if (api.preview) {
                api.preview(p);
              } else {
                api.set(p);
              }

            },

            90
          );
      };


    input.onchange =
      e => {

        clearTimeout(
          themePreviewTimer
        );


        const p = get();

        p[key] =
          Number(
            e.target.value
          );


        /*
         * Finger/mouse released:
         * build the proper final-quality geometry once.
         */
        api.set(p);
      };
  }


  /* =======================================================
     JSON
     ======================================================= */

  const json =
    document.querySelector('#json');


  $('jsonSection').append(json);

  json.classList.remove('hidden');


  $('jsonSection').append(
    document.querySelector(
      '#regenerate'
    )
  );


  /* =======================================================
     EXISTING QUICK CONTROLS
     ======================================================= */

  const quick =
    document.querySelector(
      '.quick-controls'
    );


  control.insertBefore(
    quick,
    document.querySelector(
      '.message'
    )
  );


  document.querySelector(
    '#topperQuickField'
  ).hidden = false;


  for (
    const sel
    of [
      '.editor-tabs',
      '.editor-window',
      '.toy-select'
    ]
  ) {

    control.querySelector(sel).hidden =
      true;
  }


  control
    .querySelector(
      ':scope > .section-head'
    )
    ?.remove();


  control
    .querySelector('.legend')
    ?.remove();


  $('colourSection')
    .setAttribute(
      'name',
      'settings-box'
    );


  $('colourSection').append(
    $('saveDesign').parentElement
  );


  /* =======================================================
     MOVE CORE COLOUR INTO COLOURS & PAINT
     ======================================================= */

  const coreColourInput =
    document.querySelector(
      '#param-color'
    );


  if (coreColourInput) {

    const coreColourField =
      coreColourInput.closest('label') ||
      coreColourInput.parentElement;


    if (coreColourField) {

      const colourHome =
        document.createElement(
          'div'
        );


      colourHome.className =
        'studio-core-colour';


      const heading =
        document.createElement(
          'h3'
        );


      heading.textContent =
        'Design colour';


      colourHome.append(
        heading,
        coreColourField
      );


      $('colourSection')
        .insertBefore(
          colourHome,
          $('legacyColourNote')
        );
    }
  }


  /* =======================================================
     ONLY ONE MAIN SETTINGS BOX OPEN AT A TIME
     ======================================================= */

  panel.addEventListener(
    'toggle',

    e => {

      const opened =
        e.target;


      if (
        !opened.open ||
        !opened.getAttribute('name')
      ) {
        return;
      }


      for (
        const other
        of panel.querySelectorAll(
          'details[name]'
        )
      ) {

        if (
          other !== opened &&
          other.getAttribute('name') ===
          opened.getAttribute('name')
        ) {
          other.open = false;
        }
      }
    },

    true
  );


  /* =======================================================
     PAINT STATE
     ======================================================= */

  let paintOn = false;

  let erasing = false;

  let down = false;

  let activePointer = null;

  let history = [];

  let lastHit = null;

  let lastGeometry = null;

  let lastMaterial = '';

  let lastPaint = [];

  let baseColours = null;

    let lastPainted = null;


  $('filament').onchange =
    e => {

      const p = get();

      p.material =
        e.target.value;

      api.set(p);
    };


  $('rainbow').onclick =
    () => {

      const p = get();

      p.rainbowPhase =
        Math.random();

      api.set(p);
    };


  $('colourSection').ontoggle =
    () => {

      if (
        !$('colourSection').open
      ) {
        setPaint(false);
      }
    };


  function paintData() {

    const p = get();

    return p.design
      ? p.design.paint
      : (
          p.paint ||
          {
            strokes: []
          }
        );
  }


  function storePaint(strokes) {

    const p = get();


    if (p.design) {

      p.design.paint = {
        strokes
      };

    } else {

      p.paint = {
        strokes
      };
    }


    api.write(p);

    applyMaterial();
  }


  function setPaint(on) {

    paintOn = on;

    api.controls.enabled =
      !on;

    api.stopSpin();


    $('paintToggle')
      .setAttribute(
        'aria-pressed',
        on
      );


    $('rotatePaint')
      .setAttribute(
        'aria-pressed',
        !on
      );


    api.canvas.style.cursor =
      on
        ? 'crosshair'
        : 'grab';
  }


  $('paintToggle').onclick =
    () =>
      setPaint(true);


  $('rotatePaint').onclick =
    () =>
      setPaint(false);


  $('paintPanel').ontoggle =
    () => {

      if (
        !$('paintPanel').open
      ) {
        setPaint(false);
      }
    };


  $('erasePaint').onclick =
    () => {

      erasing =
        !erasing;


      $('erasePaint')
        .setAttribute(
          'aria-pressed',
          erasing
        );
    };


  /* =======================================================
     PAINT SWATCHES
     ======================================================= */

  for (
    const col
    of [
      '#ff784e',
      '#f4cf57',
      '#45b779',
      '#42bddd',
      '#775be8',
      '#f093c1',
      '#ffffff',
      '#17231d'
    ]
  ) {

    const b =
      document.createElement(
        'button'
      );


    b.style.background =
      col;


    b.setAttribute(
      'aria-label',
      `Paint ${col}`
    );


    b.onclick =
      () => {

        $('paintColour').value =
          col;


        erasing = false;


        $('erasePaint')
          .setAttribute(
            'aria-pressed',
            'false'
          );
      };


    $('swatches').append(b);
  }


  $('undoPaint').onclick =
    () => {

      if (history.length) {
        storePaint(
          history.pop()
        );
      }
    };


  $('clearPaint').onclick =
    () => {

      history.push(
        structuredClone(
          paintData().strokes
        )
      );


      storePaint([]);
    };


  /* =======================================================
     PAINT RAYCASTING
     ======================================================= */

  const ray =
    new THREE.Raycaster();


  const mouse =
    new THREE.Vector2();


  function dab(e) {

    const mesh =
      api.mesh();


    if (!mesh) {
      return;
    }


    const rect =
      api.canvas
        .getBoundingClientRect();


    mouse.set(
      (
        e.clientX -
        rect.left
      ) /
      rect.width *
      2 -
      1,

      -(
        e.clientY -
        rect.top
      ) /
      rect.height *
      2 +
      1
    );


    ray.setFromCamera(
      mouse,
      api.camera
    );


    mesh.updateWorldMatrix(
      true,
      false
    );


    const hit =
      ray.intersectObject(mesh)[0];


    if (!hit) {
      return;
    }


    const local =
      mesh.worldToLocal(
        hit.point.clone()
      );


    const size =
      +$('paintSize').value;


    if (
      lastHit &&
      local.distanceTo(lastHit) <
      size * .2
    ) {
      return;
    }


    lastHit =
      local.clone();


    let strokes =
      paintData().strokes;


    if (erasing) {

      strokes =
        strokes.filter(
          s =>
            new THREE.Vector3(
              ...s.p
            )
              .distanceTo(local) >
            size +
            s.size * .3
        );

    } else {

      if (
        strokes.length >=
        1500
      ) {

        $('paintStatus')
          .textContent =
          'Your paint page is full. Erase or clear some paint to keep going.';

        return;
      }


      strokes = [
        ...strokes,

        {
          p:
            local.toArray(),

          size,

          color:
            $('paintColour')
              .value
        }
      ];
    }


    storePaint(strokes);
  }


  api.canvas.addEventListener(
    'pointerdown',

    e => {

      if (
        !paintOn ||
        down
      ) {
        return;
      }


      e.preventDefault();

      e.stopImmediatePropagation();


      history.push(
        structuredClone(
          paintData().strokes
        )
      );


      if (
        history.length >
        25
      ) {
        history.shift();
      }


      down = true;

      activePointer =
        e.pointerId;

      lastHit = null;


      api.canvas
        .setPointerCapture(
          e.pointerId
        );


      dab(e);
    },

    true
  );


  api.canvas.addEventListener(
    'pointermove',

    e => {

      if (
        paintOn &&
        down &&
        e.pointerId ===
        activePointer
      ) {

        e.preventDefault();

        dab(e);
      }
    },

    true
  );


  for (
    const ev
    of [
      'pointerup',
      'pointercancel',
      'lostpointercapture'
    ]
  ) {

    api.canvas.addEventListener(
      ev,

      e => {

        if (
          e.pointerId ===
          activePointer
        ) {

          down = false;

          activePointer = null;

          lastHit = null;
        }
      },

      true
    );
  }


  /* =======================================================
     MATERIAL / PAINT APPLICATION
     ======================================================= */

  function applyMaterial() {

    const p = get();

    const d =
      p.design;

    const mesh =
      api.mesh();


    if (!mesh) {
      return;
    }


    const material =
      d?.material ||
      p.material ||
      'legacy';


    const phase =
      d?.rainbowPhase ??
      p.rainbowPhase ??
      0;


    const strokes =
      paintData().strokes;


    const g =
      mesh.geometry;


    const pos =
      g.attributes.position;


    const key =
      material +
      phase +
      p.color;


    const same =
      g === lastGeometry &&
      key === lastMaterial;


    let incremental =
      same &&
      strokes.length ===
      lastPaint.length + 1 &&
      strokes
        .slice(0, -1)
        .every(
          (v, i) =>
            JSON.stringify(v) ===
            JSON.stringify(
              lastPaint[i]
            )
        );


    if (!same) {

      g.computeBoundingBox();


      baseColours =
        new Float32Array(
          pos.count * 3
        );


      const seq =
        (
          material === 'legacy'
            ? [p.color]
            : (
                palette[material] ||
                palette.white
              )
        )
          .map(
            c =>
              new THREE.Color(c)
          );


      for (
        let i = 0;
        i < pos.count;
        i++
      ) {

        const u =
          (
            (
              (
                pos.getY(i) -
                g.boundingBox.min.y
              ) /
              52 +
              phase
            ) %
            1 +
            1
          ) %
          1 *
          seq.length;


        const j =
          Math.floor(u);


        const c =
          seq[j]
            .clone()
            .lerp(
              seq[
                (j + 1) %
                seq.length
              ],

              u - j
            );


        baseColours.set(
          [
            c.r,
            c.g,
            c.b
          ],

          i * 3
        );
      }
    }


    const painted =
      new Float32Array(
        incremental
          ? lastPainted
          : baseColours
      );


    for (
      const s
      of (
        incremental
          ? strokes.slice(-1)
          : strokes
      )
    ) {

      const c =
        new THREE.Color(
          s.color
        );


      const r2 =
        s.size * s.size;


      for (
        let i = 0;
        i < pos.count;
        i++
      ) {

        const dx =
          pos.getX(i) -
          s.p[0];


        const dy =
          pos.getY(i) -
          s.p[1];


        const dz =
          pos.getZ(i) -
          s.p[2];


        if (
          dx * dx +
          dy * dy +
          dz * dz <
          r2
        ) {

          painted.set(
            [
              c.r,
              c.g,
              c.b
            ],

            i * 3
          );
        }
      }
    }


    g.setAttribute(
      'color',

      new THREE.BufferAttribute(
        painted,
        3
      )
    );


    mesh.material.color
      .set('#ffffff');


    mesh.material.vertexColors =
      true;


    mesh.material.needsUpdate =
      true;


    lastGeometry =
      g;

    lastMaterial =
      key;

    lastPaint =
      strokes;

    lastPainted =
      painted;
  }


  /* =======================================================
     UI SYNC
     ======================================================= */

  function sync() {

    const p = get();


    /*
     * Theme tabs.
     */
    for (
      const button
      of panel.querySelectorAll(
        '[data-theme]'
      )
    ) {

      const active =
        button.dataset.theme ===
        p.theme;


      button.setAttribute(
        'aria-selected',
        active
      );


      button.classList.toggle(
        'active',
        active
      );
    }


    /*
     * Atlantis uses the original controls.
     *
     * Galactic / Terra expose the structural controls.
     */
    $('themeFields').hidden =
      p.theme === 'atlantis';


    document.querySelector(
      '#controlsEditor'
    ).hidden = false;


    for (
      const group
      of document.querySelectorAll(
        '#controlsEditor > details'
      )
    ) {

      group.hidden =
        p.theme !== 'atlantis' &&
        ![
          'Core body',
          'Handle',
          'Totem'
        ].includes(
          group
            .querySelector('summary')
            .textContent
        );
    }


    if (
      p.theme !== 'atlantis'
    ) {

      /*
       * Missing structureFilled values are treated as ON.
       * Explicit false remains OFF.
       */
      $('structureFilled').checked =
        p.structureFilled !== false;


      const form =
        $('themeForm');


      form.replaceChildren();


      for (
        const name
        of forms[p.theme]
      ) {

        const option =
          document.createElement(
            'option'
          );


        option.value =
          name;


        option.textContent =
          name[0]
            .toUpperCase() +
          name.slice(1);


        form.append(option);
      }


      form.value =
        p.form;


      $('formNote').textContent =
        formNotes[p.form] || '';


      /*
       * Form-specific controls.
       */
      const square =
        [
          'tesseract',
          'pyramid'
        ].includes(p.form);


      $('radialCount')
        .closest('label')
        .hidden =
        square;


      $('structureTwist')
        .closest('label')
        .hidden =
        square ||
        p.form === 'cloud';


      $('structureLayers')
        .closest('label')
        .hidden =
        ![
          'pyramid',
          'shell',
          'feather',
          'coral',
          'pinecone'
        ].includes(p.form);


      $('radialDepth')
        .closest('label')
        .hidden =
        [
          'pyramid',
          'shell',
          'droplet'
        ].includes(p.form);


      /*
       * More useful names for the generic Detail slider.
       */
      $('detailLabel')
        .textContent =
        ({
          orbital:
            'Upper deck radius',

          pulsar:
            'Inner ring radius',

          tesseract:
            'Inner cube size',

          helix:
            'Helix spread',

          nova:
            'Core / ray spread',

          armillary:
            'Orbit fullness',

          cloud:
            'Cloud fullness',

          tree:
            'Branch spread',

          seed:
            'Pod opening',

          feather:
            'Barb spread',

          blossom:
            'Petal spread',

          coral:
            'Branch spread',

          pinecone:
            'Scale fullness'
        })[p.form] ||
        'Form fullness';


      /*
       * Slider values.
       */
      for (
        const key
        of [
          'radialScale',
          'radialDepth',
          'radialCount',
          'profileHeight',
          'structureWall',
          'structureGap',
          'structureTwist',
          'structureLayers'
        ]
      ) {

        $(key).value =
          p[key];


        $(key + 'Value')
          .textContent =
          Number(
            p[key].toFixed(2)
          );
      }


      /*
       * Fill Shape defaults to ON when the property
       * is missing, while still respecting explicit OFF.
       */
      $('structureFilled').checked =
        p.structureFilled !== false;
    }

        /*
     * Filament controls.
     */
    $('filament').value =
      p.material ||
      'white';


    $('legacyColourNote').hidden =
      !!p.material;


    $('rainbow').hidden =
      p.material === 'white';


    /*
     * Character quick field.
     *
     * The actual OFF / ON state is controlled by app.js.
     */
    document.querySelector(
      '#topperQuickField'
    ).hidden = false;


    applyMaterial();
  }


  /* =======================================================
     SAVE DESIGN
     ======================================================= */

  function save(
    blob,
    name
  ) {

    const a =
      document.createElement('a');


    a.href =
      URL.createObjectURL(blob);


    a.download =
      name;


    a.click();


    setTimeout(
      () =>
        URL.revokeObjectURL(
          a.href
        ),

      1500
    );
  }


  $('saveDesign').onclick =
    () =>
      save(
        new Blob(
          [
            JSON.stringify(
              get(),
              null,
              2
            )
          ],

          {
            type:
              'application/json'
          }
        ),

        'topbot-design.json'
      );


  /* =======================================================
     LOAD DESIGN
     ======================================================= */

  $('loadDesign').onchange =
    async e => {

      try {

        const f =
          e.target.files[0];


        if (!f) {
          return;
        }


        if (
          f.size >
          1500000
        ) {
          throw Error(
            'That design file is too large.'
          );
        }


        const p =
          JSON.parse(
            await f.text()
          );


        const converted =
          !!p.design ||
          p.version === 2;


        api.set(p);


        if (converted) {

          document.querySelector(
            '.message'
          ).textContent =
            'Older design converted to an Atlantis top. Colour retained; paint cleared for the changed shape.';
        }


        history = [];

      } catch (err) {

        api.error(
          err.message
        );
      }


      e.target.value = '';
    };


  /* =======================================================
     PAINTING GUIDE
     ======================================================= */

  $('paintGuide').onclick =
    () => {

      api.stopSpin();


      const mesh =
        api.mesh();


      if (!mesh) {
        return;
      }


      const output =
        document.createElement(
          'canvas'
        );


      output.width =
        1600;

      output.height =
        1300;


      const ctx =
        output.getContext('2d');


      const oldPosition =
        api.camera.position.clone();


      const oldTarget =
        api.controls.target.clone();


      const oldAspect =
        api.camera.aspect;


      ctx.fillStyle =
        '#fffdf6';


      ctx.fillRect(
        0,
        0,
        1600,
        1300
      );


      ctx.fillStyle =
        '#17231d';


      ctx.font =
        'bold 36px sans-serif';


      ctx.fillText(
        'TopBot — my painting guide',
        45,
        55
      );


      const box =
        new THREE.Box3()
          .setFromObject(mesh);


      const centre =
        box.getCenter(
          new THREE.Vector3()
        );


      const size =
        box
          .getSize(
            new THREE.Vector3()
          )
          .length() *
        1.65;


      const views = [
        [
          'Front',
          0,
          .25,
          1
        ],

        [
          'Back',
          0,
          .25,
          -1
        ],

        [
          'Top',
          0,
          1,
          .001
        ],

        [
          'Side',
          1,
          .25,
          0
        ]
      ];


      views.forEach(
        (
          [
            label,
            x,
            y,
            z
          ],
          i
        ) => {

          api.camera.position
            .copy(centre)
            .add(
              new THREE.Vector3(
                x,
                y,
                z
              )
                .normalize()
                .multiplyScalar(
                  size
                )
            );


          api.camera.lookAt(
            centre
          );


          api.renderer.render(
            api.scene,
            api.camera
          );


          const col =
            i % 2;


          const row =
            Math.floor(i / 2);


          const factor =
            Math.min(
              760 /
              api.canvas.width,

              530 /
              api.canvas.height
            );


          const vw =
            api.canvas.width *
            factor;


          const vh =
            api.canvas.height *
            factor;


          ctx.drawImage(
            api.canvas,

            col * 800 +
            20 +
            (760 - vw) / 2,

            row * 590 +
            95 +
            (530 - vh) / 2,

            vw,
            vh
          );


          ctx.fillStyle =
            '#17231d';


          ctx.font =
            'bold 25px sans-serif';


          ctx.fillText(
            label,

            col * 800 + 35,

            row * 590 + 85
          );
        }
      );


      api.camera.position
        .copy(oldPosition);


      api.camera.aspect =
        oldAspect;


      api.controls.target
        .copy(oldTarget);


      api.camera.lookAt(
        oldTarget
      );


      api.camera
        .updateProjectionMatrix();


      api.renderer.render(
        api.scene,
        api.camera
      );


      output.toBlob(
        blob =>
          save(
            blob,
            'topbot-painting-guide.png'
          )
      );
    };


  /* =======================================================
     FILAMENT PREVIEW
     ======================================================= */

  function previewMaterial(
    material,
    phase = 0,
    showPaint = true
  ) {

    const p =
      get();


    const mesh =
      api.mesh();


    if (!mesh) {
      return;
    }


    const g =
      mesh.geometry;


    const pos =
      g.attributes.position;


    g.computeBoundingBox();


    const colours =
      new Float32Array(
        pos.count * 3
      );


    const seq =
      (
        palette[material] ||
        palette.white
      )
        .map(
          c =>
            new THREE.Color(c)
        );


    /*
     * Build the chosen filament appearance.
     */
    for (
      let i = 0;
      i < pos.count;
      i++
    ) {

      const u =
        (
          (
            (
              (
                pos.getY(i) -
                g.boundingBox.min.y
              ) /
              52 +
              phase
            ) %
            1
          ) +
          1
        ) %
        1 *
        seq.length;


      const j =
        Math.floor(u);


      const c =
        seq[j]
          .clone()
          .lerp(
            seq[
              (j + 1) %
              seq.length
            ],

            u - j
          );


      colours.set(
        [
          c.r,
          c.g,
          c.b
        ],

        i * 3
      );
    }


    /*
     * White filament can show the child's actual paint.
     * Rainbow filament deliberately does not.
     */
    if (showPaint) {

      const strokes =
        paintData().strokes;


      for (
        const s
        of strokes
      ) {

        const c =
          new THREE.Color(
            s.color
          );


        const r2 =
          s.size *
          s.size;


        for (
          let i = 0;
          i < pos.count;
          i++
        ) {

          const dx =
            pos.getX(i) -
            s.p[0];


          const dy =
            pos.getY(i) -
            s.p[1];


          const dz =
            pos.getZ(i) -
            s.p[2];


          if (
            dx * dx +
            dy * dy +
            dz * dz <
            r2
          ) {

            colours.set(
              [
                c.r,
                c.g,
                c.b
              ],

              i * 3
            );
          }
        }
      }
    }


    g.setAttribute(
      'color',

      new THREE.BufferAttribute(
        colours,
        3
      )
    );


    mesh.material.color
      .set('#ffffff');


    mesh.material.vertexColors =
      true;


    mesh.material.needsUpdate =
      true;
  }


  /* =======================================================
     PUBLIC STUDIO API
     ======================================================= */

  return {
    sync,
    applyMaterial,
    previewMaterial
  };
}