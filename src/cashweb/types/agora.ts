
export type TextPost = {
  kind: 'post';
  title: string;
  url?: string;
  message?: string;
}

export type AgoraMessageEntry = TextPost;

export type AgoraMessage = {
  /// Lotus address of poster
  poster: string;
  topic: string;
  satoshis: number;
  entries: AgoraMessageEntry[];
  payloadDigest: string;
  parentDigest?: string;
}
