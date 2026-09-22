# TANKZ

A self-hosted, single-player browser tank combat prototype built with Three.js, Rapier rigid-body physics, and plain HTML/CSS/JavaScript. No Sites integration, account, remote game service, or runtime CDN is required.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Open the local URL Vite prints (normally http://localhost:5173). A keyboard and mouse or touchpad are required. Chrome, Edge, Firefox, or Safari with WebGL2 is required. Audio starts after the first click.

## Self-host

```sh
npm run build
```

Upload **all contents of `dist/`** to any static HTTP server. Relative asset paths support hosting in a subdirectory. Serve JavaScript with its normal MIME type. Do not open `index.html` directly with `file://`. No backend, database or secret is needed. `npm run preview` serves the production build locally.

## Play

Eliminate eight enemy patrol jeeps within five minutes. Select a tank in the garage, optionally buy ammunition with earned in-game credits, and deploy. Purchases, remaining ammunition and credits are stored on this browser. There are no real-money purchases.

| Control | Action |
| --- | --- |
| W / S | Drive forward / reverse |
| A / D | Steer hull left / right |
| Mouse / touchpad | Choose turret bearing; range and elevation are automatic |
| Left mouse **or Space** | Fire main gun; hold for repeated shots |
| Right mouse | Fire coaxial gun |
| 1 / 2 / 3 | AP / HE / APDS ammunition |
| Q | Deploy smoke; interrupts AI targeting |
| Shift | Brake and slide |
| R | Recover an overturned or stuck tank; 12-second cooldown |
| Mouse wheel | Camera zoom |
| Escape | Pause / resume |

The white diamond shows mouse direction. Point toward a visible jeep: a narrow bearing cone selects it and automatically sets range and elevation. Moving the cursor closer or farther along the same direction does not change shot elevation. An amber enemy marker indicates the selected jeep. With no enemy along that bearing, the gun uses a fixed 55 m ground range. Physical cover still blocks target selection and projectiles.

The larger amber crosshair remains the predicted impact from the **current** gun direction, ammunition and chassis velocity. Turret traverse/elevation rates, hills, recoil, cover and motion still affect the actual shot; the reticle converges as the gun catches up. Dashed amber means reloading.

## Implemented

- Three distinct tank configurations: Kestrel scout, Vanguard medium, Marauder heavy. Mass, acceleration, speed, armor, gun strength, reload, traverse and elevation rates differ.
- Dynamic rigid-body chassis with six suspension probes, ground grip, differential steering, braking, hill jumps and physical collisions. Rocks use their transformed triangle meshes, so low sloped rocks can be crawled over; chassis undersides are bevelled to avoid snagging on low lips.
- Fixed 60 Hz simulation. Each shell and coaxial round is a distinct Rapier rigid body, with gravity, continuous collision detection and an additional swept collision check. AP, HE and APDS have different velocity, damage, blast radius and price.
- Direction-only mouse aiming with automatic target acquisition/range, followed by hull-pitch/roll compensation and inherited-velocity compensation in ballistic aiming. Traverse and elevation remain rate-limited. Predicted impact checks intervening physical cover.
- Heightfield-style mesh terrain with matching triangle-mesh collision, generated desert albedo/normal/height maps, rotated multi-scale texture splatting, bedrock blending and broad color variation.
- Procedural 3D vehicle meshes with generated armor paint; ruins with generated concrete, sandstone rocks, shrubs, movable rubble, explosive fuel drums, destructible wall segments and physical debris.
- Bounded particle pool with generated smoke, fire, spark and crater textures; additive emissive fire/embers; short-lived pooled point lights; staged fire-to-smoke explosions; cannon muzzle flashes and ground-pressure dust; ground-conforming tread impressions and textured crater/scorch decals. Positional explosion audio, engine sound and adjustable camera shake.
- Garage, ammunition purchasing, gameplay HUD/minimap, pause/settings and win/loss results. Showroom simulation is frozen so menu tanks remain stationary.
- Light patrol jeep enemies, each with a visible driver and gunner. Three active jeeps start the match; each has 100 HP, and its machine gun fires roughly eight rounds per second for only 1.2 damage per hit. Direct main-gun hits destroy jeeps.
- Jeep explosions eject two articulated 11-body ragdolls with spherical joints. Crew land physically; driving over grounded crew leaves a persistent red terrain smear. Ragdolls are capped at 16 and retire after 45 seconds; smears are capped at 64.
- Visible paired tank tracks and speed-dependent dust emitted behind both tracks; jeeps kick up smaller tire dust plumes.
- Dusk lighting with a low warm sun, cool sky fill, visible local blast lighting and cooling emissive metal fragments. Destruction uses shaped metal panels, wheels, rebar and fractured stone with convex collision rather than cube debris.
- Local enemy AI, smoke countermeasure, kills and damage tracking, credit rewards, rematches and persistent preferences.

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
```

The physics tests cover ballistic math, turret wraparound, suspension/acceleration/braking across all tanks, CCD against a thin wall, climbing an actual rock mesh, dune jumps and landings, impact convergence on a pitched/rolled hull, weak jeep bullets, crew ejection/landing and run-over smears. The browser integration check requires the dev server on port 5173 and a local Chrome installation (or `TANKZ_BROWSER=chromium` with Playwright Chromium installed). It checks rendering errors, garage purchases, menu stability, movement, Space firing, Q smoke, pause/resume and result flow. Screenshots go to ignored `test-artifacts/`.

### Visibility and patrols

Cover, terrain, and deployed smoke block shared player/AI sight rays. Unseen areas retain their map detail beneath soft translucent shadow; hidden living enemies disappear from the scene, HUD markers, automatic target acquisition, and minimap. Visibility reaches 65 m for the player and 58 m for patrols. The fog field samples at 10 Hz, with soft spatial filtering and frame-rate-independent blending on every rendered frame (roughly 0.3 seconds to settle); enemy visibility is checked each simulation tick.

Jeeps patrol local waypoints, take 0.75 seconds of continuous sight to engage, then take 3 seconds to transmit a radio report. Reports reach patrols within 52 m after 1.25 seconds, with additional recipients spaced 2 seconds apart. Responders investigate the reported position; they must acquire their own sight before attacking and relaying further. Losing sight leaves the AI searching the last known position before returning to patrol. Killing an unengaged patrol awards a stealth-kill notification and prevents its radio alert. A report already transmitted survives the sender's destruction.

Rendering uses a depth-aware fog pass, HDR bloom, ACES output, subtle animated film grain, and a vignette. These run entirely locally with bundled Three.js addons.

Jeep navigation uses clearance-expanded obstacle footprints and an A* route grid, with periodic replanning as cover is destroyed or moved. Three width-spaced probes scan candidate steering directions for nearby vehicles and debris. Jeeps slow for tight turns and brake before obstructions; sustained lack of displacement triggers a bounded reverse-and-turn recovery before replanning. Patrol destinations are moved out of blocked cells. Physics regression tests cover detouring around a wall and escaping a U-shaped ruin through its opening.

### Roaming infantry

Deployment adds 20 machine-gun soldiers: two lone patrols and squads of 4, 6, and 8. Squads share a wandering destination and keep local spacing; each soldier uses collision-aware capsule movement and routes around obstacles. They participate in the same line-of-sight, last-known-position, and delayed radio system as jeeps. Engaged troops choose reachable cover, spread between cover positions, and periodically peek to fire short, low-damage bursts. Only visible infantry appears in targeting, enemy markers, and the minimap.

Infantry takes direct projectile and blast damage. Lethal explosions launch articulated ragdolls with directional impulses; a moving grounded tank can crush standing soldiers or landed bodies into a terrain smear. Corpses share the existing bounded ragdoll pool. The mission objective remains eight jeeps; infantry is supporting opposition.

Enemy markers retain their DOM nodes and update every rendered frame, smoothing the world-space anchor before projection so camera movement stays synchronized. Standing infantry caught beneath a moving tank first enters a jointed ragdoll tumble, then leaves a stain and detached physical limbs after 0.55–0.9 seconds. Vehicle suspension rays ignore living units; jeep hull colliders cover the body and wheel width, allowing tank ramming to transfer momentum without lifting the tank onto the jeep.

Terrain props are seated against the rendered mesh triangles using their transformed vertices. Rocks follow the local slope and embed slightly; each shrub clump and twig is grounded independently. Fuel drums use matching cylindrical physics shapes, and prop rotations are shared between rendering and collision.

Ambient occlusion uses denoised GTAO contact shading around vehicles, rubble, rocks, and vegetation. Transparent smoke, fire, and decals are excluded from the occluder pass. High quality uses 16 samples at 75% resolution; Performance uses 8 samples at 50% resolution. AO composites before bloom and tone mapping.

The FPS counter can be enabled in Settings or the pause menu; the preference persists across reloads. It averages actual rendered frame timing over half a second. Infantry has blended walk/run/idle animations with articulated hips and knees, body bob, and weapon sway. Standing run-over victims briefly tumble, then leave a stain and separate physical limb groups. Running over a landed limb replaces it with a smaller smear.

Soldier machine-gun rounds remain individual CCD rigid bodies. Oblique hits on tank armor reflect their velocity using the collision surface normal, retain 58% of speed, and emit sparks; near-normal impacts terminate. Ricochets are capped at two per round. Every visible machine-gun shot emits a hot muzzle flash and a short pooled light.

A direct cannon-shell hit on infantry immediately dismembers the target and launches the detached physical parts in the incoming round’s direction with an upward impulse. Nearby blast casualties still use articulated whole-body ragdolls.

### Vanguard model detail

The Vanguard is modeled after the approved garage/main-menu concept: sloped plate hull, angular tapered turret, exposed road wheels, individual track shoes, tapered cannon and open muzzle collar. Main menu and garage use the 68,992-triangle showroom model with beveled panels, wheel bolts, track pins, hatch hardware, lamp guards, tools, tow cable, storage and markings. Deployment builds the 6,140-triangle gameplay version (about 91% fewer triangles). Both share dimensions, turret pivots and muzzle transforms, with the same vehicle physics. Showroom lighting is enabled only in the menu and garage.

### Kestrel model detail

The Kestrel is a modern recon tank based on concept-art/08-kestrel-scout.png. It has a low faceted wedge hull with sponsons over the tracks, continuous rubber band tracks around six road wheels, a toothed front sprocket, and an unmanned wedge turret with a short bustle. The long gun has a segmented thermal sleeve and a multi-baffle muzzle brake. The turret also carries a panoramic commander sight, a telescoping electro-optic sensor mast, a remote weapon station, active-protection launchers, radar tiles and laser-warning receivers. A recon drone sits docked on the rear deck. Angular two-tone camouflage is projected in model space, so the bands continue across facets, and the turret carries the stencilled 06 and scout diamond. The 69,672-triangle showroom model adds chevron track lugs and guide horns, dual road wheels with lightening holes and bolts, sight panes, lenses, panel seams, skirt bolts and rubber flaps, tools and a stowage basket. Deployment builds the 7,056-triangle gameplay version. Both share dimensions, the turret pivot and the muzzle transform.

The showroom armor uses generated albedo, tangent-space normal, roughness and specular maps (`public/assets/kestrel-armor-*.png`) on a physical material. The gameplay armor uses the albedo with the generated bump map. Textured armor is box-projected per triangle for even texel density.

### Marauder model detail

The Marauder (formerly Bastion) is the biggest tank in the game and deliberately over the top, based on concept-art/09-marauder-heavy.png:
- **Hull and running gear:** four separate track units, each with an idler, three road wheels and a sprocket under a chamfered armored guard. A tall slab hull is clad in reactive armor bricks, with a toothed ram plough on push arms painted in hazard stripes at the front.
- **Rear:** twin exhaust stacks with heat shields and rear-facing elbows, engine intakes, lashed jerry cans, a spare road wheel and caged lamps.
- **Turret and gun:** a colossal slab turret with spare track links and more bricks. It mounts one enormous gun with a fume extractor and box muzzle brake, flanked by twin autocannon pods that elevate with it. The roof carries a cupola machine gun, a 12-tube rocket pod, caged searchlights, smoke dischargers, a bustle rack, aerials and a pennant. The turret is stencilled "07" with the heavy triangle.
- **Detail levels:** the 84,333-triangle showroom model adds individual bricks and track links, chains, lamp cages, a tow cable and bolts. The gameplay version is 9,269 triangles. Both share the turret pivot, the muzzle and the exhaust outlets.
- **Exhaust:** the stacks puff smoke in gameplay, harder under throttle, and idle gently in the showroom.
- **Showroom floor:** the floor is offset by each tank's scale, so every tank rests on it.
- **Collider:** the heavy config sets a larger hull collider (`hull:[1.66,2.4]`) so the plough and wider track units don't clip into cover. The other tanks keep the default.

Armor uses generated albedo, normal, roughness and specular maps in the showroom, and albedo plus bump in gameplay (`public/assets/marauder-armor-*.png`). A shader darkens and browns the lower hull with road grime and tones down the rust. Pipes, fittings, chains, cans and bedrolls use tinted variants of the same maps. The plough uses a generated hazard-stripe texture (`marauder-hazard-albedo.png`), placed so its wrap seam falls outside the blade.

The menu and garage now stage the high-detail model in an industrial hangar with concrete service bays, floor stains, workshop props, girders and stencilled banners. Warm area/key lighting contrasts with cool doorway light; local shadow maps, PMREM environment reflections and generated armor normal/roughness maps supply close-up surface detail. Showroom rendering adds SMAA, subtle distance blur, restrained bloom and reduced film grain. Deployment restores the outdoor lighting, camera and gameplay post-processing settings. Generated material prompts are recorded in ASSET_PROMPTS.md.

The doorway opens onto low-poly three-dimensional ruined depot buildings, broken slabs, rubble, concrete barricades, utility lines and burning tire piles. An imagegen dusk panorama surrounds the scene, with low-poly berms, rocks and shrubs filling the ground between the depot and horizon. The remaining distant tire stack uses a 64-frame RGBA fire atlas baked from a local 2D buoyancy/advection simulation, with frame interpolation, a blended loop boundary, upward noise distortion and independently phased flame sources. Flame bodies use premultiplied alpha rather than all-additive sprites. Flickering light, embers and long-lived drifting smoke complete the effect. The near tire pile has been removed. Rebuild the atlas with `node scripts/bake-fire.mjs`; no external authoring software is required. Rendering and frame scheduling settings are unchanged. The service ladder extends into the overhead structure; both Vanguard smoke-launcher banks angle upward and outward.

Smoke particles now use view-depth sorting, age-dependent expansion/dissipation, soft texture borders, subtle internal distortion and coherent wind/buoyancy. These apply to tire plumes, explosions, cannon smoke and smoke screens without changing their gameplay visibility rules. Jeep wrecks have a 60% chance of burning for 12–22 seconds, fade their flames and lights over the last four seconds, then smolder for nine seconds. Non-burning wrecks smolder for five seconds. Three concurrent wreck emitters are allowed; they follow the rigid body, stop emitting while hidden, pause with gameplay, and dispose their flame resources on completion. Existing emitted smoke dissipates naturally afterward. Crossing roof beams were removed from the showroom ruins.

Research informing smoke motion and compositing: [NVIDIA: Fire in the Vulcan Demo](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-6-fire-vulcan-demo), [SideFX: Understanding how pyro works](https://www.sidefx.com/docs/houdini/pyro/background.html). This remains a sprite approximation, not a volumetric fluid simulation at runtime.

Direct projectile hits on infantry emit directional, gravity-affected blood droplets and bounded terrain stains. Cannon hits retain immediate dismemberment. Machine-gun hits accumulate per soldier; a lethal hit after at least three direct rounds uses the dismemberment path, while fewer lethal hits retain the whole-body ragdoll. Airborne droplets expire or leave small stains on reaching terrain.

Q launches six small CCD rigid-body smoke grenades from the turret banks. They burst after staggered 0.85–1.01 second fuses, establishing eight-second, 4.5 m vision-blocking clouds at each burst location. Their smoke builds gradually, stays low and disperses; the 18-second ability cooldown remains. Drive dust is emitted every 0.42–0.22 m depending on speed along interpolated track contact paths, with larger overlapping low-opacity particles rather than timed batches. This follows [Epic's distance-based emission guidance](https://dev.epicgames.com/documentation/unreal-engine/spawn-modules?application_version=4.27).

Frame pacing: visual fog raycasts are distributed across updates while unit perception stays immediate; static navigation slopes and mesh bounds are cached, unsuccessful infantry routes respect retry timers, jeep replans are staggered, and particle buffers are prepared once per rendered frame. Wreck lights reuse three slots of the existing six-light effect pool so ignition/extinction does not alter the scene's light count. Reproduce profiling with `node tests/driving-profile.mjs` or `RADIO=1 node tests/driving-profile.mjs` for synchronized engagement/radio stress. Browser timing is machine-dependent and does not establish a universal FPS guarantee.

Grenade smoke now uses larger, overlapping soft-edged billows with internal density shading, building a continuous low screen. Sand wakes scale emission spacing, size, density and lifespan with vehicle speed, using one source per track.

Jeep, infantry and tank secondary machine guns share glancing-armor ricochets (58% speed retained, two-bounce limit). Small-arms rigid bodies use sensor colliders plus swept hit detection: hits still damage armor, but cannot apply contact impulses or impede the tank through solid-contact CCD. Cannon shells retain physical contact. Player engine-deck smoke begins at 40% health, increases at 30%, and becomes heavy at 20%, with color darkening continuously between those thresholds. Settings opens and dismisses with a short fade/slide over the retained main menu, blocks background controls, restores button focus on dismissal, and respects reduced motion.

Track dust uses one source per tread, muted terrain-brown particles and rapid horizontal velocity decay, leaving a lingering wake rather than four divergent streams. Soft sand records shallow compression in a persistent height map (maximum 7.5 cm), with mesh displacement, surface shading and batched updates to affected terrain collider patches. Rock and ruin floors are excluded; tread and ground decals follow the displaced surface. This adapts the persistent height-map approach described in [Deformable Snow Rendering](https://gdcvault.com/play/1021004/Deformable-Snow-Rendering-in-Batman). Live soldier contacts do not transfer solver impulses to tanks; overlap-based run-over behavior remains active.

Jeep destruction randomly selects a fuel fireball, broad pressure/dust burst, or staggered cook-off. Explosions layer a 50 ms flash, rapidly decelerating hot lobes, cooling orange fire, grouped rolling smoke, embers, and a terrain-conforming irregular dust wave. Cannon and machine-gun muzzle flashes use short-lived crossed planes aligned with the barrel, randomized proportions, pooled lighting, and detached lingering smoke; cannons also vent side jets. Pools cap concurrent muzzle flashes at 24 and shockwaves at eight. Timing and layering draw on [Atif's explosion breakdown](https://realtimevfx.com/t/stylized-frag-launcher-explosion-overwatch-inspiration-breakdown-posted/1894?page=2) and [practitioner muzzle-flash guidance](https://realtimevfx.com/t/wondering-how-good-muzzle-flashes-are-made/13540). Wrecked jeeps collapse visually and use a beveled convex hull recognized by suspension rays; live jeeps retain their original collision behavior.

Enemy deployment and reinforcements use a padded camera-frustum exclusion plus a 35 m player buffer. Jeep reinforcements try alternate entry points and retry after one second when all are blocked; infantry placement relocates to off-camera navigable cells. Large squads include one RPG specialist with a shoulder launcher. RPG troops stop and hold aim for 1.15 seconds, reset that delay when visibility/alignment/cover interrupts it, and reload for 4.8 seconds. Rockets are individual CCD rigid bodies (48 m/s launch speed, gravity, 95 direct damage, 3.5 m blast radius), with distance-spaced lingering exhaust smoke, a flickering emissive engine and two pooled local engine lights. Existing cover, ragdoll and run-over behavior applies to RPG soldiers.

Specialist infantry now have procedural weapon-specific upper-body animations blended with their walking/running gait. RPGs have a long tube with rims, grips, sight, a visible loaded rocket and spare rounds; soldiers carry the launcher upright, shoulder it with both hands, and lower it/reach for a fresh round during reload. Firing waits until the shoulder pose is ready. Six- and eight-person squads also include a flamethrower soldier with twin fuel cylinders, harness, hose, mask and nozzle. Flamethrowers close to 8 m, aim briefly, then fire for up to 2.2 seconds followed by a 2.6-second recovery. The stream reaches 11 m, applies 22 damage/second on contact and is blocked by solid cover; flame travel length matches the obstruction raycast. All specialists retain ordinary locomotion, collision, ragdoll and crushing behavior.

Flamethrower streams now have a widening, turbulent orange core, rolling smoke edges, flying sparks and pulsing local light. A flamethrower soldier's death detonates the fuel pack once: a fuel-style explosion, nearby blast damage, blood/stain effects and varied airborne ragdoll groups with a strong upward launch. Existing ragdoll limits and cleanup still apply.

Infantry run-overs now distinguish full hull overlap from partial track-edge contact. Partial hits can sever one leg, leaving an unarmed crawling survivor for 18–26 seconds; fast edge hits sometimes separate the lower body, leaving a 4–6 second crawl before death. A 0.7 second edge-hit grace period permits the initial tank pass, while later direct contact can finish the wounded soldier. Crawl speed pulses with the arm-drag animation, and wounds leave timed blood trails. Full dismemberment selects among four non-repeating adjacent breakup patterns with varied retained joints, radial scatter, launch height and spin; fragments bleed briefly and leave a stain when landing. Ragdolls remain bounded to 24 groups and blood decals to 192 instances. Extra burst droplets, scattered stains and varying decal shapes/colors reduce repetition.

Five reactive scenery types are available for testing: abandoned car, wooden supply crate, wooden road barricade, fuel bowser and field generator. Five examples sit around the deployment area: car (-10,21), crate (-5,12), barricade (2,8), fuel bowser (13,16), generator (8,28). Four additional clusters bring the total to 25. All have dynamic collision and weapon health; tank contact applies crush damage. Cars flatten into persistent traversable wrecks. Crates/barricades scatter wooden panels and beams; generators break apart with sparks; fuel bowsers explode with nearby damage and chain reactions. Broken visible pieces become bounded, temporary rigid-body debris. The generated wood texture and exact prompt are recorded in ASSET_PROMPTS.md.
