import type { Router } from 'vue-router'

export const settingsRoutes = [
  '/settings',
  '/profile',
  '/receive',
  '/send',
  '/add-contact',
]

export function openPage(router: Router, route: string) {
  const currentRoute = router.currentRoute.value.path
  for (const settingsRoute of settingsRoutes) {
    if (currentRoute.startsWith(settingsRoute)) {
      return router.replace(route)
    }
  }
  return router.push(route)
}

export function openChat(router: Router, address: string) {
  const chatRoute = `/chat/${address}`
  return openPage(router, chatRoute)
}
