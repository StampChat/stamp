import type { RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { Store } from 'vuex'

const unprotectedRoutes = ['/home', '/setup', '/changelog']

export function createRoutes<S> (store: Store<S>): RouteRecordRaw[] {
  async function redirectIfNoProfile (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) {
    await ((store as unknown) as { restored: Promise<unknown> }).restored

    const profile = store.getters['myProfile/getProfile']
    console.log('Navigating to ', to.fullPath)
    if (profile.name || unprotectedRoutes.includes(to.fullPath)) {
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
        { path: 'home', component: () => import('pages/HomePage.vue') },
        { path: 'changelog', component: () => import('pages/Changelog.vue') },
        { path: 'chat/:address', component: () => import('pages/Chat.vue') },
        { path: 'settings', component: () => import('pages/Settings.vue') },
        { path: 'profile', component: () => import('pages/Profile.vue') },
        { path: 'receive', component: () => import('pages/Receive.vue') },
        { path: 'send', component: () => import('pages/Send.vue') },
        { path: 'add-contact', component: () => import('pages/AddContact.vue') },
        { path: 'setup', component: () => import('pages/Setup.vue') }
      ],
      beforeEnter: redirectIfNoProfile
    }
  ]
  return routes
}
