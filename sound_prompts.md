# TANKZ — sound generation prompts

These are production prompts for audio generation or recording, not audio files already added to the game. The current prototype uses synthesized temporary engine, gun and UI sounds. All voices are fictional adult soldiers; no named performers or voice imitation. Art direction: gritty, tactile military machinery in a dry desert at dusk, with a slightly exaggerated indie action-game punch. Weight and clarity matter more than documentary realism.

## Delivery and mixing requirements

- Deliver dry, clean 48 kHz / 24-bit WAV masters with useful headroom and no clipping. Export OGG runtime versions after editing. No spoken filenames, introductions, watermarks, or unwanted background music.
- Positional effects: mono. Music and non-positional ambience: stereo. Keep impact transients close to the beginning; trim leading silence. Preserve natural decay tails.
- Generate the variant count listed for each prompt. Vary timbre and articulation, not overall loudness. Loop assets must have seamless boundaries with no clicks, fades or distinct recurring events.
- Keep weapon, engine, debris and voice layers separate for distance attenuation, timing and mixing. Do not bake a scream into every explosion. Prevent repeated identical voices and limit simultaneous vocal reactions.
- Music and continuous engines should leave space for the cannon transient, reload cue and approaching MG fire. Apply spatialization, occlusion and distance filtering in-game rather than permanently baking them into close recordings.

## Weapons

### cannon_scout_fire — 6 variants, 1.5–2.5 seconds, mono

**Prompt:** A light tank cannon firing once outdoors in a dry desert. A very sharp pressure crack, compact low-frequency thump, metallic breech jolt, and short gritty air-pressure tail. Fast and agile rather than thunderously heavy. One shot only, no automatic burst, no casing afterward, no voices, no music, no enclosed-room reverberation. Strong but clean transient, no clipping. Gritty military indie action game.

### cannon_medium_fire — 6 variants, 2–3 seconds, mono

**Prompt:** A medium battle tank cannon firing one powerful round at close range in an open desert. Hard concussive crack, heavy chesty bass punch, dense mechanical recoil clank, and a dusty pressure wash trailing away. More weight than a light cannon but a quick readable attack. One isolated shot; no shell impact, screaming, music or artificial cinematic riser. Natural short outdoor tail and clean headroom.

### cannon_heavy_fire — 6 variants, 3–4 seconds, mono

**Prompt:** One enormous heavy tank cannon shot in an open desert. Explosive initial crack, deep physical low-end punch, a strained metal recoil assembly slamming backward, and a rolling bass decay across open ground. Huge and intimidating without clipping or masking the sharp attack. No second shot, no impact at the target, no voices and no music. Keep the source dry enough for in-game distance processing.

### cannon_pressure_dust — 5 variants, 0.7–1.3 seconds, mono

**Prompt:** The gritty pressure wash immediately after a tank cannon fires: a fast outward rush of air scouring loose sand and fine gravel off the ground, then a soft dusty settling hiss. No gunshot or explosion transient; this is a separate environmental layer beneath the cannon. Dry, close, sandy, tactile, short and forceful.

### cannon_reload — 4 variants, 1.0–1.8 seconds, mono

**Prompt:** A compact tank cannon loading mechanism completing one reload cycle. Heavy steel breech opens, an empty metal case shifts, a fresh shell slides into place with a weighty scrape, and the breech shuts with a clear final locking clack. Mechanical, worn and practical. No gunshot, voices or ambient engine. Make the final lock unmistakable, so it can serve as a gun-ready cue.

### cannon_ready — 4 variants, 0.12–0.3 seconds, mono

**Prompt:** A short, satisfying mechanical gun-ready confirmation: a firm steel latch click with a small resonant metallic tick. Industrial and analog, not a digital notification or arcade beep. Clear at low volume during combat. One isolated sound with a short tail.

### jeep_mg_shot — 8 variants, 0.15–0.4 seconds, mono

**Prompt:** One shot from a light machine gun mounted on a small army jeep. A dry sharp pop-crack, a light mechanical bolt snap and a short outdoor tail. Threatening repeated chatter but much smaller than a tank cannon. No bass-heavy explosion, voices, music, bullet impact or enclosed reverberation. Designed to repeat cleanly at roughly eight shots per second.

### jeep_mg_burst — 4 variants, 0.6–1.2 seconds, mono

**Prompt:** A jeep-mounted light machine gun firing a short uneven burst at approximately eight shots per second. Distinct dry cracks, loose receiver chatter, a quick bolt stop at the end. Open desert acoustics. No shell impacts, explosion, voices or music. Leave each shot readable. Use as a burst alternative, not layered over the individual-shot asset.

### tank_coax_shot — 6 variants, 0.2–0.45 seconds, mono

**Prompt:** One close shot from a tank's coaxial machine gun. Tighter, heavier and more enclosed mechanical timbre than a jeep machine gun, with a clean rapid crack and muted steel receiver clatter. Short outdoor tail, no music, no target impact and no cannon boom. Suitable for rapid repeated playback.

### shell_flyby — 6 variants, 0.3–0.8 seconds, mono

**Prompt:** A fast tank projectile passing close by: a tight tearing hiss and rapid air displacement, with a subtle low whiplash quality. One left-to-right event rendered as a mono source for later spatial movement. No cannon firing or impact, no exaggerated science-fiction laser or long cartoon whistle.

### apds_flyby — 5 variants, 0.15–0.4 seconds, mono

**Prompt:** A very high-velocity kinetic projectile slicing past at close range. Brief, razor-sharp supersonic zip and pressure snap, markedly shorter and cleaner than a conventional shell flyby. No explosion, gunshot or music. One isolated pass, mono for in-game positioning.

## Explosions and destruction

### jeep_explosion — 6 variants, 3–5 seconds, mono

**Prompt:** A small military jeep violently exploding in a desert battlefield. An immediate sharp fuel ignition crack, a compact heavy fireball thump, a brief tearing-metal crunch, and a warm rolling combustion tail. Loud and satisfying, smaller than a tank exploding. No voices or music. Keep wheel impacts and extended falling-debris clatter out of this layer so they can be placed separately in-game.

### jeep_crew_ejection_scream — 8 variants, 0.5–1.4 seconds, mono

**Prompt:** A fictional adult male army jeep crew member giving one brief startled yell as an explosion throws him into the air. Begin with a sudden shocked grunt, open into a short involuntary scream, end naturally. Stylized action-game performance, urgent and physical, not prolonged suffering, no words, no comedy whistle, no children, no background blast or music. Dry close voice for later spatial processing. Each variant should feel like a different spontaneous reaction.

**Trigger:** Choose separate driver and gunner takes at ejection, with a small randomized offset after ignition. Limit to two voices per nearby jeep; suppress distant or overlapping repetitions.

### jeep_explosion_reference_mix — 3 variants, 4–5 seconds, mono

**Prompt:** A reference mix of a small military jeep exploding, followed almost immediately by two different adult soldiers' brief shocked ejection yells and a scattering of tumbling metal. Concussive fuel ignition first; the voices are shorter and quieter than the blast; wheel and panel impacts follow after a small delay. Gritty stylized armored combat, no music, no intelligible dialogue, no prolonged screams. This is an audition reference only; deliver the explosion, voices and debris as separate stems as well.

### tank_explosion — 5 variants, 4–6 seconds, mono

**Prompt:** A heavily armored tank suffering a catastrophic explosion. A huge concussive crack and low-frequency blast, armor rupturing with a strained tearing-metal roar, then a dense rumbling fire tail. Much larger and lower than a jeep explosion. Outdoor desert, no reverberant room, no voices, no music. Avoid a long Hollywood build-up; destruction begins immediately.

### he_ground_impact — 8 variants, 1.5–3 seconds, mono

**Prompt:** One high-explosive shell striking compacted desert sand. A hard impact thud followed instantly by a broad explosive crack, a low sandy boom and a spray of gritty earth. Fast attack, earthy and forceful; no metal vehicle breakup or vocal sounds. Isolated mono effect with a natural outdoor tail.

### ap_armor_impact — 8 variants, 0.5–1.4 seconds, mono

**Prompt:** A tank shell striking steel vehicle armor. Violent short metallic punch, sharp ringing fracture and a dense crunch of stressed plate. Hard, weighty, close and physical. No fireball boom unless the vehicle is destroyed separately; no music, voices or second hit.

### mg_armor_ping — 12 variants, 0.1–0.4 seconds, mono

**Prompt:** One small machine-gun bullet striking thick tank armor with little damage. A sharp metallic tick-ping, short gritty steel resonance and a tiny chipped-metal rattle. Crisp but restrained, clearly much lighter than a cannon impact. Very short, dry and repeatable without becoming shrill. No explosion or ricochet whistle in this layer.

### masonry_break — 6 variants, 1–2 seconds, mono

**Prompt:** A damaged concrete wall section breaking apart under a shell impact. A dry brittle crack, dense crumbling aggregate, several irregular chunks separating, exposed rebar creaking briefly. No explosion transient, no voices, no music. Gritty real material detail, not glass breaking or identical wooden blocks.

### fuel_drum_explosion — 5 variants, 1.5–3 seconds, mono

**Prompt:** A rusty fuel drum rupturing with a sharp sheet-metal pop, a quick hollow steel flex and a compact fiery whoomp. A smaller, higher-pitched blast than the jeep explosion. One sudden event, outdoor dry acoustics, no voices or music. Preserve a distinct metallic attack.

### metal_fragment_land — 10 variants, 0.25–1 seconds, mono

**Prompt:** One irregular torn steel vehicle panel hitting desert gravel, bouncing once or twice, then settling. Bent sheet-metal clank, scraping edge and small grit underneath. Vary between light rattling fragments and heavier dull panels. No explosions, no voices, no repetitive identical block sounds. Close dry single impacts.

### wheel_land_roll — 6 variants, 1–2.5 seconds, mono

**Prompt:** A detached military jeep wheel falling onto compacted desert sand. A rubbery heavy thump, a little metal hub rattle, two diminishing bounces and a brief gritty roll. Earthy and physical, no cartoon boing, no explosion, no voices or music. Keep enough separation to place the landing after an explosion.

### stone_fragment_land — 10 variants, 0.2–0.8 seconds, mono

**Prompt:** Irregular stone or concrete fragments hitting coarse sand, one or two hard knocks followed by a tiny gritty skitter. Dry brittle texture, varied sizes, no musical tone, no vehicle sounds, no explosion. Short isolated takes suitable for randomized debris collisions.

### wreck_fire_loop — 2 variants, 8–12 seconds, mono loop

**Prompt:** A modest vehicle wreck burning outdoors. Low steady combustion, intermittent soft crackle, occasional small metal cooling ticks and a gentle flame flutter. No large explosions, voices or music. Natural restrained loop that can sit quietly below battle sounds. Seamless with no fade in or fade out and no obvious repeating signature.

## Crew and run-over interactions

### ragdoll_ground_impact — 8 variants, 0.3–0.8 seconds, mono

**Prompt:** A clothed adult soldier landing heavily on loose desert ground after being thrown from a vehicle. A padded body thud, gear and buckle clatter, a small gritty skid. Short, grounded action-game foley, no bone snaps, no vocalization, no explosion or music. Vary the landing angle and weight slightly between takes.

### crew_runover_squish — 6 variants, 0.3–0.7 seconds, mono

**Prompt:** One short stylized game squish as a heavy tank tread rolls over a fallen enemy on sandy ground. A compressed damp crunch-squelch layered with a low soft thud and a little gritty cloth drag. Brief, punchy and readable rather than elaborate or prolonged. No screaming, dialogue, music, repeated impacts or long liquid tail. Dry close source for in-game attenuation.

**Trigger:** Once per ragdoll when the red smear decal is created. Never repeat every frame while the tank remains over the same location. Keep it quieter than weapons and suppress very distant playback.

### crew_hit_reaction — 6 variants, 0.15–0.45 seconds, mono

**Prompt:** A fictional adult male soldier's brief startled exertion grunt, as if jolted hard in a moving vehicle. Short nonverbal reaction, grounded military action-game performance. No words, screams, background sounds or music. Do not resemble any recognizable actor.

## Driving and mechanical movement

### tank_engine_start — 3 variants per tank weight, 2–4 seconds, mono

**Prompt:** An old diesel tank engine starting. A heavy starter motor strains, the engine catches with several uneven chugs, then settles into a strong low mechanical idle. Worn industrial character, close dry recording, no driving, voices, music or gunfire. Produce light, medium and heavy variants with progressively deeper and weightier engines.

### tank_engine_idle — light / medium / heavy, 6–10 seconds each, mono loop

**Prompt:** A running diesel tank engine idling steadily. Deep combustion pulses, modest mechanical vibration and a little worn fan hiss. Stable RPM, no throttle changes, track movement, voices or music. Seamless dry loop with no start or stop; keep enough upper mechanical texture to remain audible on small speakers without excessive bass.

### tank_engine_drive — low / medium / high RPM, 6–10 seconds each, mono loops

**Prompt:** A military tank diesel engine under sustained driving load at one steady RPM. Heavy cyclical combustion, a gritty mechanical whine and dense chassis vibration. No shifting, acceleration sweep, start, stop, tracks, gunfire, voices or music. Deliver three phase-compatible steady loops at low, medium and high engine speed for smooth in-game crossfading.

### tank_tracks_sand — 4 variants, 6–8 seconds, mono loop

**Prompt:** Steel tank tracks rolling continuously over dry desert sand and scattered gravel. Rhythmic heavy tread clatter, sand grinding and fine grit spraying backward. Steady movement with no starts or stops, no engine or gunfire. Seamless loop, weighty and tactile, with distinct but not overly regular metallic detail.

### tank_tracks_rock — 4 variants, 4–6 seconds, mono loop

**Prompt:** Heavy tracked armor slowly crawling over rough sandstone and low broken masonry. Tight metal tread chatter, gritty rock scrapes and irregular heavy contacts, at a steady low speed. No engine, voices, music or explosions. Seamless loop suitable for blending with the sand track loop.

### tank_brake_slide — 6 variants, 0.6–1.5 seconds, mono

**Prompt:** A heavy tank braking hard and sliding sideways on loose desert grit. Abrupt metal strain, a broad scraping sand wash and a few quick tread clanks before stopping. No rubber tire squeal, no engine, no voices or music. Playful physical weight without sounding like an aircraft landing.

### tank_land — light / medium / heavy, 4 variants each, 0.6–1.5 seconds, mono

**Prompt:** A tracked tank landing after a small dune jump. A deep chassis thud, suspension compression, metallic track slap and a short outward spray of sand. One landing only, dry outdoor acoustics, no explosion or gunshot. Scale the bass weight and suspension rattle for a light, medium or heavy tank.

### suspension_creak — 8 variants, 0.2–0.6 seconds, mono

**Prompt:** A loaded military vehicle suspension compressing over an obstacle: short strained steel squeak, hydraulic resistance and a compact metal settle. Mechanical and worn, not a door hinge or cartoon spring. Isolated dry foley, no engine, impact blast or voices.

### jeep_engine_drive — idle / cruise, 6–8 seconds each, mono loops

**Prompt:** An old open military jeep engine running at a steady speed. Rough midrange petrol-engine rattle and light body vibration, clearly smaller and higher-pitched than a tank diesel. Dry close perspective, no tire noise, gear shifts, music, voices or gunfire. Deliver seamless idle and steady cruise loops separately.

### turret_traverse — 3 variants, 3–5 seconds, mono loop

**Prompt:** A worn tank turret power traverse motor turning at a steady rate. Low mechanical electric whir, restrained gear friction and subtle heavy-bearing rumble. Intimate and functional, not futuristic. No start or stop, firing, voices or music. Seamless loop with room for in-game pitch changes based on traverse speed.

### turret_stop — 5 variants, 0.15–0.35 seconds, mono

**Prompt:** A tank turret mechanism stopping precisely: a short geared deceleration and compact steel settling clunk. Restrained, mechanical, dry and satisfying. No gunshot, electronic beep, voices or music.

### vehicle_recovery — 3 variants, 0.8–1.4 seconds, mono

**Prompt:** A heavy mechanical winch pulling briefly under tension, followed by a solid chassis settling clunk and a small sand scrape. An in-game tank recovery action, practical and physical rather than magical. No engine startup, music, voices or long towing sequence.

## Countermeasures, UI and ambience

### smoke_launcher — 5 variants, 0.3–0.7 seconds, mono

**Prompt:** A tank smoke grenade launcher firing: a short hollow pneumatic thump, a small metallic tube rattle, then a quick gas puff. Much quieter and softer than the main cannon. No impact explosion, voices, music or long reverb.

### smoke_bloom — 3 variants, 1.5–3 seconds, mono

**Prompt:** A smoke grenade beginning to vent a dense screen on sandy ground. A brief ignition pop followed by coarse pressurized hissing that eases into a soft smoky fizz. No fireball, artillery boom, music or voices. Separate from the launcher thump.

### ui_hover_select — 5 variants, 0.05–0.12 seconds, stereo or mono

**Prompt:** A tiny muted mechanical switch tick for a weathered military interface. Crisp, tactile and quiet; no melodic pitch, digital sparkle or sci-fi beeping. One short sound, no room noise or long tail.

### ui_confirm_purchase — 4 variants, 0.15–0.35 seconds, stereo or mono

**Prompt:** A satisfying two-part industrial confirmation: a small latch click followed by a firm metal stamp. Suggest ammunition being checked into a field inventory. Compact, dry and friendly, not cash-register coins or casino audio. No speech or music.

### ui_insufficient_credits — 3 variants, 0.15–0.3 seconds, stereo or mono

**Prompt:** A restrained mechanical rejection: two short dull relay knocks, slightly lower and less resolved than a successful confirmation. Readable without being harsh or alarming. No buzzer blast, words, music or sci-fi tone.

### enemy_destroyed_confirm — 4 variants, 0.2–0.45 seconds, stereo or mono

**Prompt:** A concise analog military-interface confirmation that a target has been destroyed. A dry radio relay click and one subtle low metallic accent. Satisfying but understated, clearly audible beneath an explosion without becoming a celebratory jingle. No voice or music.

### low_armor_warning — 3 variants, 0.5–0.8 seconds, stereo or mono

**Prompt:** A compact old armored-vehicle warning tone, two measured low electronic pulses with a faint relay texture. Urgent but not shrill, no constant siren, no spoken warning, no music. Intended to trigger sparingly when armor crosses a critical threshold, not loop continuously.

### desert_dusk_ambience — 2 variants, 45–60 seconds, stereo loop

**Prompt:** A wide quiet desert industrial ruin at dusk. Gentle dry wind across sand, faint loose sheet metal creaking far away, occasional barely audible grit movement. Calm and spacious beneath combat, no birds close to the listener, no intelligible voices, no gunfire, no dramatic gust peaks and no music. Seamless loop with a soft center and subtle stereo width.

### garage_ambience — 2 variants, 30–45 seconds, stereo loop

**Prompt:** A quiet makeshift military vehicle workshop at dusk. Low ventilation hum, distant understated metal ticks and a soft canvas flap in the dry breeze. No active welding sparks, recognizable tools performing repeated sequences, voices, engines revving or music. Subtle seamless background loop that does not distract from menu interactions.

## Music

All music must be original, with no recognizable existing melody, named-artist imitation, vocals or spoken radio chatter. Deliver full mixes plus time-aligned percussion, bass, texture and melodic stems. Combat layers must share tempo, key, bar lengths and loop boundaries.

### menu_garage_music — 90–120 seconds, stereo loop, 86 BPM

**Prompt:** Original instrumental menu music for a gritty indie tank combat game in a desert at dusk. Slow 86 BPM pulse, dusty analog bass, muted industrial metal percussion, restrained distorted guitar textures and a sparse uneasy minor-key motif. Warm sunset melancholy with a sense of machinery waiting to move. Deliberate and atmospheric, not orchestral military triumph, not EDM festival energy. No vocals or speech. Seamless loop with no big ending or introductory silence; leave room for UI clicks and engine sounds.

### combat_low_intensity — 64 bars, stereo loop, 112 BPM

**Prompt:** Original instrumental low-intensity combat loop for a desert tank action game at 112 BPM. A steady dry mechanical groove, low analog bass pulse, sparse clanking percussion, gritty guitar accents and restrained tension. Momentum and anticipation without constant maximal drums. Indie industrial character, no vocals, no cinematic choir, no recognizable melody. Seamless 64-bar loop with stems, designed as the foundation for a higher-intensity layer in the same key and tempo.

### combat_high_intensity_layer — 64 bars, stereo loop, 112 BPM

**Prompt:** An original additive high-intensity layer for an existing 112 BPM industrial armored combat groove. Tight urgent percussion, distorted rhythmic guitar stabs, metallic accents and a controlled rising bass texture. Exciting, heavy and playful enough for tank jumps and explosions. No lead melody that clashes with a sparse minor-key base, no vocals, no full-song intro or ending. Exactly 64 bars, seamless loop, and restrained sub-bass so cannon impacts stay dominant. Deliver percussion and texture stems separately.

### combat_transition_riser — 2 bars, 112 BPM, stereo

**Prompt:** An original two-bar transition at 112 BPM using a short industrial drum fill, tightening mechanical texture and a restrained bass swell, ending cleanly on a downbeat. Built to join low- and high-intensity tank-combat loops. No explosive hit that could be mistaken for a weapon, no vocals, no long whoosh or giant cinematic braam.

### victory_stinger — 5–7 seconds, stereo

**Prompt:** An original short victory cue for a gritty independent military game: a firm resolving analog bass note, two confident industrial drum strikes and a restrained warm distorted-guitar chord. Satisfying survival rather than grand patriotic triumph. No fanfare orchestra, cheering, vocals or speech. Clear musical resolution and a short clean tail.

### defeat_stinger — 4–6 seconds, stereo

**Prompt:** An original brief defeat cue for a desert tank game: a low unresolved guitar texture, a soft descending analog bass figure and one muted mechanical percussion hit, fading naturally. Somber but encouraging another attempt; not melodramatic or mournful. No vocals, speech, explosions, choir or dramatic orchestral swell.

## Infantry wounds, crawling and varied run-over reactions

Record several fictional adult soldier voices, keeping the same voice identity throughout one soldier's injury, crawl and death. Deliver each spoken line as its own file with three distinct takes per voice. Screams, dialogue and physical impacts are separate assets. Follow the dry mono delivery requirements above; no weapons, music, radio filter or baked-in battlefield ambience.

### infantry_partial_runover_scream — 12 variants, 0.5–2 seconds, mono

**Prompt:** One fictional adult soldier's sudden involuntary scream as a tank track catches them. Begin with a startled sharp intake or interrupted shout, followed by a raw pain cry that breaks into strained breath. Vary onset, pitch, length and intensity across takes: a short bark, a rising scream, a breathless gasp, a voice cracking under shock. Gritty dramatic game performance, not comedic. No spoken words, no impact sound, no other voices. Leave room for a separate injury line afterward.

### infantry_leg_injury_line — 3 takes per line per voice, 0.8–3 seconds each, mono

**Prompt:** A fictional adult soldier on the ground, shocked and breathless after losing the use of a leg. Deliver exactly one of the following lines per file. Use varied distressed performances: stunned disbelief, urgent panic, then strained pleading. Keep words understandable without making every take a full-volume shout. A brief gasp may precede the line; do not add dialogue or narration.

- “Oh my God, my legs!”
- “My leg! My leg!”
- “I can't feel my legs!”
- “Medic! I need a medic!”
- “Help me! Please!”
- “Get me out of here!”
- “I can't stand up!”
- “Don't leave me here!”

### infantry_severe_injury_reaction — 8 variants, 0.6–2 seconds, mono

**Prompt:** One brief, severely wounded fictional adult soldier reaction: a shocked gasp, broken cry or short desperate call for help, ending in shallow strained breathing. Performance is weak and stunned rather than a sustained theatrical scream. Intended for a character who remains alive only a few seconds. No extended dialogue, impacts, background voices or music.

### infantry_crawl_effort — 12 variants, 0.3–1.1 seconds, mono

**Prompt:** One isolated effort vocalization from a wounded fictional adult soldier dragging themselves across sand using their arms. A tight grunt, shaky exhale, restrained whimper or breath catching with exertion. Vary intensity and phrasing, with no intelligible speech. Leave clean silence at the end. These are individually triggered one-shots, not a continuous loop.

### infantry_crawl_plea — 3 takes per line per voice, 0.6–2 seconds each, mono

**Prompt:** A wounded fictional adult soldier trying to crawl toward safety, speaking one short line between strained breaths. Deliver only the selected line, softly or urgently as a variation. Same voice identity as the injury reaction; no additional words, other voices, impacts or ambience.

- “Help me…”
- “Medic…”
- “Over here!”
- “Please… help.”
- “I can't move…”

### infantry_final_breath — 8 variants, 0.5–1.5 seconds, mono

**Prompt:** One quiet final exhausted exhale from a fictional adult soldier, sometimes preceded by a small interrupted breath or subdued groan. Restrained dramatic game acting. No words, long scream, exaggerated theatrical death rattle, music or physical impact. Keep the ending soft and clean.

### infantry_partial_track_impact — 8 variants, 0.2–0.65 seconds, mono

**Prompt:** A brief heavy tracked-vehicle injury impact for a stylized gritty combat game: a compact compressed thud, wet snap and short fabric tear, with a small grit scrape. Distinct, tactile transient; smaller and shorter than a full run-over. No scream, engine loop or second impact. Vary the balance of fabric, weight and wet texture across takes.

### infantry_full_crush_variation — 10 variants, 0.35–1 second, mono

**Prompt:** One forceful infantry run-over impact: a weighty compressed crunch, dense wet squelch, torn fabric and a short sandy scrape. Create varied single impacts, occasional two-stage compressions and abrupt flattened endings. Exaggerated game readability without a long messy tail. No voices, vehicle engine, metal explosion or music. Layer with existing track audio at runtime.

### infantry_crawl_foley — 10 variants, 0.4–1 seconds, mono

**Prompt:** One pull of a wounded soldier's clothed body across dry desert sand: sleeve and glove scrape, uniform dragging, a restrained damp smear and loose grains shifting. Low, close and tactile. No voice or breathing; those are separate layers. Match a slow irregular arm-pull animation rather than footsteps. One isolated movement per file.

### infantry_fragment_wet_landing — 10 variants, 0.12–0.5 seconds, mono

**Prompt:** One small clothed body fragment landing on sandy ground: a soft weighted thud, brief damp slap and faint fabric/grit rustle. Alternate light and heavy variants with very short tails. No voice, explosion, metallic ring or large splash. Designed for sparse delayed landing accents after the main impact.

### Wound audio event and variation rules

| Gameplay event | Sound layers | Timing and selection |
| --- | --- | --- |
| Partial track hit / severed leg | Partial impact + injury scream | Each once at injury; alternate takes without immediate repeats |
| Wounded survivor reacts | Leg injury line | Optional, 0.3–0.9 seconds after the scream; one initial line per soldier |
| Severe lower-body separation | Partial or full impact + severe reaction | Prefer short reactions that fit the 4–6 second survival window |
| Soldier drags forward | Crawl foley + occasional effort grunt | Follow actual arm pulls; do not play on every animation cycle |
| Wounded soldier remains alive | Occasional crawl plea | Optional, spaced 4–7 seconds apart; many soldiers stay nonverbal |
| Wounded soldier expires | Final breath | Once at death; cancel queued pleas and effort sounds |
| Full run-over / finishing pass | Full crush variation + optional short cry | One event per victim; cancel earlier queued injury dialogue |
| Dismembered fragment lands | Wet landing | Only on significant first contact; select a few audible fragments |
| Flamethrower fuel pack detonates | Fuel-pack detonation + optional brief reaction | Keep voice separate; no prolonged dialogue after death |

Use a weighted shuffle bag per voice and event, with no immediate repetition. Not every injury should produce a spoken line: start with a 35% chance after a survivable partial hit and tune in playtests. Cap nearby injury speech/screams at two concurrent voices, prioritize proximity, and keep a per-soldier vocal cooldown. Interrupt queued lines when a soldier dies, is crushed again or leaves audible range. Avoid stacking a scream, plea and grunt from the same soldier. Preserve the impact transient by briefly ducking the voice if necessary. These are required asset prompts and integration notes; recorded vocals are not yet implemented.

## Implementation event map

| Game event | Primary layers | Playback notes |
| --- | --- | --- |
| Main cannon fires | Weight-specific cannon + pressure dust | At muzzle; recoil and flash start with the transient |
| Main gun finishes reloading | Reload lock / ready | Player-local, quiet and clear |
| Jeep machine gun fires | Jeep MG shot | Short repeated mono source at gunner; cap overlapping tails |
| Coaxial gun fires | Tank coax shot | Distinct from jeep MG |
| Projectile strikes | Material-specific impact | Use impact position, not shooter position |
| Jeep destroyed | Jeep explosion + crew ejection yells | Independent blast/voice timing; debris lands later |
| Tank destroyed | Tank explosion | Higher weight than jeep, music briefly ducks |
| Crew hits ground | Ragdoll ground impact | Threshold by contact speed; cooldown per ragdoll |
| Tank runs over crew | Crew run-over squish | Once when the smear is placed |
| Fragment bounces | Metal / wheel / stone landing | Contact impulse threshold and cooldown; voice budget |
| Vehicle moves / slides / lands | Engine + surface track layer + transient foley | Speed/RPM driven, independent from throttle input |
| Turret rotates / stops | Traverse loop + stop | Fade loop with rotation speed |
| Smoke deployed | Launcher + delayed smoke bloom | Separate muzzle and ground positions |
| Burning wreck persists | Wreck fire loop | Distance attenuation; stop with wreck retirement |
| Menus / garage | Garage ambience + menu music | Lower music under selection/confirmation cues |
| Match begins / intensifies | Desert ambience + adaptive combat stems | Crossfade on bar boundaries |
| Match ends | Victory or defeat stinger | Stop or duck combat stems cleanly |

## Suggested integration order

1. Cannon, jeep MG, jeep explosion, crew ejection, run-over squish, impacts and reload-ready feedback.
2. Engine/track blends, cannon dust wash, suspension, landing, material debris and smoke launcher.
3. Dusk ambience, burning wreck loops, UI set and adaptive music.

Keep the existing synthesized sounds as an explicit fallback until each replacement asset is generated, reviewed, normalized and wired to its event. These prompts do not imply that voice, squish, music or recorded replacement audio is currently implemented.

### RPG infantry
- Shoulder launcher handling: canvas sling slide, glove grip, light metal sight rattle, brief and dry; no voices, no music.
- Rocket launch: sharp ignition crack followed by a forceful short exhaust whoosh, gritty military field recording character, clean tail.
- Rocket flyby: fast directional sizzling exhaust hiss, Doppler pass, separate near and distant variations.
- Launcher reload: glove movement, hollow tube clack and ammunition seating click, approximately three seconds.

### Flamethrower infantry
- Ignition: small metallic valve click and sharp gas ignition whoof, no explosion tail.
- Sustained flame: seamless pressurized fuel roar with fluttering combustion, aggressive but readable beneath cannon fire, two-second loop plus separate release hiss.
- Fuel-pack movement: restrained metal cylinder rattle and canvas creaks for walk/run foley.
- Fuel-pack detonation: sudden pressurized tank rupture, deep rolling fuel fireball, sharp metal fragments and scattered ground impacts; separate close and distant variations, no music.

## Reactive scenery destruction

- **scenery_car_crush — 6 variants, 1–2 seconds, mono:** Old civilian sedan collapsing beneath tank tracks: buckling sheet metal, window-glass crackle, suspension pop and a final flattened crunch. No explosion, voice, engine loop or music; one isolated compression event.
- **scenery_crate_break — 8 variants, 0.5–1 seconds, mono:** Dry weathered shipping crate breaking under heavy force: several sharp timber cracks, nail pulls and lighter boards scattering onto sand. No metallic explosion or voices. Separate light board-landing accents.
- **scenery_barricade_break — 6 variants, 0.6–1.2 seconds, mono:** Wooden road barrier snapping and toppling: long beam crack, two shorter splinters and a dry sandy impact. Distinct from a crate's hollow collapse; no gunshot or engine.
- **scenery_fuel_bowser_burst — 6 variants, 2–4 seconds, mono:** Small towable fuel tank rupturing: pressurized metal split, sharp ignition, compact deep fireball, then scattered sheet-metal impacts. Keep combustion and debris stems separate. No voices or music.
- **scenery_generator_destroy — 6 variants, 0.6–1.5 seconds, mono:** Field generator enclosure breaking apart: heavy panel clatter, brittle electrical snaps and a brief dying mechanical rattle. No enormous explosion or looping electricity. Separate sparks and metal-impact layers.
