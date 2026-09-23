# Audio assets

- `music/machinery-waiting.mp3` — Machinery Waiting, looping menu/hangar music.
- `stingers/victory.mp3` — one-shot victory cue.
- `stingers/defeat.mp3` — one-shot defeat cue.

The supplied recordings are preserved; only their paths and filenames changed.
`src/audio.js` defines the asset manifest. All recordings are fetched and decoded during initial loading. Menu/hangar music and result stingers use Music volume; engine, weapons and UI sounds use SFX volume. Both settings persist independently, and an older master-volume preference initializes both sliders. Result cues play once when a match ends, and fade out if the player leaves the results screen or starts another match.

Engine, tracks, gear shifts and cannon discharge use recordings. Machine guns, rocket launches and UI sounds retain synthesized effects. Explosion impacts use the supplied recordings through the SFX volume bus.

## Explosion effects

Original filenames are recorded here for source attribution; MP3 contents are unchanged.

- `sfx/explosion-distant.mp3` — original: `skyclad_sound_EXPLDsgn_Explosion+Distant+Exterior+Medium+No+Debris,+Early+Echoes+into+Tail+Clean+with+Flange+Slight_SCS_NONE_933.mp3`
- `sfx/explosion-fireball-01.mp3` — original: `zapsplat_explosion_big_fireball_001_89751.mp3`
- `sfx/explosion-fireball-02.mp3` — original: `zapsplat_explosion_big_fireball_002_89752.mp3`
- `sfx/explosion-large.mp3` — original: `skyclad_sound_EXPLDsgn_Explosion+Large+No+Debris,+Impact+Crisp,+Tail+Swell+with+Echoes+slapback,+Ripple+with+Flange_SCS_NONE_932.mp3`

The two fireballs alternate for jeep/vehicle and fuel explosions. The large explosion handles nearby shell and grenade blasts, with size-dependent volume and pitch. At 65 m or farther, the distant explosion replaces the close recording. Voices are attenuated with distance and limited to eight simultaneous recordings, favouring louder blasts.

## Vehicle and weapon recordings

Three engine bands crossfade with speed for each tank class. Slow/fast track layers fade in with movement (light tanks share medium tracks). Gear changes alternate two clips with a cooldown. Cannon discharge uses the artillery recording for AP, HE and canister. Loops blend their endpoints in decoded memory; original MP3s remain unchanged.

- `sfx/engine-heavy-fast.mp3` — original: `smartsound_TRANSPORTATION_TANK_Large_Engine_Fast_Speed_Steady_01.mp3`
- `sfx/engine-heavy-cruise.mp3` — original: `smartsound_TRANSPORTATION_TANK_Large_Engine_Medium_Speed_Steady_01.mp3`
- `sfx/engine-heavy-idle.mp3` — original: `smartsound_TRANSPORTATION_TANK_Large_Engine_Slow_Idle_Steady_01.mp3`
- `sfx/tracks-heavy-fast.mp3` — original: `smartsound_TRANSPORTATION_TANK_Large_Tracks_Rattle_Fast.mp3`
- `sfx/tracks-heavy-slow.mp3` — original: `smartsound_TRANSPORTATION_TANK_Large_Tracks_Rattle_Slow.mp3`
- `sfx/engine-medium-fast.mp3` — original: `smartsound_TRANSPORTATION_TANK_Medium_Engine_Fast_Speed_Steady_01.mp3`
- `sfx/engine-medium-cruise.mp3` — original: `smartsound_TRANSPORTATION_TANK_Medium_Engine_Medium_Speed_Steady_01.mp3`
- `sfx/engine-medium-idle.mp3` — original: `smartsound_TRANSPORTATION_TANK_Medium_Engine_Slow_Idle_Steady_01.mp3`
- `sfx/gear-shift-01.mp3` — original: `smartsound_TRANSPORTATION_TANK_Medium_Gear_Shift_01.mp3`
- `sfx/gear-shift-02.mp3` — original: `smartsound_TRANSPORTATION_TANK_Medium_Gear_Shift_02.mp3`
- `sfx/tracks-medium-fast.mp3` — original: `smartsound_TRANSPORTATION_TANK_Medium_Tracks_Rattle_Fast_01.mp3`
- `sfx/tracks-medium-slow.mp3` — original: `smartsound_TRANSPORTATION_TANK_Medium_Tracks_Rattle_Slow_01.mp3`
- `sfx/engine-light-fast.mp3` — original: `smartsound_TRANSPORTATION_TANK_Small_Engine_Fast_Steady_01.mp3`
- `sfx/engine-light-cruise.mp3` — original: `smartsound_TRANSPORTATION_TANK_Small_Engine_Medium_Steady_01.mp3`
- `sfx/engine-light-idle.mp3` — original: `smartsound_TRANSPORTATION_TANK_Small_Engine_Slow_Idle_Steady_01.mp3`
- `sfx/cannon-fire.mp3` — original: `smartsound_WEAPONS_ARTILLERY_Medium_Close_02.mp3`

Discarded redundant intermediate track layers:
- `smartsound_TRANSPORTATION_TANK_Large_Tracks_Rattle_Medium.mp3`
- `smartsound_TRANSPORTATION_TANK_Medium_Tracks_Rattle_Medium_01.mp3`

## Infantry and grenades

All nine additions are used. Four short agony variations replace synthesized burning cries; two pain/ejection variations cover wounds, deaths and jeep crew launches. Cries are audible within 35 m, allow up to two overlapping voices, and permit at most two cries in any six-second window. Burning infantry attempt one cry each; ordinary deaths have a 20% chance, wounded troops do not cry again when expiring, and jeep ejections attempt one cry per vehicle. Grenade pin pulls are only audible nearby; grenade detonations choose close/distant recordings at 65 m.

- `sfx/infantry-agony-01.mp3` — original: `344_audio_VOXScrm_Male_Screams_in_Agony_11_344_Audio_Screaming_2002.mp3`
- `sfx/infantry-agony-02.mp3` — original: `344_audio_VOXScrm_Male_Screams_in_Agony_16_344_Audio_Screaming_2004.mp3`
- `sfx/infantry-agony-03.mp3` — original: `344_audio_VOXScrm_Male_Screams_in_Agony_7_344_Audio_Screaming_1998.mp3`
- `sfx/infantry-agony-04.mp3` — original: `344_audio_VOXScrm_Male_Screams_in_Agony_8_344_Audio_Screaming_1999.mp3`
- `sfx/grenade-explosion-close.mp3` — original: `Blastwave_FX_GrenadeExplosion_S08WA.229.mp3`
- `sfx/infantry-pain-01.mp3` — original: `master_of_dreams_male_screams_1_473.mp3`
- `sfx/grenade-explosion-distant.mp3` — original: `zapsplat_explosion_grenade_300m_distance_reverb_ext_25222.mp3`
- `sfx/infantry-pain-02.mp3` — original: `zapsplat_human_male_man_scream_pain_89117.mp3`
- `sfx/grenade-pin-pull.mp3` — original: `zapsplat_multimedia_game_sound_pin_pull_metal_safety_gun_or_hand_grenade_war_001_93273.mp3`

## Body impacts

The heavier smash accompanies tank crushes; the lighter wet impact accompanies wounds and dismemberment. These are triggered by physical events, not every blood decal. Playback is limited to two voices, a 0.3-second shared cooldown, and 25 m range.

- `sfx/body-crush.mp3` — original: `esm_game_hatchling_alien_smash_2_impact_stab_knife_spill_drip_weapon_wet_juicy_horror.mp3`
- `sfx/body-impact.mp3` — original: `esm_game_catch_fish_wiggle_wet_water_impact_stab_knife_spill_drip_weapon_wet_juicy_horror.mp3`
