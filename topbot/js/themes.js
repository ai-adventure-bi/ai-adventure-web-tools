import * as THREE from '../vendor/three.module.js';
import {meshSolid} from './sculpture.js';
import {
  handleRadius,
  integratedTotemRadius,
  dolphinTailField
} from './theme-handle.js';


/* =========================================================
   TOPBOT THEMES
   ========================================================= */

export const forms = {
  galactic: [
    'pulsar',
    'orbital',
    'tesseract',
    'pyramid',
    'helix',
    'nova',
    'armillary'
  ],

  terra: [
    'droplet',
    'shell',
    'cloud',
    'tree',
    'seed',
    'feather',
    'blossom',
    'coral',
    'pinecone'
  ]
};


export const themeDefaults = {
  theme: 'atlantis',
  form: 'pulsar',

  radialScale: 1,
  radialDepth: 4,
  radialCount: 8,
  profileHeight: 1,

  /*
   * These are intentionally much chunkier than the original
   * 2.8–5 mm structures.
   *
   * The aim is stronger prints, more mass, and more overlap
   * between neighbouring structural members.
   */
  structureWall: 5.5,

  structureGap: 1,
  structureTwist: .35,
  structureLayers: 3,

  /*
   * false = open skeletal structure
   * true  = same structure plus a unioned solid interior
   *
   * Old recipes which do not contain this property are
   * treated as open structures by validateTheme().
   */
  structureFilled: true
};


export const themeRules = {
  radialScale: [.7, 1.3],
  radialDepth: [0, 8],
  radialCount: [4, 12],
  profileHeight: [.7, 1.3],

  /*
   * PRINT-SAFE STRUCTURAL RANGE
   */
  structureWall: [4.5, 8],

  structureGap: [.65, 1.35],
  structureTwist: [-1, 1],
  structureLayers: [2, 4]
};


export function validateTheme(p) {

  /*
   * Reopen very early Galactic recipes.
   */
  if (
    p.form === 'gyroscope' &&
    p.theme === 'galactic'
  ) {
    p.form = 'pulsar';
  }


  /*
   * Backwards compatibility for recipes made before the
   * Filled Interior option existed.
   */
  if (p.structureFilled === undefined) {
    p.structureFilled = true;
  }

  /*
 * Upgrade older Galactic / Terra recipes made before
 * the stronger 4.5–8 mm structural range was introduced.
 *
 * Rather than rejecting an old 2.8–4.5 mm design, bring its
 * struts up to the new printable minimum automatically.
 */
if (
  p.theme !== 'atlantis' &&
  Number.isFinite(p.structureWall) &&
  p.structureWall < themeRules.structureWall[0]
) {
  p.structureWall =
    themeRules.structureWall[0];
}


  if (
    !['atlantis', 'galactic', 'terra']
      .includes(p.theme)
  ) {
    throw Error('Unknown design theme.');
  }


  if (
    p.theme !== 'atlantis' &&
    !forms[p.theme].includes(p.form)
  ) {
    throw Error(
      'Form does not belong to this theme.'
    );
  }


  for (
    const [key, [lo, hi]]
    of Object.entries(themeRules)
  ) {

    if (
      !Number.isFinite(p[key]) ||
      p[key] < lo ||
      p[key] > hi
    ) {
      throw Error(
        `${key} must be between ${lo} and ${hi}.`
      );
    }
  }


  for (
    const key of [
      'radialCount',
      'structureLayers'
    ]
  ) {
    if (!Number.isInteger(p[key])) {
      throw Error(
        `${key} must be a whole number.`
      );
    }
  }


  if (
    typeof p.structureFilled !== 'boolean'
  ) {
    throw Error(
      'structureFilled must be true or false.'
    );
  }
}


export const formNotes = {

  /* GALACTIC */

  pulsar:
    'A recessed equatorial ring carried by swept radial arches.',

  orbital:
    'Two suspended orbital decks with open space and connecting pylons.',

  tesseract:
    'A compact nested cube frame linked at all eight corners. Fourfold symmetry.',

  pyramid:
    'A terraced square space frame with an open interior. Fourfold symmetry.',

  helix:
    'Twisting structural ribbons spiral upward around the central axis.',

  nova:
    'A dense stellar core throws swept radial rays outward like an exploding star.',

  armillary:
    'Crossing orbital rings form a compact astronomical cage around the centre.',


  /* TERRA */

  droplet:
    'A whorl of open teardrop loops around a living core.',

  shell:
    'Nested flared shell lips with curling radial ribs.',

  cloud:
    'Two branching wreaths of soft cloud lobes.',

  tree:
    'A central trunk with repeated forked boughs and rounded buds.',

  seed:
    'Split seed-pod ribs enclosing a visible central kernel.',

  feather:
    'Swept feather spines with paired, rounded barbs.',

  blossom:
    'Layered organic petals radiate from a dense central flower core.',

  coral:
    'Branching coral arms rise outward from a sturdy shared base.',

  pinecone:
    'Overlapping spiral scales build a compact seed-like organic body.'
};


/* =========================================================
   UNIONED THEME GEOMETRY
   =========================================================

   All structural pieces are represented as solid fields
   BEFORE triangulation.

   This is important for printing: overlapping struts become
   one printable body rather than intersecting STL shells.

   Dimensions are millimetres.
   ========================================================= */

export function themeSolid(p) {

  const probes = [];
  const parts = [];

  const R =
    p.bodyDiameter *
    .5 *
    p.radialScale;


  /*
   * Tesseract used to force approximately R × 1.8 height,
   * which made it dramatically taller than the other forms.
   *
   * It is now deliberately squat and compact.
   */
  const tesseractHeight =
    R * .92 * p.profileHeight;


  const H =
    Math.max(
      16,

      p.bodyHeight *
      p.profileHeight *
      (
        p.form === 'seed'
          ? 1.45
          : 1
      ),

      p.form === 'tesseract'
        ? tesseractHeight
        : 0
    ) *
    p.structureGap;


  const W = p.structureWall;
  const N = p.radialCount;
  const T = p.structureTwist;
  const D = p.radialDepth / 8;


  const shape = (bounds, fn) => {
    parts.push({
      bounds,
      fn
    });
  };


  const radial = (a, r, y) => [
    Math.cos(a) * r,
    y,
    Math.sin(a) * r
  ];


  function ball(
    x,
    y,
    z,
    rx,
    ry = rx,
    rz = rx
  ) {

    shape(
      [
        x - rx - 1,
        x + rx + 1,

        y - ry - 1,
        y + ry + 1,

        z - rz - 1,
        z + rz + 1
      ],

      (a, b, c) =>
        Math.min(rx, ry, rz) *
        (
          Math.hypot(
            (a - x) / rx,
            (b - y) / ry,
            (c - z) / rz
          ) - 1
        )
    );
  }


  function segment(
    a,
    b,
    r = W / 2
  ) {

    probes.push({
      point: a.map(
        (x, i) =>
          (x + b[i]) / 2
      ),
      radius: r
    });


    const v =
      b.map(
        (x, i) =>
          x - a[i]
      );


    const ll =
      v.reduce(
        (sum, x) =>
          sum + x * x,
        0
      );


    const pad = r + 1;


    shape(
      [
        Math.min(a[0], b[0]) - pad,
        Math.max(a[0], b[0]) + pad,

        Math.min(a[1], b[1]) - pad,
        Math.max(a[1], b[1]) + pad,

        Math.min(a[2], b[2]) - pad,
        Math.max(a[2], b[2]) + pad
      ],

      (x, y, z) => {

        const dx = x - a[0];
        const dy = y - a[1];
        const dz = z - a[2];


        const t =
          ll
            ? Math.max(
                0,
                Math.min(
                  1,
                  (
                    dx * v[0] +
                    dy * v[1] +
                    dz * v[2]
                  ) / ll
                )
              )
            : 0;


        return Math.hypot(
          dx - t * v[0],
          dy - t * v[1],
          dz - t * v[2]
        ) - r;
      }
    );
  }


  const path = (
    fn,
    r = W / 2,
    steps = 24
  ) => {

    let a = fn(0);

    for (
      let i = 1;
      i <= steps;
      i++
    ) {
      const b =
        fn(i / steps);

      segment(a, b, r);

      a = b;
    }
  };


  const ring = (
    r,
    y,
    w = W / 2
  ) => {

    shape(
      [
        -r - w - 1,
        r + w + 1,

        y - w - 1,
        y + w + 1,

        -r - w - 1,
        r + w + 1
      ],

      (x, h, z) =>
        Math.hypot(
          Math.hypot(x, z) - r,
          h - y
        ) - w
    );
  };


  /*
   * Atlantis-style rounded tip.
   *
   * This profile does not scale with the height of the
   * Galactic/Terra structure.
   */
  const tipRadius = y => {

    const u =
      y + p.tipLength;

    const c =
      p.stemDiameter * .12;


    if (u < 0) {
      return 0;
    }


    if (u < .7) {
      return (
        c *
        Math.sqrt(
          Math.max(
            0,
            1 -
            (
              (.7 - u) /
              .7
            ) ** 2
          )
        )
      );
    }


    return (
      c +
      (
        p.stemDiameter * .43 -
        c
      ) *
      Math.min(
        1,
        (u - .7) /
        (p.tipLength - .7)
      )
    );
  };


  const neck =
    p.stemDiameter * .43;


  /*
   * Permanent central spine.
   *
   * Every theme structure intersects this so there is always
   * a continuous path from tip to handle.
   */
  shape(
    [
      -neck - 1,
      neck + 1,

      -p.tipLength - 1,
      H + 1,

      -neck - 1,
      neck + 1
    ],

    (x, y, z) =>
      Math.max(
        Math.hypot(x, z) -
        (
          y < 0
            ? tipRadius(y)
            : neck
        ),

        -p.tipLength - y,
        y - H
      )
  );


  const loops = (
    fn,
    r = W / 2
  ) => {

    for (
      let i = 0;
      i < N;
      i++
    ) {
      path(
        t =>
          fn(
            i * 2 * Math.PI / N,
            t
          ),
        r
      );
    }
  };


  /* =======================================================
     GALACTIC
     ======================================================= */

  if (p.form === 'orbital') {

    const low = H * .23;
    const high = H * .83;

    const outer = R * .91;

    const inner =
      R * (.58 + .22 * D);


    ring(
      outer,
      low
    );


    ring(
      inner,
      high
    );


    loops(
      (a, t) =>
        radial(
          a + T * .6 * t,
          neck +
          (outer - neck) * t,
          low * t
        )
    );


    loops(
      (a, t) =>
        radial(
          a +
          T * .6 +
          T * .65 * t,

          outer +
          (inner - outer) * t,

          low +
          (high - low) * t
        )
    );


    loops(
      (a, t) =>
        radial(
          a + T * 1.25,
          inner * (1 - t),
          high +
          (H - high) * t
        )
    );

  }


  else if (p.form === 'pulsar') {

    ring(
      R * .9,
      H * .45,
      W * .65
    );


    ring(
      R * (.53 + .15 * D),
      H * .67
    );


    loops(
      (a, t) =>
        radial(
          a +
          T *
          Math.sin(Math.PI * t),

          R *
          .9 *
          Math.sin(Math.PI * t),

          H * t
        )
    );

  }


  else if (
    p.form === 'tesseract' ||
    p.form === 'pyramid'
  ) {

    const square = (s, y) =>
      Array.from(
        {length: 4},

        (_, i) =>
          radial(
            Math.PI / 4 +
            i * Math.PI / 2,

            s,
            y
          )
      );


    const connectSquare = q => {

      q.forEach(
        (a, i) =>
          segment(
            a,
            q[(i + 1) % 4]
          )
      );
    };


    if (p.form === 'tesseract') {

      /*
       * Shorter proportions than the original.
       */
      const outer = [
        square(
          R * .94,
          H * .17
        ),

        square(
          R * .94,
          H * .83
        )
      ];


      const innerSize =
        R * (.4 + .2 * D);


      const inner = [
        square(
          innerSize,
          H * .35
        ),

        square(
          innerSize,
          H * .65
        )
      ];


      for (
        const q
        of [
          ...outer,
          ...inner
        ]
      ) {
        connectSquare(q);
      }


      for (
        let i = 0;
        i < 4;
        i++
      ) {

        segment(
          outer[0][i],
          outer[1][i]
        );


        segment(
          inner[0][i],
          inner[1][i]
        );


        for (
          let k = 0;
          k < 2;
          k++
        ) {

          segment(
            outer[k][i],
            inner[k][i]
          );


          segment(
            inner[k][i],
            [
              0,
              k ? H : 0,
              0
            ]
          );
        }
      }

    } else {

      const base =
        square(
          R * .94,
          H * .16
        );


      connectSquare(base);


      for (
        let i = 0;
        i < 4;
        i++
      ) {

        segment(
          base[i],
          [0, H, 0]
        );


        segment(
          [0, 0, 0],
          base[i]
        );
      }


      for (
        let k = 1;
        k < p.structureLayers;
        k++
      ) {

        const t =
          k / p.structureLayers;


        connectSquare(
          square(
            R * .94 * (1 - t),
            H * (.16 + .84 * t)
          )
        );
      }
    }

  }


  else if (p.form === 'helix') {

    /*
     * Multiple chunky helical ribs.
     *
     * All ribs begin close enough to the centre to union with
     * the central spine.
     */
    loops(
      (a, t) => {

        const envelope =
          Math.sin(Math.PI * t);

        const r =
          neck +
          (
            R * (.78 + .14 * D) -
            neck
          ) *
          envelope;


        return radial(
          a +
          T * 2.4 * t +
          Math.PI * 1.35 * t,

          r,

          H * t
        );
      },

      W * .56
    );


    ring(
      R * (.58 + .12 * D),
      H * .5,
      W * .55
    );

  }


  else if (p.form === 'nova') {

    /*
     * Dense central star with curved rays.
     */
    ball(
      0,
      H * .48,
      0,

      Math.max(
        neck * 1.6,
        R * .2
      ),

      H * .18,

      Math.max(
        neck * 1.6,
        R * .2
      )
    );


    loops(
      (a, t) => {

        const wave =
          Math.sin(Math.PI * t);


        return radial(
          a +
          T *
          .9 *
          wave,

          neck +
          (
            R * .94 -
            neck
          ) *
          wave,

          H *
          (
            .08 +
            .82 * t
          )
        );
      },

      W * .6
    );


    ring(
      R * (.55 + .13 * D),
      H * .48,
      W * .58
    );

  }


  else if (p.form === 'armillary') {

    /*
     * Horizontal equator.
     */
    ring(
      R * .84,
      H * .48,
      W * .56
    );


    /*
     * Several vertical great-circle-like cages.
     */
    const ringCount =
      Math.max(
        4,
        Math.min(8, N)
      );


    for (
      let i = 0;
      i < ringCount;
      i++
    ) {

      const base =
        i *
        Math.PI /
        ringCount;


      path(
        t => {

          const a =
            t * Math.PI * 2;


          const x =
            Math.cos(a) *
            R * .78;


          const y =
            H * .5 +
            Math.sin(a) *
            H * .4;


          const z =
            Math.sin(
              base +
              T * .2
            ) *
            Math.cos(a) *
            R * .78;


          const xx =
            x *
            Math.cos(base) -
            z *
            Math.sin(base);


          const zz =
            x *
            Math.sin(base) +
            z *
            Math.cos(base);


          return [
            xx,
            y,
            zz
          ];
        },

        W * .52,
        48
      );
    }


    ball(
      0,
      H * .5,
      0,

      Math.max(
        neck * 1.4,
        W
      )
    );

  }


  /* =======================================================
     TERRA
     ======================================================= */

  else if (p.form === 'droplet') {

    loops(
      (a, t) =>
        radial(
          a + T * t,

          R *
          Math.sin(Math.PI * t) *
          (.98 - .25 * t),

          H * t
        ),

      W * .56
    );


    ball(
      0,
      H * .45,
      0,

      neck * 1.55,
      H * .23,
      neck * 1.55
    );

  }


  else if (p.form === 'shell') {

    for (
      let k = 0;
      k < p.structureLayers;
      k++
    ) {

      const f =
        k /
        (p.structureLayers - 1);


      const rr =
        R * (.95 - .35 * f);


      const yy =
        H * (.25 + .65 * f);


      path(
        t => {

          const a =
            t * 2 * Math.PI;


          return radial(
            a,

            rr *
            (
              1 +
              .045 *
              Math.cos(N * a)
            ),

            yy +
            W *
            .28 *
            Math.cos(N * a)
          );
        },

        W * .58,

        Math.max(
          96,
          N * 16
        )
      );


      loops(
        (a, t) =>
          radial(
            a + T * t,
            rr * t,

            yy -
            H *
            .22 *
            Math.sin(Math.PI * t)
          ),

        W / 2
      );
    }

  }


  else if (p.form === 'cloud') {

    for (
      let k = 0;
      k < 2;
      k++
    ) {

      for (
        let i = 0;
        i < N;
        i++
      ) {

        const a =
          2 * Math.PI * i / N +
          k * Math.PI / N;


        const r =
          R * (k ? .48 : .7);


        const y =
          H * (k ? .77 : .35);


        const q =
          radial(
            a,
            r,
            y
          );


        segment(
          [0, y, 0],
          q,
          W * .65
        );


        const size =
          Math.max(
            W,
            R * (.16 + .07 * D)
          );


        ball(
          ...q,
          size,
          size * (k ? .75 : .85),
          size
        );
      }
    }

  }


  else if (p.form === 'tree') {

    loops(
      (a, t) =>
        radial(
          a + T * t,
          R * .86 * t,
          H * (.14 + .62 * t)
        ),

      W * .58
    );


    for (
      let i = 0;
      i < N;
      i++
    ) {

      for (
        const side
        of [-1, 1]
      ) {

        const a =
          i *
          2 *
          Math.PI /
          N;


        path(
          t =>
            radial(
              a +
              T * .6 +
              side *
              (.14 + .16 * D) *
              t,

              R *
              (.51 + .38 * t),

              H *
              (.51 + .42 * t)
            )
        );


        const q =
          radial(
            a +
            T * .6 +
            side *
            (.14 + .16 * D),

            R * .89,
            H * .93
          );


        ball(
          ...q,
          W * .72,
          W,
          W * .72
        );
      }
    }

  }


  else if (p.form === 'seed') {

    ball(
      0,
      H * .48,
      0,

      Math.min(
        R * .34,
        neck * 2
      ),

      H * .32,

      Math.min(
        R * .34,
        neck * 2
      )
    );


    for (
      const side
      of [-1, 1]
    ) {

      loops(
        (a, t) =>
          radial(
            a +
            T *
            .5 *
            Math.sin(Math.PI * t) +
            side *
            (.08 + .13 * D) *
            Math.sin(Math.PI * t),

            R *
            .87 *
            Math.sin(Math.PI * t) ** .8,

            H * t
          ),

        W * .52
      );
    }

  }


  else if (p.form === 'feather') {

    const spine =
      (a, t) =>
        radial(
          a + T * t,
          R * .94 * t,
          H * (.18 + .65 * t)
        );


    for (
      let i = 0;
      i < N;
      i++
    ) {

      const a =
        i *
        2 *
        Math.PI /
        N;


      path(
        t =>
          spine(a, t),
        W * .55
      );


      segment(
        [0, 0, 0],
        spine(a, 0)
      );


      for (
        let j = 1;
        j <=
        p.structureLayers + 1;
        j++
      ) {

        const t =
          j /
          (p.structureLayers + 2);


        const q =
          spine(a, t);


        for (
          const side
          of [-1, 1]
        ) {

          path(
            u => {

              const r =
                R *
                .94 *
                (t + .17 * u);


              return radial(
                a +
                T * t +
                side *
                (.16 + .13 * D) *
                u,

                r,

                q[1] +
                H * .14 * u
              );
            },

            W / 2,
            8
          );
        }
      }
    }

  }


  else if (p.form === 'blossom') {

    /*
     * Two overlapping petal layers.
     */
    for (
      let layer = 0;
      layer < 2;
      layer++
    ) {

      const offset =
        layer *
        Math.PI /
        N;


      for (
        let i = 0;
        i < N;
        i++
      ) {

        const a =
          i *
          2 *
          Math.PI /
          N +
          offset;


        path(
          t => {

            const petal =
              Math.sin(Math.PI * t);


            return radial(
              a +
              T *
              .35 *
              petal,

              neck +
              (
                R *
                (layer ? .7 : .94) -
                neck
              ) *
              petal,

              H *
              (
                .18 +
                .62 * t +
                (layer ? .12 : 0)
              )
            );
          },

          W * .58
        );
      }
    }


    ball(
      0,
      H * .5,
      0,

      Math.max(
        W * 1.15,
        R * .19
      ),

      H * .18,

      Math.max(
        W * 1.15,
        R * .19
      )
    );

  }


  else if (p.form === 'coral') {

    /*
     * A thick lower collar gives all branches a shared,
     * printable foundation.
     */
    ring(
      R * .42,
      H * .22,
      W * .72
    );


    for (
      let i = 0;
      i < N;
      i++
    ) {

      const a =
        i *
        2 *
        Math.PI /
        N;


      const root =
        radial(
          a,
          R * .38,
          H * .2
        );


      segment(
        [0, H * .12, 0],
        root,
        W * .68
      );


      for (
        const side
        of [-1, 1]
      ) {

        path(
          t =>
            radial(
              a +
              side *
              (.12 + .18 * D) *
              t +
              T * .35 * t,

              R *
              (
                .38 +
                .48 * t
              ),

              H *
              (
                .2 +
                .66 * t
              )
            ),

          W * .58
        );


        const bud =
          radial(
            a +
            side *
            (.12 + .18 * D) +
            T * .35,

            R * .86,
            H * .86
          );


        ball(
          ...bud,
          W * .72,
          W * .9,
          W * .72
        );
      }
    }

  }


  else if (p.form === 'pinecone') {

    /*
     * Staggered rings of chunky overlapping scales.
     */
    const rows =
      p.structureLayers + 2;


    for (
      let row = 0;
      row < rows;
      row++
    ) {

      const t =
        row /
        Math.max(
          1,
          rows - 1
        );


      const y =
        H *
        (.18 + .67 * t);


      const envelope =
        .38 +
        .55 *
        Math.sin(
          Math.PI *
          (.12 + .76 * t)
        );


      const rr =
        R * envelope;


      const offset =
        row *
        (
          Math.PI /
          N +
          T * .15
        );


      for (
        let i = 0;
        i < N;
        i++
      ) {

        const a =
          i *
          2 *
          Math.PI /
          N +
          offset;


        const inner =
          radial(
            a,
            Math.max(
              neck,
              rr * .48
            ),
            y - H * .08
          );


        const outer =
          radial(
            a,
            rr,
            y
          );


        segment(
          inner,
          outer,
          W * .62
        );


        ball(
          ...outer,
          W * .7,
          W * .5,
          W * .82
        );
      }


      ring(
        Math.max(
          neck * 1.2,
          rr * .5
        ),
        y - H * .06,
        W * .52
      );
    }

  }


/* =======================================================
   OPTIONAL FILLED INTERIOR
   =======================================================

   Filled mode now fills the ACTUAL envelope described by
   each wireframe instead of inserting a generic inner blob.

   The original struts remain in place and are unioned with
   these solids, so they read as an exoskeleton sitting on
   the surface of the filled form.
   ======================================================= */

if (
  p.theme !== 'atlantis' &&
  p.structureFilled
) {

  /*
   * Helper: add a rotationally symmetrical filled body.
   *
   * radiusAt(y) describes the outer radius of the form at
   * any particular height.
   */
  const radialFill = (
    yMin,
    yMax,
    radiusAt
  ) => {

    shape(
      [
        -R - W - 2,
        R + W + 2,

        yMin - 1,
        yMax + 1,

        -R - W - 2,
        R + W + 2
      ],

      (x, y, z) => {

        const radius =
          Math.max(
            neck,
            radiusAt(y)
          );


        return Math.max(
          Math.hypot(x, z) - radius,
          yMin - y,
          y - yMax
        );
      }
    );
  };


  /* -------------------------------------------------------
     TESSERACT

     Only the INNER cube is filled.
     The outer cube remains an open exoskeleton.
     ------------------------------------------------------- */

  if (p.form === 'tesseract') {

    const innerHalf =
      R * (.4 + .2 * D);


    const low =
      H * .35;


    const high =
      H * .65;


    shape(
      [
        -innerHalf - 1,
        innerHalf + 1,

        low - 1,
        high + 1,

        -innerHalf - 1,
        innerHalf + 1
      ],

      (x, y, z) =>
        Math.max(
          Math.abs(x) - innerHalf,
          Math.abs(z) - innerHalf,
          low - y,
          y - high
        )
    );

  }


  /* -------------------------------------------------------
     PYRAMID

     Fill follows the actual taper of the pyramid frame.
     ------------------------------------------------------- */

 else if (p.form === 'pyramid') {

  /*
   * The wireframe square is generated using radial()
   * with its corners at 45 degrees.
   *
   * R * .94 is therefore the CENTRE-TO-CORNER radius,
   * not the square's half-width.
   *
   * Convert that diagonal radius into the actual
   * X/Z half-width so the solid meets the wireframe.
   */

  const bottom =
    H * .16;

  const top =
    H;

  const cornerRadius =
    R * .94;

  const baseHalf =
    cornerRadius / Math.sqrt(2);


  shape(
    [
      -baseHalf - W,
      baseHalf + W,

      bottom - W,
      top + W,

      -baseHalf - W,
      baseHalf + W
    ],

    (x, y, z) => {

      const t =
        (y - bottom) /
        (top - bottom);


      /*
       * At the bottom:
       * half = exact half-width of the wireframe square.
       *
       * At the top:
       * half = 0 at the pyramid apex.
       */
      const half =
        baseHalf *
        (1 - t);


      return Math.max(

        Math.abs(x) - half,

        Math.abs(z) - half,

        bottom - y,

        y - top

      );
    }
  );

}


  /* -------------------------------------------------------
     PULSAR

     Follows the swept radial arches:
     narrow at top/bottom, broadest around the middle.
     ------------------------------------------------------- */

  else if (p.form === 'pulsar') {

    radialFill(
      0,
      H,

      y => {

        const t =
          y / H;


        return (
          R *
          .9 *
          Math.sin(
            Math.PI * t
          )
        );
      }
    );

  }


  /* -------------------------------------------------------
     ORBITAL

     The frame describes a broad lower orbital body which
     narrows toward its upper deck.
     ------------------------------------------------------- */

  else if (p.form === 'orbital') {

    const low =
      H * .23;


    const high =
      H * .83;


    const outer =
      R * .91;


    const inner =
      R *
      (.58 + .22 * D);


    radialFill(
      0,
      H,

      y => {

        if (y <= low) {

          return (
            neck +
            (outer - neck) *
            (y / low)
          );
        }


        if (y <= high) {

          const t =
            (y - low) /
            (high - low);


          return (
            outer +
            (inner - outer) *
            t
          );
        }


        const t =
          (y - high) /
          (H - high);


        return (
          inner *
          (1 - t)
        );
      }
    );

  }


  /* -------------------------------------------------------
     HELIX

     The helix has a spindle-shaped envelope. The solid
     reaches the spiral ribs instead of floating inside them.
     ------------------------------------------------------- */

  else if (p.form === 'helix') {

    const outer =
      R *
      (.78 + .14 * D);


    radialFill(
      0,
      H,

      y => {

        const t =
          y / H;


        return (
          neck +
          (outer - neck) *
          Math.sin(
            Math.PI * t
          )
        );
      }
    );

  }


  /* -------------------------------------------------------
     NOVA

     Same broad stellar envelope traced by the curved rays.
     ------------------------------------------------------- */

  else if (p.form === 'nova') {

    radialFill(
      H * .08,
      H * .9,

      y => {

        const t =
          (
            y -
            H * .08
          ) /
          (H * .82);


        return (
          neck +
          (R * .94 - neck) *
          Math.sin(
            Math.PI * t
          )
        );
      }
    );

  }


  /* -------------------------------------------------------
     ARMILLARY

     Fill the sphere/ellipsoid enclosed by the great-circle
     rings. The rings remain visible on its surface.
     ------------------------------------------------------- */

  else if (p.form === 'armillary') {

    const cy =
      H * .5;


    const ry =
      H * .4;


    const rx =
      R * .78;


    shape(
      [
        -rx - 1,
        rx + 1,

        cy - ry - 1,
        cy + ry + 1,

        -rx - 1,
        rx + 1
      ],

      (x, y, z) => {

        const yy =
          (y - cy) / ry;


        const available =
          rx *
          Math.sqrt(
            Math.max(
              0,
              1 - yy * yy
            )
          );


        return Math.max(
          Math.hypot(x, z) -
          available,

          cy - ry - y,
          y - cy - ry
        );
      }
    );

  }


  /* -------------------------------------------------------
     DROPLET

     Uses the exact radial profile of the droplet loops.
     ------------------------------------------------------- */

  else if (p.form === 'droplet') {

    radialFill(
      0,
      H,

      y => {

        const t =
          y / H;


        return (
          R *
          Math.sin(
            Math.PI * t
          ) *
          (.98 - .25 * t)
        );
      }
    );

  }


  /* -------------------------------------------------------
     SHELL

     Broad lower shell which progressively narrows upward,
     following the nested shell lips.
     ------------------------------------------------------- */

  else if (p.form === 'shell') {

    const bottom =
      H * .2;


    const top =
      H * .92;


    radialFill(
      bottom,
      top,

      y => {

        const t =
          Math.max(
            0,
            Math.min(
              1,
              (y - bottom) /
              (top - bottom)
            )
          );


        return (
          R *
          (
            .95 -
            .38 * t
          )
        );
      }
    );

  }


  /* -------------------------------------------------------
     CLOUD

     Instead of one central egg, use the actual two levels
     of overlapping cloud lobes.

     Their overlap produces one continuous cloud-like body.
     ------------------------------------------------------- */

  else if (p.form === 'cloud') {

    for (
      let k = 0;
      k < 2;
      k++
    ) {

      for (
        let i = 0;
        i < N;
        i++
      ) {

        const a =
          2 *
          Math.PI *
          i /
          N +
          k *
          Math.PI /
          N;


        const r =
          R *
          (
            k
              ? .48
              : .7
          );


        const y =
          H *
          (
            k
              ? .77
              : .35
          );


        const q =
          radial(
            a,
            r,
            y
          );


        const size =
          Math.max(
            W * 1.15,
            R *
            (
              .2 +
              .08 * D
            )
          );


        ball(
          ...q,

          size,

          size *
          (
            k
              ? .85
              : .95
          ),

          size
        );
      }
    }


    /*
     * Central mass joins all cloud lobes together.
     */
    ball(
      0,
      H * .52,
      0,

      R * .48,
      H * .32,
      R * .48
    );

  }


  /* -------------------------------------------------------
     TREE

     Fill follows the widening trunk / canopy profile rather
     than placing an unrelated sphere inside it.
     ------------------------------------------------------- */

  else if (p.form === 'tree') {

    radialFill(
      H * .12,
      H * .94,

      y => {

        const t =
          (
            y -
            H * .12
          ) /
          (H * .82);


        return (
          neck +
          R *
          .84 *
          Math.pow(
            Math.max(
              0,
              t
            ),
            .85
          )
        );
      }
    );

  }


  /* -------------------------------------------------------
     SEED

     Fill the complete pod envelope traced by the seed ribs.
     ------------------------------------------------------- */

  else if (p.form === 'seed') {

    radialFill(
      0,
      H,

      y => {

        const t =
          y / H;


        return (
          R *
          .87 *
          Math.pow(
            Math.max(
              0,
              Math.sin(
                Math.PI * t
              )
            ),
            .8
          )
        );
      }
    );

  }


  /* -------------------------------------------------------
     FEATHER

     The feather structure grows outward as it rises.
     This produces a filled swept body reaching its spines.
     ------------------------------------------------------- */

  else if (p.form === 'feather') {

    radialFill(
      H * .16,
      H * .88,

      y => {

        const t =
          (
            y -
            H * .16
          ) /
          (H * .72);


        return (
          neck +
          (
            R * .94 -
            neck
          ) *
          Math.max(
            0,
            Math.min(
              1,
              t
            )
          )
        );
      }
    );

  }


  /* -------------------------------------------------------
     BLOSSOM

     Fill the petal envelope itself: narrow at centre/top,
     widest through the middle of the petals.
     ------------------------------------------------------- */

  else if (p.form === 'blossom') {

    const bottom =
      H * .18;


    const top =
      H * .92;


    radialFill(
      bottom,
      top,

      y => {

        const t =
          (
            y -
            bottom
          ) /
          (top - bottom);


        return (
          neck +
          (
            R * .9 -
            neck
          ) *
          Math.sin(
            Math.PI * t
          )
        );
      }
    );

  }


  /* -------------------------------------------------------
     CORAL

     Coral is intentionally less blob-like:
     thickened branch volumes follow each actual branch.
     ------------------------------------------------------- */

  else if (p.form === 'coral') {

    for (
      let i = 0;
      i < N;
      i++
    ) {

      const a =
        i *
        2 *
        Math.PI /
        N;


      for (
        const side
        of [-1, 1]
      ) {

        path(
          t =>
            radial(
              a +
              side *
              (.12 + .18 * D) *
              t +
              T * .35 * t,

              R *
              (
                .28 +
                .58 * t
              ),

              H *
              (
                .18 +
                .68 * t
              )
            ),

          W * 1.05
        );
      }
    }


    ball(
      0,
      H * .28,
      0,

      R * .4,
      H * .18,
      R * .4
    );

  }


  /* -------------------------------------------------------
     PINECONE

     Filled pinecone follows the same compact seed envelope
     used by the staggered scale rows.
     ------------------------------------------------------- */

  else if (p.form === 'pinecone') {

    radialFill(
      H * .12,
      H * .9,

      y => {

        const t =
          (
            y -
            H * .12
          ) /
          (H * .78);


        return (
          R *
          (
            .3 +
            .62 *
            Math.sin(
              Math.PI *
              (
                .08 +
                .84 * t
              )
            )
          )
        );
      }
    );

  }

}
  /* =======================================================
     HANDLE / TOTEM
     =======================================================

     Same character-radius system as Atlantis.

     The dolphin tail uses its own centred two-fluke field.
     All other characters use the original integrated radial
     totem functions.
     ======================================================= */

  const has =
    p.topperStyle !== 'none';


  const share =
    has
      ? Math.min(
          .72,
          Math.max(
            .45,
            p.topperHeight / 42
          )
        )
      : 0;


  const grip =
    p.stemHeight *
    (1 - share);


  const top =
    H + p.stemHeight;


  const bound =
    Math.max(
      p.topperWidth * .65,
      p.stemDiameter * 1.4
    ) + 3;


  if (
    p.topperStyle ===
    'dolphinTail'
  ) {

        /*
     * Sink the dolphin tail into the handle by 3 mm.
     *
     * This deliberately overlaps the two solids so the narrow
     * base of the tail is buried inside the grip rather than
     * sitting on top of it as a fragile neck.
     */
    const dolphinOverlap = 3;

    parts.push(
      dolphinTailField(
        THREE,
        p,
        H + grip - dolphinOverlap,
        p.stemHeight - grip + dolphinOverlap
      )
    );
  }


  shape(
    [
      -bound,
      bound,

      H - .5,
      top + 1,

      -bound,
      bound
    ],

    (x, y, z) => {

      if (
        p.topperStyle ===
        'dolphinTail'
      ) {

        return Math.max(
          Math.hypot(x, z) -
          handleRadius(
            p.handleStyle,

            Math.max(
              0,
              Math.min(
                1,
                (y - H) / grip
              )
            ),

            p,
            Math.atan2(z, x)
          ),

          H - .5 - y,
          y - H - grip
        );
      }


      const a =
        Math.atan2(z, x);


      const u =
        y - H;


      let r;


      if (u <= grip) {

        r =
          handleRadius(
            p.handleStyle,

            Math.max(
              0,
              u / grip
            ),

            p,
            a
          );

      } else {

        const t =
          Math.min(
            1,
            (u - grip) /
            (
              p.stemHeight -
              grip
            )
          );


        r =
          integratedTotemRadius(
            p,
            t,
            a,
            p.stemDiameter / 2
          );
      }


      /*
       * Round off the plain handle when no character is
       * active.
       */
      if (
        !has &&
        u >
        p.stemHeight - .7
      ) {

        r *=
          Math.sqrt(
            Math.max(
              0,
              1 -
              (
                (
                  u -
                  p.stemHeight +
                  .7
                ) /
                .7
              ) ** 2
            )
          );
      }


      return Math.max(
        Math.hypot(x, z) - r,
        H - .5 - y,
        y - top
      );
    }
  );


  return {
    parts,
    H,
    W,
    tipRadius,
    probes
  };
}


/* =========================================================
   BUILD TRIANGULATED GEOMETRY
   ========================================================= */

export function buildThemeGeometry(p, preview = false) {

  const {
    parts,
    H,
    W
  } = themeSolid(p);


    /*
   * Galactic / Terra use volumetric solid modelling.
   *
   * While a child is actively dragging a slider we use a
   * coarser temporary grid. This is dramatically cheaper to
   * calculate and exists only as an on-screen preview.
   *
   * Finished geometry and STL exports continue to use the
   * original 0.6 mm grid.
   */
  const gridStep =
    preview
      ? 1.2
      : .6;


  const g =
    meshSolid(
      parts,

      {
        family: p.form,
        wall: W
      },

      gridStep
    );


  g.userData = {
    ...g.userData,

    theme: p.theme,
    bodyHeight: H,

    nominalMinimumStrut: W,

    structureFilled:
      !!p.structureFilled,

    tipProfile:
      'Atlantis rounded',

    requiresSupports: true
  };


  /*
   * UVs retain the existing paint/material pipeline.
   *
   * Filament colour itself is spatial rather than UV-based.
   */
  const pos =
    g.attributes.position;


  const uv =
    new Float32Array(
      pos.count * 2
    );


  for (
    let i = 0;
    i < pos.count;
    i++
  ) {

    uv[i * 2] =
      Math.atan2(
        pos.getZ(i),
        pos.getX(i)
      ) /
      (Math.PI * 2) +
      .5;


    uv[i * 2 + 1] =
      (
        pos.getY(i) +
        p.tipLength
      ) /
      (
        H +
        p.stemHeight +
        p.tipLength
      );
  }


  g.setAttribute(
    'uv',
    new THREE.BufferAttribute(
      uv,
      2
    )
  );


  return g;
}