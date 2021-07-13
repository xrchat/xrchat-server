const esbuildPluginTsc = require('esbuild-plugin-tsc');

module.exports = {
  outDir: "./dist",
  esbuild: {
    target: "es2020",
    plugins: [
      esbuildPluginTsc(),
    ],
  },
};