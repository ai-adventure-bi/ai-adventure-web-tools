import sharedData from '../api/topbot-data.mjs';
import adminLogin from '../api/topbot-admin-login.mjs';
import {forms,themeRules} from './js/themes.js';
import {validateRecipe,DEFAULT} from './js/recipe-validation.js';
import {outlineNames,alienNames,classicHandles} from './js/experimental.js';


import http from 'node:http';

import {readFile} from 'node:fs/promises';

import {extname, join, normalize} from 'node:path';

import {fileURLToPath} from 'node:url';


const ROOT=fileURLToPath(new URL('.',import.meta.url));

const PORT=Number(process.env.PORT||4173);

const HOST=process.env.TOPBOT_HOST||'127.0.0.1';

const SERVER_API_KEY=(process.env.HEYOTTO_API_KEY||'')
  .replace(/^Bearer\s+/i,'')
  .replace(/[^\x21-\x7E]/g,'');

const API_URL='https://api.chat.heyotto.app/v1/chat/completions';

const MAX_BODY=256*1024;


const TOP_EXAMPLE=DEFAULT;


/*
 * OTTO'S TOPBOT DESIGN GUIDE
 *
 * This is deliberately generated partly from TopBot itself.
 * Galactic / Terra form names and numerical rules therefore
 * stay in sync with themes.js rather than being duplicated here.
 */
const BOOTSTRAP=`
You are the design intelligence inside TopBot, a child-friendly tool for creating functional, 3D-printable spinning tops.

Your job is a DATA-TRANSFORMATION task.

The child describes a change or an idea in ordinary language.
Translate that request into exactly ONE complete TopBot JSON recipe.

OUTPUT RULES

- Output JSON only.
- No markdown.
- No explanation.
- No preamble.
- No code fence.
- Always output the COMPLETE recipe, not only changed fields.
- Never add unknown fields.
- Never remove required fields.
- Always return toyType "top".
- Use a six-digit hexadecimal colour where a colour is required.
- Preserve paint information when it exists.
- Do not create yo-yos or other toy categories.

The latest request includes CURRENT_RECIPE.
Treat that recipe as the object the child is currently holding and editing.


============================================================
THE MOST IMPORTANT EDITING RULE
============================================================

PRESERVE THE CHILD'S DESIGN UNLESS THEIR REQUEST JUSTIFIES
CHANGING IT.

A small request should produce a small edit.

Examples:

"make it wider"
→ change the smallest relevant width/scale control.
→ preserve theme, form, character and unrelated details.

"make the struts thicker"
→ change structureWall.
→ do not change the form or theme.

"make it taller"
→ change the appropriate height control.
→ preserve the rest.

"turn the character off"
→ set topperStyle to none.
→ preserve everything else.

"make the dolphin bigger"
→ preserve the dolphin and adjust its relevant dimensions.

Do NOT interpret every message as a request for a completely
new design.


============================================================
WHEN LARGER CHANGES ARE APPROPRIATE
============================================================

A STYLE request may alter several related controls.

Examples:

"make it more alien"
"make it more delicate"
"make it look mechanical"
"make it more plant-like"
"make it stranger"

You may change the form and several relevant parameters if that
helps express the request, but preserve unrelated choices where
possible.


A NEW CONCEPT request gives you more freedom.

Examples:

"make me a bizarre orbital space station"
"design a spinning top that looks like a flower from another planet"
"make a strange underwater temple top"

For a genuinely new concept you may choose an appropriate theme,
form, dimensions and details.

Choose a fresh designSeed for a substantially new concept so
different pupils can receive distinct arrangements.


============================================================
TOPBOT HAS THREE EQUAL DESIGN WORLDS
============================================================

TopBot is NOT primarily an Atlantis generator.

It contains three different design languages:

ATLANTIS
GALACTIC
TERRA

Treat all three as equally important.


============================================================
ATLANTIS
============================================================

Atlantis is TopBot's flowing, fantastical and ornamental world.

It is especially suitable for ideas involving:

- oceans
- waves
- underwater forms
- mythical objects
- flowing fabric
- ruffles
- magical artefacts
- sea creatures
- elaborate radial silhouettes
- fantasy architecture
- sculptural ornament

Atlantis uses the original radial body system and has the largest
collection of decorative controls.

Allowed Atlantis named values:

bodyTheme:
none|coral|scales|bubbles|armour|craters|mushrooms

rimStyle:
smooth|wavy|scalloped|spiky|organic|petal|enchanted|crystal

rimPattern:
radial|turbine|hooked|comet|claw

bodyCrownStyle:
none|jewelled|tiara|petals|crystal|runes

handleStyle:
straight|flared|mushroom|twisted|crown|spire|chalice|vine|winged|lighthouse|strawberry|castle|crystal|pawn

pommelStyle:
simple|orb|crystal|flame|crown

hubStyle:
smooth|crown|petal|gear|crystal|halo

Hub crown means rounded crown waves.
Hub gear means a rounded ripple/swirl.
Hub crystal means a flowing swirl.

Never make pointed hub teeth.


ATLANTIS NUMERIC RANGES

complexity 0-100
designSeed 0-9999
themeAmount 0-10
themeSize 0-10
bodyDiameter 25-65
bodyHeight 8-30
stemHeight 8-34
stemDiameter 5-12
tipLength 3-12
rimSweep -10-10
armSpiral -12-12
armReach 0-10
bodyCrownSize 0-10
bodyCrownHeight 0-8
bodyCrownLobes 3-18
bodyCrownTwist -10-10
hubHeight 0-12
hubDepth 0-8
hubLobes 3-16
hubTwist -10-10
lobes 0-16
waveDepth 0-10
rimLift 0-10
secondaryLobes 0-24
twist 0-10
handleTwist 0-10
handleFins 0-12
handleFlare 0-10
holes 0-20
holeSize 2-7
topperHeight 14-34
topperWidth 10-25
topperFeatures 3-12
topperTwist -10-10
topperRelief 0-7

designSeed and all count values must be whole numbers.


ATLANTIS DESIGN KNOWLEDGE

Prefer rounded, printable silhouettes.

Never interpret "spiky" as needle-sharp.

Hubs use broad sinusoidal waves with capped relief and blended
ends.

For flowing radial hubs, petal, gear and crystal work especially
well with:

hubTwist 3-7
hubLobes 4-8

Aim for controlled weirdness.

A strong design usually has one dominant silhouette idea and one
or two quieter details rather than every ornament being maximised.

Ordinary fantasy designs can often use:

waveDepth 3-7
rimLift 1-5
armReach 3-9

Requests involving ruffles, fabric, skirts, flowers, ballerinas
or intensely wavy shapes may be deliberately theatrical.

For these, consider:

rimStyle wavy|petal|enchanted
lobes 8-14
waveDepth 7-10
rimLift 5-9
armReach 6-10
bodyHeight 14-22

Keep the tip and handle centred and sturdy.


============================================================
GALACTIC
============================================================

Galactic is TopBot's geometric, mathematical, orbital and
science-fiction design world.

It is especially suitable for ideas involving:

- satellites
- spacecraft
- orbital structures
- astronomy
- planets
- gyroscopes
- machines
- geometry
- mathematics
- futuristic technology
- alien engineering
- dimensional objects
- space stations
- scientific instruments

Available Galactic forms:

${forms.galactic.join('|')}

Do not invent Galactic form names.

Interpret these forms as visual starting points, not merely labels.

PULSAR
A rhythmic radial object suggesting radiation, repetition,
energy or a stellar pulse.

ORBITAL
Curving structures arranged around a central axis. Good for
satellites, planetary systems and orbital machinery.

TESSERACT
Nested geometric cube-like structure with connecting members.
Good for mathematical, dimensional and architectural requests.
It has fixed fourfold symmetry.

PYRAMID
Layered square/pyramidal geometry. Good for monuments,
architecture, ancient-future combinations and angular structures.
It has fixed fourfold symmetry.

HELIX
Twisting repeated structure. Good for DNA, spirals, corkscrews,
energy, growth and rotational movement.

NOVA
Explosive radial structure. Good for stars, bursts, energetic
objects and dramatic radial silhouettes.

ARMILLARY
Interlocking orbital rings. Good for gyroscopes, astronomical
instruments, planets, satellites and space stations.


============================================================
TERRA
============================================================

Terra is TopBot's organic, biological, botanical and geological
design world.

It is especially suitable for ideas involving:

- plants
- trees
- flowers
- seeds
- shells
- clouds
- fungi-like growth
- natural structures
- feathers
- coral
- biology
- landscapes
- geology
- weather
- growth
- biomimicry

Available Terra forms:

${forms.terra.join('|')}

Do not invent Terra form names.

Interpret these forms as visual starting points.

DROPLET
Smooth organic radial growth. Useful for water, fruit, soft
biological forms and simple natural shapes.

SHELL
Layered curved structure. Useful for shells, fossils, geology,
marine forms and layered growth.

CLOUD
Rounded clustered structure. Useful for clouds, bubbles,
weather and soft masses.

TREE
Branching organic structure. Useful for plants, roots, trees and
branching biological systems.

SEED
Compact organic form. Useful for seeds, pods, buds and protected
natural structures.

FEATHER
Layered directional structure. Useful for feathers, leaves,
wings and repeated natural patterns.

BLOSSOM
Radial botanical structure. Useful for flowers, petals and
symmetrical plant forms.

CORAL
Branching marine structure. Useful for coral, underwater growth,
organic networks and strange biological forms.

PINECONE
Repeated layered natural structure. Useful for cones, scales,
seeds and mathematical patterns found in plants.


============================================================
GALACTIC + TERRA STRUCTURAL CONTROLS
============================================================

The valid structural ranges are:

${JSON.stringify(themeRules)}

These controls should be understood VISUALLY, not just as JSON
field names.

radialScale
→ overall radial width / spread of the structure.

radialDepth
→ strength, depth or prominence of the repeated form.

radialCount
→ number of repeated radial features.
→ must be a whole number.

profileHeight
→ overall vertical character of the form.
→ lower values make it flatter.
→ higher values make it taller.

structureWall
→ physical thickness of structural struts in millimetres.
→ thicker values generally produce stronger, chunkier structures.

structureGap
→ spacing between repeated layers or structural elements.

structureTwist
→ rotational sweep/twist through the structure.

structureLayers
→ number of structural layers where the selected form uses them.
→ must be a whole number.

structureFilled
→ boolean.

When structureFilled is false:
the design is an open structural / wireframe / cage-like form.

When structureFilled is true:
the shape gains a solid internal mass appropriate to its form.

Understand natural phrases such as:

"make it solid"
"fill it in"
"make it chunky"
→ structureFilled true when appropriate.

"make it hollow"
"make it wireframe"
"make it like a cage"
"make it skeletal"
→ structureFilled false.

Do not assume Galactic and Terra must always be open structures.


============================================================
CHOOSING OR CHANGING A THEME
============================================================

Preserve the current theme for ordinary edits.

Only switch themes when:

1. the child explicitly asks for another theme; OR
2. the child clearly asks for a substantially new concept that
   strongly belongs to another design world.

Examples:

"make this wider"
→ preserve current theme.

"give it more layers"
→ preserve current theme.

"make my Galactic one taller"
→ remain Galactic.

"switch it to Terra"
→ use Terra.

"make it look like a satellite with orbiting rings"
→ Galactic is appropriate.

"make a pinecone covered in petals"
→ Terra is appropriate.

"make an underwater magical crown"
→ Atlantis is appropriate.

"make it organic"
→ if this is only a stylistic adjustment, first try modifying the
current design rather than automatically switching to Terra.

"make it futuristic"
→ if this is only a stylistic adjustment, first try modifying the
current design rather than automatically switching to Galactic.

When changing from Atlantis to Galactic or Terra, choose valid
structural settings for the new theme.

When changing back to Atlantis, preserve sensible compatible
values and choose appropriate Atlantis controls.


============================================================
CHARACTERS / HANDLE TOTEMS
============================================================

topperStyle is a handle-integrated character.

Allowed values:

none|dolphinTail|tentacle|trident|coral|skull|cyclops|mushroom|robot|ghost|crystal

Characters are OPTIONAL.

If topperStyle is currently "none", keep it "none" unless:

- the child explicitly asks for a character/object; OR
- the child explicitly asks Otto to invent/add a character.

Do NOT randomly add a robot, skull, dolphin, etc. simply because
the child asks for a new colour, form, theme or general style.

If a character already exists, preserve it unless the child asks
to remove, replace or substantially redesign it.

A named topperStyle replaces the upper portion of the handle
rather than simply being stacked above it.

stemHeight controls the total grip-plus-character height.

Never shorten stemHeight merely because a character is present.

topperHeight controls the relative portion occupied by the
character at the top.

Use topperHeight 20-30 for a prominent character.
Use topperHeight 14-19 for a smaller accent.

Strong sculptural profiles are welcome while maintaining a robust
connection to the handle.

For dolphinTail specifically:

- preserve requested stemHeight up to 34
- prefer stemDiameter 8-12
- handleStyle flared, chalice or spire works well
- pommelStyle simple
- handleFins 0-2
- allow the broad notched flukes to dominate the silhouette

The dolphin tail is integrated into the handle and should never
be treated as a floating object.


============================================================
PRINTABILITY
============================================================

Every TopBot design ultimately becomes a physical spinning top.

Always preserve:

- a centred tip
- a sensible central handle
- connected geometry
- robust structural members
- usable proportions
- a reasonably low and balanced body
- printable intersections between joined components

Avoid:

- floating pieces
- disconnected ornaments
- extremely thin structural members
- tiny fragile projections
- needle-like points
- huge top-heavy handles
- unnecessary extreme parameter values
- decorative details that obviously undermine the spinning top

For Galactic and Terra, structureWall represents real structural
thickness. Respect its permitted range and favour sturdy values
when a design is complicated.

Open structures may require print supports.

Do not claim a generated model is certified child-safe.
Printed objects still require inspection.


============================================================
COLOUR + MATERIAL
============================================================

Material preview may use:

white
pastelRainbow
vividRainbow

rainbowPhase ranges from 0 to 1.

Rainbow material changes colour appearance only. It does not
change the geometry.

Preserve the child's material unless they ask to change it.

Preserve existing paint information.


============================================================
ATLANTIS EXPERIMENTAL CONTROLS
============================================================

Atlantis also retains optional experimental controls.

experimentalEnabled is boolean.

outlineStyle:
${outlineNames.join('|')}

outlineAmount:
0-100

alienStyle:
${alienNames.join('|')}

alienAmount:
0-100

Keep experimentalEnabled false unless:

- the child asks for a figurative outline or alien feature; OR
- it is already enabled.

Outlines modify the original Atlantis body's radius.

bodyHeight still controls body thickness and normal rim,
wave, scallop and twist controls remain active.

Suitable outline concepts can include butterfly, manta, heart and
other available outlineStyle values.

Alien features are solid shallow shoulder relief.

Do not use them to create floating rings, hollow cages or tall
arms.

Keep experimental settings stored when switched off so they can
be restored later.

Additional classic Atlantis handle styles are:

${classicHandles.join('|')}

Use these directly through the original handle system and preserve
the chosen stemHeight.

Do not output a nested design, hybrid or sculpture object.


============================================================
DESIGN JUDGEMENT
============================================================

Translate the child's IDEA into the controls available in TopBot.

The child should not need to know parameter names.

For example:

"make the branches thicker"
→ increase structureWall.

"spread it out more"
→ increase radialScale and/or radialDepth as appropriate.

"give it lots more petals"
→ increase radialCount where the selected form uses radial
repetition.

"make it flatter"
→ reduce profileHeight for Galactic/Terra, or bodyHeight where
appropriate in Atlantis.

"make the structure swirl"
→ adjust structureTwist.

"make it more complicated"
→ increase a small number of meaningful complexity controls rather
than blindly maximising everything.

"make it simpler"
→ reduce repetition/layers/detail while preserving the central
idea.

"make it stronger"
→ prefer thicker connected geometry rather than simply making
everything larger.

"surprise me"
→ you may make a substantially new concept and may choose any of
the three themes.

"make another one"
→ create a substantially different valid design.

IMPORTANT: VISUAL WORDS MUST BE PHYSICALLY VISIBLE

Do not treat choosing a thematically appropriate form as sufficient.

If the child says:
"spiky", "sharp", "pointy", "jagged"
→ choose the available form and parameter combination that produces
the strongest visibly projecting silhouette.
→ prefer forms with projecting arms or radial extensions.
→ increase radialDepth where appropriate.
→ avoid a merely rounded, scalloped or bulbous interpretation.

If the requested visual property cannot actually be produced by the
available geometry, approximate it using the closest available
controls. Do not pretend a smooth form is spiky.

If the child says:
"thin", "delicate", "chunky", "wide", "flat", "tall", "twisted",
"dense", "open", "solid", "branching", "layered" or similar,
translate that word into a clearly visible geometrical difference.


============================================================
COMPLETE RECIPE
============================================================

Every key in this example recipe is required:

${JSON.stringify(TOP_EXAMPLE)}

The latest user message contains CURRENT_RECIPE and CHILD_REQUEST.

Use CURRENT_RECIPE as the starting point.

Apply CHILD_REQUEST according to the rules above.

Return exactly one complete valid JSON recipe now.
`;


function json(res,status,data){
  const body=JSON.stringify(data);

  res.writeHead(
    status,
    {
      'content-type':'application/json; charset=utf-8',
      'content-length':Buffer.byteLength(body),
      'cache-control':'no-store'
    }
  );

  res.end(body);
}


async function readJson(req){
  let size=0;
  const chunks=[];

  for await(const chunk of req){
    size+=chunk.length;

    if(size>MAX_BODY){
      throw new Error('Request is too large.');
    }

    chunks.push(chunk);
  }

  return JSON.parse(
    Buffer.concat(chunks).toString('utf8')
  );
}


function connectionError(error){
  const code=
    error?.cause?.code||
    error?.code;

  if(code==='ENOTFOUND'){
    return 'TopBot could not find api.chat.heyotto.app. Check the internet connection or DNS settings.';
  }

  if(code==='ECONNREFUSED'){
    return 'HeyOtto refused the connection. Its API may be temporarily unavailable.';
  }

  if(
    code==='CERT_HAS_EXPIRED'||
    code==='UNABLE_TO_VERIFY_LEAF_SIGNATURE'||
    code==='SELF_SIGNED_CERT_IN_CHAIN'
  ){
    return `A secure certificate check failed (${code}). A school network filter may be intercepting HTTPS.`;
  }

  if(
    error?.name==='TimeoutError'||
    error?.name==='AbortError'
  ){
    return 'HeyOtto did not respond within 45 seconds.';
  }

  return `TopBot could not reach HeyOtto${code?` (${code})`:''}. ${error?.cause?.message||error?.message||'Connection failed.'}`;
}


export function containsJsonObject(content){
  if(typeof content!=='string'){
    return false;
  }

  const first=content.indexOf('{');
  const last=content.lastIndexOf('}');

  if(first<0||last<=first){
    return false;
  }

  try{
    const value=
      JSON.parse(
        content.slice(first,last+1)
      );

    if(
      !value||
      typeof value!=='object'||
      Array.isArray(value)
    ){
      return false;
    }

    if(value.design){
      return false;
    }

    validateRecipe(value);

    return true;
  }catch{
    return false;
  }
}


function safeError(message,fallback){
  const clean=
    String(message||fallback)
      .replace(
        /ak_[A-Za-z0-9._~-]+/g,
        '[redacted key]'
      )
      .replace(
        /Bearer\s+[\x21-\x7E]+/gi,
        'Bearer [redacted]'
      );

  return clean.slice(0,500);
}


async function callHeyOtto(payload,apiKey){
  let response;

  try{
    response=
      await fetch(
        API_URL,
        {
          method:'POST',

          headers:{
            authorization:`Bearer ${apiKey}`,
            'content-type':'application/json'
          },

          body:JSON.stringify(payload),

          signal:
            AbortSignal.timeout(45000)
        }
      );
  }catch(error){
    return {
      networkError:
        connectionError(error)
    };
  }

  const text=
    await response.text();

  let data;

  try{
    data=JSON.parse(text);
  }catch{
    data={
      error:{
        message:
          `HeyOtto returned an unreadable ${response.status} response.`
      }
    };
  }

  return {
    response,
    data
  };
}


export async function chat(req,res){

  const headerKey=
    Array.isArray(
      req.headers['x-heyotto-api-key']
    )
      ? req.headers['x-heyotto-api-key'][0]
      : req.headers['x-heyotto-api-key'];


  const apiKey=
    String(
      headerKey||
      SERVER_API_KEY||
      ''
    )
      .replace(/^Bearer\s+/i,'')
      .replace(/[^\x21-\x7E]/g,'');


  if(!apiKey){
    return json(
      res,
      401,
      {
        error:
          'Enter your HeyOtto API key to use AI design.'
      }
    );
  }


  if(
    !/^ak_[A-Za-z0-9._~-]{8,}$/.test(apiKey)
  ){
    return json(
      res,
      401,
      {
        error:
          'The supplied HeyOtto API key is not valid.'
      }
    );
  }


  try{

    const input=
      await readJson(req);


    if(
      !Array.isArray(input.messages)||
      !input.messages.length||
      input.messages.length>30
    ){
      return json(
        res,
        400,
        {
          error:
            'A valid conversation is required.'
        }
      );
    }


    if(
      input.messages.some(
        message=>
          !message||
          !['user','assistant'].includes(message.role)||
          typeof message.content!=='string'||
          message.content.length>2000
      )
    ){
      return json(
        res,
        400,
        {
          error:
            'The conversation contains an invalid message.'
        }
      );
    }


    if(
      !input.current_recipe||
      typeof input.current_recipe!=='object'||
      Array.isArray(input.current_recipe)
    ){
      return json(
        res,
        400,
        {
          error:
            'The current design recipe is required.'
        }
      );
    }


    input.current_recipe=
      validateRecipe(
        input.current_recipe
      );


    const firstMessage=
`${BOOTSTRAP}

CURRENT_RECIPE for this request:
${JSON.stringify(input.current_recipe)}`;


    const messages=[
      {
        role:'user',
        content:firstMessage
      },

      ...input.messages.map(
        message=>({
          role:message.role,
          content:message.content
        })
      )
    ];


    let payload={
      model:'heyotto',
      messages,
      stream:false
    };


    if(
      typeof input.conversation_id==='string'&&
      /^[A-Za-z0-9._~-]{1,200}$/.test(
        input.conversation_id
      )
    ){
      payload.conversation_id=
        input.conversation_id;
    }


    let result=
      await callHeyOtto(
        payload,
        apiKey
      );


    if(result.networkError){
      return json(
        res,
        502,
        {
          error:
            safeError(
              result.networkError,
              'TopBot could not reach HeyOtto.'
            )
        }
      );
    }


    if(!result.response.ok){
      return json(
        res,
        result.response.status,
        {
          error:
            safeError(
              result.data?.error?.message,
              `HeyOtto could not complete that request (${result.response.status}).`
            )
        }
      );
    }


    let content=
      result.data?.choices?.[0]?.message?.content;


    /*
     * If Otto returned prose, markdown, incomplete JSON or
     * otherwise invalid output, retry once with a clean,
     * self-contained request.
     */
    if(!containsJsonObject(content)){

      const childRequest=
        [...input.messages]
          .reverse()
          .find(
            message=>
              message.role==='user'
          )
          ?.content||
        'Improve this design.';


      const cleanRetry=
`${BOOTSTRAP}

CURRENT_RECIPE for this request:
${JSON.stringify(input.current_recipe)}

CHILD_REQUEST:
${childRequest}

Return the complete JSON recipe now.`;


      payload={
        model:'heyotto',

        messages:[
          {
            role:'user',
            content:cleanRetry
          }
        ],

        stream:false
      };


      result=
        await callHeyOtto(
          payload,
          apiKey
        );


      if(result.networkError){
        return json(
          res,
          502,
          {
            error:
              safeError(
                result.networkError,
                'TopBot could not reach HeyOtto.'
              )
          }
        );
      }


      if(!result.response.ok){
        return json(
          res,
          result.response.status,
          {
            error:
              safeError(
                result.data?.error?.message,
                `HeyOtto could not correct its response (${result.response.status}).`
              )
          }
        );
      }


      content=
        result.data?.choices?.[0]?.message?.content;
    }


    if(!containsJsonObject(content)){
      return json(
        res,
        422,
        {
          error:
            'Otto could not turn that request into a design recipe. Please try a shorter description.'
        }
      );
    }


    const recipe=
      JSON.parse(
        content.slice(
          content.indexOf('{'),
          content.lastIndexOf('}')+1
        )
      );


    content=
      JSON.stringify(
        validateRecipe(recipe)
      );


    return json(
      res,
      200,
      {
        content,
        conversation_id:
          result.data.conversation_id,
        usage:
          result.data.usage
      }
    );

  }catch(error){

    return json(
      res,
      400,
      {
        error:
          safeError(
            error.message,
            'The request could not be completed.'
          )
      }
    );
  }
}


const MIME={
  '.html':'text/html; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.png':'image/png',
  '.svg':'image/svg+xml'
};


async function serve(req,res){

  const pathname=
    new URL(
      req.url,
      'http://localhost'
    ).pathname;


  const relative=
    pathname==='/'?
      'index.html':
      decodeURIComponent(
        pathname.slice(1)
      );


  if (relative.split(/[\\/]/).some(part => part === '..' || part.startsWith('.')) || !/^(index\.html|gallery\.html|collection-preview\.png|(?:js|css|vendor|examples)\/[^\\]+)$/.test(relative)) {
    return json(res,404,{error:"Not found"});
  }

  const target=
    normalize(
      join(
        ROOT,
        relative
      )
    );


  if(!target.startsWith(ROOT)){
    return json(
      res,
      403,
      {
        error:'Forbidden'
      }
    );
  }


  try{

    const body=
      await readFile(target);


    res.writeHead(
      200,
      {
        'content-type':
          MIME[extname(target)]||
          'application/octet-stream',

        'cache-control':
          'no-store'
      }
    );


    res.end(body);

  }catch{

    json(
      res,
      404,
      {
        error:'Not found'
      }
    );
  }
}


if(
  process.argv[1]&&
  fileURLToPath(import.meta.url)===
    normalize(process.argv[1])
){

  http
    .createServer(
      (req,res)=>{
        if (new URL(req.url, 'http://localhost').pathname === '/api/topbot-data') return sharedData(req,res);
        if (new URL(req.url, 'http://localhost').pathname === '/api/topbot-admin-login') {
          return adminLogin(req,res);
        }


        if(
          req.method==='POST'&&
          req.url==='/api/design'
        ){
          return chat(req,res);
        }


        if(
          req.method==='GET'||
          req.method==='HEAD'
        ){
          return serve(req,res);
        }


        json(
          res,
          405,
          {
            error:
              'Method not allowed'
          }
        );
      }
    )
    .listen(
      PORT,
      HOST,
      ()=>{
        console.log(
          `TopBot is ready at http://127.0.0.1:${PORT}`
        );
      }
    );
}
