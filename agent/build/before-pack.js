"use strict";

// electron-builder 26.15.3 uses 7-Zip 24, but the bundled NSIS decoder
// cannot decode its BCJ2/ARM64 streams. They silently omit EXE/DLL files.
// https://github.com/electron-userland/electron-builder/issues/9983
module.exports = function beforePack(context) {
  if (context.electronPlatformName === "win32") {
    process.env.ELECTRON_BUILDER_7Z_FILTER = "BCJ";
  }
};
