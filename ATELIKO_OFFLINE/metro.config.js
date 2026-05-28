const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  resolver: {
    blockList: exclusionList([
      /android\/app\/build\/.*/,
      /android\/build\/.*/,
      /android\/\.gradle\/.*/,
      /\/tools\/.*/,
    ]),
  },
});
