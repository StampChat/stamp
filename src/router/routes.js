import store from '../store/index'

async function redirectIfNoProfile (to, from, next) {
  localStorage.clear()
  let address = await store.getters['myProfile/getMyProfile'].address
  console.log(address)
  if (address !== null) {
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

// Always leave this as last one
if (process.env.MODE !== 'ssr') {
  routes.push({
    path: '*',
    component: () => import('pages/Error404.vue')
  })
}

export default routes
