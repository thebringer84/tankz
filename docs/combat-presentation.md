# Combat presentation references and decisions

Research consulted September 22, 2026:

- [US Army / DVIDS: M1 Muzzle Blast](https://www.dvidshub.net/image/6340037/m1-muzzle-blast). Visual reference for the incandescent gas volume ahead of the barrel. The effect direction here is an artistic interpretation, not a physical blast simulation.
- [Army Armor: M256, 120mm Abrams Main Gun Flareout](https://www.benning.army.mil/armor/earmor/content/issues/2014/jul_sep/Jablonka.html). Distinguishes the initial blast from a secondary flame; supports separating flash and lingering emission rather than keeping a uniform fireball alive.
- [NVIDIA GPU Gems 3, Chapter 23](https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-23-high-speed-screen-particles). Layered particles convey volume, but overdraw can dominate rendering. This change retains fixed flash/light pools and the existing particle buffer rather than adding a new full-screen effect. A separate reduced-resolution soft-particle pass would need its own GPU profiling; it is not part of this change.
- [Three.js Material](https://threejs.org/docs/pages/Material.html). Transparency, depth-write and blending behavior inform the additive flash/streak and independently cloned unit fade materials.

## Artistic treatment

A generated turbulent plume on two crossed quads supplies the white-hot core and amber edge. A 160 ms presentation envelope, a short local light pulse, pale expanding smoke, and a ground-projected dust wave establish the shot's weight. The flash must be submitted at least once before its lifetime can expire. These durations are deliberately stretched for readability from the elevated game camera.

The shell is a small pointed metal model with a tapered, velocity-aligned exposure streak representing at most 25 ms of travel, capped at 3.2 world units. This is a readability treatment, not a claim about real projectile luminosity. No change to projectile speed, gravity, damage or collision size. Rockets retain their distinct exhaust; cannon shells no longer drop glowing particle breadcrumbs.

Hull orientation uses subtle teal ground chevrons, independent of the turret. Fog perception remains immediate for targeting and AI, while presentation confirms sightings for 75 ms, tolerates a 130 ms occlusion, then fades in/out over 180/240 ms. Moving infantry is excluded from the player's visual fog occlusion so crowds do not create tiny flashing holes. Solid cover and smoke still block visibility.

The pause modal animates its shade and panel on entry and exit. Simulation resumes only after dismissal. Reduced motion skips both transitions; repeated Escape during dismissal cannot restart gameplay early.

## Generated asset

- Built-in imagegen tool via the imagegen skill, no CLI fallback.
- Saved asset: `public/assets/cannon-muzzle-plume.png` (1254 × 1254 RGBA; generated alpha preserved).
- Exact generation prompt:

```text
Use case: stylized-concept. Asset type: production game VFX texture, single isolated tank cannon muzzle blast plume, straight-alpha transparent PNG. Primary request: a cinematic photorealistic transient pressure-driven muzzle flash, NOT an impact explosion. Composition: square canvas, plume oriented vertically, narrow white-hot ignition origin at bottom center (x 50%, y 85%), widening into an irregular bulbous turbulent flame front at y 35%, terminating by y 12%. Keep every luminous wisp inside the canvas with at least 10% fully transparent padding on every side. Dense white and pale ivory core, bright amber midtones, small copper-orange ragged edges and translucent wisps. Broad irregular cauliflower lobes, fractal detail, incandescent gas, no long spark trails, little to no gray smoke. Lighting is self emitted; volumetric realistic fluid simulation aesthetic suitable for a AAA desert tank game. Genuinely transparent background with smooth semitransparent alpha, not black background and not a drawn checkerboard. No tank, barrel, projectile, ground, scene, text, border, grid, or watermark. Single plume only, no sprite sheet. Intended to be mapped on crossed quads along a cannon bore, bottom of image at muzzle and top pointing outward.
```
