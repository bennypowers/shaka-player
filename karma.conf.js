const { createDefaultConfig } = require('@open-wc/testing-karma');

const merge = require('deepmerge');

module.exports = config => {
  config.set(merge(createDefaultConfig(config), {
    ...config.autoWatch ? { mochaReporter: { output: 'autowatch' } } : {},
    files: [
      { pattern: config.grep ? config.grep : './shaka-player.test.js', type: 'module' },
    ],
    esm: {
      nodeResolve: true,
    },
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--autoplay-policy=no-user-gesture-required',
        ],
      },
    },
  }));
  return config;
};
