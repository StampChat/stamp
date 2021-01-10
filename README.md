<h1 align="center">
  Holy Messenger
</h1>

<p align="center">
  A eCash powered cryptomessenger.
</p>

<p align="center">
  <a href="https://circleci.com/gh/cashweb/stamp">
    <img alt="Build Status" src="https://circleci.com/gh/cashweb/stamp.svg?style=svg">
  </a>

  <a href="LICENSE">
    <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg">
  </a>
</p>

**WARNING: Holy Messenger is in early alpha development stage. There will be multiple breaking changes from now until a stable release. We default to the eCash testnet as to protect against lost funds.**

## Install from Binary

1. Download the appropriate binary for your machine from the [latest releases](https://github.com/cashweb/stamp/releases).
2. Unzip your package.
3. Run it.

## Build from Source

### Requirements

* [Quasar](https://quasar.dev/start/pick-quasar-flavour)

### Cloning the Source

Clone this repository using

```bash
git clone https://github.com/cashweb/stamp.git
cd stamp
```

### Development Mode

Running the following command should run electron in development mode and watch the source files with hot reloading enabled:

```bash
yarn dev
```

### Linux, MacOS and Windows Builds

```bash
yarn install
yarn build
```

Your binary will be located in `/dist/electron/Packaged/` folder.

You may cross-platform compile to the following targets:

* `darwin`
* `mac`
* `win32`
* `win`
* `linux`


```bash
yarn install
quasar build -m electron -b builder -T {target here}
```

Note that one cannot cross-compile to MacOS and that building from Linux to Windows requires [Wine](https://www.winehq.org/).

More information can be found [here](https://www.electron.build/) and [here](https://quasar.dev/quasar-cli/developing-electron-apps/build-commands).

### Android

**Unstable**

```bash
quasar build -m capacitor -T android
```

### iOS

**Unstable**

```bash
quasar build -m capacitor -T ios
```

### Updating the generated protobuf files:

If the protobuf files need to change due to the addition of a new entry type, or some addition, the following commands will allow for the regeneration of these files. 
Please check them into the repo after they have been generated.

* [Protobuf compiler](https://github.com/protocolbuffers/protobuf)

```bash
git submodule update --init --recursive
yarn generate:protobuffers
```

## Usage

**TODO**
