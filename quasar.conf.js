/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://quasar.dev/quasar-cli/quasar-conf-js
/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const { configure } = require("quasar/wrappers");

module.exports = configure(function (ctx) {
  return {
    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://quasar.dev/quasar-cli/cli-documentation/boot-files
    boot: [
      "i18n",
      "axios",
      "network-prefix",
      "setup-apis",
      ctx.mode.electron ? "electron" : "capacitor",
    ],

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-css
    css: ["dialogs.scss", "dark-mode.scss", "light-mode.scss", "app.scss"],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v5',
      // 'fontawesome-v5',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      "roboto-font", // optional, you are not bound to it
      "material-icons", // optional, you are not bound to it
    ],

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-framework
    framework: {
      iconSet: "material-icons", // Quasar icon set
      lang: "en-US", // Quasar language pack

      components: ["QSkeleton", "QScrollObserver"],
      directives: [],

      // Quasar plugins
      plugins: ["Notify", "Loading", "Dialog"],
    },

    // https://quasar.dev/quasar-cli/cli-documentation/supporting-ie
    supportIE: false,

    // https://quasar.dev/quasar-cli/cli-documentation/supporting-ts
    supportTS: {
      tsCheckerConfig: {
        eslint: {
          enabled: true,
          files: "./src/**/*.{ts,tsx,js,jsx,vue}",
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
      // this is a configuration passed on
      // to the underlying Webpack
      devtool: "source-map",

      vueRouterMode: "hash", // available values: 'hash', 'history'

      // rtl: false, // https://quasar.dev/options/rtl-support
      // preloadChunks: true,
      // showProgress: false,
      // gzip: true,
      // analyze: true,

      // Options below are automatically set depending on the env, set them if you want to override
      // extractCSS: false,

      // https://quasar.dev/quasar-cli/cli-documentation/handling-webpack
      chainWebpack(chain) {
        const nodePolyfillWebpackPlugin = require("node-polyfill-webpack-plugin");
        chain.plugin("node-polyfill").use(nodePolyfillWebpackPlugin);
        // example for its content (adds linting)
        const ESLintPlugin = require("eslint-webpack-plugin");
        chain
          .plugin("eslint-webpack-plugin")
          .use(ESLintPlugin, [{ extensions: ["js"] }]);
      },

      extendWebpack(cfg) {
        cfg.resolve.modules = [
          path.resolve(__dirname, "local_modules"),
          ...cfg.resolve.modules,
        ];
        // linting is slow in TS projects, we execute it only for production builds
        cfg.resolve.fallback = {
          fs: false,
          tls: false,
          net: false,
        };

        if (ctx.prod) {
          // Ensure we are copying our local_modules folder into place
          // before yarn install --production runs. Otherwise, we
          // will have issues.
          const CopyWebpackPlugin = require("copy-webpack-plugin");
          cfg.plugins.push(
            new CopyWebpackPlugin({
              patterns: [
                {
                  from: "local_modules",
                  to: path.join(cfg.output.path, "local_modules"),
                },
              ],
            })
          );

          cfg.module.rules.push({
            test: /\.xpriv_generate\.js$/,
            loader: "worker-loader",
            exclude: /node_modules/,
          });
        }
      },
    },

    // Full list of options: https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-devServer
    devServer: {
      https: false,
      port: 8080,
      open: true, // opens browser window automatically
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
      workboxPluginMode: "GenerateSW", // 'GenerateSW' or 'InjectManifest'
      workboxOptions: {}, // only for GenerateSW
      manifest: {
        name: "Stamp",
        short_name: "Stamp",
        description: " A Lotus powered internet cryptomessenger",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#027be3",
        icons: [
          {
            src: "icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-256x256.png",
            sizes: "256x256",
            type: "image/png",
          },
          {
            src: "icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
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
      bundler: "builder", // 'packager' or 'builder'

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: "org.cashweb.stamp",
        extraFiles: [{ from: "src-electron/icons", to: "resources/icons" }],
        publish: {
          provider: "github",
        },

        win: {
          target: "zip,tar.gz",
          icon: "src-electron/icons/linux-512x512.png",
        },

        linux: {
          category: "Utility",
          target: "AppImage,snap",
          icon: "src-electron/icons/linux-512x512.png",
        },
      },

      // More info: https://quasar.dev/quasar-cli/developing-electron-apps/node-integration

      extendWebpackMain(cfg) {},

      extendWebpackPreload(cfg) {},
    },
  };
});
