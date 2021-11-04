
export type TextPost = {
  kind: 'post';
  title: string;
  url?: string;
  message?: string;
}

export type SoapboxMessageEntry = TextPost;

export type SoapboxMessage = {
  /// Lotus address of poster
  poster: string;
  topic: string;
  satoshis: number;
  entries: SoapboxMessageEntry[];
  payloadDigest: string;
  parentDigest?: string;
  timestamp: Date;

  /// Filled in based on local processing
  replies?: SoapboxMessage[]
}
