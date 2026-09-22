# Dust and recon presentation

The dust reference was aerial footage of two tanks training on a dry road: [Storyblocks aerial tank column](https://www.storyblocks.com/video/stock/two-tanks-drive-road-dust-aerial-army-training-military-armored-machine-national-defense-power-demonstration-vehicle-riding-at-dry-347763762). The inspected preview shows dense earth-colored billows merging behind the vehicles. The licensed preview is a research reference only, not a shipped asset.

Two track emission streams now feed a larger, slower central wake. Yaw speed generates dust even without forward motion; airborne tracks stop emitting. Landing bursts use estimated normal impact energy and vehicle mass, with a contact cooldown to prevent suspension chatter producing repeated bursts. Instanced billboards share one draw call and the existing bounded particle pool. Track decals previously rendered over the dust; their draw order now places them beneath it.

The recon model includes a beveled composite hull, four motor arms, animated crossed rotors with translucent blur discs, camera gimbal, vents, navigation lamps, landing skids and antenna. Generated textures and exact prompts are documented in `ASSET_PROMPTS.md`.

Recon is a temporary additional visibility observer. It doesn't change the tank's gun line of sight or force a turret lock. Camera clipping applies only to player presentation; enemy perception retains its own height-based sight radius. Contact overlays use recycled DOM nodes, acquire with a brief scale animation and pulse around a dark-backed red square with pale corner brackets. Reduced-motion preferences suppress animation.

Validation covers merged wakes, pivot dust, landing energy, pool limits, drone lifecycle and rigid-body cleanup, cover clearance, camera clipping, sight ordering, animated marker styles, expiry cleanup, and player versus enemy impacts in fog. Browser captures show trail/pivot/landing dust, drone geometry, contacts and expiry.
