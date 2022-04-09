export async function processInput(items: DataTransferItemList) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
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
