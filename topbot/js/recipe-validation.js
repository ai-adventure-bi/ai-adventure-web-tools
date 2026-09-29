import {themeDefaults,validateTheme} from './themes.js';
import {classicHandles,upgradeRecipe,validateExperimental} from './experimental.js';
import {defaultDesign,validateDesign} from './design.js';
const DEFAULT={...themeDefaults,toyType:'top',experimentalEnabled:false,outlineStyle:'round',outlineAmount:80,alienStyle:'none',alienAmount:50,complexity:65,designSeed:4837,bodyTheme:'none',themeAmount:4,themeSize:4,bodyDiameter:60,bodyHeight:20,stemHeight:25,stemDiameter:9,tipLength:8,rimStyle:'spiky',rimPattern:'hooked',rimSweep:7,armSpiral:10,armReach:9,bodyCrownStyle:'jewelled',bodyCrownSize:6,bodyCrownHeight:5,bodyCrownLobes:10,bodyCrownTwist:2,handleStyle:'spire',pommelStyle:'crystal',hubStyle:'smooth',hubHeight:3,hubDepth:2,hubLobes:8,hubTwist:0,lobes:6,waveDepth:7,rimLift:3,secondaryLobes:12,twist:4,handleTwist:5,handleFins:4,handleFlare:4,holes:0,holeSize:3,topperStyle:'none',topperHeight:24,topperWidth:18,topperFeatures:6,topperTwist:2,topperRelief:4,color:'#8e6df2'};

const PRESETS={top:DEFAULT};

const rules={complexity:[0,100],designSeed:[0,9999],themeAmount:[0,10],themeSize:[0,10],bodyDiameter:[25,65],bodyHeight:[8,30],stemHeight:[8,34],stemDiameter:[5,12],tipLength:[3,12],rimSweep:[-10,10],armSpiral:[-12,12],armReach:[0,10],bodyCrownSize:[0,10],bodyCrownHeight:[0,8],bodyCrownLobes:[3,18],bodyCrownTwist:[-10,10],hubHeight:[0,12],hubDepth:[0,8],hubLobes:[3,16],hubTwist:[-10,10],lobes:[0,16],waveDepth:[0,10],rimLift:[0,10],secondaryLobes:[0,24],twist:[0,10],handleTwist:[0,10],handleFins:[0,12],handleFlare:[0,10],holes:[0,20],holeSize:[2,7],topperHeight:[14,34],topperWidth:[10,25],topperFeatures:[3,12],topperTwist:[-10,10],topperRelief:[0,7]};

const styles=['smooth','wavy','scalloped','spiky','organic','petal','enchanted','crystal'];

const rimPatterns=['radial','turbine','hooked','comet','claw'];

const handles=[...classicHandles,'straight','flared','mushroom','twisted','crown','spire','chalice','vine','winged'];

const pommels=['simple','orb','crystal','flame','crown'];

const hubs=['smooth','crown','petal','gear','crystal','halo'];

const bodyCrowns=['none','jewelled','tiara','petals','crystal','runes'];

const topperStyles=['none','dolphinTail','tentacle','trident','coral','skull','cyclops','mushroom','robot','ghost','crystal'];

const bodyThemes=['none','coral','scales','bubbles','armour','craters','mushrooms'];

function checkNumbers(raw,schema){for(const [k,[lo,hi]] of Object.entries(schema)){if(typeof raw[k]!=='number'||!Number.isFinite(raw[k]))throw Error(`${k} must be a number (${lo}–${hi}).`);if(raw[k]<lo||raw[k]>hi)throw Error(`${k} must be between ${lo} and ${hi}.`);}}

function validate(raw){raw=upgradeRecipe(raw,DEFAULT);validateTheme(raw);raw.experimentalEnabled=false;if(raw.paint)validateDesign({...defaultDesign(),paint:raw.paint});if(raw.design){if(raw.toyType!=='top')throw Error('TopBot 2 components require a spinning top.');raw={...raw,design:validateDesign(raw.design)};}if(raw.material&&!['white','pastelRainbow','vividRainbow'].includes(raw.material))throw Error('Unknown filament.');if(raw.rainbowPhase!==undefined&&(!Number.isFinite(raw.rainbowPhase)||raw.rainbowPhase<0||raw.rainbowPhase>1))throw Error('Rainbow phase must be 0–1.');if(!Object.keys(PRESETS).includes(raw.toyType))throw Error('toyType is not recognised.');if(typeof raw.color!=='string'||!/^#[0-9a-f]{6}$/i.test(raw.color))throw Error('color must be a hex colour such as #8e6df2.');if(raw.toyType==='top'){checkNumbers(raw,rules);if(!styles.includes(raw.rimStyle))throw Error(`rimStyle must be ${styles.join(', ')}.`);if(!rimPatterns.includes(raw.rimPattern))throw Error(`rimPattern must be ${rimPatterns.join(', ')}.`);if(!bodyCrowns.includes(raw.bodyCrownStyle))throw Error(`bodyCrownStyle must be ${bodyCrowns.join(', ')}.`);if(!handles.includes(raw.handleStyle))throw Error(`handleStyle must be ${handles.join(', ')}.`);if(!pommels.includes(raw.pommelStyle))throw Error(`pommelStyle must be ${pommels.join(', ')}.`);if(!hubs.includes(raw.hubStyle))throw Error(`hubStyle must be ${hubs.join(', ')}.`);if(!topperStyles.includes(raw.topperStyle))throw Error(`topperStyle must be ${topperStyles.join(', ')}.`);if(!bodyThemes.includes(raw.bodyTheme))throw Error(`bodyTheme must be ${bodyThemes.join(', ')}.`);for(const k of ['designSeed','lobes','secondaryLobes','bodyCrownLobes','hubLobes','handleFins','holes','topperFeatures'])if(!Number.isInteger(raw[k]))throw Error(`${k} must be a whole number.`);}return {...raw};}


export {DEFAULT,validate as validateRecipe,rules,styles,rimPatterns,bodyCrowns,bodyThemes,handles,pommels,hubs,topperStyles};
