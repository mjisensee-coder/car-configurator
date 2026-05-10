/**
 * Verified BMW E30 imagery library.
 *
 * Every URL in this file is a real BMW E30 photograph from a free,
 * commercial-use-allowed source (Pexels or Unsplash) — both licenses
 * permit commercial use without attribution.
 *
 * Adding a new image:
 *   1. Verify it's actually a BMW E30 (E30 search on the source site).
 *   2. Confirm license: Pexels = "Pexels License", Unsplash = "Unsplash License".
 *   3. Add a key here with a short comment describing the shot.
 *   4. Reference it from data/*.json or components by importing this module.
 *
 * Keep this file as the single source of truth. Don't paste image URLs
 * directly into JSON or JSX — go through here, so the audit trail is
 * one file.
 */

const PX = (id: number, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&q=80`;

const UN = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const E30 = {
  /* Hero / cinematic */
  heroWide: PX(18311087, 1600), // Vintage E30, dramatic shadowed lighting
  heroCoupe: UN('photo-1750800457000-2f76870d985f', 1600), // White coupe, Luke Miller
  heroRed: UN('photo-1753658478807-00db61f7acf2', 1600), // Red E30 on grass, Enzo Swan

  /* Whites & lights */
  whiteConvertible: PX(19397303), // White E30 convertible at sunset, palm trees
  whiteCoupe: PX(9545550), // White E30 M3 coupe
  whiteCoupe2: UN('photo-1750800457000-2f76870d985f'), // White E30 coupe, Luke Miller

  /* Reds */
  redOnGrass: UN('photo-1753658478807-00db61f7acf2'), // Red E30 on grass
  redTuned: PX(17918285), // Red, tuned E30
  redClassic: PX(19565328), // Red E30
  redLowAngle: PX(20227074), // Red E30
  redM3: PX(34444962), // Red M3
  redSilver: PX(29190879), // Red/silver
  orangeM3: PX(26348360), // Orange tuned M3

  /* Blacks & darks */
  blackDrifting: PX(16823797), // Black E30 drifting
  blackBW: PX(19413542), // Black & white
  blackM3a: PX(12359723), // Black M3
  blackM3b: PX(29527751), // Black M3
  blackM3c: PX(29527748), // Black M3
  blackM3d: PX(29527750), // Black M3 (alt)
  blackM3e: PX(30313792), // Black M3
  black1: PX(11110466),
  black2: PX(11110446),
  black3: PX(11110511),
  black4: PX(10397720),
  black5: PX(31875669),

  /* Blues */
  navyBlue: PX(15397757), // Navy blue E30
  blueM3: PX(8839772), // Blue M3
  blueClassic: PX(12472234), // Blue E30
  blueDeep: PX(36608247), // Blue E30

  /* Grays / silvers */
  grayClean: PX(18781177), // Gray E30
  grayM3: PX(16737678), // Gray M3

  /* Tuned / aggressive — for wheel/suspension cards */
  tuned1: PX(19272394), // Tuned E30
  tuned2: PX(15098023), // Dark tuned
  tuned3: PX(11110409), // Tuned dark
  tuned4: PX(27993139),
  tuned5: PX(27993135),
  tuned6: PX(19577717),
  tuned7: PX(34687793),
  tuned8: PX(11110489),
  tuned9: PX(15660476),
  tuned10: PX(11110420),
  tuned11: PX(20694122),
  tuned12: PX(29527749),

  /* Detail shots — interior */
  interior: PX(17623842), // E30 interior

  /* Vintage / dramatic */
  vintage: PX(18311087), // Dramatic shadowed lighting
} as const;

export type E30ImageKey = keyof typeof E30;
