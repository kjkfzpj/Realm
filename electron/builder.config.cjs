/**
 * electron-builder configuration for the Windows NSIS installer.
 *
 * Produces a standard unsigned .exe. Code signing is deferred until a real
 * certificate is in hand; Windows SmartScreen will warn on first launch in
 * the meantime. See docs/packaging.md.
 */
module.exports = {
  appId: 'app.citybuilder.v1',
  productName: 'City Builder',
  directories: {
    output: 'release',
    buildResources: 'assets',
  },
  asar: true,
  files: [
    'dist-electron/**/*',
    'dist/**/*',
    'content/**/*',
    'package.json',
    '!**/*.map',
  ],
  extraResources: [
    // Ship empty mods folder so installs have somewhere for the user to drop mods.
    { from: 'mods', to: 'mods', filter: ['**/*', '!node_modules'] },
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    artifactName: 'CityBuilder-Setup-${version}.${ext}',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: false,
    deleteAppDataOnUninstall: false,
  },
};
