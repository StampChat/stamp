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

module.exports = configure(function (ctx) {
  return {
    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://quasar.dev/quasar-cli/cli-documentation/boot-files
    boot: [
      'composition-api',
      'i18n',
      'axios',
      'network-prefix',
      'setup-apis',
      ctx.mode.electron ? 'electron' : 'capacitor'
    ],

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-css
    css: [
      'dialogs.scss',
      'dark-mode.scss',
      'light-mode.scss',
      'app.scss'
    ],

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
      'material-icons' // optional, you are not bound to it
    ],

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-framework
    framework: {
      iconSet: 'material-icons', // Quasar icon set
      lang: 'en-us', // Quasar language pack

      // Possible values for "all":
      // * 'auto' - Auto-import needed Quasar components & directives
      //            (slightly higher compile time; next to minimum bundle size; most convenient)
      // * false  - Manually specify what to import
      //            (fastest compile time; minimum bundle size; most tedious)
      // * true   - Import everything from Quasar
      //            (not treeshaking Quasar; biggest bundle size; convenient)
      importStrategy: 'auto',

      components: ['QSkeleton', 'QScrollObserver'],
      directives: [],

      // Quasar plugins
      plugins: ['Notify', 'Loading', 'Dialog']
    },

    // https://quasar.dev/quasar-cli/cli-documentation/supporting-ie
    supportIE: false,

    // https://quasar.dev/quasar-cli/cli-documentation/supporting-ts
    supportTS: {
      tsCheckerConfig: { eslint: true }
    },

    // https://quasar.dev/quasar-cli/cli-documentation/prefetch-feature
    // preFetch: true

    // Full list of options: https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-build
    build: {
      // this is a configuration passed on
      // to the underlying Webpack
      devtool: 'eval-source-map',

      vueRouterMode: 'hash', // available values: 'hash', 'history'

      // rtl: false, // https://quasar.dev/options/rtl-support
      // preloadChunks: true,
      // showProgress: false,
      // gzip: true,
      // analyze: true,

      // Options below are automatically set depending on the env, set them if you want to override
      // extractCSS: false,

      // https://quasar.dev/quasar-cli/cli-documentation/handling-webpack
      extendWebpack (cfg) {
        cfg.resolve.modules = [path.resolve(__dirname, 'local_modules'), ...cfg.resolve.modules]
        // linting is slow in TS projects, we execute it only for production builds
        if (ctx.prod) {
          // Ensure we are copying our local_modules folder into place
          // before yarn install --production runs. Otherwise, we
          // will have issues.
          const CopyWebpackPlugin = require('copy-webpack-plugin')
          cfg.plugins.push(
            new CopyWebpackPlugin({
              patterns: [
                {
                  from: 'local_modules',
                  to: path.join(cfg.output.path, 'local_modules')
                }
              ]
            })
          )
          cfg.module.rules.push({
            enforce: 'pre',
            test: /\.(js|vue)$/,
            loader: 'eslint-loader',
            exclude: /node_modules/,
            options: {
              formatter: require('eslint').CLIEngine.getFormatter('stylish')
            }
          })
          cfg.module.rules.push({
            test: /\.xpriv_generate\.js$/,
            loader: 'worker-loader',
            exclude: /node_modules/
          })
        }
      }
    },

    // Full list of options: https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-devServer
    devServer: {
      https: false,
      port: 8080,
      vueDevtools: true,
      open: true // opens browser window automatically
      
    },

    // animations: 'all', // --- includes all animations
    // https://quasar.dev/options/animations
    animations: [],

    // https://quasar.dev/quasar-cli/developing-ssr/configuring-ssr
    ssr: {
      pwa: false
    },

    // https://quasar.dev/quasar-cli/developing-pwa/configuring-pwa
    pwa: {
      workboxPluginMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      workboxOptions: {}, // only for GenerateSW
      manifest: {
        name: 'Stamp',
        short_name: 'Stamp',
        description: ' A Lotus powered internet cryptomessenger',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#027be3',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
      iosStatusBarPadding: true
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-electron-apps/configuring-electron
    electron: {
      bundler: 'builder', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options

        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',

        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: 'org.cashweb.stamp',
        extraFiles: [
          { from: 'src-electron/icons', to: 'resources/icons' }
        ],
        publish: []
      },

      // More info: https://quasar.dev/quasar-cli/developing-electron-apps/node-integration
      nodeIntegration: true,

      extendWebpack (/* cfg */) {
        // do something with Electron main process Webpack cfg
        // chainWebpack also available besides this extendWebpack
      }
    }
  }
})
