# IRCash

IRCash is a Bitcoin Cash powered internet relay chat.

**WARNING: IRCash is in alpha development stage. There will be multiple breaking changes from now until a stable release and reserve the right to do so. Running IRCash defaults to the Bitcoin Cash testnet. If you decide to fork and change this default expect to lose funds.**

### Installation from Binary

### Linux

### MacOS

### Windows

### Android

## Build from Source

### Requirements

* [Protobuf compiler](https://github.com/protocolbuffers/protobuf)
* [Quasar](https://quasar.dev/start/pick-quasar-flavour)

Clone this repository using

```bash
git clone https://github.com/cashweb/ircash.git
cd ircash
git submodules update --init --recursive
```

### Linux

Generate the protobuf files from their schema

```bash
bash ./generate_protobufs.sh
```

Build the Electron application via

```bash
quasar build -m electron
```

### MacOS

### Windows

### Android

## Usage
