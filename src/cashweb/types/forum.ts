export type TextPost = {
  kind: 'post'
  title: string
  url?: string
  message?: string
}

export type ForumMessageEntry = TextPost

export type ForumMessage = {
  /// Lotus address of poster
  poster: string
  topic: string
  satoshis: number
  entries: ForumMessageEntry[]
  payloadDigest: string
  parentDigest?: string
  timestamp: Date

  /// Filled in based on local processing
  replies?: ForumMessage[]
}
