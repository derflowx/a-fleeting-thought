# A fleeting thought

An interactive writing artwork: 99 birds become letters on a single cable, then return to their flock when the letters are deleted.

A pale paper sky, a moving murmuration, a gently sagging wire, and a quiet invitation: **Write something.**

## Live website

GitHub Pages is configured by `.github/workflows/pages.yml`. Every push to `main` runs the checks, builds `dist/`, and deploys the static site. The repository’s Pages publishing source must be set to **GitHub Actions**.

## Run locally

Requires **Node.js 22 or newer**. No packages need installing.

```sh
npm start
```

Open **http://127.0.0.1:4173**. Stop the server with Ctrl+C.

```sh
npm test       # Run the automated checks
npm run build  # Prepare a static website in dist/
```

The development server listens only on this computer's loopback interface.

## Writing

- Each non-whitespace character borrows one of the 99 persistent birds.
- Birds steer out of the live flock, retaining their momentum, then brake and perch at their character's position. Journeys typically take around three seconds and vary with distance and heading.
- Wings, feet, body and beak morph directly into vector letter contours. Wings snap into place; the other parts follow more quickly.
- Deleting reverses the morph, emits a few dark feathers and sends the same bird back into the moving flock. Bulk deletions scatter takeoffs over a random 0–300 ms window.
- Text stays on one centered line. Spacing and framing ease as the thought grows or shrinks; newlines and tabs become spaces. The cable stays symmetric.
- Once all 99 birds are used, further insertion—including spaces—is blocked until a character is deleted. The overall input boundary is 360 Unicode code points, including whitespace.
- The cursor is hidden during ordinary typing and softly appears for selection or deletion.

## Sharing

**Share thought** creates a compressed replay link carrying the edit timeline, including pauses, corrections and deleted words. Opening the link automatically replays the writing. The recipient can replay it or start a new recording.

There is no writing database, analytics or account requirement. The data lives in the URL fragment, which is not sent as part of HTTP requests; anyone who has the complete link can decode the writing, including text that was erased. Links support up to 2,000 edits, 30 minutes and a 60 KB encoded URL.

A local preview link works only on the computer running the server. To share with other people, publish the static site and use its hosted address. Hosted pages generate replay links against their own origin. To make local authoring generate links for an already published copy, set `PUBLIC_ORIGIN` in `site-config.js` to that verified hosted origin.

The first edit starts the recording. Shared framing adapts to the viewer's screen; exact pixels and flight paths can differ with viewport dimensions and reduced-motion preferences.

## Design and simulation

The visual direction is restrained and painterly: pale celadon, warm parchment, procedural grain, and dark olive ink. All artwork is rendered with Canvas; no remote images or fonts are requested.

The flock is a 3D boids simulation with local separation, alignment and cohesion. Internal eddies and a rotating strain field create changing compression and stretch. Climbing birds flap faster; descending birds extend their wings to glide. Each bird keeps a ±15% variation in speed and landing overshoot.

The flock lives in a fixed 1000 × 650 world. A centered, uniform camera preserves its proportions during window resizing. Arrivals and returns use the same coordinate transforms. Near touchdown, birds match their moving letter slot's velocity, so they can land while typing continues.

Each cable uses a damped spring for landing and takeoff impulses. The six bird parts interpolate into flattened Georgia outline polygons, preserving letter counters; curved internal joins avoid rectangular-looking subdivisions. The settled letter is a serif glyph. Supported outlines cover extended Latin and common punctuation; unsupported glyphs currently use an outlined placeholder. `glyphs.js` contains outlines extracted locally from the macOS Georgia typeface; no font file is bundled.

## Source map

| File | Purpose |
|---|---|
| `app.js` | Keyboard adapter, scene state, lifecycle and rendering |
| `text-model.js` | Shared Unicode-aware text and edit boundary |
| `flock.js` | Fixed bird population, ownership, local flocking and return steering |
| `air.js` | Internal flow forces and velocity-driven wingbeats |
| `arrival.js` | Force-driven arrivals, landing springs and release offsets |
| `morph.js`, `glyphs.js` | Six-part bird-to-letter vector morphing |
| `framing.js`, `viewport.js` | Centered text fitting and undistorted world projection |
| `replay.js` | Timed edit patches, validation, compression and seeded variation |
| `index.html`, `style.css` | Minimal interface and accessible native input |
| `server.mjs`, `build.mjs` | Dependency-free local server and static packaging |

## Future work and current limits

Speech input can feed the existing boundary with `window.birdwire.setText(transcript, 'speech')`; microphone access and speech recognition are not implemented. `window.birdwire.getState()` supplies a development snapshot.

Selection uses the underlying native textarea; the canvas does not yet draw a selection highlight. The cable is a lightweight spring, rather than a segmented physical rope. Bird anatomy remains most perceptible during transformation; fully bird-shaped settled letterforms would be a further artistic study. Motion blur is disabled.

Potential next studies: more expressive anatomy-to-stroke correspondence, localized cable waves, optional soft wing and air sounds, and a speech adapter that handles interim and final transcripts.


### Flight silhouettes

Flock birds orient in 3D along their velocity, bank into turns, and change silhouette through foreshortening. Their up axis stays continuous through steep climbs. Climbing wingbeats and descending glides are preserved.
