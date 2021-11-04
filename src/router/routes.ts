import type { RouteRecordRaw } from 'vue-router'

export function createRoutes (): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [
    {
      path: '/',
      redirect: '/agora',
      component: () => import('layouts/MainLayout.vue'),
      children: [
        {
          path: 'soapbox',
          component: () => import('layouts/SoapboxLayout.vue'),
          children: [
            { path: '', component: () => import('pages/Soapbox.vue') },
            { path: ':payloadDigest', component: () => import('pages/SoapboxPost.vue') },
            { path: '/new-post', component: () => import('pages/CreatePost.vue') },
            { path: '/new-post/:parentDigest', component: () => import('pages/CreatePost.vue') }
          ]
        },
        { path: 'agora', redirect: '/soapbox' },
        { path: 'changelog', component: () => import('pages/Changelog.vue') },
        { path: 'chat/:address', component: () => import('pages/Chat.vue') },
        { path: 'settings', component: () => import('pages/Settings.vue') },
        { path: 'profile', component: () => import('pages/Profile.vue') },
        { path: 'receive', component: () => import('pages/Receive.vue') },
        { path: 'send', component: () => import('pages/Send.vue') },
        { path: 'add-contact', component: () => import('pages/AddContact.vue') },
        { path: 'setup', component: () => import('pages/Setup.vue') },
        { path: 'wipe-wallet', component: () => import('pages/WipeWallet.vue') }
      ]
    }
  ]
  return routes
}
