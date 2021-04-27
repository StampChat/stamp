import Router from 'vue-router'

export const settingsRoutes = [
  '/settings',
  '/profile',
  '/receive',
  '/send',
  '/add-contact'
]

export function openPage (router: Router, currentRoute: string, route: string) {
  for (const settingsRoute of settingsRoutes) {
    if (currentRoute.startsWith(settingsRoute)) {
      return router.replace(route)
    }
  }
  return router.push(route)
}
