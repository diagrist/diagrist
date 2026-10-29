---
title: Live editor and embedding
description: Write a diagram in the browser at live.diagrist.com, share it as a link and embed it in Confluence or any page with an iframe.
---

The [live editor](https://live.diagrist.com/) shows the code on the left and the picture on the right, drawn again
as you type. Findings appear below the code and as marks in it, with the same codes and texts as `dgr check`. Every
kind of the docs can be drawn.

## Nothing reaches a server

The editor compiles in your browser, in a Web Worker, and draws the PNG there too, with resvg compiled to
WebAssembly. The source is kept in the address, behind the `#`: compressed with deflate and written as base64url,
like `https://live.diagrist.com/#v1:…`. Browsers never send the part after the `#` to a server, not even as the
referrer, so the diagram stays on your machine. Nothing is stored, and there are no accounts and no analytics.

The address is the document. Bookmark it, put it in a ticket or send it to a colleague, and the diagram opens as
you left it. The PNG and SVG the editor downloads are the same bytes the command line writes.

## Share and download

The bar above the editor has these buttons (the editor speaks German for now):

| Button | What it does |
|---|---|
| Link kopieren | Copies the address with the source, to share the diagram. |
| Einbetten | Opens the address and the HTML for an iframe, see below. |
| SVG, PNG | Download the picture. |
| .dgr | Downloads the source, to keep it next to your code and build it with `dgr`. |

## Embed a diagram

Every diagram has a second address, `https://live.diagrist.com/embed#v1:…`, that shows only the picture, scaled to
the frame, with a link back to the editor. **Einbetten** gives you that address and an HTML snippet:

```html
<iframe src="https://live.diagrist.com/embed#v1:…" title="Sign in" width="100%" height="480" style="border:0"></iframe>
```

In Confluence, type `/iframe`, paste the address and set a height. Any other page that allows iframes takes the
HTML as it is. Only the embed page may be framed by other sites; the editor itself may not.

The embedded picture is drawn in the reader's browser from the address, so it changes only when you replace the
address. To change a diagram, open it with the link below the picture, edit it, and embed the new address.
