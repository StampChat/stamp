/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://quasar.dev/quasar-cli/quasar-conf-js
/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const { configure } = require('quasar/wrappers')

// import { defineConfig } from 'vite';
const { NodeGlobalsPolyfillPlugin } = require('@esbuild-plugins/node-globals-polyfill');
const { NodeModulesPolyfillPlugin } = require('@esbuild-plugins/node-modules-polyfill');
const rollupNodePolyFill = require('rollup-plugin-node-polyfills')

module.exports = configure(function (ctx) {
  return {
    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://quasar.dev/quasar-cli/cli-documentation/boot-files
    boot: [
      'pinia',
      'i18n',
      'axios',
      'network-prefix',
      'setup-apis',
      ctx.mode.electron ? 'electron' : 'capacitor',
    ],

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-css
    css: ['dialogs.scss', 'dark-mode.scss', 'light-mode.scss', 'app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v5',
      // 'fontawesome-v5',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-framework
    framework: {
      iconSet: 'material-icons', // Quasar icon set
      lang: 'en-US', // Quasar language pack

      components: ['QSkeleton', 'QScrollObserver'],
      directives: [],

      // Quasar plugins
      plugins: ['Notify', 'Loading', 'Dialog'],
    },

    // https://quasar.dev/quasar-cli/cli-documentation/supporting-ie
    supportIE: false,

    // https://quasar.dev/quasar-cli/cli-documentation/supporting-ts
    supportTS: {
      tsCheckerConfig: {
        eslint: {
          enabled: true,
          files: './src/**/*.{ts,tsx,js,jsx,vue}',
        },
      },
    },

    // default values:
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router',
    //   store: 'src/store',
    //   indexHtmlTemplate: 'src/index.template.html',
    //   registerServiceWorker: 'src-pwa/register-service-worker.js',
    //   serviceWorker: 'src-pwa/custom-service-worker.js',
    //   electronMain: 'src-electron/electron-main.js',
    //   electronPreload: 'src-electron/electron-preload.js'
    // },

    // https://quasar.dev/quasar-cli/cli-documentation/prefetch-feature
    // preFetch: true

    // Full list of options: https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-build
    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node16'
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      // env: {},
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      // extendViteConf (viteConf) {},
      // viteVuePluginOptions: {},
      resolve: {
        alias: {
          // This Rollup aliases are extracted from @esbuild-plugins/node-modules-polyfill,
          // see https://github.com/remorses/esbuild-plugins/blob/master/node-modules-polyfill/src/polyfills.ts
          // process and buffer are excluded because already managed
          // by node-globals-polyfill
          util: 'rollup-plugin-node-polyfills/polyfills/util',
          sys: 'util',
          events: 'rollup-plugin-node-polyfills/polyfills/events',
          stream: 'rollup-plugin-node-polyfills/polyfills/stream',
          path: 'rollup-plugin-node-polyfills/polyfills/path',
          querystring: 'rollup-plugin-node-polyfills/polyfills/qs',
          punycode: 'rollup-plugin-node-polyfills/polyfills/punycode',
          url: 'rollup-plugin-node-polyfills/polyfills/url',
          string_decoder: 'rollup-plugin-node-polyfills/polyfills/string-decoder',
          http: 'rollup-plugin-node-polyfills/polyfills/http',
          https: 'rollup-plugin-node-polyfills/polyfills/http',
          os: 'rollup-plugin-node-polyfills/polyfills/os',
          assert: 'rollup-plugin-node-polyfills/polyfills/assert',
          constants: 'rollup-plugin-node-polyfills/polyfills/constants',
          _stream_duplex:
            'rollup-plugin-node-polyfills/polyfills/readable-stream/duplex',
          _stream_passthrough:
            'rollup-plugin-node-polyfills/polyfills/readable-stream/passthrough',
          _stream_readable:
            'rollup-plugin-node-polyfills/polyfills/readable-stream/readable',
          _stream_writable:
            'rollup-plugin-node-polyfills/polyfills/readable-stream/writable',
          _stream_transform:
            'rollup-plugin-node-polyfills/polyfills/readable-stream/transform',
          timers: 'rollup-plugin-node-polyfills/polyfills/timers',
          console: 'rollup-plugin-node-polyfills/polyfills/console',
          vm: 'rollup-plugin-node-polyfills/polyfills/vm',
          zlib: 'rollup-plugin-node-polyfills/polyfills/zlib',
          tty: 'rollup-plugin-node-polyfills/polyfills/tty',
          domain: 'rollup-plugin-node-polyfills/polyfills/domain',
          crypto: 'rollup-plugin-node-polyfills/polyfills/empty'
        },
      },
      optimizeDeps: {
        esbuildOptions: {
          // Node.js global to browser globalThis
          define: {
            global: 'globalThis',
          },
          // Enable esbuild polyfill plugins
          plugins: [
            NodeGlobalsPolyfillPlugin({
              process: true,
              buffer: true,
            }),
            NodeModulesPolyfillPlugin(),
          ],
        },
      },

      vitePlugins: [
        ['@intlify/vite-plugin-vue-i18n', {
          // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
          // compositionOnly: false,

          // you need to set i18n resource including paths !
          include: path.resolve(__dirname, './src/i18n/**')
        },],
        rollupNodePolyFill(),
      ]
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#devServer
    devServer: {
      // https: true
      open: true // opens browser window automatically
    },

    // animations: 'all', // --- includes all animations
    // https://quasar.dev/options/animations
    animations: [],

    // https://quasar.dev/quasar-cli/developing-ssr/configuring-ssr
    ssr: {
      pwa: false,
    },

    // https://quasar.dev/quasar-cli/developing-pwa/configuring-pwa
    pwa: {
      workboxPluginMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      workboxOptions: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      injectPwaMetaTags: true,
      useCredentialsForManifestTag: false,
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
      iosStatusBarPadding: true,
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-electron-apps/configuring-electron
    electron: {
      bundler: 'builder', // 'packager' or 'builder'

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: 'org.cashweb.stamp',
        extraFiles: [{ from: 'src-electron/icons', to: 'resources/icons' }],
        publish: [],

        linux: {
          category: 'Utility',
          target: 'AppImage',
          icon: 'src-electron/icons/linux-512x512.png',
        },
      },
    },
  }
})
