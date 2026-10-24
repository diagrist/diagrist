# Bundled fonts

The kernel measures text with tables generated from these files (`src/font-metrics.ts`, `src/inter-regular.ts`,
`src/inter-semibold.ts`, `src/space-grotesk-regular.ts`, `src/space-grotesk-medium.ts`, ADR 0013 and 0022), and
rasterizers such as `@diagrist/export-png` set text with them. The font files are the upstream release files,
unchanged. All families are under the SIL Open Font License 1.1, whose text ships next to them.

| Family | Source | Release | Licence file |
|---|---|---|---|
| JetBrains Mono | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) | 2.305 | `OFL.txt` |
| Inter | [rsms/inter](https://github.com/rsms/inter) | v4.1, commit `e3a3d4c57d5ecc01453a575621882a384c1995a3`, `Inter-4.1.zip`, folder `extras/ttf` | `OFL-Inter.txt` |
| Space Grotesk | [floriankarsten/space-grotesk](https://github.com/floriankarsten/space-grotesk) | 2.0.0, commit `7220f5d04813fe83babe76d4fd23e02275021280`, `SpaceGrotesk-2.0.0.zip`, folder `ttf/static` | `OFL-SpaceGrotesk.txt` |

The zip of Inter 4.1 has the SHA-256 `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e`. Only the
static TrueType faces of the two weights the looks use are bundled, since resvg reads TrueType and OpenType but no
WOFF2, and a variable font would need its instances resolved for the advance tables.

The zip of Space Grotesk 2.0.0 has the SHA-256 `53b415577d4139248555300710bea0d268c7a5be67b93de53b716a9736cabffd`.
Its Regular and Medium faces are bundled, the weights `look=instrument` uses; the kernel sets Medium from weight 500
on. The licence text came with Windows line endings, which are changed to Unix ones here; upstream its SHA-256 is
`564ce565c371c5e5bbf286006565a7c9aa55a9f56e7ca58d56e05d649dd61a72`.

| File | SHA-256 |
|---|---|
| `Inter-Regular.ttf` | `40d692fce188e4471e2b3cba937be967878f631ad3ebbbdcd587687c7ebe0c82` |
| `Inter-SemiBold.ttf` | `78a843fade9d4612a5567302fb595b56976eb5fcebf4fea5a5912d638bafcde3` |
| `OFL-Inter.txt` | `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a` |
| `SpaceGrotesk-Regular.ttf` | `5ede28c4425f3fe4830c8f4754b39e9a87a93d0c3baa5e0a9924532aaa8a98bd` |
| `SpaceGrotesk-Medium.ttf` | `3183b7eb0b4241476360e2cd8e527868616cc16d3ce332c4376505989b772b44` |
| `OFL-SpaceGrotesk.txt` | `c6dec685825f73b18c20926fddc65e8315642e12986f15db0699170940a09efc` |
| `JetBrainsMono-Regular.ttf` | `e6fd0d7e91550b3ed2b735d4312474362c4716edc4fc0577a0f61ed782d5aed1` |
| `JetBrainsMono-Bold.ttf` | `d22c4f3821d725eb01210d278d95dfcfcaadc34699a06658d47c8a5cc5830ada` |
| `JetBrainsMono-Italic.ttf` | `6dc8e1322d4b2013b64e277bf66abc6748207c46a590471d4296876c2c235d0c` |
| `JetBrainsMono-BoldItalic.ttf` | `cec9b489af5c98a94cb8d8d8708ef1640cca0f296b207de1f50b2dd95e967bdf` |
| `OFL.txt` | `a76abf002c49097d146e86740a3105a5d00450b1592e820a1109a8c5680cd697` |
