# Bundled fonts

The kernel measures text with tables generated from these files (`src/font-metrics.ts`, `src/inter-*.ts`,
`src/geist-*.ts`, ADR 0013 and 0022), and rasterizers such as `@diagrist/export-png` set text with them. The files
are the upstream release files, unchanged. All families are under the SIL Open Font License 1.1, whose text ships
next to them.

| Family | Source | Release | Licence file |
|---|---|---|---|
| JetBrains Mono | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) | 2.305 | `OFL.txt` |
| Inter | [rsms/inter](https://github.com/rsms/inter) | v4.1, commit `e3a3d4c57d5ecc01453a575621882a384c1995a3`, `Inter-4.1.zip`, folder `extras/ttf` | `OFL-Inter.txt` |
| Geist, Geist Mono | [vercel/geist-font](https://github.com/vercel/geist-font) | v1.8.2, commit `1d6dfdb6e58c0ddd841c1e24e59aef01ec3916e4`, `geist-font-v1.8.2.zip`, folders `Geist/ttf` and `GeistMono/ttf` | `OFL-Geist.txt` |

The zip of Inter 4.1 has the SHA-256 `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e`. Only the
static TrueType faces of the two weights the looks use are bundled, since resvg reads TrueType and OpenType but no
WOFF2, and a variable font would need its instances resolved for the advance tables.

The zip of Geist 1.8.2 has the SHA-256 `43ffb66912b1c49e40c371d96e86b3b3dab42db83eb2d0c8a17321210394c4c7`. Geist
Regular and SemiBold set names and texts of `look=panel`, Geist Mono Regular its protocols and flow numbers; the
glyphs of Geist Mono are equally wide at every weight, so one face measures them all.

| File | SHA-256 |
|---|---|
| `Inter-Regular.ttf` | `40d692fce188e4471e2b3cba937be967878f631ad3ebbbdcd587687c7ebe0c82` |
| `Inter-SemiBold.ttf` | `78a843fade9d4612a5567302fb595b56976eb5fcebf4fea5a5912d638bafcde3` |
| `OFL-Inter.txt` | `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a` |
| `Geist-Regular.ttf` | `6a5d5f9e7dcd8933883cdcb6c76eb99a1d4bae852d6ada979683b573af6adec9` |
| `Geist-SemiBold.ttf` | `a690e797cf4addbdc7233ff6f1fb8d726a007a38807c5d797cfa2379cab321ac` |
| `GeistMono-Regular.ttf` | `2c01278ad859e862b39d1f618c2272dfd0df7c23d5aab37ff7062cdd615abf83` |
| `OFL-Geist.txt` | `c683bfbcc7e087f5d37a54ef628f10387c451a83ddc459b151403a164ac46c90` |
| `JetBrainsMono-Regular.ttf` | `e6fd0d7e91550b3ed2b735d4312474362c4716edc4fc0577a0f61ed782d5aed1` |
| `JetBrainsMono-Bold.ttf` | `d22c4f3821d725eb01210d278d95dfcfcaadc34699a06658d47c8a5cc5830ada` |
| `JetBrainsMono-Italic.ttf` | `6dc8e1322d4b2013b64e277bf66abc6748207c46a590471d4296876c2c235d0c` |
| `JetBrainsMono-BoldItalic.ttf` | `cec9b489af5c98a94cb8d8d8708ef1640cca0f296b207de1f50b2dd95e967bdf` |
| `OFL.txt` | `a76abf002c49097d146e86740a3105a5d00450b1592e820a1109a8c5680cd697` |
