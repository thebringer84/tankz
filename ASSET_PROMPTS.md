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
