# Destructible buildings

The Dev Map has a small Baghdad district a short drive north of the spawn: a main street running east–west at z ≈ −30, with buildings on both sides, a mosque behind them, a petrol station on the road in from the west, and a courtyard house east of the spawn. Lots are listed in `BUILDING_LOTS` (`src/config.js`). `terrainHeight` flattens each lot into an exact pad and blends back to the dunes over `LOT_FALLOFF` metres. Rocks and shrubs are kept off the pads.

| Type | What it is | Notable pieces |
| --- | --- | --- |
| `unfinished` | Three-storey poured-concrete skeleton | 16 columns per floor, rebar starts, partial cinder-block infill, a missing top-floor slab, sand heap |
| `market` | Two-storey shop row | Five shopfronts with rolling shutters, signboards and awnings, flats above |
| `apartment` | Four-storey block | Cantilevered balconies with railings and laundry, AC units, rooftop stair house |
| `shanasheel` | Old Baghdad yellow-brick house | Projecting timber *shanasheel* bays with mashrabiya screens, pointed arches, crenellated parapet |
| `hotel` | Seven-storey concrete hotel | Ribbon windows, lobby shopfronts, rooftop sign, water tanks and dishes |
| `government` | Ministry office | Tall arched ground floor, drum-column portico, frieze, flag, concrete T-walls |
| `warehouse` | Brick warehouse | Roller doors, gable ends, steel trusses carrying corrugated roof sheets |
| `mosque` | Neighbourhood mosque | Arcaded portico, tile frieze, drum and four-ring tiled dome, 20 m minaret with gallery |
| `courtyard` | Family house | Walled forecourt with steel gate, date palm, rooftop laundry line |
| `petrol` | Petrol station | Canopy on four columns, fuel islands with exploding dispensers, kiosk, price pylon |

`street` is extra dressing, deployed with the district: an asphalt strip, wooden utility poles with sagging wires, date palms, a sandbag checkpoint, HESCO barriers and burnt-out cars.

## How it is built

**Cells** (`src/building-geometry.js`). Every visible piece is a small convex solid. A wall part is a rectangle (or a convex arch voussoir) that is Voronoi-fractured into cells about 1 m across, then extruded through the wall. Each polygon edge carries a label. Original surfaces (`edge`, `top`) keep the facade material. Fresh breaks (`cut`) use the fractured concrete/brick core texture, so a hole always shows broken masonry. All cells of a building go into one non-indexed geometry per material. A whole building costs a handful of draw calls. Hiding a cell collapses its triangles to a point, and the original positions are kept so the cell can still be thrown or dropped.

**Kit** (`src/building-kit.js`). `Blueprint` offers the modular components:

- `wallBay(frame, W, H, t, opening, style)`: a wall bay with a window, door, shopfront, pointed arch or open hole. Openings add atlas-textured inserts (grilles, shutters, doors, shutters with graffiti, signs), sills, AC units and awnings as decor cells.
- `storey(footprint, y, H, t, openingFor)`: a full ring of bays. `floorSlab()` lays slab tiles with overhanging edges. `interiorColumns()`, `parapet()` and `column()` fill in the rest.
- `slab()`, `dome()` (ring modules of curved tile segments), `drum()` (cylindrical wedges for minarets and portico columns), `waterTank()`, `dish()`, `condenser()`, `atlasQuad()`, `fixtureBox()`, `foundation()` (a static plinth).

`src/building-catalog.js` assembles the ten building types (and the street dressing) programmatically from these parts, with seeded variation in tints, window treatments and rooftop clutter. To add a building, write a function that returns a `Blueprint`. Register it in `BUILDING_TYPES` and add a lot to `BUILDING_LOTS`.

**Modules and structure** (`src/buildings.js`). Each module (a wall bay, slab tile, column, parapet, dome ring, drum…) keeps one cuboid collider per intact part. On the first break, that part switches to per-cell convex hulls, so shells really do pass through windows and breaches. Supports are derived from geometry:

- A module rests on anything whose top meets its bottom.
- Walls and columns also bear on the wall or column directly below through the slab, with four times the weight. Knocking out a ground-floor bay therefore removes the load path for the facade above it.
- Balconies, shanasheel bays, trusses, roof sheets, porticos and the dome declare explicit supports.

`evaluate()` walks modules bottom-up. A module stands if the surviving share of its support (scaled by the supporters' own integrity) reaches `need`. Otherwise it stands only if enough same-level, vertically-supported neighbours can bridge it (`lateral`). A module also fails outright when its own cell integrity drops below `fail`. Unstable modules are scheduled lowest-first, with a short delay that grows with height, and trickle dust while they sag. So collapses progress floor by floor.

**Falling and rubble.** A collapsing module becomes one to three compound rigid bodies with the building's visible cells. Rigid groups (the minaret, each palm and utility pole) fall as a single body with a topple impulse. Chunks lean away from the last damage. When a chunk slams into something, it shatters into per-cell debris (dust burst, grit, thud, camera shake). Settled debris is baked into per-material ring-buffer meshes (`RubbleBatch`), so rubble costs a few draw calls. Large pieces keep a fixed convex collider. Debris uses its own collision bit (`0x0020`). Tank chassis ignore it and ride over rubble on their suspension rays, and projectiles ignore it so loose rubble never absorbs rounds. Budgets: 110 live debris bodies, 46 falling chunks, 160 rubble colliders and 1600 grit chips.

**Damage routing.** `Game.impact` sends building hits to `Buildings.hit()`. HE breaches about 2 m around the impact and splashes neighbouring modules. AP punches a tighter, deeper hole, and small arms chip dust and wear cells down over time. Ground bursts near buildings splash them through `Buildings.splash()`. Windows shatter with glass glints, and fuel dispensers chain into explosions. Tanks faster than about 5 t·m/s of momentum break the wall cells they press on (`ram()`).

**Effects** (`src/building-fx.js`). Impact puffs, a rolling ground-hugging collapse cloud that uses the vehicle-dust billboards, falling-chunk dust trails, smouldering smoke after collapses, instanced grit with terrain bounces, and synthesised collapse rumble and debris thuds (`AudioEngine.collapse` and `debris`).

**Navigation and camera.** Standing ground-floor modules block the nav grid, and collapses refresh it. The follow camera looks down from 43 m behind the tank. When a building stands between it and the tank, or the tank is inside one, a dithered screen-space cutaway opens around the tank. The cutaway discards only building fragments nearer to the camera than the tank.

## Materials

The seven source images were generated with the codex image skill, one at a time: plaster, yellow brick, fractured core, flat roof, turquoise dome tile, corrugated steel, and a 4 × 4 facade atlas. They then got an edge cross-fade, and luminance-derived normal maps were added (see `ASSET_PROMPTS.md`). They live in `public/assets/buildings/`. Albedos are JPEG to keep the download to about 4.5 MB.

## Tests

- `tests/buildings.test.js` (part of `npm test`) covers:
  - exact Voronoi tiling and cut labels
  - all ten types assembling stable, with no floating parts, within the triangle budget
  - flat pads with no rocks on them
  - breaches that fracture colliders and bake rubble
  - progressive collapse above a breach
  - the minaret toppling as one rigid body
  - exploding fuel pumps
  - dropped cell islands
  - navigation blocking.
- `npm run test:buildings` (dev server on :5173) deploys the Dev Map, photographs the district, fires real HE/AP at the hotel and minaret, rams the apartment block, checks the cutaway and samples frame pacing. It writes screenshots to `test-artifacts/buildings/`.
