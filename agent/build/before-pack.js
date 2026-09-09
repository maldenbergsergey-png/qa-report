"use strict";

// electron-builder 26.15.3 uses 7-Zip 24, but the bundled NSIS decoder
// cannot decode its BCJ2/ARM64 streams. They silently omit EXE/DLL files.
// https://github.com/electron-userland/electron-builder/issues/9983
module.exports = function beforePack(context) {
  const { Arch } = require("builder-util");
  if (!(context.electronPlatformName === "darwin" && context.arch === Arch.arm64 || context.electronPlatformName === "win32" && context.arch === Arch.x64)) {
    throw new Error("Supported agent platforms: macOS Apple Silicon and Windows x64");
  }
  if (context.electronPlatformName === "win32") {
    process.env.ELECTRON_BUILDER_7Z_FILTER = "BCJ";
  }
};
