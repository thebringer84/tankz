# Generated production textures

Generated with the built-in image_gen tool. Maps are AI-authored visual textures, not measured material scans. All final files are in `public/assets/`. The normal and height maps used the desert albedo as their image reference; shader strengths are intentionally subtle.

## desert-albedo.png

Use case: stylized-concept. Production game texture, square seamless tileable desert ground ALBEDO map, orthographic directly overhead, fills entire image edge to edge. Dry warm ochre sandy earth with fine gravel, small subdued stones, faint windswept ripples, broad hand-painted pigment variation. Gritty indie military game with painterly brushwork; not photoreal. Flat diffuse lighting, NO directional light, no cast shadows, no ambient occlusion, no perspective, no buildings plants tracks craters text borders or objects. Consistent small feature scale, understated contrast so tanks read clearly. Seamless all four edges. This is a raw usable texture not a concept board.

## desert-normal.png

Input image is a reference albedo game texture. Generate its matching tangent-space OpenGL normal map ONLY. Preserve exact positions and scale of stones and ripples. Flat regions RGB 128,128,255, subtle cyan/magenta slope variations, raised pebbles, fine sand ripples. Square full bleed seamless tile, no lighting, text, borders, ordinary surface colors or rendered preview. Raw blue/purple normal-map data texture, modest height amplitude.

## desert-height.png

Input image is reference albedo game texture. Generate matching grayscale height / bump map ONLY, preserving exact positions and scale of stones and ripples. White means raised small stones, medium gray flat sand, dark subtle crevices. Broad flat regions with subtle sand grain, low amplitude variation, not directional illumination or a grayscale photograph. Square full bleed seamless tile, no text, border or preview.

## armor-albedo.png

Generate a square seamless tileable raw ALBEDO material texture of hand-painted worn olive drab military steel. Olive paint, subtle brush strokes, small chipped corners and exposed dull gray steel flecks, restrained reddish rust, fine scratches. Flat diffuse texture edge to edge, no directional lighting, shadows, perspective, objects, text, panels, bolts or borders. Gritty indie game 3D tank material; muted green-gray not bright green. Seamless all edges.

## Vanguard medium tank: turnaround, armour, running gear, canvas, grime, decal and lamp lens

Generated with the codex imagegen skill (built-in image_gen tool, one call per asset). The geometry reference is concept-art/02-garage-loadout.png, with 01 and 06 as supporting angles and concept-art/10-vanguard-turnaround.png, generated from 02, for the unseen rear and top. Used by src/vanguard.js.

Map sets. `vanguard-armor-*` covers hull and turret and `vanguard-gear-*` covers tracks, wheels and fittings. In each set, bump, specular and roughness are imagegen edits of that set's albedo, passed as the reference image. The **normal maps are computed from the bump** (Sobel on a 1.1 px blur, wrap mode, OpenGL +Y), so colour and relief align exactly. Alignment check (high-pass correlation with the albedo; about 0.00 at a 40 px offset in every case):

- armour: bump +0.40, specular +0.35, roughness +0.50
- gear: bump +0.56, roughness +0.50. Gear specular is -0.09 against the albedo because mud and dust are bright in albedo but dull in specular. It is -0.29 against roughness, which is expected for shiny steel.

Seams: each map in a set got the same mirrored edge cross-fade (56 px), taking wrap error from about 15 to 0. Grayscale data maps are stored as 8-bit L PNGs.

Other assets:
- `vanguard-canvas-bump/normal` are a high-pass of the canvas weave.
- `vanguard-decal.png` has real alpha. The triangle sits left of u=0.469 and "217" right of it.
- `vanguard-lens.png` is both the colour and emissive map for the headlamps, the marker and the red-tinted tail lamps.

The running-gear set is shared by all three tanks. `gearMaterial` in src/tank-geometry.js builds tracks, tyres, hubs, hooks, lamp cages and other metal fittings from it on the Kestrel and the Marauder. The Kestrel's canvas uses the Vanguard canvas maps.

Showroom materials use albedo, normal, roughness and specular (Physical). Gameplay uses albedo and bump. A shared weathering pass adds macro tone, cavity (showroom), chip metalness from the specular map, dust and mud driven by the grime mask and baked root-space height.

### Turnaround (Image 1: concept 02)
> Use case: stylized-concept
> Asset type: production vehicle turnaround design sheet, landscape 3:2, used by a 3D modeller as the geometry reference.
> Input images: Image 1 is the approved concept art; the tank in the centre (turret marked "217") is the exact design to reproduce. Keep every design element identical: boxy riveted cast-and-welded turret with faceted cheeks, box mantlet with round gun collar, long 76 mm gun with thickened muzzle, commander cupola, stowage bin on the turret rear side, sloped glacis with two headlamps in bar guards and a driver vision block, lower nose plate with two U tow shackles, angled front mud guards, full-length track guards with stowage boxes, five large rubber-tyred road wheels, raised front drive sprocket, rear idler, return rollers, cast steel link tracks, rear engine deck.
> Primary request: the same tank drawn as four clean orthographic views arranged in a grid on a neutral warm-grey studio backdrop: LEFT SIDE view (top left), FRONT view (top right), REAR view (bottom right) and TOP-DOWN plan view (bottom left). Same scale in every view, aligned, no perspective distortion. Weathered olive drab paint as in the concept, "217" and the triangle emblem on the turret sides.
> Style/medium: realistic painted 3D render, crisp readable forms and hardware.
> Avoid: labels, dimension lines, text other than 217, humans, background scenery.

### vanguard-armor-albedo.png (Image 1: concept 02)
> Use case: stylized-concept
> Asset type: tileable PBR ALBEDO texture for the hull and turret armour of a hero medium tank ("Vanguard") in a cinematic 3D desert tank game. It will be box-projected over large steel plates at roughly 2.2 metres per tile.
> Input images: Image 1 is the approved concept art; use ONLY the tank's paint and weathering as the colour and wear reference (worn olive drab paint over cast and rolled steel).
> Primary request: a square, full-bleed, perfectly seamless repeatable surface of battle-worn olive drab painted armour steel matching the concept tank. Base: muted olive-drab green paint (not bright, not yellow-green), with broad soft tonal mottling between slightly darker grey-olive and faded dusty khaki-olive. Weathering: many small-to-medium irregular chipped paint flakes exposing dark gunmetal steel, some chips with thin lighter primer edges; fine speckled chipping; dry desert dust accumulating in soft patches; faint vertical rain/rust streaks in muted oxide brown; a few light scratches and scuffs; subtle cast-steel pitting texture in the paint. Density of wear similar to the concept: clearly battle worn but the olive paint still covers roughly 80 percent of the surface.
> Style/medium: photoreal, cinema-grade material scan with a very slight hand-painted richness.
> Composition/framing: straight-on orthographic flat material, uniform scale across the entire image, no focal object, no perspective.
> Lighting: completely flat diffuse colour only; absolutely no directional light, highlights, cast shadows, ambient occlusion or vignette.
> Constraints: must tile seamlessly on all four borders. Medium value, readable at a distance.
> Avoid: tanks, panels, panel seams, bolts, rivets, welds, lettering, numbers, symbols, camouflage stripes, frames, borders, text, watermark.

### vanguard-armor-bump.png (Image 1: the armour albedo)
> Use case: precise-object-edit
> Asset type: matching grayscale HEIGHT / BUMP map for a tileable PBR tank armour material.
> Input images: Image 1 is the edit target: the tank armour ALBEDO texture. Transform it into its height map.
> Primary request: convert the attached olive armour albedo into a strictly grayscale height map that aligns with it pixel for pixel. Preserve the exact position, shape and scale of every chipped paint flake, speckle, rust streak, scratch and pit. Intact painted steel is a flat medium-light grey (about 62 percent) with very fine low-amplitude paint and cast-steel grain noise; chipped flakes where the paint layer is missing are darker recesses (about 40 percent) with crisp raised paint-edge rims slightly brighter than the paint; scratches are thin dark grooves; rust streaks very slightly raised and rough; dust patches barely raised and soft.
> Constraints: identical framing, square, full bleed, seamless tiling, no perspective. Strictly grayscale height data, not a photograph.
> Avoid: colour, directional lighting, shading, shadows, ambient occlusion, text, labels, borders, previews.

### vanguard-armor-specular.png (Image 1: the armour albedo)
> Use case: precise-object-edit
> Asset type: matching grayscale SPECULAR intensity map for a tileable PBR tank armour material.
> Input images: Image 1 is the edit target: the tank armour ALBEDO texture. Transform it into its specular map.
> Primary request: convert the attached olive armour albedo into a strictly grayscale specular-intensity map aligned pixel for pixel. Preserve the exact position, shape and scale of every chipped flake, speckle, rust streak, scratch and dust patch. Old matte olive paint is an even dark grey (about 30 percent) with subtle fine mottling; dust patches darker (about 18 percent); rust streaks very dark (about 12 percent); chipped flakes of exposed bare gunmetal steel and hairline scratches are bright (80 to 92 percent), with the thin primer rims mid grey.
> Constraints: identical framing, square, full bleed, seamless tiling, no perspective. Strictly grayscale PBR data.
> Avoid: colour, directional lighting, shading, shadows, text, labels, borders, previews.

### vanguard-armor-roughness.png (Image 1: the armour albedo)
> Use case: precise-object-edit
> Asset type: matching grayscale ROUGHNESS map for a tileable PBR tank armour material.
> Input images: Image 1 is the edit target: the tank armour ALBEDO texture. Transform it into its roughness map.
> Primary request: convert the attached olive armour albedo into a strictly grayscale linear roughness map aligned pixel for pixel. Preserve the exact position, shape and scale of every chipped flake, speckle, rust streak, scratch and dust patch. Matte olive paint is light grey (about 76 percent) with subtle fine mottling; dust patches lighter (about 88 percent); rust streaks near white (92 percent); chipped flakes of exposed bare steel are dark grey (about 38 percent) and hairline scratches darker still (about 30 percent).
> Constraints: identical framing, square, full bleed, seamless tiling, no perspective. Strictly grayscale linear PBR data.
> Avoid: colour, directional lighting, shading, shadows, text, labels, borders, previews.

### vanguard-gear-albedo.png (Image 1: concept 02)
> Use case: stylized-concept
> Asset type: tileable PBR ALBEDO texture for the running gear of a hero tank in a cinematic 3D desert tank game: cast manganese-steel track links, drive sprocket, idlers, road-wheel hubs, suspension arms, tow shackles and chains.
> Input images: Image 1 is the approved concept art; use ONLY the tank's tracks and road wheels as the colour and wear reference.
> Primary request: a square, full-bleed, perfectly seamless repeatable surface of heavily used dark cast steel: dark gunmetal grey-brown iron with fine cast-sand pitting, patchy orange-brown and dark umber rust bloom, traces of worn olive paint remnants in small patches, caked and dried pale desert dust and ochre mud clinging in clumps and smears, a few bright worn polished scuffs where metal rubs metal.
> Style/medium: photoreal cinema-grade material scan.
> Composition/framing: straight-on orthographic flat material, uniform scale, no focal object, no perspective.
> Lighting: completely flat diffuse colour only; no directional light, highlights, cast shadows, ambient occlusion or vignette.
> Constraints: must tile seamlessly on all four borders. Mid-dark overall value (not black).
> Avoid: track links, bolts, rivets, objects, shapes, text, numbers, frames, borders, watermark.

### vanguard-gear-bump.png, -specular.png, -roughness.png (Image 1: the gear albedo)
> Use case: precise-object-edit
> Asset type: matching grayscale HEIGHT / BUMP map for a tileable PBR cast-steel running-gear material (tank tracks, wheels, sprocket).
> Input images: Image 1 is the edit target: the running-gear steel ALBEDO texture. Transform it into its height map.
> Primary request: convert the attached rusty cast-steel albedo into a strictly grayscale height map aligned with it pixel for pixel. Preserve the exact position, shape and scale of every rust bloom, mud clump, pit, paint remnant and scuff. Bare cast steel is medium grey (about 50 percent) with fine sand-cast pitting noise; caked mud and dust clumps are raised and lumpy (65 to 85 percent); rust blooms slightly raised and flaky; olive paint remnants slightly raised with crisp edges; worn polished scuffs slightly lower and smooth.
> Constraints: identical framing, square, full bleed, seamless tiling, no perspective. Strictly grayscale height data.
> Avoid: colour, directional lighting, shading, shadows, ambient occlusion, text, labels, borders, previews.

> Use case: precise-object-edit
> Asset type: matching grayscale SPECULAR intensity map for a tileable PBR cast-steel running-gear material.
> Input images: Image 1 is the edit target: the running-gear steel ALBEDO texture. Transform it into its specular map.
> Primary request: convert the attached rusty cast-steel albedo into a strictly grayscale specular-intensity map aligned pixel for pixel. Preserve the exact position, shape and scale of every rust bloom, mud clump, pit, paint remnant and scuff. Dull dark bare cast steel is mid grey (about 55 percent); worn polished metal scuffs are bright (85 to 95 percent); rust blooms dark (15 percent); caked mud and dust very dark (8 percent); olive paint remnants dark grey (30 percent).
> Constraints: identical framing, square, full bleed, seamless tiling, no perspective. Strictly grayscale PBR data.
> Avoid: colour, directional lighting, shading, shadows, text, labels, borders, previews.

> Use case: precise-object-edit
> Asset type: matching grayscale ROUGHNESS map for a tileable PBR cast-steel running-gear material.
> Input images: Image 1 is the edit target: the running-gear steel ALBEDO texture. Transform it into its roughness map.
> Primary request: convert the attached rusty cast-steel albedo into a strictly grayscale linear roughness map aligned pixel for pixel. Preserve the exact position, shape and scale of every rust bloom, mud clump, pit, paint remnant and scuff. Bare cast steel medium grey (about 55 percent); worn polished scuffs dark (25 to 35 percent); rust blooms light (85 percent); caked mud and dust near white (93 percent); olive paint remnants light grey (75 percent).
> Constraints: identical framing, square, full bleed, seamless tiling, no perspective. Strictly grayscale linear PBR data.
> Avoid: colour, directional lighting, shading, shadows, text, labels, borders, previews.

### vanguard-canvas-albedo.png (Image 1: concept 01)
> Use case: stylized-concept
> Asset type: tileable PBR ALBEDO texture for military canvas tarpaulins, bedrolls and stowage bags strapped to a tank.
> Input images: Image 1 is the approved concept art; use ONLY the canvas bag / tarp on the tank's turret side as the colour reference.
> Primary request: a square, full-bleed, perfectly seamless repeatable surface of heavy woven cotton duck canvas, faded olive-khaki with dusty lighter patches, visible fine basket weave, a few darker grease and oil stains, soft sun fading, desert dust ground into the fibres, slight fraying scuffs.
> Style/medium: photoreal cinema-grade fabric material scan.
> Composition/framing: straight-on orthographic flat material, uniform scale, weave running exactly horizontal and vertical, no folds, no wrinkles, no perspective.
> Lighting: completely flat diffuse colour only; no directional light, highlights, shadows or ambient occlusion.
> Constraints: must tile seamlessly on all four borders.
> Avoid: folds, seams, straps, buckles, stitching lines, objects, text, frames, borders, watermark.

### vanguard-grime-mask.png (Image 1: concept 06)
> Use case: stylized-concept
> Asset type: tileable grayscale GRIME MASK texture used by a shader to blend dried desert mud and dust onto the lower hull, tracks and wheels of a tank.
> Input images: Image 1 is the approved concept art; use ONLY the dried mud and dust splattered over the tank's lower hull and track guards as the pattern reference.
> Primary request: a square, full-bleed, perfectly seamless grayscale mask: black means clean surface, white means thick caked mud. Organic clumpy splatter kicked up by tracks, irregular dried mud patches with cracked edges, fine spray speckles, soft dusty smears and several vertical drip streaks running downward. Roughly 40 percent coverage with a full range of soft and hard edges.
> Composition/framing: flat orthographic, uniform density across the frame, no focal object, no perspective.
> Constraints: strictly grayscale mask data, seamless on all four borders.
> Avoid: colour, lighting, shading, shadows, text, frames, borders, watermark.

### vanguard-decal.png (Image 1: concept 02)
> Use case: stylized-concept
> Asset type: transparent-background paint stencil DECAL sprite for the turret side of a tank in a cinematic 3D game.
> Input images: Image 1 is the approved concept art; match the white "217" number and the white triangle emblem painted on the tank's turret, including their worn, chipped, weathered look.
> Primary request: a wide landscape image on a genuinely TRANSPARENT background containing exactly two painted markings side by side, left to right: (1) a bold white equilateral triangle emblem outline with a smaller solid white triangle cut into its lower centre (an upward delta chevron like the concept), and (2) the number "217" in bold condensed military stencil numerals. Text (verbatim): "217" — the digits two, one, seven. Off-white chalky military paint colour (#E9E4D2). The paint is heavily weathered: chipped, scratched, flaking with many small missing flecks and dusty worn edges so the steel below would show through; realistic hand-sprayed stencil edges with slight overspray.
> Composition/framing: flat orthographic, markings fill most of the frame with generous transparent padding, both markings the same height, perfectly upright.
> Constraints: transparent background alpha, the missing chips are transparent, no background colour.
> Avoid: any other text or numbers, steel or olive background, shadows, perspective, frames, borders, watermark.

### vanguard-lens.png
> Use case: stylized-concept
> Asset type: square texture for the round glass lens of a military vehicle headlamp, used as both the colour and emissive map on a flat disc in a cinematic 3D game.
> Primary request: straight-on orthographic view of a round vintage military tank headlamp lens filling a square frame edge to edge: thick pressed glass with concentric Fresnel rings and a fine vertical prismatic flute pattern, a warm tungsten glow (pale cream-yellow core, warm amber toward the rim), subtle dust and grime specks on the glass, slight scratches, a thin dark metal retaining ring at the very edge of the circle. The corners outside the circle are pure black.
> Composition/framing: perfectly centred circle touching the square edges, no perspective, flat.
> Lighting: self-illuminated glowing lens only; no environment reflections, no lens flare, no bloom rays.
> Avoid: text, logos, bulb filament close-up, housings, background scenery, frames, watermark.

## concrete-albedo.png

Square tileable seamless raw game ALBEDO texture, worn pale gray beige military bunker concrete with hand painted surface, subtle chipped plaster and aggregate, fine hairline cracks, faint soot patches, neutral desaturated stone palette. Full image one flat diffuse material, no directional lighting or shading, NO large cracks holes bricks panels objects text border perspective. Gritty painterly indie tank game. Surface remains fairly light gray.

## rock-albedo.png

Square tileable seamless raw game ALBEDO texture, dry exposed desert sandstone bedrock, muted pale taupe gray with broad hand-painted strata and warm rusty mineral speckling, subtle angular surface chips. Deliberately desaturated, earthy, medium light gray tan. Full bleed flat diffuse material, no directional lighting shadows perspective objects sand dunes text or borders. Painterly indie 3D tank game.

## smoke.png

Production game VFX texture: a single isolated soft volumetric SMOKE PUFF sprite, square image, genuinely transparent RGBA background. Neutral light gray and white fluffy rolling smoke with intricate turbulent wisps, soft feathered edges fading completely to alpha zero, asymmetrical organic cloud filling central 75% of frame, no cropped edges. Hand-painted indie game effects texture, viewed front on, broad soft shading, no fire, no ground, no shadow beneath, no surrounding scene, no text, no borders, no atlas. Used as tintable particles for dust, smoke and explosions. Preserve actual transparency.



## fire.png

Built-in image_gen output, saved in public/assets/fire.png.

Production VFX particle sprite for a gritty hand-painted 3D desert tank game. One isolated compact explosive FIRE BALL puff, bright cream white core transitioning through vivid yellow and orange to dark red wispy edges. Organic turbulent lobes and fine tongues of fire, not a circle or a sphere. Single square full image, object centered occupying central 75%, all edges fade completely to transparent. Genuine transparent RGBA background. No ground, no cast shadows, no scenery, no text, no border, no atlas. This is a raw sprite texture meant to be layered, rotated and animated, not concept art. Soft particle boundaries, painterly indie game detail, dramatic incandescent center.

## sparks.png

Built-in image_gen output, saved in public/assets/sparks.png.

Production VFX particle sprite for a gritty hand-painted 3D military game. One compact BURST OF METAL IMPACT SPARKS radiating from center, vivid white-yellow central flash, tapered glowing orange flecks flying outward, a few tiny dark metal specks. Asymmetrical starburst, not a symmetrical icon. Isolated centered on genuinely transparent RGBA background, square texture with wide fully transparent padding at all edges. No ground, no smoke cloud, no objects, no text, no border, no atlas. Game-ready impact / muzzle flash sprite, sharp hot center and softer outer flecks.

## crater.png

Built-in image_gen output, saved in public/assets/crater.png.

Production top-down ground decal texture for a stylized gritty 3D desert tank combat game. A single irregular shallow SHELL IMPACT CRATER in ochre desert sand, charcoal scorched center, radial cracks, scattered tiny gravel and a low broken sandy rim. Exactly orthographic overhead, subtle painted depth with no directional cast shadow, no perspective, no other objects. Genuinely transparent RGBA background outside the irregular feathered rim; all four square image edges fully transparent, decal centered occupying central 75%. Hand-painted indie game art, soot black and dark brown inside, muted sand tan rim, no flames, no text, no border, no atlas. Raw ground-projected decal asset.


## armor-roughness.png

Built-in image_gen edit using armor-albedo.png as reference; saved in public/assets/armor-roughness.png. Linear grayscale PBR data.

Generate a matching grayscale ROUGHNESS map for the reference olive painted armor texture. Production PBR texture, square seamless full bleed, no labels or preview. Preserve exact placement of reference scratches and chipped paint. Mostly medium-light grey rough painted steel (roughness 0.55-0.75), scattered darker gray exposed-metal chips (roughness 0.25-0.4), slightly lighter grime. Do NOT copy illumination into the map. No border, no colors, no lighting. Fine restrained variation suitable for a close-up military tank model.

## armor-normal.png

Built-in image_gen edit using armor-albedo.png as reference; saved in public/assets/armor-normal.png. Linear tangent-space OpenGL normal data.

Create a matching tangent-space OpenGL NORMAL MAP for the supplied olive painted armor albedo. Preserve exact scratches and chipped paint positions. RGB approximately 128 128 255 on flat metal, subtle purple/cyan changes around tiny chipped paint edges, hairline scratches, pitted cast steel. Raw square seamless texture only. Very shallow microrelief suitable for close-up tank armor, not embossed camouflage. No text, no labels, no border, no ordinary surface colors, no baked light.
## Showroom dusk and sustained tire fire

Built-in image_gen generation. Saved as public/assets/showroom-dusk-sky.png and public/assets/tire-flame.png. The flame output has a black backdrop and is used with additive blending.

Sky prompt: Use case: stylized-concept. Production game skybox texture, full 360 degree equirectangular panorama, 2:1 aspect ratio. Gritty painterly realistic desert military game at dusk, dark desaturated blue slate upper sky, layered wispy storm clouds catching restrained amber copper light along the horizon, dusty atmospheric haze. Very distant soft desert mesas just below equator, lower hemisphere muted dark sandy earth. Horizon exactly halfway vertically. Sky occupies upper half, no buildings, no foreground props, no fire, no text, no border, no sun disk. Left and right edges seamlessly match. Rich cinematic hand-painted indie art, natural clouds not smooth generic gradient. Raw environment map only, not a picture of a hangar.

Flame prompt: Use case: stylized-concept. Production VFX texture for continuous burning tire fire in a gritty military 3D game. One isolated upright narrow column of licking flames, broad connected orange glowing base at bottom center, multiple long thin tapering tongues bending slightly right, wispy translucent orange red tips, pale yellow hot lower center. Height about twice width. This is a sustained ground fire not an explosion, NOT a fireball or round puff. Raw front-facing sprite on genuinely transparent RGBA background, wide transparent padding, soft alpha edges, no tire, ground, smoke, objects, text or border. Painterly realistic detailed turbulent flame filaments.

## Kestrel scout concept and composite armor maps

Generated with the generate-image skill (codex built-in imagegen). The concept is saved as concept-art/08-kestrel-scout.png and is the geometry reference for src/kestrel.js. The maps are saved as public/assets/kestrel-armor-{albedo,normal,bump,specular,roughness}.png. Each derived map was an edit of the albedo, passed as the reference image. Alignment was checked by high-pass correlation against the albedo (0.10 to 0.45 when aligned, about 0.00 when offset by 40 px). Seams were checked for tiling: wrap-edge differences match the interior.

Concept prompt: Production vehicle design sheet for a video game, landscape 3:2. Subject: KESTREL, a cutting-edge light reconnaissance scout tank, shown as one large clean three-quarter front-left view on a neutral warm grey studio backdrop with soft contact shadow. Design: very low, long, wedge-shaped faceted stealth hull with sharp chines and a steeply raked glacis; angular side skirts covering the upper track run; five small lightweight road wheels per side, front drive sprocket, rear idler, continuous rubber band tracks with chevron lugs. Low flat unmanned remote turret, wide and heavily faceted like a wedge, with a rear ammunition bustle; long slim high-velocity gun with a segmented thermal sleeve and a compact multi-baffle muzzle brake. Roof carries a gyro-stabilised panoramic commander sight drum, a telescoping sensor mast with a spherical electro-optic head, small pyramid laser-warning receivers on turret corners, active protection launcher boxes on turret flanks, a compact remote weapon station machine gun, and a small quadcopter recon drone docked on the rear hull deck. Thin LED light slits, driver periscope array. Matte khaki-olive composite armor with subtle darker angular disruptive camouflage panels, hand-painted indie game texture, light edge wear and dust, stencilled number 06 and a white diamond marking on turret side. Gritty military industrial indie game art style matching chunky compact tank proportions, crisp readable silhouette, painterly surfaces, physically believable light. No text other than the 06 marking, no labels, no humans, no background scenery.

Albedo prompt: Square seamless tileable raw ALBEDO game material texture of modern matte composite tank armor coating, light warm khaki-olive (muted sandy olive, fairly light and desaturated so it can be tinted), fine powder-coat / ceramic spray-on grain, very subtle hand-painted brush variation, sparse small chipped edges revealing dull dark grey composite underneath, light dust accumulation and faint streaks, a few fine scratches. Flat diffuse texture filling the whole frame edge to edge with uniform even density, NO directional lighting, NO shadows, NO perspective, NO panel seams, NO bolts, NO rivets, NO camouflage shapes, NO text, NO border. Gritty painterly indie tank game material, cleaner and more modern than old riveted steel. Left/right and top/bottom edges must tile seamlessly.

Normal prompt (albedo reference): A matching tangent-space OpenGL NORMAL MAP for this khaki composite armor albedo. Preserve the exact position, shape and scale of every chipped paint spot, scratch and grain from the reference so the maps align pixel for pixel. Flat areas RGB approximately (128,128,255) lavender-blue; chipped spots read as shallow recessed depressions with thin purple/cyan/pink rims; hairline scratches as fine grooves; very fine even powder-coat grain microrelief. Very shallow relief suitable for close-up armor, not embossed. Square, full bleed, same framing as reference, seamless tiling, no text, labels, border, preview, ordinary surface colors or baked lighting.

Bump prompt (albedo reference): A matching grayscale HEIGHT / BUMP MAP for this khaki composite armor albedo. Preserve the exact position, shape and scale of every chipped paint spot, scratch and grain. Painted surface is a flat medium-light grey (about 60 percent); chipped spots are darker recessed depressions (paint layer missing); hairline scratches are thin dark grooves; very fine low-amplitude powder-coat grain noise over everything. Strictly grayscale height data, not a photograph: no directional lighting, no shading, no color. Square, full bleed, seamless tiling, no text, labels, border or preview.

Specular prompt (albedo reference): A matching grayscale SPECULAR (specular intensity) map for this khaki composite armor albedo. Preserve the exact position, shape and scale of every chipped paint spot, scratch and grain. Matte ceramic-composite paint is a fairly dark even grey (about 30-35 percent brightness) with subtle fine mottling; dusty streaks slightly darker; chipped spots where bare composite/metal is exposed and hairline scratches are bright (80-95 percent). Strictly grayscale PBR data: no directional lighting, no shading, no color. Square, full bleed, seamless tiling, no text, labels, border or preview.

Roughness prompt (albedo reference): A matching grayscale ROUGHNESS map for this khaki composite armor albedo. Preserve the exact position, shape and scale of every chipped paint spot, scratch and grain. Matte painted composite is light grey (roughness about 0.7-0.8) with subtle fine mottling; dust streaks slightly lighter; chipped spots of exposed composite/metal and hairline scratches are darker grey (roughness 0.3-0.45). Strictly grayscale linear PBR data: no directional lighting, no shading, no color. Square, full bleed, seamless tiling, no text, labels, border or preview.

## Marauder super-heavy concept, armour maps and hazard stripes

Generated with the generate-image skill (codex built-in imagegen). The concept is saved as concept-art/09-marauder-heavy.png and is the geometry reference for src/marauder.js. The maps are saved as public/assets/marauder-armor-{albedo,normal,bump,specular,roughness}.png and marauder-hazard-albedo.png. Each derived armor map was an edit of the albedo, passed as the reference image. Their high-pass correlation with the albedo is 0.13 to 0.57 when aligned and about 0.00 when offset by 40 px. The derived maps and the hazard texture did not tile at their wrap edges, so each edge was cross-faded over 40 px with its mirror. For the normal map, the matching channel was inverted in the mirrored sample. The fix leaves alignment intact.

Concept prompt: Production vehicle design sheet for a video game, landscape 3:2. Subject: MARAUDER, an absurdly over-the-top super-heavy assault tank, the biggest machine in the game, shown as one large clean three-quarter front-left view on a neutral warm grey studio backdrop with soft contact shadow. Design: a massive, tall, brutal fortress on FOUR separate track units (two tracks per side, front and rear pairs visible) with heavy armoured track guards; huge angled bulldozer-style ram plough on the front with welded teeth; thick welded slab armour layered with rows of explosive reactive armour bricks; big dual vertical exhaust stacks at the rear; a colossal wide angular cast-and-slab turret with a heavy bustle, mounting ONE enormous long main cannon with a giant box muzzle brake and a fume extractor, flanked by two coaxial auto-cannons in armoured pods, a roof rocket pod launcher box on one side, a heavy machine-gun cupola, big smoke grenade launcher clusters, a caged searchlight, spare track links hung on the turret sides, chains, tow cables and jerry cans. Dark weathered gunmetal olive armour with rust streaks, heavy soot around exhausts, chipped hazard yellow-and-black chevron stripes on the plough, stencilled number 07 and a white triangle marking on turret side. Gritty military industrial indie game art style, chunky exaggerated proportions, crisp readable silhouette, hand-painted painterly surfaces, physically believable light. No text other than the 07 marking, no labels, no humans, no background scenery.

Albedo prompt: Square seamless tileable raw ALBEDO game material texture of heavily weathered thick cast and welded super-heavy tank armour steel: dark gunmetal olive-grey paint, large areas of worn and chipped paint revealing dark bare steel, orange-brown rust blooms and vertical rust streaks, oily soot smudges, pitted cast-steel surface, scattered scratches and gouges, faint hand-painted brush variation. Mid-dark overall value (not black) so it can be tinted. Flat diffuse texture filling the whole frame edge to edge with uniform even density, NO directional lighting, NO shadows, NO perspective, NO panel seams, NO bolts, NO rivets, NO text, NO border. Gritty painterly indie tank game material. Left/right and top/bottom edges must tile seamlessly.

Derived map prompts (albedo reference; each ends with: preserve the exact position, shape and scale of every paint chip, rust bloom, pit, scratch and gouge so the maps align pixel for pixel; square, full bleed, seamless, no text, labels, border, preview or baked lighting):
- Normal: a matching tangent-space OpenGL NORMAL MAP. Flat painted areas RGB approximately (128,128,255); paint layer edges around chipped areas as small raised steps with purple/cyan/pink rims; bare steel and rust areas slightly recessed and rough-pitted; scratches and gouges as grooves; pitted cast-steel microrelief. Moderate relief, not embossed, no ordinary surface colours.
- Bump: a matching grayscale HEIGHT / BUMP MAP. Intact paint is medium-light grey (about 60 percent); chipped areas of bare steel and rust are darker recesses with rough pitted noise; scratches and gouges are thin dark grooves; fine cast-steel pitting over everything. Strictly grayscale height data.
- Specular: a matching grayscale SPECULAR map. Old matte paint dark grey (25-30 percent); rust blooms and soot very dark (10-15 percent); worn bare steel patches and scratch/gouge edges light (70-90 percent).
- Roughness: a matching grayscale ROUGHNESS map. Old matte paint light grey (about 0.75); rust and soot near white (0.9-0.95); worn bare steel and polished scratch/gouge edges dark grey (0.3-0.45).

Hazard prompt: Square seamless tileable raw ALBEDO game material texture of hazard warning stripes painted on battered heavy steel: bold diagonal 45 degree stripes alternating chipped faded hazard yellow-ochre and sooty black, exactly four yellow and four black stripes of equal width across the square so it tiles perfectly, stripes run from bottom-left to top-right. Heavily worn: paint chipped at edges revealing dark bare steel and orange rust, scrapes and gouges from ramming, oily grime, rust streaks. Flat diffuse texture edge to edge, NO directional lighting, NO shadows, NO perspective, NO bolts, NO text, NO border. Gritty painterly indie tank game material. Left/right and top/bottom edges must tile seamlessly.

## Reactive scenery wood — built-in imagegen

Saved asset: `public/assets/scenery-wood.png`. Generated with the built-in image generation tool and copied into the self-hosted project. Used on supply crates, road barricades, and their physical broken pieces. Other scenery reuses the existing metal, armor, rubber, and lamp materials.

Final prompt:
> Use case: stylized-concept. Asset type: square seamless game surface texture, 1024x1024. Generate a flat orthographic albedo texture of weathered military shipping-crate wood: warm desaturated grey-brown rough timber, six broad parallel vertical boards, subtle hand-painted grain, worn edges, nail heads, small faded olive paint remnants and desert dust. Gritty indie military industrial art style. Fill the entire image edge to edge, tile seamlessly. No perspective, no object silhouette, no lighting gradients, no shadows, no text, no border. This will be mapped onto actual low-poly wooden crates and breakable barricades in a desert tank game.


## Cannon muzzle plume

`public/assets/cannon-muzzle-plume.png` — generated with the built-in imagegen tool using the imagegen skill; 1254 × 1254 RGBA with the generated alpha preserved. The exact prompt and research references are recorded in [docs/combat-presentation.md](docs/combat-presentation.md#generated-asset). Used by the pooled cannon flash shader.


## Frontier sandstone — built-in imagegen

Saved asset: `public/assets/frontier-sandstone.png`. Generated with the built-in image generation tool using the imagegen skill, copied into the project, and used as the albedo and subtle bump input for fractured stone ramps, boundary cliffs and low-poly terrain extensions. Geometry is authored in the game so its collisions match the visible surfaces.

Final prompt:
> Use case: stylized-concept. Asset type: seamless square tileable base-color texture for real-time low-poly desert sandstone boulders, natural stone jump ramps and distant mesa scenery in a tank driving game. Create a flat orthographic surface texture filling the entire square: weathered warm ochre sandstone, subtle horizontal sediment strata, chipped mineral edges, restrained charcoal hairline fissures and sandy dust in crevices. Broad quiet areas between fine details, natural varied rock grain, muted tan and dusty reddish brown matching a desert at late afternoon. Neutral diffuse illumination, no directional lighting or cast shadows, no perspective, no individual freestanding rocks, no objects, no sky, no text, no borders or watermark. Seamless matching edges, production-ready game albedo material, 1024 square.

## Awareness border and enemy alert meter — built-in imagegen

Saved assets: `public/assets/awareness-edge.png` and `public/assets/alert-chevron.png`. Generated using the imagegen skill and built-in image generation tool, copied into the project with the generated alpha preserved. The border is a tinted mask behind the HUD; the chevron repeats in the five-segment enemy alert meter. Text stays native HTML for clarity and accessibility.

Final border prompt:
> Use case: stylized-concept. Asset type: transparent widescreen 16:9 game HUD viewport-edge mask for a gritty desert tank game. Create ONLY a very restrained thin perimeter of white translucent windblown dust, fine etched scratches and faint analog sensor grain, fading inward smoothly. Concentrate detail in the four extreme corners and outermost 5 percent of each edge. Entire central 85 percent must be genuinely transparent and empty. All marks neutral white with varying alpha, suitable for tinting teal, amber or red by code. Elegant cinematic military optics, delicate uneven atmospheric edge treatment, no solid panels, no text, no symbols, no reticles, no glow across center, no black background, no checkerboard baked into the image, actual transparent alpha background. This image will overlay gameplay without obscuring the action.

Final chevron prompt:
> Use case: stylized-concept. Asset type: transparent game HUD glyph, one reusable illuminated segment for a five-level enemy alert meter in a gritty military tank game. A single bold upward pointing chevron, centered, crisp geometric silhouette with subtly chamfered corners, thick white metal arms, very fine distressed etched grain and one thin inset dark groove following the chevron. Neutral white and light grey only, no colored lighting. The chevron fills about 75 percent of the square with generous transparent padding. Actual transparent alpha background, no text, no numbers, no border, no drop shadow, no other icons, no black or checkerboard backdrop. Designed to remain clear at 22 pixels tall and to be tinted teal, amber or orange-red by the game. Output a square image.

## Tank dust and recon drone

Generated with the imagegen skill using the built-in image generation tool. Saved assets: `public/assets/tank-dust-billow.png` (alpha preserved) and `public/assets/recon-drone-composite.png`. The dust is tinted to the terrain in the particle shader; the drone material wraps actual beveled hull, arms and motor geometry. Recon square overlays use native CSS for crisp outlines and animation.

Final dust prompt:
> Use case: stylized-concept. Asset type: production real-time VFX particle texture, isolated suspended desert dust billow on actual transparent alpha background, square. A single broad low turbulent dust eddy seen obliquely from above, soft overlapping irregular lobes of fine powder, warm pale taupe and desaturated sandy beige, wispy feathered semi-transparent edges, subtle internal billowing density and fine variation, softly shaded volume under diffuse daylight. Dense but translucent interior with asymmetric curls; no sharp outlines or solid opaque chunks. Fill central 75 percent with generous fully transparent padding on all sides. Not a smoke column, no fire, no explosion, no ground plane, no vehicle, no scene, no debris, no cast shadow, no black or checkerboard baked into the background, no text. Designed for overlapping transparent particles forming a realistic broad tank dust wake from an aerial gameplay camera. Preserve a soft usable alpha falloff and faint wispy edges.

Final drone prompt:
> Use case: stylized-concept. Asset type: seamless tileable square albedo material for the physical 3D model of a compact rugged military reconnaissance quadcopter in a desert tank game. Flat orthographic macro surface of dark charcoal olive composite armor: fine subtle carbon fiber weave beneath worn matte ceramic paint, restrained olive-green panels of color variation, small dusty tan abrasions and micro scratches. Clean premium technical surface, realistic restrained fine details readable on a small flying drone. Even neutral diffuse illumination, no shadows or lighting gradients. Continuous material surface filling frame edge to edge; no drone object, no perspective, no panel borders, no text, no logos, no transparency, seamless on every edge. The game will map this texture onto beveled drone hull, rotor arms and motor housings.

## Destructible buildings — codex image skill

Saved in `public/assets/buildings/`. Generated one at a time with the codex CLI's built-in image generator (`generate-image` skill), at 1254 × 1254. Post-processing (PIL):

- Plaster, fractured core and roof got a 48 px half-offset edge cross-fade for wrap. Brick, tile and corrugated steel already tiled on their pattern grid.
- Everything was resized to 1024².
- Albedos are stored as JPEG (q88, atlas q90).
- Normal maps (`*-normal.png`, 512², OpenGL +Y) are a wrapped Sobel of the blurred luminance, so relief lines up exactly with the albedo.

Tints come from vertex colours in `src/building-catalog.js`, which is why plaster was generated near-neutral.

`plaster-albedo.jpg`
> Production game texture, square seamless tileable ALBEDO map of weathered Middle-Eastern cement stucco / lime plaster wall surface, as seen on sun-baked Baghdad houses. Very light, near-neutral warm off-white to pale sand color (so it can be tinted in-engine), with subtle trowel marks, hairline cracks, a few small chipped patches revealing darker cement, faint dust and rain streak stains, scattered small bullet pock marks and shrapnel chips. Gritty indie military game with painterly hand-painted brushwork, not photoreal. Orthographic straight-on, flat diffuse lighting, NO directional light, no cast shadows, no perspective, no windows, doors, text, borders, or objects. Understated contrast, consistent small feature scale, fills entire image edge to edge, seamless on all four edges.

`brick-albedo.jpg`
> Production game texture, square seamless tileable ALBEDO map of traditional Iraqi / old Baghdad yellow-tan fired brick masonry wall (the pale buff 'farshi' brick used in old Baghdad houses). Running bond, thin flat bricks roughly 4:1 aspect, recessed sandy mortar joints, individual bricks varying from pale buff to honey tan with a few darker baked ones, worn eroded edges, fine dust, a few chipped bricks and small shrapnel scars. Exactly 8 brick courses tall and 4 bricks wide across the tile so it repeats cleanly. Gritty indie military game with painterly hand-painted brushwork, not photoreal. Orthographic straight-on, flat diffuse lighting, NO directional light, no cast shadows, no perspective, no windows, text, borders, or objects. Fills entire image edge to edge, seamless on all four edges.

`rubble-core-albedo.jpg` (fresh fracture faces, grit)
> Production game texture, square seamless tileable ALBEDO map of freshly fractured concrete and cinder-block core, the raw broken cross-section exposed when a wall is blown apart by tank fire. Rough jagged grey-beige aggregate, embedded pebbles and gravel, crumbled cement, pale powdery dust, small voids, thin rusty rebar fragments and orange rust bleed, occasional broken hollow cinder-block cavities. Warm desert dust tint, grey to sandy beige palette. Gritty indie military game with painterly hand-painted brushwork, not photoreal. Orthographic straight-on, flat diffuse lighting, NO directional light, no cast shadows, no perspective, no text, borders or objects. Fills entire image edge to edge, seamless on all four edges.

`facade-atlas.jpg`. Generated first, then edited from that first result to remove a portrait of a real political figure, a religious slogan in the graffiti, and a brand label.
> Game texture ATLAS, square image divided into an exact 4 by 4 grid of equal square cells (each cell exactly one quarter of the width and height), no gaps, no gutters, no borders, no labels between cells. Each cell is a straight-on orthographic, flat-lit (no directional light, no cast shadows) hand-painted facade element from 2000s war-time Baghdad, filling its cell edge to edge. Row 1 left to right: (1) rectangular window with dark glass and a painted steel security grille, (2) closed wooden louvered shutters in faded sun-bleached green, (3) pointed-arch window with ornate wrought-iron grille and dark interior, (4) shattered window, broken glass shards, dark burnt interior. Row 2: (5) blue-painted riveted steel door, (6) weathered wooden double door with arched top, (7) closed corrugated rolling steel shop shutter, dented with spray-paint graffiti squiggles, (8) half-raised rolling shop shutter showing a dark shop interior. Row 3: (9) faded red shop sign board with white Arabic-style calligraphy lettering, (10) faded green shop sign board with yellow Arabic-style lettering, (11) grimy beige window air-conditioner unit front grille, (12) dark carved wooden mashrabiya lattice screen. Row 4: (13) turquoise and cobalt Islamic geometric tile band, (14) carved sandstone geometric frieze, (15) faded peeling paper posters on plaster, (16) ribbed corrugated steel garage door painted dull blue. Gritty indie military game style, painterly, muted dusty colors, not photoreal.

> Edit: keep the exact same 4x4 grid layout, cell boundaries, style, lighting and every other cell unchanged, but change only these three cells: Row 2 cell 3: replace the graffiti text with abstract non-text spray-paint squiggles, drips and a painted phone-number-like row of Arabic numerals only (no words, no religious phrases). Row 3 cell 3: remove the brand label, leave a blank dirty plate. Row 4 cell 3: replace the portrait posters with faded torn generic posters showing only abstract patterns, a palm tree silhouette and blocky unreadable Arabic-style lettering; absolutely no people, faces or real persons.

`tile-albedo.jpg` (dome, minaret shaft, minaret cap)
> Production game texture, square seamless tileable ALBEDO map of weathered turquoise and cobalt-blue glazed ceramic tiles as used on Baghdad mosque domes: small repeating Islamic geometric star-and-cross pattern in turquoise, deep cobalt, white and a little ochre-yellow, with dusty grout, sun-faded glaze, a few missing chipped tiles showing tan plaster underneath, and fine desert dust. Pattern repeats exactly 4 times across and 4 times down. Gritty indie military game painterly hand-painted style, not photoreal. Orthographic straight-on, flat diffuse lighting, NO directional light, no shadows, no perspective, no text, borders or objects. Fills the entire image edge to edge, seamless on all four edges.

`corrugated-albedo.jpg` (warehouse roof, awnings, petrol canopy)
> Production game texture, square seamless tileable ALBEDO map of old corrugated galvanized steel roofing sheet, corrugation ribs running vertically, exactly 12 ribs across the tile, dull grey-zinc metal with faded pale-blue paint remnants, heavy orange-brown rust streaks running downward, dents, a few rivet/nail holes, and fine desert dust settled in the troughs. Gritty indie military game with painterly hand-painted brushwork, not photoreal. Orthographic straight-on, flat diffuse lighting, NO directional light, no cast shadows, no perspective, no text, borders or objects. Fills the entire image edge to edge, seamless on all four edges.

`roof-albedo.jpg` (flat roofs, floor slabs, street asphalt)
> Production game texture, square seamless tileable ALBEDO map of a flat Middle-Eastern concrete rooftop seen from directly above, as on Baghdad houses: sun-bleached pale grey-beige cement screed with hairline cracks, darker patched black bitumen/tar seam repairs, faint square screed joints, windblown sand drifts, dust, water stains and a few small scorch marks. Gritty indie military game with painterly hand-painted brushwork, not photoreal. Orthographic top-down, flat diffuse lighting, NO directional light, no cast shadows, no perspective, no objects, text or borders. Understated contrast, fills the entire image edge to edge, seamless on all four edges.
