// Converte import.meta (usado por libs 3D/estado) para o Expo Web não quebrar.
module.exports = function (api) {
  api.cache(true);
  return { presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]] };
};
