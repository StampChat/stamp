import { ForumMessage } from 'src/cashweb/types/forum'

export const sortModes = <const>['hot', 'top', 'new']
export type SortMode = typeof sortModes[number]

export function halfLife(satoshis: number, timestamp: Date, now: Date) {
  const halvedAmount =
    satoshis *
    Math.pow(0.5, (now.valueOf() - timestamp.valueOf()) / (60 * 60 * 24 * 1000))
  return halvedAmount
}

export function halfLifeSort(posts: ForumMessage[]) {
  const now = new Date()
  return posts
    .slice()
    .sort(
      (a, b) =>
        halfLife(b.satoshis, b.timestamp, now) -
        halfLife(a.satoshis, a.timestamp, now),
    )
}

export function timeSort(posts: ForumMessage[]) {
  return posts
    .slice()
    .sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf())
}

export function voteSort(posts: ForumMessage[]) {
  return posts.slice().sort((a, b) => b.satoshis - a.satoshis)
}

export function sortPostsByMode(posts: ForumMessage[], sortMode: SortMode) {
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
