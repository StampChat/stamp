export async function pAll<T, FuncType extends () => Promise<T>>(
  queue: FuncType[],
  concurrency = 5,
) {
  let index = 0
  const results: T[] = []

  // Run a pseudo-thread
  const execThread = async () => {
    while (index < queue.length) {
      const curIndex = index++
      // Use of `curIndex` is important because `index` may change after await is resolved
      results[curIndex] = await queue[curIndex]()
    }
  }

  // Start threads
  const threads = []
  for (let thread = 0; thread < concurrency; thread++) {
    threads.push(execThread())
  }
  await Promise.all(threads)
  return results
}
