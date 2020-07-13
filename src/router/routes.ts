import { RouteConfig, Route } from 'vue-router'
import store from '../store/index'

async function redirectIfNoProfile (to: Route, from: Route, next: (route?: string) => void) {
  // eslint-disable-next-line dot-notation
  await store['restored']
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
      { path: '', component: () => import('pages/Chat.vue') }
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
