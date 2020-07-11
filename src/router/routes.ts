import { RouteConfig, Route } from 'vue-router'
import store from '../store/index'

function redirectIfNoProfile (to: Route, from: Route, next: (route?: string) => void) {
  const name = store.getters['myProfile/getProfile'].name
  console.log('Found', name)
  if (name) {
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
