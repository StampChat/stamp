import { Networks } from 'bitcore-lib-xpi'
import { boot } from 'quasar/wrappers'

export default boot(() => {
  // from https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/src/chainparams.cpp#L212
  const dnsSeeds = [
    'seed.bitcoinabc.org',
    'seeder.jasonbcox.com',
    'seed.deadalnix.me',
  ]

  const liveNetwork = {
    name: 'cash-livenet',
    alias: 'cash-mainnet',
    prefix: 'bitcoincash',
    pubkeyhash: 28,
    privatekey: 0x80,
    scripthash: 40,
    xpubkey: 0x0488b21e,
    xprivkey: 0x0488ade4,
    networkMagic: 0xe3e1f3e8,
    port: 8333,
    dnsSeeds: dnsSeeds,
  }

  // TODO: we need to clean this up.
  // There shouldn't need to be this additional prefix stuff.
  const testNetwork = {
    name: 'cash-testnet',
    prefix: 'bchtest',
    pubkeyhash: 0x6f,
    privatekey: 0xef,
    scripthash: 0xc4,
    xpubkey: 0x043587cf,
    xprivkey: 0x04358394,
    networkMagic: 0xf4e5f3f4,
    port: 18333,
    dnsSeeds: dnsSeeds,
  }

  Networks.add(testNetwork)
  Networks.add(liveNetwork)
})
