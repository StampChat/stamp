# IRCash

IRCash is a Bitcoin Cash powered internet relay chat.

**WARNING: IRCash is in early alpha development stage. There will be multiple breaking changes from now until a stable release. Running IRCash currently defaults to the Bitcoin Cash testnet as to protect against lost funds.**

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

### Android

## Usage
