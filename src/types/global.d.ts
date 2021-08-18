
export { }

export interface Badge {
  updateBadge: (increment: number) => void
  setBadgeCount: (badgeCount: number) => void
}

export interface External {
  open: (url: string) => void
}

declare global {
  interface Window {
    badge: Badge;
    url: External;
  }
}
