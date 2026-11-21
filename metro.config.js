// Permite importar os modelos do Blender (.glb/.gltf) como assets.
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb', 'gltf', 'bin', 'hdr', 'ktx2');
module.exports = config;
