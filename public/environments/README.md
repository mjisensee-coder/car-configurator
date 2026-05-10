# Environment GLBs (manual download)

Two of the four configurator environments load GLB scenes from Sketchfab.
Sketchfab's download API requires an authenticated token, so we cannot
fetch the files automatically — they have to be downloaded once by hand
and dropped into this directory.

When the file is present, the corresponding scene loads it on next page
load. When it's missing, the configurator falls back to a minimal
procedural room and shows an in-3D card pointing the operator here.

## What to download

| File name | Source (Sketchfab) | Author | License |
|---|---|---|---|
| `modern-showroom.glb` | [Car-Showroom 2](https://sketchfab.com/3d-models/car-showroom-2-e7a3497e8a7c487e906b2d8814b018f0) | [Polsaris](https://sketchfab.com/polsaris) | CC BY 4.0 |
| `led-studio.glb` | [Studio V1 For Car](https://sketchfab.com/3d-models/studio-v1-for-car-9c45d19a7d434e2ca1640d6d2146e895) | [Velocity Motion](https://sketchfab.com/velocity.motion) | CC BY 4.0 |

## Steps

1. Open the Sketchfab page (sign in first — required for "Download 3D Model").
2. Pick the **glTF (.glb)** format.
3. Save the resulting file as the exact filename listed above into
   `public/environments/`.
4. Reload the configurator. The scene now loads the GLB.

The author + license credit is already wired into the global footer and
the in-scene scene-overlay link, so the CC BY 4.0 attribution requirement
is satisfied automatically once the GLB is in place.

## Adding another GLB-backed environment

1. Append the new id to the `EnvironmentId` union in `src/types/index.ts`.
2. Build a scene component in
   `src/configurator/environments/scenes/`, copying `LedStudio.tsx` as a
   starting point. Wrap the GLB load with `<SketchfabSceneFallback>`.
3. Register the new id in `SceneEnvironment.tsx` (router) and append a
   metadata entry to `environmentPresets.ts`.
4. Add a row to the table above so future maintainers know the source.
5. Add a credit row to `src/components/Footer.tsx` so the attribution
   appears site-wide.
