# AI population performance review

Research and measurements: 2026-09-22. The implementation proposals below are starting points to benchmark, not engine-prescribed rates or promised FPS gains.

## What the capture establishes

The RTX 3090 capture was at 1611 × 1227, pixel ratio 1, High quality:

| Measurement | Paused | Playing |
| --- | ---: | ---: |
| FPS | 97.96 | 23.02 |
| CPU frame, mean | 9.34 ms | 41.51 ms |
| WebGL GPU time, mean | 8.34 ms | 12.84 ms |
| CPU render submission, mean | 8.89 ms | 9.84 ms |
| Simulation, mean per rendered frame | 0 | 30.60 ms |
| Simulation ticks per rendered frame | 0 | 2.59 |
| Draw calls, mean | 837 | 856 |

CPU and GPU times overlap and must not be added. Simulation takes 11.79 ms per tick, including 6.38 ms of infantry work. At 60 ticks per second, that simulation alone consumes about 707 ms of main-thread time per second. The capture is consistent with CPU saturation and repeated catch-up ticks; it does not by itself prove unbounded simulation backlog.

The local 250-infantry/25-jeep benchmark narrows infantry work further: about 80 character-controller movement calls per tick, consuming 3.5 ms of its 5.3 ms mean. Path planning is approximately 0.2 ms. These local measurements are separate from the user's machine.

Ambient occlusion has now been removed. Its previous playing-frame cost was 4.9 ms of CPU submission and approximately 218 draw calls. Its individual GPU time was not measured. Removing it does not guarantee a proportional FPS increase.

## Relevant engine guidance

- [Epic: MassGameplay](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-mass-gameplay-in-unreal-engine) separates simulation LOD from visual representation LOD, supports variable-frequency simulation, and allows count limits per LOD. Its representations range from actors to instanced meshes to no visual representation. The useful design principle here is independent control of simulation and presentation cost; adopting Unreal or an ECS is not required.
- [Epic: Significance Manager](https://dev.epicgames.com/documentation/en-us/unreal-engine/significance-manager-in-unreal-engine) supports prioritizing actors and assigning per-category budgets. Distance alone is insufficient when a crowd converges around the player. The application must implement the actual cheaper behavior.
- [Unity: Advanced programming and code architecture](https://unity.com/how-to/advanced-programming-and-code-architecture) recommends updating subsets on different frames, moving unnecessary work out of frame loops, caching expensive results and pooling recurring objects. TANKZ already has a centralized update loop; the transferable lesson is scheduling and reduced work, not Unity's MonoBehaviour-specific callback overhead.
- [Godot: Navigation performance](https://docs.godotengine.org/en/stable/tutorials/navigation/navigation_optimizing_performance.html) recommends avoiding repeated path resets, staggering agent queries, and replanning when the destination meaningfully changes. [Navigation agents](https://docs.godotengine.org/en/4.5/tutorials/navigation/navigation_using_navigationagents.html) separates avoidance from navigation and physics, with bounded neighbor distance/count. These techniques matter, but our current pathfinding is not the dominant cost.
- [Rapier: Character controller](https://rapier.rs/docs/user_guides/javascript/character_controller/) explains that the controller resolves motion with ray/shape queries and handles slopes, stairs and obstacles. Its controller is general-purpose and can be customized for a game's needs. Our costly movement queries already execute through Rapier's WASM.
- [Glenn Fiedler: Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/) explains catch-up cost, the need for simulation headroom, and the slowdown tradeoff of limiting steps. Reducing the global physics rate or dropping elapsed simulation time would change gameplay; it is not the first remedy here.
- [MDN: Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) describes background execution and transferable buffers. This supports a later simulation/render split, but worker ownership and communication must be designed explicitly.

## Implemented scheduling changes

- Added `InfantryMovement`, which validates a straight capsule corridor against actual physics geometry before reusing it for up to 0.1 seconds (visible) or 0.2 seconds (distant). Endpoint and midpoint support rays reject steep, missing or moving support. A full capsule sweep rejects intervening obstacles. Failed validation uses the existing character controller and briefly backs off from trying the shortcut again.
- Capsules advance every 60 Hz physics tick, even when their movement queries are amortized. Direction changes and unexpected displacement invalidate cached movement. Nearby swept hazards, active sight of the player and recent damage promote immediately; demotion waits 0.5 seconds.
- Movement/cover decisions are staggered at 20 Hz for urgent/engaged soldiers, 10 Hz for visible/nonurgent soldiers and 5 Hz for distant ones. State/sight changes, new physical hazards, damage and destroyed cover wake decisions immediately. A persistent hazard does not force repeated decisions every tick, but still requires full collision handling. Perception, combat timers, aiming and weapon readiness remain at 60 Hz.
- Hidden soldiers advance animation state without rebuilding limb transforms. The current pose is evaluated for visibility, firing, wounds and death as needed. Wounded crawling movement retains the full controller.
- Catch-up ticks share four ordinary route jobs and up to 32 cover-search increments per rendered frame. The cover time budget is a soft 2 ms checked between generator increments; an individual synchronous path search can exceed it. Standalone simulation ticks retain the previous per-tick planning budget for tests/benchmarks.
- Distant investigators do not start expensive cover searches until promoted. Existing nearby combat behavior and 60 Hz perception remain in place.
- Workers, a replacement navigation system and projectile pooling remain follow-up options rather than part of this change.

Regression coverage includes continuous physical hitboxes, patrol distance, thin-wall collision, projectile/turbo promotion, demotion hysteresis, drone reveal, stale-direction rejection, invalid terrain support, hidden weapon-pose equivalence and shared catch-up planning budgets. Existing terrain, weapons, ragdoll, run-over and world tests remain required.

A sequential local comparison used the previous infantry implementation from Git HEAD and the new implementation with the same current world fixture, 250 soldiers all initially investigating, and 300 physics ticks. Rendering was excluded. The current fog-height cache was present in both runs.

| Measurement | Previous infantry | New infantry |
| --- | ---: | ---: |
| Full movement-controller calls/tick | 250 | 45.5 |
| Infantry median/tick | 13.35 ms | 4.16 ms |
| Whole simulation median/tick | 19.25 ms | 10.26 ms |
| Whole simulation p95/tick | 33.28 ms | 20.18 ms |

These are local measurements of one investigation scenario, not an RTX FPS guarantee. The earlier patrol workload reduced full movement calls from about 80 to 28 and infantry median from about 5.2 to 3.1 ms. Close combat still deliberately uses full collision handling. The final build and all 22 test files pass; playing/paused browser integration was exercised with software rendering.

### Engaged movement follow-up

Combat relevance and physical collision urgency are now separate. Seeing the player
keeps aiming and weapons at 60 Hz and decisions at staggered 20 Hz, but permits the same validated
0.1-second movement corridors used by visible noncombat infantry. Damage and swept
physical hazards immediately disable reuse; half a second without hazards is required
before reuse resumes. Wounded soldiers retain their existing full-controller path.

Stationary engaged soldiers on stable, gentle support replace repeated controller
queries with a support ray every physics tick. The full controller refreshes after
at most six reused ticks. Steering, displacement, lost/changed support and physical
hazards invalidate the stationary result. Actual hitboxes remain current.

In a two-second flat-ground engaged test, stationary soldiers require fewer than
25 full-controller calls instead of 120. The real-world ten-person encounter is
more constrained: full-controller calls fell from 36.26 to 34.81 per tick (about
4%). Whole-simulation median was 9.69 ms before and 9.89 ms afterward in sequential
local runs, so this capture does not establish a CPU-time or FPS improvement.
The benefit depends on how often soldiers can safely reuse movement; crowded,
close-range firefights still invoke the full controller frequently.

The recommendations below are the original research proposals, not a description
of the current implementation. The implementation sections above record completed work.

## Recommended changes, in order

### 1. Separate decisions, movement queries, combat, and animation

`Infantry.update()` currently runs all four together. The existing scheduling already reduces distant, unseen, unengaged patrols to 15 Hz, but nearby, engaged and wounded infantry bypass that reduction. Every scheduled healthy soldier still uses the same full character controller. In `EnemyDirector.update()`, `engaged` stays true during investigation/search until the unit returns to patrol, so losing sight of the player does not immediately restore the lower movement frequency. Use current interaction relevance instead of this broad behavior flag to select movement detail.

Introduce independent scheduling for:

- Decisions: target selection, goals and cover searches.
- Movement: desired velocity, obstacle resolution and grounding.
- Combat: weapon timing, incoming damage and immediate reactions.
- Presentation: skeletal pose, weapon visuals and interpolation.

A firing soldier may need responsive weapon logic without needing a new navigation plan or full movement query every tick. Stationary grounded soldiers are another candidate for cached movement results, with invalidation for changed support, nearby vehicles and altered obstacles.

### 2. Use simulation relevance, not visibility alone

Proposed initial tiers:

| Situation | Movement approach | Decision scheduling |
| --- | --- | --- |
| Immediate collision/combat interaction | Full collision resolution up to 60 Hz | Stagger ordinary decisions; urgent events immediate |
| Visible or tactically nearby, outside immediate interaction | Experiment with 15–30 Hz movement resolution and smooth authoritative hit-proxy updates | 5–10 Hz |
| Distant patrol, no immediate interaction | Simplified validated path/corridor following and terrain support; full-controller fallback at difficult geometry | 2–5 Hz, preferably squad-level |

These are experiment ranges, not final settings. Keep the world physics, player, shells and damage processing at 60 Hz initially.

Relevance must include proximity to the tank, weapon reach, incoming projectile sweeps, recent damage, active attacks and the recon drone. Promote before an interaction can occur. Keep hit proxies available and current for distant targets. Do not make off-screen enemies invulnerable or stop their patrol timers. A conservative promotion margin should account for relative speed and the maximum deferred-update interval.

Use different promotion/demotion thresholds and a demotion delay to prevent rapid tier switching. Ordinary jobs need count/time budgets plus a maximum service delay so a dense crowd cannot starve distant agents. Immediate hits and collision safety must not be dropped to satisfy a budget.

### 3. Reduce full movement queries, rather than just moving them elsewhere

For distant patrols, use the existing navigation grid to constrain travel and a terrain-support representation for elevation. Avoid invoking stair climbing, slope sliding and general shape sweeps when a validated open path segment is sufficient. Near walls, ramps, cliffs, destructible obstacles and vehicles, retain the full controller or explicitly validate the simpler result.

Separate cheap updates of the capsule's authoritative position from expensive obstacle resolution. Interpolating only the rendered mesh would leave hitboxes lagging. Do not feed a very large accumulated time into combat and assume it is equivalent to many small ticks: firing cadence, collision and moving support need their own handling.

Benchmark changes individually. A trial of earlier native collision-group filtering produced no meaningful improvement in the local benchmark and was discarded.

### 4. Preserve existing scheduling wins; improve them where measured

The code already uses spatial buckets for crowd separation, a route queue capped at four jobs per tick, and bounded cover-search work. Retain these. Consider event-driven route invalidation and shared squad routes before flow fields or a replacement navigation system. Shared routes still need individual obstacle/formation handling.

The current cover-search deadline is per simulation tick. Several catch-up ticks can therefore repeat the budget in one rendered frame. Expensive noncritical jobs should also have a bounded render-frame workload and maximum latency, independently of the fixed physics loop.

### 5. Decouple hidden animation carefully

Avoid rebuilding hidden limb transforms merely because AI moved. Advance compact animation state and evaluate visible poses as needed. Before firing, dismembering or ejecting a ragdoll, evaluate the required pose so muzzle and body-part transforms are correct. `animateWeapon()` also affects firing readiness, so skipping the existing animation function wholesale would alter gameplay.

Cache rig part references and reuse temporary vectors where measurements justify it. Pool frequently created projectile visuals separately from their authoritative damage behavior. These are follow-up allocation reductions, not substitutes for addressing movement-query cost.

### 6. Consider a worker after the ownership boundary is clean

If main-thread simulation remains expensive, one worker should own the authoritative Rapier world and simulation state. The main thread sends commands and consumes timestamped pose/event snapshots for Three.js and UI. Transfer reusable buffers in batches; do not synchronously message per soldier or share live Three/Rapier objects between threads.

This can free main-thread render time, but does not reduce total movement-query work. Rewriting JavaScript in WASM is lower priority because the largest measured infantry operation is already a WASM physics query.

## Validation before adopting a cheaper movement path

Measure per-tick CPU cost and query count, plus frame p95 during patrol, pursuit, a dense engagement, smoke/drone reveal, explosions and turbo run-overs. Check hills, ramps, boundary walls, destroyed cover, moving vehicles, incoming distant shells, promotion/demotion and pause/resume. Compare elapsed patrol distance, fire cadence and damage outcomes; reduced update rates must not quietly slow the world.

Use the same resolution and encounter for before/after captures. A working target to evaluate is a 4–6 ms simulation tick, down from the user's 11.79 ms; this is a proposed budget, not an achieved result. Reassess rendering/GPU cost after AO removal before setting a high-refresh FPS target.
