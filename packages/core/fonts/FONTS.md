# Bundled fonts

The kernel measures text with tables generated from these files (`src/font-metrics.ts`, `src/inter-regular.ts`,
`src/inter-semibold.ts`, ADR 0013 and 0022), and rasterizers such as `@diagrist/export-png` set text with them. The
files are the upstream release files, unchanged. Both families are under the SIL Open Font License 1.1, whose text
ships next to them.

| Family | Source | Release | Licence file |
|---|---|---|---|
| JetBrains Mono | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) | 2.305 | `OFL.txt` |
| Inter | [rsms/inter](https://github.com/rsms/inter) | v4.1, commit `e3a3d4c57d5ecc01453a575621882a384c1995a3`, `Inter-4.1.zip`, folder `extras/ttf` | `OFL-Inter.txt` |

The zip of Inter 4.1 has the SHA-256 `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e`. Only the
static TrueType faces of the two weights the looks use are bundled, since resvg reads TrueType and OpenType but no
WOFF2, and a variable font would need its instances resolved for the advance tables.

| File | SHA-256 |
|---|---|
| `Inter-Regular.ttf` | `40d692fce188e4471e2b3cba937be967878f631ad3ebbbdcd587687c7ebe0c82` |
| `Inter-SemiBold.ttf` | `78a843fade9d4612a5567302fb595b56976eb5fcebf4fea5a5912d638bafcde3` |
| `OFL-Inter.txt` | `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a` |
| `JetBrainsMono-Regular.ttf` | `e6fd0d7e91550b3ed2b735d4312474362c4716edc4fc0577a0f61ed782d5aed1` |
| `JetBrainsMono-Bold.ttf` | `d22c4f3821d725eb01210d278d95dfcfcaadc34699a06658d47c8a5cc5830ada` |
| `JetBrainsMono-Italic.ttf` | `6dc8e1322d4b2013b64e277bf66abc6748207c46a590471d4296876c2c235d0c` |
| `JetBrainsMono-BoldItalic.ttf` | `cec9b489af5c98a94cb8d8d8708ef1640cca0f296b207de1f50b2dd95e967bdf` |
| `OFL.txt` | `a76abf002c49097d146e86740a3105a5d00450b1592e820a1109a8c5680cd697` |
