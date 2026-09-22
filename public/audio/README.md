# Audio assets

- `music/machinery-waiting.mp3` — Machinery Waiting, looping menu/hangar music.
- `stingers/victory.mp3` — one-shot victory cue.
- `stingers/defeat.mp3` — one-shot defeat cue.

The supplied recordings are preserved; only their paths and filenames changed.
`src/audio.js` defines the asset manifest. All three recordings are fetched and decoded during initial loading. Menu/hangar music and result stingers use Music volume; engine, weapons and UI sounds use SFX volume. Both settings persist independently, and an older master-volume preference initializes both sliders. Result cues play once when a match ends, and fade out if the player leaves the results screen or starts another match.

Engine, weapon and UI sounds are synthesized in code.
