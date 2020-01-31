<h1 align="center">
  IRCash
</h1>

<p align="center">
  A Bitcoin Cash powered internet relay chat.
</p>

<p align="center">
  <a href="LICENSE">
    <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg">
  </a>
</p>

**WARNING: IRCash is in early alpha development stage. There will be multiple breaking changes from now until a stable release. We default to the Bitcoin Cash testnet as to protect against lost funds.**

### Install from Binary

TODO

## Build from Source

### Requirements

* [Protobuf compiler](https://github.com/protocolbuffers/protobuf)
* [Quasar](https://quasar.dev/start/pick-quasar-flavour)

### Cloning the Source

Clone this repository using

```bash
git clone https://github.com/cashweb/ircash.git
cd ircash
git submodules update --init --recursive
```

### Generating the Protobuf files

```bash
bash ./generate_protobufs.sh
```

### Linux, MacOS and Windows

```bash
quasar build -m electron
```

Your binary will be located in `/dist/ircash-{distribution}/` folder.

### Android

**Unstable**

```bash
quasar build -m capacitor -T android
```

### Android

**Unstable**

```bash
quasar build -m capacitor -T ios
```

## Usage

**TODO**
