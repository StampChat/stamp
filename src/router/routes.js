import store from '../store/index'

async function redirectIfNoProfile (to, from, next) {
  let name = await store.getters['myProfile/getProfile'].name
  console.log('name', name)
  if (name !== null) {
    next()
  } else {
    next('/setup')
  }
}

const routes = [
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
