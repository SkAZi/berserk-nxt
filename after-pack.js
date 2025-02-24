const { Arch, Platform } = require("electron-builder")
const fs = require("fs/promises")
const path = require("path")
const { exec } = require("child_process")

const author = "Developer ID Application: Igor Potapov (2AC4L7R5YG)"
exports.default = async function (context) {
  if (context.packager.platform === Platform.MAC) {
    const copy_to = path.resolve(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources", "app.asar.unpacked", "resources");
    if(Arch[context.arch] === 'arm64') {
      console.log("  • Signing extra resource:", copy_to)
      await fs.copyFile("./ai/lib/mac-arm64/lib_lightgbm.dylib", `${copy_to}/lib_lightgbm.dylib`)
      await fs.copyFile("./ai/lib/mac-arm64/libomp.dylib", `${copy_to}/libomp.dylib`)
      await exec(`codesign --deep --force --sign "${author}" "${copy_to}/libomp.dylib"`)
      await exec(`install_name_tool -change @rpath/libomp.dylib ./libomp.dylib "${copy_to}/lib_lightgbm.dylib"`)
      await exec(`codesign --deep --force --sign "${author}" "${copy_to}/lib_lightgbm.dylib"`)
    } else {
      console.log("  • Signing extra resource:", copy_to)
      await fs.copyFile("./ai/lib/mac/lib_lightgbm.dylib", `${copy_to}/lib_lightgbm.dylib`)
      await fs.copyFile("./ai/lib/mac/libomp.dylib", `${copy_to}/libomp.dylib`)
      await exec(`codesign --deep --force --sign "${author}" "${copy_to}/libomp.dylib"`)
      await exec(`install_name_tool -change @rpath/libomp.dylib ./libomp.dylib "${copy_to}/lib_lightgbm.dylib"`)
      await exec(`codesign --deep --force --sign "${author}" "${copy_to}/lib_lightgbm.dylib"`)
    }
  } else if (context.packager.platform === Platform.WINDOWS) {
    const copy_to = path.resolve(context.appOutDir, "resources", "app.asar.unpacked", "resources");
    console.log("  • Signing extra resource:", copy_to)
    await fs.copyFile("./ai/lib/windows/lib_lightgbm.dll", `${copy_to}/lib_lightgbm.dll`)
    await fs.rename(`${copy_to}/server`, `${copy_to}/server.exe`)
  } else if (context.packager.platform === Platform.LINUX) {
    const copy_to = path.resolve(context.appOutDir, "resources", "app.asar.unpacked", "resources");
    console.log("  • Signing extra resource:", copy_to)
    await fs.copyFile("./ai/lib/linux/lib_lightgbm.so.1", `${copy_to}/lib_lightgbm.so.1`)
    await fs.copyFile("./ai/lib/linux/libomp.so.1", `${copy_to}/libomp.so.1`)
  }
}
