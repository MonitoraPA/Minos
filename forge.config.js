const fs = require("fs");
const path = require("path");

module.exports = {
  packagerConfig: {
    icon: "./assets/icon",
    asar: true,
  },
  ignore: ["configurations", ""],
  hooks: {
    postPackage: async (forgeConfig, options) => {
      fs.copyFileSync(
        "./config/conf.json",
        path.join(options.outputPaths[0], "resources", "conf.json")
      );

      fs.copyFileSync(
        "./assets/icon.png",
        path.join(options.outputPaths[0], "icon.png")
      );

      if (options.spinner) {
        options.spinner.info(
          `Completed packaging for ${options.platform} / ${options.arch} at ${options.outputPaths[0]}`
        );
      }
    },
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
    },
    {
      name: "@electron-forge/maker-zip",
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        icon: "./assets/icon.png",
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        icon: "./assets/icon.png",
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        background: "./assets/dmg-background.png",
      },
    },
  ],
};
