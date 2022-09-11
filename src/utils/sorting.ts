import { MessageWithReplies } from 'src/stores/forum'

export const sortModes = <const>['hot', 'top', 'new']
export type SortMode = typeof sortModes[number]

export function halfLife(satoshis: number, timestamp: Date, now: Date) {
  const halvedAmount =
    satoshis *
    Math.pow(0.5, (now.valueOf() - timestamp.valueOf()) / (60 * 60 * 24 * 1000))
  return halvedAmount
}

export function halfLifeSort(posts: MessageWithReplies[]) {
  const now = new Date()
  return posts
    .slice()
    .sort(
      (a, b) =>
        halfLife(b.satoshis, new Date(b.timestamp), now) -
        halfLife(a.satoshis, new Date(a.timestamp), now),
    )
}

export function timeSort(posts: MessageWithReplies[]) {
  return posts.slice().sort((a, b) => {
    return new Date(b.timestamp).valueOf() - new Date(a.timestamp).valueOf()
  })
}

export function voteSort(posts: MessageWithReplies[]) {
  return posts.slice().sort((a, b) => b.satoshis - a.satoshis)
}

export function sortPostsByMode(
  posts: MessageWithReplies[],
  sortMode: SortMode,
) {
  switch (sortMode) {
    case 'hot':
      return halfLifeSort(posts)
    case 'top':
      return voteSort(posts)
    case 'new':
      return timeSort(posts)
    default:
      return halfLifeSort(posts)
  }
}
