# TANKZ concept review

Status: initial visual proposal awaiting user review. No prototype implementation yet.

Generated using the built-in image_gen tool. Exact prompts are in [PROMPTS.md](PROMPTS.md).

## Screens

1. [Main menu](01-main-menu.png)
2. [Garage and loadout](02-garage-loadout.png)
3. [Future multiplayer deployment lobby](03-match-lobby.png)
4. [Gameplay and HUD](04-gameplay.png)
5. [Pause and settings](05-pause-settings.png)
6. [Match results](06-match-results.png)
7. [Terrain, cover, vehicles and effects reference](07-world-effects.png)
8. [Kestrel scout vehicle design reference](08-kestrel-scout.png) (geometry reference for src/kestrel.js; the in-game hull is shortened to the Kestrel's compact footprint)
9. [Marauder super-heavy vehicle design reference](09-marauder-heavy.png) (geometry reference for src/marauder.js)

## Direction and review notes

Weathered olive vehicles, ochre desert, charcoal metal panels, ivory condensed typography and amber actions. Distinct compact silhouettes; elevated camera; readable cover routes; layered fire, smoke, physical debris and lingering surface marks.

These images establish composition and mood, not final UI copy or production geometry. The generated rendering leans realistic; the intended production material treatment remains hand-painted. The world/effects board is the strongest reference for compact vehicle proportions. Review the desired degree of painterly stylization before building assets.

Generated slogans, extra navigation items and currencies are placeholders, not approved features. Team shape conventions vary across images and must be standardized. The lobby shows 4/4 despite two open slots; use actual occupancy in implementation. Settings must show PAUSED only for an actually paused offline simulation. Browser navigation needs an appropriate exit-to-menu action. The gameplay image predates the clarified aiming requirement and does not fully show the required separate predicted-impact marker.

## Requirements retained for the prototype

- Browser game using HTML, CSS and Three.js with actual 3D terrain, tanks and obstacles.
- Desert mesh terrain, splatted sand/gravel/rock materials with large-scale variation to suppress repeating patterns. Generate visual texture assets, including bump and normal maps, after direction approval; validate map alignment and lighting before use.
- Shrubs, destroyed buildings, rocks and other cover; low obstacles can be traversed. Rigid-body vehicle/obstacle interactions, suspension, jumps, slides and enjoyable Micro Machines-like handling.
- WASD driving; independent mouse-controlled turret. Tank-specific traverse AND elevation rates.
- Mouse target indicates desired aim. A separate crosshair indicates predicted shell impact from the current barrel pose and ballistic trajectory. Never snap the gun instantly to the mouse.
- Every fired projectile is its own physics object with ballistic behavior and collision handling. Future implementation should prevent fast projectiles tunneling through cover.
- Purchasable ammunition types with different properties. Purchase currency, ammunition types, pricing and balance remain undecided. No ammunition implementation or new concept requested at this stage.
- Different tanks vary in engine, gun, armor, turret handling, secondary weapon and countermeasures.
- Rich explosions, smoke, dust, debris and adjustable camera shake. Moving tanks emit dust and leave paired tracks. Impacts leave craters/scorches and other decals; exact terrain deformation scope remains undecided.
- Preserve gameplay readability through dense effects. Physical debris and cosmetic particles can use different simulation budgets.
- Plan for other players controlling tanks later: separate input commands, vehicle simulation and presentation; data-driven tank/ammunition definitions; stable entity IDs and fixed simulation steps. Future authoritative multiplayer simulation should control combat outcomes. No online implementation during concept review.

Next gate: user reviews visual direction before game implementation.
