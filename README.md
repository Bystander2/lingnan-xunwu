# Lingnan Xunwu · A Cantonese Garden Scavenger Hunt

A browser-only Cantonese vocabulary game. Find the words on your shopping slip in a hand-drawn plan of a Lingnan (southern Chinese) garden, tear them out of the paper, and hear them spoken in Cantonese. Halfway through, the paper refuses to tear — and pulls you into the drawing, where you finish the hunt in first person inside a 3D garden.

- **Act 1** — `garden-map.html`: a 2D garden plan. Click the items on your slip to tear them out.
- **Act 2** — `garden.html`: the same garden in 3D (Three.js), explored in first person. It can also be opened on its own to find all 12 words.

## Running locally

Static files, no build step. Open `garden-map.html` directly (double-clicking works), or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/garden-map.html
```

## Controls

- **Act 1**: click things in the plan that match the words on the slip. Hint, new round and voice toggle are on the slip.
- **Act 2**: `WASD` to walk, `Shift` to run, mouse to look, `E` to pick up / inspect, `Q` for a hint, `R` for a new round, `V` to toggle pronunciation.

## Credits

- Vocabulary and native-speaker Cantonese audio: [DimSum AI Cantonese corpus](https://search.aidimsum.com/docs) (Modern Cantonese Dictionary).
- Textures: [Poly Haven](https://polyhaven.com) (CC0).
- Fonts: Ma Shan Zheng and Zhi Mang Xing (Google Fonts, OFL); Cantonese-specific characters are filled in with a subset of LXGW WenKai TC (OFL), embedded.
- 3D: [Three.js](https://threejs.org) r149 (MIT).
