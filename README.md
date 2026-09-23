# TANKZ

A self-hosted, single-player browser tank combat prototype built with Three.js, Rapier rigid-body physics, and plain HTML/CSS/JavaScript. No Sites integration, account, remote game service, or runtime CDN is required.

## Run

Requires Node.js 22.12+ (Node.js 24 LTS is recommended for Cloudflare builds).

```sh
npm ci
npm run dev
```

Open the local URL Vite prints (normally http://localhost:5173). A keyboard and mouse or touchpad are required. Chrome, Edge, Firefox, or Safari with WebGL2 is required. Audio starts after the first click.

Deployment ends with a short black hold while live simulation settles, followed by
an 850 ms fade into the battlefield. The hold waits for six steady frames after
350 ms, with a 1.6-second maximum wait on slow machines. Weapons, damage, player
commands and the match timer stay gated until the reveal finishes. Reduced-motion
mode skips the animated fade. Profiler captures label these frames `deployment`.

## Self-host

```sh
npm run build
```

Upload **all contents of `dist/`** to any static HTTP server. Relative asset paths support hosting in a subdirectory. Serve JavaScript with its normal MIME type. Do not open `index.html` directly with `file://`. No backend, database or secret is needed. `npm run preview` serves the production build locally.

### Cloudflare Workers

The checked-in `wrangler.jsonc` serves `dist/` as static assets. No Worker script or
Cloudflare Vite plugin is needed. In Cloudflare's Git-connected Workers build settings, use:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: the repository root
- Worker name: `tankz` (matching `wrangler.jsonc`)

For a manual deployment after authenticating with Cloudflare, run `npm run deploy`.
To validate the configuration without uploading, run `npm run build` followed by
`npx wrangler deploy --dry-run`. Keep the Wrangler config in Git so deployment does
not trigger Wrangler's automatic Vite setup.

## Play

Eliminate 15 enemy patrol jeeps within 15 minutes. Kestrel is the default tank; change vehicles in the garage, then use Deploy to open the mission overview. AP and HE ammunition are unlimited. Earned credits are stored on this browser.

| Control | Action |
| --- | --- |
| W / S | Drive forward / reverse |
| A / D | Steer hull left / right |
| Mouse / touchpad | Choose turret bearing; range and elevation are automatic |
| Left mouse **or Space** | Fire main gun; hold for repeated shots |
| Right mouse | Fire coaxial gun |
| 1 / 2 | AP / HE ammunition (both unlimited) |
| Q | Deploy smoke; interrupts AI targeting |
| Shift + W | Turbo boost (hold; recharges when released) |
| R | Recover an overturned or stuck tank; 12-second cooldown |
| Mouse wheel | Camera zoom |
| Escape | Pause / resume |

The white diamond shows mouse direction. Point toward a visible jeep: a narrow bearing cone selects it and automatically sets range and elevation. Moving the cursor closer or farther along the same direction does not change shot elevation. A red crosshair sits directly on the selected target. With no enemy along that bearing, the gun uses a fixed 55 m ground range. Physical cover still blocks target selection and projectiles.

The larger amber crosshair remains the predicted impact from the **current** gun direction, ammunition and chassis velocity. Turret traverse/elevation rates, hills, recoil, cover and motion still affect the actual shot; the reticle converges as the gun catches up. Dashed amber means reloading.

## Implemented

- Three distinct tank configurations: Kestrel scout, Vanguard medium, Marauder heavy. Mass, acceleration, speed, armor, gun strength, reload, traverse and elevation rates differ.
- Dynamic rigid-body chassis with six suspension probes, ground grip, differential steering, braking, hill jumps and physical collisions. Rocks use their transformed triangle meshes, so low sloped rocks can be crawled over; chassis undersides are bevelled to avoid snagging on low lips.
- Fixed 60 Hz simulation. Each shell and coaxial round is a distinct Rapier rigid body, with gravity, continuous collision detection and an additional swept collision check. AP and HE are physical shells. Both have unlimited ammunition.
- Direction-only mouse aiming with automatic target acquisition/range, followed by hull-pitch/roll compensation and inherited-velocity compensation in ballistic aiming. Traverse and elevation remain rate-limited. Predicted impact checks intervening physical cover.
- Heightfield-style mesh terrain with matching triangle-mesh collision, generated desert albedo/normal/height maps, rotated multi-scale texture splatting, bedrock blending and broad color variation.
- Procedural 3D vehicle meshes with generated armor paint; ruins with generated concrete, sandstone rocks, shrubs, movable rubble, explosive fuel drums, destructible wall segments and physical debris.
- Bounded particle pool with generated smoke, fire, spark and crater textures; additive emissive fire/embers; short-lived pooled point lights; staged fire-to-smoke explosions; cannon muzzle flashes and ground-pressure dust; ground-conforming tread impressions and textured crater/scorch decals. Positional explosion audio, engine sound and adjustable camera shake.
- Garage, unlimited AP/HE selection, gameplay HUD/minimap, pause/settings and win/loss results. The showroom keeps gameplay physics frozen while the tank and its display platform rotate together.
- Light patrol jeep enemies, each with a visible driver and gunner. All 15 jeeps start the match, distributed across the expanded battlefield; each has 100 HP, and its machine gun fires roughly eight rounds per second for only 1.2 damage per hit. Direct main-gun hits destroy jeeps.
- Jeep explosions eject two articulated 11-body ragdolls with spherical joints. Crew land physically; driving over grounded crew leaves a persistent red terrain smear. Ragdolls are capped at 16 and retire after 45 seconds; smears are capped at 64.
- Visible paired tank tracks and speed-dependent dust emitted behind both tracks; jeeps kick up smaller tire dust plumes.
- Dusk lighting with a low warm sun, cool sky fill, visible local blast lighting and cooling emissive metal fragments. Destruction uses shaped metal panels, wheels, rebar and fractured stone with convex collision rather than cube debris.
- Local enemy AI, smoke countermeasure, kills and damage tracking, credit rewards, rematches and persistent preferences.
- A destructible Baghdad-style district on the Dev Map, just north of the spawn: ten buildings (unfinished concrete frame, shop row, apartment block, shanasheel house, seven-storey hotel, ministry office with portico and T-walls, brick warehouse, mosque with tiled dome and minaret, courtyard house, petrol station) plus street dressing (asphalt, utility poles and wires, date palms, sandbags, HESCO, burnt-out cars). Every building is assembled from a modular kit of pre-fractured wall bays, slab tiles, columns, parapets, dome rings and drums. Shells punch real holes (rounds fly through windows and breaches), knocked-out load paths bring the storeys above down as falling chunks that shatter on impact, the minaret and palms topple as single pieces, fuel pumps explode, and fast tanks can ram through walls. Impacts throw plaster dust, instanced grit and glass glints, collapses roll a ground-hugging dust cloud and leave smouldering, baked rubble. A dithered cutaway keeps the tank visible behind or inside tall buildings. See `docs/buildings.md`.

## Scope and next steps

This is a playable prototype, not a finished multiplayer game. Enemy navigation is local obstacle avoidance rather than a complete navmesh. Ammunition uses arcade damage and blast behavior; detailed armor penetration/ricochet and component damage are not yet simulated. Craters are cosmetic surface decals and do not deform the collision terrain. Meshes are built procedurally with generated materials; they are not imported production art. The hand-painted material direction is established, with further asset detail and VFX tuning expected.

For online development, `commandFor()` already separates local/AI input commands from `drive()`, entities have stable per-match IDs, configuration is data-driven, and physics runs at a fixed timestep. Next steps are moving authoritative simulation out of the presentation class, command sequence numbers, server validation, state snapshots, interpolation and reconciliation. No claim of networking or cross-platform determinism is made by this prototype.

## Project layout

- `src/config.js`: tank/ammunition data, terrain function and ballistic math.
- `src/game.js`: simulation, input, aiming, projectiles, AI and renderer orchestration.
- `src/terrain.js`: terrain shader, mesh/collider construction and cover.
- `src/models.js`: tank geometry and materials.
- `src/aiming.js`: directional target acquisition, auto-range and cover checks.
- `src/debris.js`: material-specific physical fragments and fractured rubble geometry.
- `src/effects.js`: particles and ground-conforming tread, scorch and smear decals.
- `src/ragdolls.js`: physical crew ejection, articulation, cleanup and run-over detection.
- `src/building-geometry.js`, `src/building-kit.js`, `src/building-catalog.js`, `src/buildings.js`, `src/building-fx.js`: fracture geometry, the modular building kit, the ten building blueprints plus street dressing, the destruction/collapse runtime, and grit/rubble/dust effects.
- `src/audio.js`: local synthesized sound.
- `sound_prompts.md`: production prompts and trigger notes for replacement SFX, adult crew reactions, squish, ambience and music; these new audio recordings are not yet generated or wired.
- `src/ui.js`, `src/style.css`: screens and HUD.
- `public/assets/`: generated production textures; prompts in `ASSET_PROMPTS.md`.
- `concept-art/`: approved visual references and original prompt set.

## Verification

```sh
npm test
npm run build
npm run test:browser
npm run test:buildings   # dev server on :5173; screenshots in test-artifacts/buildings/
```

The physics tests cover ballistic math, turret wraparound, suspension/acceleration/braking across all tanks, CCD against a thin wall, climbing an actual rock mesh, dune jumps and landings, impact convergence on a pitched/rolled hull, weak jeep bullets, crew ejection/landing and run-over smears. The browser integration check requires the dev server on port 5173 and a local Chrome installation (or `TANKZ_BROWSER=chromium` with Playwright Chromium installed). It checks rendering errors, garage selection, menu stability, movement, Space firing, Q smoke, pause/resume and result flow. Screenshots go to ignored `test-artifacts/`.

### Visibility and patrols

Cover, terrain, and deployed smoke block shared player/AI sight rays. Unseen areas retain their map detail beneath soft translucent shadow; hidden living enemies disappear from the scene, automatic target acquisition, and minimap. Visibility reaches 65 m for the player and 58 m for patrols. The fog field samples at 10 Hz, with soft spatial filtering and frame-rate-independent blending on every rendered frame (roughly 0.3 seconds to settle); enemy visibility is checked each simulation tick.

Jeeps patrol local waypoints, take 0.75 seconds of continuous sight to engage, then take 3 seconds to transmit a radio report. Reports reach patrols within 52 m after 1.25 seconds, with additional recipients spaced 2 seconds apart. Responders investigate the reported position; they must acquire their own sight before attacking and relaying further. Losing sight leaves the AI searching the last known position before returning to patrol. Killing an unengaged patrol awards a stealth-kill notification and prevents its radio alert. A report already transmitted survives the sender's destruction.

Rendering uses a depth-aware fog pass, HDR bloom, ACES output, subtle animated film grain, and a vignette. These run entirely locally with bundled Three.js addons.

Jeep navigation uses clearance-expanded obstacle footprints and an A* route grid, with periodic replanning as cover is destroyed or moved. Three width-spaced probes scan candidate steering directions for nearby vehicles and debris. Jeeps slow for tight turns and brake before obstructions; sustained lack of displacement triggers a bounded reverse-and-turn recovery before replanning. Patrol destinations are moved out of blocked cells. Physics regression tests cover detouring around a wall and escaping a U-shaped ruin through its opening.

### Roaming infantry

Deployment adds 500 infantry in 25 squads spread across the map, including machine-gun, RPG, flamethrower and grenadier troops. Squads share a wandering destination and keep local spacing; each soldier uses collision-aware capsule movement and routes around obstacles. They participate in the same line-of-sight, last-known-position, and delayed radio system as jeeps. Engaged troops choose reachable cover, spread between cover positions, and periodically peek to fire short, low-damage bursts. Only visible infantry appears in targeting and the minimap.

Infantry takes direct projectile and blast damage. Lethal explosions launch articulated ragdolls with directional impulses; a moving grounded tank can crush standing soldiers or landed bodies into a terrain smear. Corpses share the existing bounded ragdoll pool. The mission objective is 15 jeeps; infantry is supporting opposition.

The hunting crosshair stays within a central screen region; a locked target gets a red crosshair directly on its position. Overhead enemy triangles have been removed. Standing infantry caught beneath a moving tank first enters a jointed ragdoll tumble, then leaves a stain and detached physical limbs after 0.55–0.9 seconds. Vehicle suspension rays ignore living units; jeep hull colliders cover the body and wheel width, allowing tank ramming to transfer momentum without lifting the tank onto the jeep.

Terrain props are seated against the rendered mesh triangles using their transformed vertices. Rocks follow the local slope and embed slightly; each shrub clump and twig is grounded independently. Fuel drums use matching cylindrical physics shapes, and prop rotations are shared between rendering and collision.

Ambient occlusion is disabled at all quality levels to avoid a second scene geometry pass. Directional shadows, fog, bloom, tone mapping and showroom antialiasing remain enabled as configured.

The FPS counter can be enabled in Settings or the pause menu; the preference persists across reloads. It averages actual rendered frame timing over half a second. Infantry has blended walk/run/idle animations with articulated hips and knees, body bob, and weapon sway. Standing run-over victims briefly tumble, then leave a stain and separate physical limb groups. Running over a landed limb replaces it with a smaller smear.

Soldier machine-gun rounds remain individual CCD rigid bodies. Oblique hits on tank armor reflect their velocity using the collision surface normal, retain 58% of speed, and emit sparks; near-normal impacts terminate. Ricochets are capped at two per round. Every visible machine-gun shot emits a hot muzzle flash and a short pooled light.

A direct cannon-shell hit on infantry immediately dismembers the target and launches the detached physical parts in the incoming round’s direction with an upward impulse. Nearby blast casualties still use articulated whole-body ragdolls.

### Vanguard model detail

The Vanguard follows the garage/main-menu concept with a broad sloped glacis, armored track shoulders, exposed road wheels, individual track shoes, a taller faceted turret, cast gun mantlet, stepped cannon and bored muzzle brake. A dedicated generated olive-drab armor albedo gives both detail levels chipped paint, oxide and desert wear; the showroom material adds matching normal and roughness maps. The turret carries a distressed 217 stencil and triangle. The roughly 117,000-triangle showroom version adds track grips and pins, wheel bolts, welds, hatch hardware, lamp guards, tools, tow cable, storage and a roof machine gun. Deployment uses a roughly 8,000-triangle version with the same silhouette, articulation, muzzle transform and vehicle physics. Showroom lighting is enabled only in the menu and garage.

### Kestrel model detail

The Kestrel is a modern recon tank based on concept-art/08-kestrel-scout.png. It has a low faceted wedge hull with sponsons over the tracks, continuous rubber band tracks around six road wheels, a toothed front sprocket, and an unmanned wedge turret with a short bustle. The long gun has a segmented thermal sleeve and a multi-baffle muzzle brake. The turret also carries a panoramic commander sight, a telescoping electro-optic sensor mast, a remote weapon station, active-protection launchers, radar tiles and laser-warning receivers. A recon drone sits docked on the rear deck. Angular two-tone camouflage is projected in model space, so the bands continue across facets, and the turret carries the stencilled 06 and scout diamond. The 69,672-triangle showroom model adds chevron track lugs and guide horns, dual road wheels with lightening holes and bolts, sight panes, lenses, panel seams, skirt bolts and rubber flaps, tools and a stowage basket. Deployment builds the 7,056-triangle gameplay version. Both share dimensions, the turret pivot and the muzzle transform.

The showroom armor uses generated albedo, tangent-space normal, roughness and specular maps (`public/assets/kestrel-armor-*.png`) on a physical material. The gameplay armor uses the albedo with the generated bump map. Textured armor is box-projected per triangle for even texel density.

### Marauder model detail

The Marauder (formerly Bastion) is the biggest tank in the game and deliberately over the top, based on concept-art/09-marauder-heavy.png:
- **Hull and running gear:** four separate track units, each with an idler, three road wheels and a sprocket under a chamfered armored guard. A tall slab hull is clad in reactive armor bricks, with a toothed ram plough on push arms painted in hazard stripes at the front.
- **Rear:** twin exhaust stacks with heat shields and rear-facing elbows, engine intakes, lashed jerry cans, a spare road wheel and caged lamps.
- **Turret and gun:** a colossal slab turret with spare track links and more bricks. It mounts one enormous gun with a fume extractor and box muzzle brake, flanked by twin autocannon pods that elevate with it. The roof carries a cupola machine gun, a 12-tube rocket pod, caged searchlights, smoke dischargers, a bustle rack and aerials. The turret is stencilled "07" with the heavy triangle.
- **Detail levels:** the 84,333-triangle showroom model adds individual bricks and track links, chains, lamp cages, a tow cable and bolts. The gameplay version is 9,269 triangles. Both share the turret pivot, the muzzle and the exhaust outlets.
- **Exhaust:** the stacks puff smoke in gameplay, harder under throttle, and idle gently in the showroom.
- **Showroom platform:** the display deck is offset by each tank's scale, so every tank rests on it.
- **Collider:** the heavy config sets a larger hull collider (`hull:[1.66,2.4]`) so the plough and wider track units don't clip into cover. The other tanks keep the default.

Armor uses generated albedo, normal, roughness and specular maps in the showroom, and albedo plus bump in gameplay (`public/assets/marauder-armor-*.png`). A shader darkens and browns the lower hull with road grime and tones down the rust. Pipes, fittings, chains, cans and bedrolls use tinted variants of the same maps. The plough uses a generated hazard-stripe texture (`marauder-hazard-albedo.png`), placed so its wrap seam falls outside the blade.

The menu and garage stage the high-detail model on a slowly rotating metal platform in an industrial hangar with concrete service bays, floor stains, girders and stencilled banners. The platform's front index rotates with the selected tank. Warm area/key lighting contrasts with cool doorway light; local shadow maps, PMREM environment reflections and generated armor normal/roughness maps supply close-up surface detail. Showroom rendering adds SMAA, subtle distance blur, restrained bloom and reduced film grain. Bundled Ubuntu Sans and Ubuntu Sans Mono fonts keep the interface consistent in browser previews. Deployment restores the outdoor lighting, camera and gameplay post-processing settings. Generated material prompts are recorded in ASSET_PROMPTS.md.

The doorway opens onto low-poly three-dimensional ruined depot buildings, broken slabs, rubble, concrete barricades, utility lines and burning tire piles. An imagegen dusk panorama surrounds the scene, with low-poly berms, rocks and shrubs filling the ground between the depot and horizon. The remaining distant tire stack uses a 64-frame RGBA fire atlas baked from a local 2D buoyancy/advection simulation, with frame interpolation, a blended loop boundary, upward noise distortion and independently phased flame sources. Flame bodies use premultiplied alpha rather than all-additive sprites. Flickering light, embers and long-lived drifting smoke complete the effect. The near tire pile has been removed. Rebuild the atlas with `node scripts/bake-fire.mjs`; no external authoring software is required. Rendering and frame scheduling settings are unchanged. The service ladder extends into the overhead structure; both Vanguard smoke-launcher banks angle upward and outward.

Smoke particles now use view-depth sorting, age-dependent expansion/dissipation, soft texture borders, subtle internal distortion and coherent wind/buoyancy. These apply to tire plumes, explosions, cannon smoke and smoke screens without changing their gameplay visibility rules. Jeep wrecks have a 60% chance of burning for 12–22 seconds, fade their flames and lights over the last four seconds, then smolder for nine seconds. Non-burning wrecks smolder for five seconds. Three concurrent wreck emitters are allowed; they follow the rigid body, stop emitting while hidden, pause with gameplay, and dispose their flame resources on completion. Existing emitted smoke dissipates naturally afterward. Crossing roof beams were removed from the showroom ruins.

Research informing smoke motion and compositing: [NVIDIA: Fire in the Vulcan Demo](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-6-fire-vulcan-demo), [SideFX: Understanding how pyro works](https://www.sidefx.com/docs/houdini/pyro/background.html). This remains a sprite approximation, not a volumetric fluid simulation at runtime.

Direct projectile hits on infantry emit directional, gravity-affected blood droplets and bounded terrain stains. Cannon hits retain immediate dismemberment. Machine-gun hits accumulate per soldier; a lethal hit after at least three direct rounds uses the dismemberment path, while fewer lethal hits retain the whole-body ragdoll. Airborne droplets expire or leave small stains on reaching terrain.

Q launches six small CCD rigid-body smoke grenades from the turret banks. They burst after staggered 0.85–1.01 second fuses, establishing eight-second, 4.5 m vision-blocking clouds at each burst location. Their smoke builds gradually, stays low and disperses; the 18-second ability cooldown remains. Drive dust is emitted every 0.42–0.22 m depending on speed along interpolated track contact paths, with larger overlapping low-opacity particles rather than timed batches. This follows [Epic's distance-based emission guidance](https://dev.epicgames.com/documentation/unreal-engine/spawn-modules?application_version=4.27).

Frame pacing: visual fog raycasts are distributed across updates while unit perception stays immediate; static navigation slopes and mesh bounds are cached, unsuccessful infantry routes respect retry timers, jeep replans are staggered, and particle buffers are prepared once per rendered frame. Wreck lights reuse three slots of the existing six-light effect pool so ignition/extinction does not alter the scene's light count. Reproduce profiling with `node tests/driving-profile.mjs` or `RADIO=1 node tests/driving-profile.mjs` for synchronized engagement/radio stress. Browser timing is machine-dependent and does not establish a universal FPS guarantee.

Horde planning uses an indexed A* heap with reusable search buffers, four queued infantry routes per physics tick, and incremental cover candidates with a 2 ms soft budget (at most 32 candidate advances). Movement and weapons continue while plans wait. Spatial buckets restrict separation checks to adjacent cells. Run `node scripts/benchmark-hordes.mjs` to reproduce simultaneous 20/100/200-soldier encounters; it reports infantry CPU time, excluding rendering, physics stepping, and asset creation. On the development machine, the 200-soldier initial update fell from 102 ms to about 2 ms; the 95th percentile fell from 9.7 ms to 4.7 ms. These are scenario-specific measurements, not a whole-frame FPS guarantee.

Grenade smoke now uses larger, overlapping soft-edged billows with internal density shading, building a continuous low screen. Sand wakes scale emission spacing, size, density and lifespan with vehicle speed, using one source per track.

Jeep, infantry and tank secondary machine guns share glancing-armor ricochets (58% speed retained, two-bounce limit). Small-arms rigid bodies use sensor colliders plus swept hit detection: hits still damage armor, but cannot apply contact impulses or impede the tank through solid-contact CCD. Cannon shells retain physical contact. Player engine-deck smoke begins at 40% health, increases at 30%, and becomes heavy at 20%, with color darkening continuously between those thresholds. Settings opens and dismisses with a short fade/slide over the retained main menu, blocks background controls, restores button focus on dismissal, and respects reduced motion.

Track dust uses one source per tread, muted terrain-brown particles and rapid horizontal velocity decay, leaving a lingering wake rather than four divergent streams. Soft sand records shallow compression in a persistent height map (maximum 7.5 cm), with mesh displacement, surface shading and batched updates to affected terrain collider patches. Rock and ruin floors are excluded; tread and ground decals follow the displaced surface. This adapts the persistent height-map approach described in [Deformable Snow Rendering](https://gdcvault.com/play/1021004/Deformable-Snow-Rendering-in-Batman). Live soldier contacts do not transfer solver impulses to tanks; overlap-based run-over behavior remains active.

Jeep destruction randomly selects a fuel fireball, broad pressure/dust burst, or staggered cook-off. Explosions layer a 50 ms flash, rapidly decelerating hot lobes, cooling orange fire, grouped rolling smoke, embers, and a terrain-conforming irregular dust wave. Cannon and machine-gun muzzle flashes use short-lived crossed planes aligned with the barrel, randomized proportions, pooled lighting, and detached lingering smoke; cannons also vent side jets. Pools cap concurrent muzzle flashes at 24 and shockwaves at eight. Timing and layering draw on [Atif's explosion breakdown](https://realtimevfx.com/t/stylized-frag-launcher-explosion-overwatch-inspiration-breakdown-posted/1894?page=2) and [practitioner muzzle-flash guidance](https://realtimevfx.com/t/wondering-how-good-muzzle-flashes-are-made/13540). Wrecked jeeps collapse visually and use a beveled convex hull recognized by suspension rays; live jeeps retain their original collision behavior.

Enemy deployment and reinforcements use a padded camera-frustum exclusion plus a 35 m player buffer. Jeep reinforcements try alternate entry points and retry after one second when all are blocked; infantry placement relocates to off-camera navigable cells. Large squads include one RPG specialist with a shoulder launcher. RPG troops stop and hold aim for 1.15 seconds, reset that delay when visibility/alignment/cover interrupts it, and reload for 4.8 seconds. Rockets are individual CCD rigid bodies (48 m/s launch speed, gravity, 95 direct damage, 3.5 m blast radius), with distance-spaced lingering exhaust smoke, a flickering emissive engine and two pooled local engine lights. Existing cover, ragdoll and run-over behavior applies to RPG soldiers.

Specialist infantry now have procedural weapon-specific upper-body animations blended with their walking/running gait. RPGs have a long tube with rims, grips, sight, a visible loaded rocket and spare rounds; soldiers carry the launcher upright, shoulder it with both hands, and lower it/reach for a fresh round during reload. Firing waits until the shoulder pose is ready. Six- and eight-person squads also include a flamethrower soldier with twin fuel cylinders, harness, hose, mask and nozzle. Flamethrowers close to 8 m, aim briefly, then fire for up to 2.2 seconds followed by a 2.6-second recovery. The stream reaches 11 m, applies 22 damage/second on contact and is blocked by solid cover; flame travel length matches the obstruction raycast. All specialists retain ordinary locomotion, collision, ragdoll and crushing behavior.

Flamethrower streams now have a widening, turbulent orange core, rolling smoke edges, flying sparks and pulsing local light. A flamethrower soldier's death detonates the fuel pack once: a fuel-style explosion, nearby blast damage, blood/stain effects and varied airborne ragdoll groups with a strong upward launch. Existing ragdoll limits and cleanup still apply.

Infantry run-overs now distinguish full hull overlap from partial track-edge contact. Partial hits can sever one leg, leaving an unarmed crawling survivor for 18–26 seconds; fast edge hits sometimes separate the lower body, leaving a 4–6 second crawl before death. A 0.7 second edge-hit grace period permits the initial tank pass, while later direct contact can finish the wounded soldier. Crawl speed pulses with the arm-drag animation, and wounds leave timed blood trails. Full dismemberment selects among four non-repeating adjacent breakup patterns with varied retained joints, radial scatter, launch height and spin; fragments bleed briefly and leave a stain when landing. Ragdolls remain bounded to 24 groups and blood decals to 192 instances. Extra burst droplets, scattered stains and varying decal shapes/colors reduce repetition.

Five reactive scenery types are available for testing: abandoned car, wooden supply crate, wooden road barricade, fuel bowser and field generator. Five examples sit around the deployment area: car (-10,21), crate (-5,12), barricade (2,8), fuel bowser (13,16), generator (8,28). Four additional clusters bring the total to 25. All have dynamic collision and weapon health; tank contact applies crush damage. Cars flatten into persistent traversable wrecks. Crates/barricades scatter wooden panels and beams; generators break apart with sparks; fuel bowsers explode with nearby damage and chain reactions. Broken visible pieces become bounded, temporary rigid-body debris. The generated wood texture and exact prompt are recorded in ASSET_PROMPTS.md.


Combat presentation: the cannon uses a generated gas-plume texture, an expanding dust pulse and a bounded shell exposure streak. Teal chevrons show hull direction on the ground. Enemy models fade through fog transitions while targeting remains immediate. The hunting crosshair stays amber and central; a visible target lock turns it red and places it directly on the target. Floating enemy triangles are removed. The pause panel animates in and out, with simulation frozen until dismissal finishes; reduced motion skips the animations. Research, exact asset prompt and design details are in [docs/combat-presentation.md](docs/combat-presentation.md). Run `TANKZ_BROWSER=chromium node tests/combat-presentation-browser.mjs` against the dev server (override its address with `TANKZ_URL`) for deterministic browser checks and screenshots.


The battlefield now covers approximately 539 × 539 m: 500% more area than the original 220 × 220 m map. Spaced rock and ruin clusters leave wider driving lanes. Twenty-four directional ridges and eight stone ramps include reserved approaches and landing corridors. The match timer is 15 minutes to accommodate the larger map and 15-jeep objective.

Terrain uses 576 independently culled render/collision chunks. Track deformation updates only affected chunks and neighboring normals; navigation, fog, ground decals and minimap coordinates cover the full map. Infantry capsules advance at 60 Hz. Outside immediate interaction range, validated 0.1–0.2 second movement corridors amortize full character-controller queries. Decisions are staggered at 5–10 Hz for distant/visible troops; nearby hazards and active attackers retain full-rate handling. Hidden pose evaluation is deferred while animation and weapon-readiness clocks continue. Infantry uses spatial crowd separation; tank run-over detection remains active.

Run `node scripts/benchmark-world.mjs` for a real-terrain, 250-infantry/25-jeep CPU simulation profile. A local 300-tick run measured 6.8 ms median and 10.0 ms p95, compared with 25.1/28.3 ms before the movement optimizations. This excludes GPU rendering and is not an FPS guarantee. `tests/world.test.js` checks population distribution, clear jump lanes, chunk deformation/seams, distant update scheduling, and physical ridge/stone launches and landings. The combat browser check also renders an outer-map ridge and verifies terrain frustum culling.


The perimeter now has continuous physical sandstone cliffs, large boulders and reinforced steel fence sections on overlapping concrete footings. A collision backstop also contains airborne tanks. Four low-poly terrain extensions continue the landscape 260 m beyond the playable boundary, joining at the corners. Frontier geometry is merged by side/material to limit draw calls. The stone ramps use fractured, tapered slabs with layered shoulders, face-projected UVs and a generated sandstone material instead of simple untextured wedges.

Hold either Shift key while driving forward to use turbo: up to 3.5 seconds at 2.6× engine force and a 1.7× speed ceiling. Releasing Shift preserves the remaining charge. Recharge starts after 1.2 seconds and takes nine seconds from empty; after exhausting the tank, release Shift before boosting again. The HUD shows charge and boost state. Turbo changes ground propulsion while retaining normal airborne physics, and charge resets on deployment. The AI retains its own braking behavior.

Boundary regression tests scan all four visible edges every two metres and drive a boosted tank against fence sections on each side. Jump tests cover normal and boosted ridge/stone launches and landings. The 250-infantry/25-jeep CPU benchmark with the new frontier measured 6.9 ms median / 10.3 ms p95 locally (rendering excluded).


Vehicle rendering interpolates between 60 Hz physics poses using the fixed-step accumulator, keeping motion smooth at other refresh rates without changing simulation. The follow camera filters one shared position/gaze anchor; visual shake no longer feeds back into that anchor. Recovery resets pose history, and pausing holds the displayed pose. Regression tests cover 60/75/90/120/144/165 Hz, uneven frame intervals, rotation interpolation and camera stability; the browser check exercises the actual frame loop at 120 Hz.

Player awareness appears as restrained viewport-edge effects and a text label: teal STEALTH when undetected, amber SPOTTED on initial detection or while enemies search, and red ENGAGED during visible pursuit or recent incoming attacks. Escalation is immediate, while recovery requires 1.25 seconds of consistently lower threat. Effects leave the center transparent, do not intercept input, dim during pause and respect reduced-motion preferences.

The five-chevron ENEMY ALERT meter measures current AI pressure: noticing enemies contribute 0.5–1.5, visible pursuers 2, searching enemies 0.5, and each distinct pending radio responder 0.5. Thresholds are 0.5 / 2 / 6 / 14 / 28. Recent attacks ensure at least level 2. The meter drops after a quiet interval and clears when the player returns to stealth; dead/wounded units and old radio transmissions do not inflate it. This is a presentation of existing AI aggression, not a difficulty modifier. Generated asset prompts are in ASSET_PROMPTS.md.

Target acquisition stays yellow until both turret yaw and gun elevation reach the current target's firing solution. The red on-target lock requires a visible live target, a reachable elevation, yaw error below 0.012 radians and elevation error below 0.01 radians. Reload status remains separate from aiming alignment.

Ragdoll pool eviction marks removed items before destroying their physics bodies. The update loop skips evicted entries in its snapshot, including bodies removed when an earlier run-over breaks into several fragments. Dismembered source items also relinquish ownership explicitly, preventing double removal of transferred body parts. Regression coverage fills the pool through crowd run-overs and advances both physics tests and the browser game loop through simultaneous fragment creation and eviction.

Press **E** to launch a recon quadcopter. It climbs 20 m, reveals unobstructed terrain within 32 m, and marks contacts with animated red squares. It self-destructs after 8 seconds; launch cooldown is 22 seconds. The HUD shows climb, remaining lifetime, and cooldown. Pause freezes the drone.

Sight radius follows observer height: infantry 32 m, jeeps 38 m, Kestrel 57.2 m, Vanguard 60 m, Marauder 63.2 m. Cover and smoke obstruct sight. Player and drone reveals stop at the viewport boundary with a soft fog edge; enemy AI perception is independent of camera position. Player shells and impact craters remain visible in fog. Hostile projectiles, flashes and trails are hidden outside revealed space.

Dust now merges from both tracks into a broad lingering wake, includes stationary pivot clouds and impact-energy-scaled landing bursts, and uses a generated billow texture tinted ochre to match the desert. Ground decals render beneath the dust.

Additional browser checks: `TANKZ_BROWSER=chromium TANKZ_URL=http://localhost:5174 node tests/dust-browser.mjs` and `node tests/recon-browser.mjs` with the same environment. Captures are written under `test-artifacts/`.

Audio files are organized under `public/audio/music/` and `public/audio/stingers/`. Machinery Waiting loops in the menu/hangar; victory and defeat cues play once on match results. All recordings are preloaded. Music and result stingers use Music volume; engine, weapon and UI sounds use SFX volume. Both settings are saved independently. See `public/audio/README.md` for the asset list.

For rendering diagnostics, start the dev server and run `node scripts/profile-rendering.mjs`
(use `TANKZ_BROWSER=chromium` for Playwright Chromium). `TANKZ_WIDTH` and
`TANKZ_HEIGHT` override the 1440 × 900 viewport. The script reports the graphics
backend, complete multi-pass draw counts, and CPU submission timings for a frozen
menu/combat scene, comparing normal rendering and disabled shadows. These short samples exclude simulation and are not FPS
or GPU benchmarks; SwiftShader results do not represent hardware GPU performance.

The built-in profiler is available under **Settings → Graphics** or
**Pause → Graphics**. Enable **Performance profiler** to show a floating panel
while playing. The toggle persists across reloads; disabling it removes timing
wrappers and GPU queries and stops any recording.

The panel shows a rolling 15-second frame/CPU/GPU graph with 60/120 FPS budget
lines, one-second stage averages, and simulation/controller/draw/projectile/particle
counts. **Record 15 s** captures the next interval; **Export capture** downloads it.
**Save last 15 s** immediately exports recent history. JSON includes individual
frames, alert modes, stage costs, and per-frame quality/lighting settings. Missing
GPU samples display as unavailable. CPU parent/child timings overlap.

Use **Flash lighting** to compare an encounter with that lighting enabled/disabled.
The switch affects the pooled muzzle/explosion lights; machine-gun point lighting
is separately disabled by default and can be compared with **Machine-gun lighting**.
The profiler itself adds measurement/display
cost, so compare captures under the same conditions. History is limited to 60 seconds
and 12,000 frames. Scene rebuilds reconnect instrumentation automatically.

To diagnose the actual playing/paused frame loop on your own GPU, reload the game
and run this in Chrome's console while deployed:

```js
copy(JSON.stringify(await tankz.profile(15000), null, 2))
```

Return focus to the game, play for about seven seconds, then press Escape and leave
it paused until the capture finishes. The command copies the report. It separates
playing/paused CPU stages, simulation ticks per frame, complete draw counts, and
GPU render time when timer queries are supported. CPU stage timings are inclusive:
`simulation.infantry` belongs to `simulation`, and `pass.*` belongs to `render`.
Console-only captures remove instrumentation automatically afterward. With the panel
enabled, console captures share its ongoing session. Capturing does not change quality settings.
Playing frames are grouped as `playing.stealth`, `playing.spotted`, and
`playing.engaged` using alert state at frame entry. For encounter diagnostics,
spend the first few seconds unnoticed, then let the squad engage you. Captures
include projectile/particle counts, projectile updates, shot creation, impacts,
audio scheduling, movement hazards and route searches. These timings are inclusive.

Machine-gun fire uses emissive muzzle flashes and smoke without point lighting by
default. Cannon/explosion, wreck and rocket lighting remains enabled. To compare
the former machine-gun lighting, set `tankz.game.fx.machineGunLightsEnabled = true`;
restore `false` for the default. Capture metadata records both lighting switches
at capture start, so keep them fixed during each capture.

To isolate flash lighting during an encounter, set `tankz.game.fx.flashLightsEnabled = false`
in the console, then restore it with `true`. This suppresses the pooled muzzle/explosion
lights while preserving particles, projectiles, wreck/rocket lights and the scene light
count. Compare captures with the same camera and encounter; reload restores the default.
`node scripts/benchmark-encounter.mjs` compares CPU simulation with a ten-person squad
passive, fighting, fighting without cover searches, and fighting without firing. It
does not measure rendering or browser compositing.


Infantry movement relevance includes swept vehicle/projectile approaches, recent damage,
visibility and drone reveals. Promotion is immediate and demotion waits half a second.
Cached corridors require static, gentle terrain support plus a swept capsule clearance
check; walls, steep ground, moving support and unsafe corridors use the full controller.
Engaged soldiers can also reuse 0.1-second corridors outside physical hazards;
aiming and weapon timing still run at 60 Hz. Engaged movement/cover decisions run
at a staggered 20 Hz (visible nonurgent: 10 Hz; distant: 5 Hz), with immediate
decisions on state/sight changes, damage, destroyed cover and new physical hazards.
Perception remains at 60 Hz. Stationary engaged soldiers
check support every tick and periodically refresh full collision handling. Damage
or swept hazards force full movement immediately, with a half-second quiet delay
before reuse resumes.
Distant investigators defer cover searches. Route/cover budgets are shared across all
catch-up ticks in a rendered frame. Run `node scripts/benchmark-world.mjs --investigate`
for a 250-investigator workload, or omit the flag for the patrol baseline. The design,
tradeoffs and measurements are recorded in [docs/ai-performance.md](docs/ai-performance.md).

### Infantry crowd budgets

Combat sight no longer selects the highest movement-physics tier. Troops reuse validated movement corridors outside swept physical hazards; moving tank footprints, projectiles, damage, obstacles and lost support still require collision checks. Capsules, aiming and weapon timers continue updating every simulation tick.

Infantry thinking is limited to 128 decisions per rendered frame, including catch-up ticks: 96 prioritize damage, new physical hazards, nearby reactions and combat specialists; 32 service the oldest queued requests to prevent starvation. Under overload, troops retain their previous steering while waiting. Squad destinations and existing route/cover budgets remain in use.

Run `node scripts/benchmark-infantry-swarm.mjs` for a repeatable 1,500-troop mass-alert CPU workload, independent of the configured deployment population. It includes catch-up frames and reports decision and collision-query counts. It excludes rendering, perception updates and projectile creation, so its timings are not gameplay FPS measurements.

Nearby troops now share cached navigation corridors when clear entry and exit segments connect them. Navigation refreshes invalidate the cache. Each frame can serve up to 32 route requests while still allowing only four new movement-route searches. Each soldier owns its waypoint list. Crowd separation samples at most 36 neighbours, rotates samples in dense cells, estimates crowd pressure, and caps the resulting speed.

Distant machine-gunners use one instanced body-and-weapon mesh with GPU leg animation and per-instance gait, aim and fog fade. They enter this representation beyond 30 metres and return to detailed models within 22 metres; targeting, damage, wounds and specialist weapons retain detailed models. Physics capsules and hit detection remain individual. The batch shares lighting and animated shadows, grows as needed, and is disposed when rebuilding the world. `node tests/infantry-crowd-browser.mjs` compares draw calls and checks fog, detail transitions, wounds, ragdolls and buffer growth, saving before/after screenshots in `test-artifacts/`.

### Grenadiers

Each patrol squad starts with a grenadier in place of one machine-gunner (25 grenadiers at the current deployment size). Grenadiers carry a grenade bandolier and use a visible overarm throw. They engage from 5–18 metres, approach distant targets and retreat when too close. A throw has a 0.3-second wind-up and 1.4-second cooldown, compared with the RPG's 1.15-second aim and 4.8-second reload. Frag grenades follow a gravity-driven arc, bounce off geometry, and detonate after a 1.6-second fuse with a 3.2-metre vehicle blast radius. They retain physical hitboxes, fog visibility, pooled projectile models and normal world cleanup. Run `node tests/grenadier-browser.mjs` to check the deployed specialist, animation, flight and fuse cleanup.

### Mission deployment

The Kestrel light recon tank is selected by default. Main menu **Deploy** opens mission selection. **Dev Map** is the first mission: clear all 15 machine-gun jeeps from enemy territory within 15 minutes. A single overview shows the objective and opposition while six generated scenery layers automatically drift horizontally at different speeds. There are no scrolling sections or loadout/refit links. **Launch mission** starts the existing deployment reveal; restarting from results returns to mission selection.

Mission definitions live in `src/missions.js`. Generated artwork and its built-in image generation prompt set live in `public/assets/missions/dev-map/` (the jeep cutout is retained for future use). Motion is disabled by reduced-motion preferences. Escape returns to the menu. Run `node tests/missions-browser.mjs` for selection, automatic parallax, reduced motion, and launch checks.
