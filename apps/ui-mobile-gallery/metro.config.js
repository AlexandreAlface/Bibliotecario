const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../../'); // raiz do monorepo

const config = getDefaultConfig(projectRoot);

// ver o monorepo todo (inclui packages/)
config.watchFolders = [
  workspaceRoot,
  path.resolve(workspaceRoot, 'packages/ui-mobile'),
];

// garantir que React e RN vêm SEMPRE da raiz
config.resolver.nodeModulesPaths = [
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  react: path.resolve(workspaceRoot, 'node_modules/react'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
};

// symlinks estáveis (útil em workspaces)
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
