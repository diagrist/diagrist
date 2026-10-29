---
title: Live editor and embedding
description: Write a diagram in the browser at live.diagrist.com, share it as a link and embed it in Confluence or any page with an iframe.
---

The [live editor](https://live.diagrist.com/) shows the code on the left and the picture on the right, drawn again
as you type. Findings appear below the code and as marks in it, with the same codes and texts as `dgr check`. Every
kind of the docs can be drawn, and **Examples** loads any example of the [gallery](/gallery/) that needs no other
files.

The picture fits the pane until you zoom: drag it to move it, hold Ctrl (or pinch) and use the wheel to zoom at the
pointer, or use the buttons below it. While the code does not have the focus, `+` and `-` zoom, `0` fits and `1` shows the actual
size. Drag the line between the panes, or focus it and use the arrow keys, to give the code more or less room. On a
narrow screen, **Source** and **Picture** switch between the two.

## Nothing reaches a server

The editor compiles in your browser, in a Web Worker, and draws the PNG there too, with resvg compiled to
WebAssembly. The source is kept in the address, behind the `#`: compressed with deflate and written as base64url,
like `https://live.diagrist.com/#v1:…`. Browsers never send the part after the `#` to a server, not even as the
referrer, so the diagram stays on your machine. Nothing is stored but the width of the panes, in your browser, and there are no accounts and no analytics.

The address is the document. Bookmark it, put it in a ticket or send it to a colleague, and the diagram opens as
you left it. The PNG and SVG the editor downloads are the same bytes the command line writes.

## Share and download

The bar above the editor has these buttons:

| Button | What it does |
|---|---|
| Copy link | Copies the address with the source, to share the diagram. |
| Embed | Opens the address and the HTML for an iframe, see below. |
| Download | The picture as SVG or PNG, or the source as `.dgr`, to keep it next to your code and build it with `dgr`. |

## Embed a diagram

Every diagram has a second address, `https://live.diagrist.com/embed#v1:…`, that shows only the picture, scaled to
the frame, with a link back to the editor. **Embed** gives you that address and an HTML snippet:

```html
<iframe src="https://live.diagrist.com/embed#v1:…" title="Sign in" width="100%" height="480" style="border:0"></iframe>
```

In Confluence, type `/iframe`, paste the address and set a height. Any other page that allows iframes takes the
HTML as it is. Only the embed page may be framed by other sites; the editor itself may not.

The embedded picture is drawn in the reader's browser from the address, so it changes only when you replace the
address. To change a diagram, open it with the link below the picture, edit it, and embed the new address.
