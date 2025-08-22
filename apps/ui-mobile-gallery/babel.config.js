module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          '@bibliotecario/ui-mobile': '../../packages/ui-mobile/dist',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
      }],
      // 'react-native-reanimated/plugin', // se a tua lib usar Reanimated
    ],
  };
};
