# Rendering and update-loop performance

Updated 2026-09-22. This complements [AI performance](ai-performance.md).

The rendering and simulation optimizations below are implemented. Full authoritative simulation offload to a worker (item 21) is **not implemented**. It remains an architectural follow-up, rather than a claimed result of this rendering pass. No RTX 3090 FPS improvement is claimed without a new capture.

## Evidence and limits

The raw captures were local diagnostic artifacts and have been removed from the workspace. Future captures are excluded from Git; their measurements are retained below for reference.

The original user capture, `tankz-profile-2026-09-23T00-15-28.347Z.json`, used an RTX 3090 / Direct3D 11 at 2108 × 1227, pixel ratio 1, High quality:

| Mode | FPS | CPU mean / p95 (ms) | GPU mean (ms) | Simulation per tick (ms) | Ticks per frame | Render submission (ms) | Draws |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Paused | 111.5 | 6.2 / 10.1 | 4.0 | – | 0 | 5.6 | 691 |
| Stealth | 37.9 | 24.4 / 46.1 | 9.5 | 9.9 | 1.58 | 7.5 | 633 |
| Spotted | 61.9 | 15.0 / 30.4 | 8.1 | 8.0 | 0.96 | 6.1 | 516 |
| Engaged | 44.8 | 20.5 / 52.3 | 8.0 | 9.3 | 1.35 | 6.5 | 751 |

The accompanying Chrome trace, `Trace-20260922T202323.json.gz`, contains roughly 15.5 seconds and 968 animation frames. Simulation and rendering both consume substantial main-thread time. Matrix updates and jeep clearance rays are significant sampled costs. There are eight major GCs, with the longest approximately 9.4 ms, and fourteen animation callbacks longer than 33 ms.

Catch-up ticks **amplify** stalls; they are not proof of the initiating cause. GC, expensive individual calls, and browser/driver scheduling can trigger a slow frame. CPU render submission and GPU duration overlap and must not be added. Nested profiler stages must not be added to their parents.

Local Node fixtures measure CPU simulation only. Browser checks verify rendering correctness and draw counts; their GPU timings do not establish RTX 3090 performance. The previous claim that local checks used the same RTX 3090 through WSL, with a fixed 6 ms synchronization delay, was not substantiated and has been removed. Earlier isolated estimates are not promises of cumulative savings.

## Implemented changes

Numbering matches the original recommendations.

| Item | Implementation | Important behavior / tradeoff |
| --- | --- | --- |
| 1. Catch-up work | Fog sampling runs on the first simulation tick of a render frame, carrying elapsed time forward. Ordinary jeep steering is staggered; existing infantry route/cover budgets remain shared across the frame. | Physics, collisions, perception, damage and weapon timers continue every 60 Hz tick. Urgent steering changes bypass the ordinary schedule. This reduces repeated work but does not guarantee p95 equals the mean. |
| 2. Shadow frustum | Fit light-space bounds around camera rays through a conservative receiver-height volume, with padding and texel snapping of world-space bounds. | Includes elevated receivers and sunward caster depth, not just a ground rectangle. Stable sun direction; zoom coverage is tested. Size is quantized to limit shimmering. |
| 3. Interpolation | Added presentation snapshots for visible infantry roots, limbs and weapons, projectiles, dynamic props, debris, smoke grenades and ragdoll pieces. Vehicles and drone retain their existing interpolation. | Restore authoritative transforms before gameplay queries. Reset interpolation on reparenting or large position jumps. Hidden infantry do not accumulate limb snapshot work. Interpolation adds some CPU work in exchange for smoother motion. |
| 4. Particles | Replaced point sprites with instanced camera-facing quads. Normal and additive effects have separate instance buffers; additive particles are not sorted. Upload only active instance attributes. Vehicle dust also uploads only its live range. | Retains the specialized ground-aware vehicle-dust renderer. Alpha particles are sorted within their batch, not globally across different materials. Quads avoid center-based point clipping and the 300-pixel cap; close smoke can cost more GPU time. |
| 5. Fog | Restrict visual field sweeps to observer bounds, retaining six staggered row phases. Track active/fading cells and upload changed row spans. Increase grid density from 2.75 m to about 1.375 m. | Old observer regions are explicitly cleared and kept active until their fade finishes, including drone recall. Unit perception remains immediate. Higher resolution is a quality change whose cost needs a hardware capture. |
| 6. Anti-aliasing | Disable unused canvas MSAA; enable SMAA in gameplay at High quality and retain it in the showroom. | Low-quality gameplay skips SMAA. Its GPU cost is now part of the actual composer pipeline. |
| 7. Hidden soldiers | Detach fully hidden infantry roots from the scene graph; reattach as their visibility fade begins. | Visibility release restores attachment for death, wounding and world teardown. Hidden units still simulate and can be hit. |
| 8. Static matrices | Freeze local matrices after placement for static terrain/environment hierarchies; scene and game-root identity matrices also stop recomposing. | Dynamic props and debris remain mutable. Terrain vertex deformation is independent of object transforms. |
| 9. Scenery batching | Merge reactive prop pieces per material and decorative ruin details per ruin. Also batch static weapon pieces. | Retain original scenery pieces and their transforms for physical destruction fragments; preserve independently destructible walls and dynamic rubble. |
| 10. Vegetation chunks | Split shrubs and twigs into an 8 × 8 spatial grid with computed instance bounds. | Instance placement and geometry are unchanged. Main-camera and shadow-camera culling can reject different chunks. |
| 11. Infantry skinning | Render each intact soldier's body and attached body gear as one rigidly weighted skinned mesh. Preserve material color, texture use, roughness and metalness through vertex attributes. | Weapon meshes remain separately articulated and batched per material; a whole armed soldier is therefore **not guaranteed two total draws**. Keep original body pieces off-scene, restoring them before wounding/ragdolls. |
| 12. Texture uploads | Upload dirty row spans for the rut mask and floating-point terrain surface. Fog uses the same helper. | Single-channel texture offsets require the r180 adapter described below. No collision-patch updates are dropped. |
| 13. HUD | Skip unchanged text, HTML, width, transform and selected attribute writes. | The minimap was already throttled to roughly 12.5 Hz; that behavior remains. DOM writes can dirty layout but do not each imply a forced synchronous layout. |
| 14. Point lights | Keep eight logical effect sources (six flash/wreck, two rocket), but assign the strongest distance-weighted contributors to four persistent renderer lights. | Stable shader light count during combat. Emissive flashes remain intact. At most four overlapping sources illuminate the scene; this is a visual tradeoff. Use the diagnostic budget setter below to compare with eight. |
| 15. Output pass | Fold grain and vignette into OutputPass, after tone mapping and color conversion. | Removes a fullscreen pass while retaining display-space grain. The composer now has five configured passes, including SMAA. |
| 16. Muzzle transforms | Remove full-root hierarchy updates from `muzzle()` and redundant exhaust-root updates. | World-position/direction queries update their required ancestor paths; dirty infantry poses still evaluate before firing. |
| 17. Jeep steering | Stagger ordinary clearance/steering evaluation at approximately 20 Hz, retaining the last command between evaluations. | Accumulate actual elapsed time for recovery/stuck timers. State, sight and recent-damage changes wake steering immediately; service delay is bounded. Physics, aiming and firing remain 60 Hz. |
| 18. Rapier reads | Cache body position, rotation and velocity reads within a physics phase. | Steps invalidate before and after integration; setters, impulses and kinematic changes invalidate cached reads. Returned snapshots are read-only to callers. No stale pre-step cache is reused after physics. |
| 19. Allocation pressure | Reuse per-vehicle drive scratch data, limb references/animation scratch, visibility ray scratch and crowd buckets; use numeric crowd keys. Pool projectile meshes and particle objects, vectors and colors. | Particle storage uses dense iteration, constant-time swap removal and an emission-order linked list for oldest eviction. Projectile templates own shared GPU resources; active streak transforms remain independent. This reduces allocations rather than claiming to eliminate GC. |
| 20. Run-over broad phase | Reject soldiers outside a conservative bounding sphere before the inverse-quaternion hull test. | Radius derives from the scaled hull-test dimensions, preserving pitched/rolled tank coverage. The original narrow-phase test still decides the hit. |

### Single-channel texture upload regression

The first partial-upload implementation caused the fog to stop updating correctly. Three r180's `WebGLTextures.updateTexture()` hardcodes a component stride of four when interpreting update-range coordinates, including for `RedFormat` textures. The resulting coordinates addressed the wrong pixels.

`src/texture-updates.js` now converts row spans to that coordinate space while retaining single-channel source storage. Byte and floating-point GPU readback tests verify exact changed pixels and untouched neighbors across multiple rows. This is a version-specific adapter: re-run those tests and inspect the upload implementation when upgrading Three.js. Never pass a range that crosses a row boundary.

### Infantry presentation follow-up

Interpolation now saves and restores the authored Euler angles as well as scale. Restoring only quaternions changed yaw's Euler representation past 90 degrees; subsequent yaw-only writes could retain X/Z half-turns and flip soldier facing and aim. Soldier and crew-root animation writes now set all rotation components explicitly. A regression test repeatedly crosses 90 and 180 degrees and checks the muzzle direction after interpolation and restoration.

Wounded soldiers choose individual crawl headings, phases, rates and pace, with occasional gentle random turns instead of all steering away from the player. Fading unit meshes render before alpha dust/smoke and retain depth testing/writes. GPU readback verifies that foreground dust composites over a body while dust behind it remains occluded. Moving skinned/original body comparisons also pass.

## Item 21: full simulation worker — not shipped

A worker is a potential next step if the new capture still shows a substantial main-thread simulation bottleneck. It is not established as the only way to reach high refresh rates.

The current `Game` methods share Rapier bodies, scene-node transforms, visibility, terrain deformation, effects and UI callbacks. Moving only `world.step()` would leave synchronous queries and gameplay on the main thread; it would not implement authoritative simulation offload. A correct migration needs:

1. One worker owning all physics, AI, damage, projectile and lifecycle state.
2. Input commands and generation-tagged, timestamped snapshots; no shared live Rapier/Three objects.
3. Reusable pose buffers plus ordered spawn/death, terrain, audio and effect events.
4. Main-thread presentation interpolation and explicit handling of pause, deployment, restart and worker failure.
5. Behavioral parity tests for weapons, collisions, ragdolls, smoke, drone visibility and destruction, followed by end-to-end performance measurements.

The phase-safe caches and presentation snapshots introduced here prepare parts of that boundary, but they are not a worker implementation.

## Validation

- `npm test`: 24 test files passed during this implementation pass. New coverage includes physics-cache invalidation, particle eviction/reuse, projectile ownership, interpolation/reparenting, fog region clearing, skin-to-ragdoll transforms, steering elapsed time and conservative shadow bounds.
- `node tests/texture-updates-browser.mjs`: byte and float single-channel partial uploads match GPU readback.
- `node tests/rendering-improvements-browser.mjs`: actual WebGL checks cover skinned infantry, both particle batches, SMAA, fog, wounding, ragdolls and rebuilding the world without shader/runtime errors. The original and skinned body produce identical pixels in the bind-pose comparison.
- That synthetic 960 × 720 scene submitted **377 draws / 280,748 triangles**, with a 116 × 64 shadow box and four effect lights. It uses fixture textures and is **not** a matched before/after measurement of the user's firefight.
- A final standalone Node encounter run measured 7.80 ms median / 12.11 ms p95 for the passive variant and 9.63 / 13.09 ms for combat. These are whole benchmark-tick timings, including effect updates, not browser frame timings or a matched pre-change comparison.
- `npm run build` and `node tests/profiler-browser.mjs` passed, including settings, deployment, recording, export and restoring the uninstrumented frame loop. Target-machine validation is still required for visual quality and frame-time improvements.

## Capture the result on the RTX 3090

Use the same resolution, graphics setting and infantry encounter as the baseline. Enable the profiler in Settings → Graphics, play through engagement, then save the last 15 seconds. Compare CPU mean/p95, simulation cost per tick, GPU mean/p95 and draw calls. The profiler now exposes `simulation.commands` and `simulation.steering` so command evaluation is no longer hidden outside the vehicle stage.

For a separate warmed-up lighting comparison:

```js
tankz.game.fx.setLightBudget(8) // Original maximum number of simultaneous sources.
// Let shaders warm, then capture the same encounter again.
tankz.game.fx.setLightBudget(4) // New default.
```

Changing this budget can compile a different shader variant; do not include that first transition in the steady-state comparison. The selected budget is included in profiler metadata. Check smoke near screen edges, elevated shadows at both zoom limits, moving fog and drone recall, and hidden-unit deaths as well as FPS. Avoid spending further GPU headroom until these changes have a matched hardware capture.
