# Packaging for Windows

## Build the installer

```bash
npm install
npm run package:win
```

The output is at `release/CityBuilder-Setup-<version>.exe`. It is an NSIS
installer (not one-click); the user can pick an install location, and the
app is installed per-user (no admin prompt required).

The packaging step bundles:

- `dist/` — the Vite web build
- `dist-electron/` — compiled Electron main + preload
- `content/` — the core content pack
- `mods/` — shipped as `extraResources` so users can drop new mods there

## From Linux

`electron-builder` downloads the Windows stub automatically; no Wine is
required to produce an unsigned NSIS installer. The binary is bit-identical
between Linux-produced and Windows-produced builds because the Windows stub
is the same pre-built blob.

## Code signing

The V1 installer is **unsigned**. On first launch Windows SmartScreen will
warn the user that the publisher is unknown; they can click "More info" →
"Run anyway". This is expected.

To sign, add to `electron/builder.config.cjs`:

```js
win: {
  target: [{ target: 'nsis', arch: ['x64'] }],
  certificateFile: process.env.WIN_CERT_FILE,
  certificatePassword: process.env.WIN_CERT_PASSWORD,
},
```

We will not ship a signed build until a real code-signing certificate is
available. Self-signed certs do not bypass SmartScreen's reputation check.

## Save and mod paths on Windows

- Saves: `%APPDATA%\City Builder\saves\`
- Mods:  `%APPDATA%\City Builder\mods\`

Both directories are created on first launch.

## Smoke test

After installing on a clean Windows VM:

1. Launch City Builder from the Start Menu.
2. The main window opens, loads core content, shows the tile grid.
3. Press `1`, click to place roads, then `2` to paint Dwellings.
4. Wait a few seconds with speed `2×`; buildings appear in the zone.
5. `Treasury` in the HUD updates each in-game month.

If all five happen, the build passes.
