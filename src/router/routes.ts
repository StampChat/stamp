import { RouteConfig } from 'vue-router'
import store from '../store/index'

async function redirectIfNoProfile (to: any, from: any, next: any) {
  const name = await store.getters['myProfile/getProfile'].name
  if (name !== null) {
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
