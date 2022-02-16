// import Jimp from 'jimp'

export async function processInput (items: DataTransferItemList) {
  // const item = items.find(item => item.kind === 'file')
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    console.log(item)
    switch (item.kind) {
      case 'file': {
        if (item.type.includes('image')) {
          // TODO: use JIMP to shrink large image resolutions, standardize format, etc
          // const jimped = await Jimp.read()
          // return the first image that we find
          return item.getAsFile() || null
        }
        // can process other file types below
      }
    }
  }
}
