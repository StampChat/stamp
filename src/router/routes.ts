import type { RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { Store } from 'vuex'

export function createRoutes<S> (store: Store<S>): RouteRecordRaw[] {
  async function redirectIfNoProfile (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) {
    await ((store as unknown) as { restored: Promise<unknown> }).restored

    const profile = store.getters['myProfile/getProfile']
    if (profile.name) {
      next()
    } else {
      next('/setup')
    }
  }

  const routes: RouteRecordRaw[] = [
    {
      path: '/',
      component: () => import('layouts/MainLayout.vue'),
      children: [
        { path: '', component: () => import('pages/HomePage.vue') },
        { path: 'chat/:address', component: () => import('pages/Chat.vue') },
        { path: 'settings', component: () => import('pages/Settings.vue') },
        { path: 'profile', component: () => import('pages/Profile.vue') },
        { path: 'receive', component: () => import('pages/Receive.vue') },
        { path: 'send', component: () => import('pages/Send.vue') },
        { path: 'add-contact', component: () => import('pages/AddContact.vue') }
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
  return routes
}
