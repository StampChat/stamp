import { RouteConfig, Route } from 'vue-router'
import store from '../store'

async function redirectIfNoProfile (to: Route, from: Route, next: (route?: string) => void) {
  // TODO: Fix this
  await ((store as unknown) as { restored: Promise<unknown> }).restored

  const profile = store.getters['myProfile/getProfile']
  if (profile.name) {
    next()
  } else {
    next('/setup')
  }
}

const routes: RouteConfig[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/HomePage.vue') },
      { path: 'chat/:address', component: () => import('pages/Chat.vue') },
      { path: 'settings', component: () => import('pages/Settings.vue') }
    ],
    beforeEnter: redirectIfNoProfile
  },
  {
    path: '/setup',
    component: () => import('layouts/SetupLayout.vue'),
    children: [
      { path: '', component: () => import('pages/Setup.vue') }
    ]
  }
]

export default routes
