<template>
  <div id="app-root" :class="{ 'is-admin-route': isAdminRoute, 'is-user-route': !isAdminRoute }">
    <a v-if="!isAdminRoute" class="skip-link" href="/" @click.prevent="scrollToSection('todays-almax-picks')">Skip to today’s predictions</a>
    <nav v-if="!isAdminRoute" class="theme-nav" aria-label="Primary navigation">
      <div class="theme-nav-inner">
        <a class="theme-brand" href="/" aria-label="Almax Football Predictions home">
          <img class="theme-brand-logo" src="@/assets/almax-mark.png" alt="" />
          <span class="theme-brand-text">ALMAX</span>
        </a>
        <UserProfile class="nav-user-profile" />
      </div>
    </nav>

    <router-view />

    <PhotoLightbox />

    <transition name="update-toast">
      <aside v-if="updateAvailable" :class="['update-ready', { 'on-admin': isAdminRoute }]" role="status" aria-live="polite">
        <div class="update-icon" aria-hidden="true">↻</div>
        <div class="update-copy">
          <strong>New update ready</strong>
          <span>Refresh to get the latest Almax improvements.</span>
        </div>
        <button type="button" @click="applyUpdate">Update now</button>
      </aside>
    </transition>

    <footer v-if="!isAdminRoute" class="powered-footnote">
      Powered by Dape Technologies
    </footer>
  </div>
</template>

<script>
import './assets/styles/tailwind.css'
import './assets/styles/global.css'
import './assets/styles/user-system.css'
import UserProfile from './components/UserProfile.vue'
import PhotoLightbox from './components/PhotoLightbox.vue'
const { evaluateAppUpdate } = require('./utils/updateVersion')
export default {
  name: 'App',
  components: { UserProfile, PhotoLightbox },
  data() {
    return {
      _updateTimer: null,
      updateAvailable: false,
      latestBuildId: '',
      latestVersion: '',
      currentVersion: process.env.VUE_APP_VERSION || '',
      currentBuildId: process.env.VUE_APP_BUILD_ID || '',
      currentBuiltAt: process.env.VUE_APP_BUILT_AT || ''
    }
  },
  computed: {
    isAdminRoute() {
      return this.$route && (
        this.$route.path.startsWith('/admin') ||
        this.$route.path.startsWith('/dev')
      )
    }
  },
  watch: {
    isAdminRoute(val) {
      document.body.classList.toggle('user-route', !val)
    }
  },
  mounted() {
    document.body.classList.remove('light-mode')
    localStorage.removeItem('theme')
    document.body.classList.toggle('user-route', !this.isAdminRoute)
    this.checkForUpdate()
    this._updateTimer = window.setInterval(this.checkForUpdate, 20000)
    window.addEventListener('focus', this.checkForUpdate)
    window.addEventListener('online', this.checkForUpdate)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  },
  beforeUnmount() {
    document.body.classList.remove('user-route')
    window.clearInterval(this._updateTimer)
    window.removeEventListener('focus', this.checkForUpdate)
    window.removeEventListener('online', this.checkForUpdate)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  },
  methods: {
    scrollToSection(id) {
      document.getElementById(id)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      })
    },
    handleVisibilityChange() {
      if (!document.hidden) this.checkForUpdate()
    },
    async checkForUpdate() {
      try {
        const response = await fetch(`/version.json?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        if (!response.ok) return
        const manifest = await response.json()
        const updateAvailable = evaluateAppUpdate({
          buildId: this.currentBuildId,
          version: this.currentVersion,
          builtAt: this.currentBuiltAt
        }, manifest)
        if (updateAvailable) {
          this.latestBuildId = manifest.buildId || manifest.version
          this.latestVersion = manifest.version || ''
          this.updateAvailable = true
        } else {
          this.latestBuildId = ''
          this.latestVersion = ''
          this.updateAvailable = false
        }
      } catch { /* Update checks should never interrupt the application. */ }
    },
    applyUpdate() {
      this.updateAvailable = false
      const url = new URL(window.location.href)
      url.searchParams.set('_appv', this.latestBuildId || this.latestVersion || Date.now().toString())
      window.location.replace(url.toString())
    }
  }
}
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
#app-root { min-height: 100vh; }
body:not(.user-route) { padding-top: 0; }
.skip-link { position: fixed; top: 8px; left: 12px; z-index: 12000; min-height: 44px; padding: 11px 15px; border-radius: 8px; background: #f4cd47; color: #17140b; font-size: 15px; font-weight: 800; transform: translateY(-150%); transition: transform .18s ease; }
.skip-link:focus { transform: translateY(0); }
.powered-footnote {
  background: #050505;
  border-top: 1px solid rgba(255, 215, 0, 0.12);
  color: rgba(255, 255, 255, 0.48);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.5;
  padding: 8px 14px;
  text-align: center;
}
.update-ready { position:fixed; right:24px; bottom:96px; z-index:10020; width:min(390px,calc(100vw - 28px)); display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:12px; padding:13px 14px; border:1px solid rgba(255,215,0,.32); border-radius:16px; background:rgba(19,19,16,.94); color:#fff; box-shadow:0 18px 55px rgba(0,0,0,.48); backdrop-filter:blur(18px); }
.update-ready.on-admin { bottom:24px; }
.update-icon { width:34px; height:34px; display:grid; place-items:center; border-radius:50%; background:rgba(255,215,0,.14); color:#ffd700; font-size:21px; font-weight:800; }
.update-copy { min-width:0; display:flex; flex-direction:column; gap:2px; }
.update-copy strong { font-size:15px; }
.update-copy span { color:rgba(255,255,255,.68); font-size:13px; line-height:1.45; }
.update-ready button { min-height:44px; border:0; border-radius:9px; padding:10px 14px; background:#ffd700; color:#111; font-size:15px; font-weight:800; white-space:nowrap; cursor:pointer; }
.update-toast-enter-active,.update-toast-leave-active { transition:opacity .22s ease,transform .22s ease; }
.update-toast-enter-from,.update-toast-leave-to { opacity:0; transform:translateY(12px) scale(.97); }

/* ── User navigation ── */
.theme-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 9999;
  height: 44px;
  background: rgba(10, 10, 10, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 215, 0, 0.18);
  box-shadow: 0 3px 20px rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
}
.theme-nav-inner {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  gap: 10px;
  padding: 0 18px;
}
.theme-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
  color: #fff;
  text-decoration: none;
  min-width: 0;
}
.theme-brand-logo {
  width: 30px;
  height: 30px;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.28));
}
.theme-brand-text {
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 1.6px;
  line-height: 1;
}
.nav-user-profile { margin-left: 4px; }

@media (max-width: 480px) {
  .theme-nav-inner { padding: 0 10px; gap: 8px; }
  .theme-brand-logo { width: 28px; height: 28px; }
  .theme-brand-text { display: none; }
  .update-ready { right:14px; bottom:82px; grid-template-columns:auto 1fr; }
  .update-ready.on-admin { bottom:14px; }
  .update-ready button { grid-column:1/-1; width:100%; }
}

@media (prefers-reduced-motion: reduce) {
  .update-toast-enter-active,.update-toast-leave-active { transition:none; }
}
</style>
