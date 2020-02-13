<h1 align="center">
  IRCash
</h1>

<p align="center">
  A Bitcoin Cash powered internet relay chat.
</p>

<p align="center">
  <a href="https://circleci.com/gh/cashweb/ircash">
    <img alt="Build Status" src="https://circleci.com/gh/cashweb/ircash.svg?style=svg">
  </a>

  <a href="LICENSE">
    <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg">
  </a>
</p>

**WARNING: IRCash is in early alpha development stage. There will be multiple breaking changes from now until a stable release. We default to the Bitcoin Cash testnet as to protect against lost funds.**

## Install from Binary

1. Download the appropriate binary for your machine from the [latest releases](https://github.com/cashweb/ircash/releases).
2. Unzip your package.
3. Run it.

## Build from Source

### Requirements

* [Protobuf compiler](https://github.com/protocolbuffers/protobuf)
* [Quasar](https://quasar.dev/start/pick-quasar-flavour)

### Cloning the Source

Clone this repository using

```bash
git clone https://github.com/cashweb/ircash.git
cd ircash
git submodule update --init --recursive
```

### Generating the Protobuf files

```bash
bash ./generate_protobufs.sh
```

### Linux, MacOS and Windows

```bash
yarn install
quasar build -m electron -b builder
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

## Usage

**TODO**
