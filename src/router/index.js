import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import AdminLogin from '../views/admin/AdminLogin.vue'
import DevLogin from '../views/dev/DevLogin.vue'
import { enableDevPreview, isDevPreviewAvailable, isDevPreviewEnabled } from '../utils/devPreviewMode'
import { enableAdminPreview, isAdminPreviewAvailable, isAdminPreviewEnabled } from '../utils/adminPreviewMode'

const routes = [
  {
    path: '/',
    component: HomePage
  },
  {
    path: '/admin/preview',
    component: AdminLogin,
    beforeEnter: (to, from, next) => {
      if (!isAdminPreviewAvailable()) { next('/admin/login'); return }
      localStorage.removeItem('adminToken')
      enableAdminPreview()
      next({ path: '/admin/dashboard', query: to.query })
    }
  },
  {
    path: '/admin/login',
    component: AdminLogin,
    beforeEnter: (to, from, next) => {
      if (localStorage.getItem('adminToken') || isAdminPreviewEnabled()) {
        next('/admin/dashboard')
      } else {
        next()
      }
    }
  },
  {
    path: '/admin/dashboard',
    component: () => import(/* webpackChunkName: "owner-dashboard" */ '../views/admin/AdminDashboard.vue'),
    beforeEnter: (to, from, next) => {
      if (localStorage.getItem('adminToken') || isAdminPreviewEnabled()) {
        next()
      } else {
        next('/admin/login')
      }
    }
  },
  {
    path: '/admin',
    redirect: '/admin/login'
  },
  // ── Developer portal ─────────────────────────────────────────────────────
  {
    path: '/dev/preview',
    component: DevLogin,
    beforeEnter: (to, from, next) => {
      if (!isDevPreviewAvailable()) {
        next('/dev/login')
        return
      }
      localStorage.removeItem('devToken')
      enableDevPreview()
      next('/dev/dashboard')
    }
  },
  {
    path: '/dev/login',
    component: DevLogin,
    beforeEnter: (to, from, next) => {
      if (localStorage.getItem('devToken') || isDevPreviewEnabled()) {
        next('/dev/dashboard')
      } else {
        next()
      }
    }
  },
  {
    path: '/dev/dashboard',
    component: () => import(/* webpackChunkName: "developer-dashboard" */ '../views/dev/DevDashboard.vue'),
    beforeEnter: (to, from, next) => {
      if (localStorage.getItem('devToken') || isDevPreviewEnabled()) {
        next()
      } else {
        next('/dev/login')
      }
    }
  },
  {
    path: '/dev',
    redirect: '/dev/login'
  }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
