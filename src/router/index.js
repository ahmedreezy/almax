import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import AdminLogin from '../views/admin/AdminLogin.vue'
import AdminDashboard from '../views/admin/AdminDashboard.vue'
import DevLogin from '../views/dev/DevLogin.vue'
import DevDashboard from '../views/dev/DevDashboard.vue'

const routes = [
  {
    path: '/',
    component: HomePage
  },
  {
    path: '/admin/login',
    component: AdminLogin,
    beforeEnter: (to, from, next) => {
      if (localStorage.getItem('adminToken')) {
        next('/admin/dashboard')
      } else {
        next()
      }
    }
  },
  {
    path: '/admin/dashboard',
    component: AdminDashboard,
    beforeEnter: (to, from, next) => {
      if (localStorage.getItem('adminToken')) {
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
    path: '/dev/login',
    component: DevLogin,
    beforeEnter: (to, from, next) => {
      if (localStorage.getItem('devToken')) {
        next('/dev/dashboard')
      } else {
        next()
      }
    }
  },
  {
    path: '/dev/dashboard',
    component: DevDashboard,
    beforeEnter: (to, from, next) => {
      if (localStorage.getItem('devToken')) {
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
