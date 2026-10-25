# Bundled grammars

`@diagrist/code` highlights code with TextMate grammars that it ships in `src/grammars/*.json` and bundles into its
code, instead of depending on `@shikijs/langs`, which installs all of Shiki's two hundred grammars (8.4 MB) for the
six used here. The files are taken from the npm package [`tm-grammars`](https://www.npmjs.com/package/tm-grammars)
1.32.22 (MIT, by Anthony Fu), the collection `@shikijs/langs` 4.5.0 is built from, whose tarball has the SHA-256
`6d75b2699fe65499bfb81d7e002d79116f2e9d56c417d3fcdd128c239db9e1b1`. Each file is the grammar of that package written
on one line, `JSON.stringify(JSON.parse(text))`, so the data is unchanged and a diff stays small.

| File | Upstream source, at the commit `tm-grammars` names | Licence | SHA-256 in `tm-grammars` | SHA-256 here |
|---|---|---|---|---|
| `java.json` | [microsoft/vscode](https://github.com/microsoft/vscode/blob/3c86ede5f554f6e196c832394e126b291a1de606/extensions/java/syntaxes/java.tmLanguage.json) | MIT | `c2d622b901b19119f2b3469583ef50fe6998788c179c0d3bbd7a0eab019378cb` | `85bd6d026262a91a276921542e7936ac70fac5571fe2f82953fc59f2831ae1ee` |
| `kotlin.json` | [fwcd/vscode-kotlin](https://github.com/fwcd/vscode-kotlin/blob/626e20d5c51a4379c4c0ee293aa89e58b5232aec/syntaxes/kotlin.tmLanguage.json) | MIT | `df113ce9452b3938bdee7a18e88f688eb7eb2023607e62dbad46e756c68f7729` | `25e2965834c1c83599b250ffba13da84fae30817d3d13c819108ad750c85ea73` |
| `sql.json` | [microsoft/vscode](https://github.com/microsoft/vscode/blob/af600487b1e94374d9f48f57cbf2cad24656b07f/extensions/sql/syntaxes/sql.tmLanguage.json) | MIT | `a79bd625f928c0c2297ee4d96248b30c357e7c33aba8d6cb8d41d6ae801c8758` | `59d4a33c8a11299d0cf2c7e4e100147eb30d652aa7b4f390803dc05ce5220930` |
| `yaml.json` | [textmate/yaml.tmbundle](https://github.com/textmate/yaml.tmbundle/blob/e54ceae3b719506dba7e481a77cea4a8b576ae46/Syntaxes/YAML.tmLanguage) | TextMate bundle licence | `960c376ae415e3258da44b8afe603828c919a2d6efbf8072b26b744246116542` | `afd37585a91a49f79907ae8ed550ebebe8b87a9c5ca8e6e42095d4eeaeae579c` |
| `json.json` | [microsoft/vscode](https://github.com/microsoft/vscode/blob/d6af4893ed9a3545163a4cb748fa5548bd1e51a5/extensions/json/syntaxes/JSON.tmLanguage.json) | MIT | `f726cfcd953e00567c714a93c15a6227ef7bdb92c939cb07217e036ef5716dc0` | `e0b2e1bd5d70c012b060980cd2bc9dbc9735540e2409e1b233d6e67219c7f166` |
| `xml.json` | [microsoft/vscode](https://github.com/microsoft/vscode/blob/10a1d2a50a2882f5ae85bdb51eb04d3064fb9de9/extensions/xml/syntaxes/xml.tmLanguage.json) | MIT | `4432e3aa5974256559326a692830cc5b375a21aac895de739e8b0a73a396edf6` | `83a1545a8d7a55950fdf6c1d01919676039187b24ce7b0ead918b241d1504ea7` |

## Licences

### Java, SQL, JSON and XML: Visual Studio Code

```
MIT License

Copyright (c) 2015 - present Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Kotlin: vscode-kotlin

```
The MIT License (MIT)

Copyright (c) 2016 George Fraser
Copyright (c) 2018 fwcd

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### YAML: TextMate bundle

The repository has no licence file; its README states the licence of its files:

```
Permission to copy, use, modify, sell and distribute this
software is granted. This software is provided "as is" without
express or implied warranty, and with no claim as to its
suitability for any purpose.
```

### The collection: tm-grammars

```
MIT License

Copyright (c) 2021 Pine Wu
Copyright (c) 2023 Anthony Fu <https://github.com/antfu>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
