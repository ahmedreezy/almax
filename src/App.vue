<template>
  <div id="app-root" :class="{ 'light-mode': isLight }">
    <!-- ── Theme Nav Bar ── -->
    <nav v-if="!isAdminRoute" class="theme-nav" aria-label="Appearance settings">
      <div class="theme-nav-inner">
        <a class="theme-brand" href="/" aria-label="Almax Football Predictions home">
          <img class="theme-brand-logo" src="@/assets/almax-mark.png" alt="" />
          <span class="theme-brand-text">ALMAX</span>
        </a>
        <span class="theme-nav-label">Appearance</span>
        <div class="theme-nav-pills" role="group" aria-label="Choose theme">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            :class="['theme-pill', { active: themeMode === opt.value }]"
            :aria-pressed="themeMode === opt.value"
            @click="setTheme(opt.value)"
          >
            <span class="pill-icon" aria-hidden="true">{{ opt.icon }}</span>
            <span class="pill-label">{{ opt.label }}</span>
          </button>
        </div>
        <UserProfile class="nav-user-profile" />
      </div>
    </nav>

    <router-view />

    <PhotoLightbox />

    <footer v-if="!isAdminRoute" class="powered-footnote">
      Powered by Dape Technologies
    </footer>
  </div>
</template>

<script>
import './assets/styles/global.css'
import UserProfile from './components/UserProfile.vue'
import PhotoLightbox from './components/PhotoLightbox.vue'
export default {
  name: 'App',
  components: { UserProfile, PhotoLightbox },
  data() {
    const saved = localStorage.getItem('theme') || 'dark'
    return {
      themeMode: saved,
      systemIsLight: window.matchMedia('(prefers-color-scheme: light)').matches,
      _systemMedia: null,
      themeOptions: [
        { value: 'light',  icon: '☀️', label: 'Light'  },
        { value: 'dark',   icon: '🌙', label: 'Dark'   },
        { value: 'system', icon: '🖥',  label: 'System' },
      ]
    }
  },
  computed: {
    isAdminRoute() {
      return this.$route && (
        this.$route.path.startsWith('/admin') ||
        this.$route.path.startsWith('/dev')
      )
    },
    isLight() {
      if (this.themeMode === 'system') return this.systemIsLight
      return this.themeMode === 'light'
    }
  },
  watch: {
    isLight(val) {
      document.body.classList.toggle('light-mode', val)
    },
    themeMode(val) {
      localStorage.setItem('theme', val)
      if (val === 'system') {
        this._attachSystemListener()
      } else {
        this._detachSystemListener()
      }
    }
  },
  mounted() {
    document.body.classList.toggle('light-mode', this.isLight)
    if (this.themeMode === 'system') this._attachSystemListener()
  },
  beforeUnmount() {
    this._detachSystemListener()
  },
  methods: {
    setTheme(mode) { this.themeMode = mode },
    _attachSystemListener() {
      this._systemMedia = window.matchMedia('(prefers-color-scheme: light)')
      this._systemMedia.addEventListener('change', this._onSystemChange)
    },
    _detachSystemListener() {
      if (this._systemMedia) {
        this._systemMedia.removeEventListener('change', this._onSystemChange)
        this._systemMedia = null
      }
    },
    _onSystemChange(e) {
      this.systemIsLight = e.matches
    }
  }
}
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
#app-root { min-height: 100vh; }
.powered-footnote {
  background: #050505;
  border-top: 1px solid rgba(255, 215, 0, 0.12);
  color: rgba(255, 255, 255, 0.48);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.5;
  padding: 8px 14px;
  text-align: center;
}
body.light-mode .powered-footnote {
  background: #f3f4f6;
  border-top-color: rgba(0, 0, 0, 0.12);
  color: rgba(0, 0, 0, 0.56);
}

/* ── Theme Nav ── */
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
body.light-mode .theme-nav {
  background: rgba(240, 242, 245, 0.96);
  border-bottom-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
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
body.light-mode .theme-brand-text {
  color: #141414;
}
.nav-user-profile { margin-left: 4px; }
.theme-nav-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: rgba(170, 170, 170, 0.7);
  user-select: none;
}
body.light-mode .theme-nav-label {
  color: rgba(80, 80, 80, 0.8);
}
.theme-nav-pills {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 3px;
}
body.light-mode .theme-nav-pills {
  background: rgba(0, 0, 0, 0.07);
}
.theme-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 20px;
  border: none;
  background: transparent;
  color: rgba(170, 170, 170, 0.75);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}
body.light-mode .theme-pill {
  color: rgba(80, 80, 80, 0.8);
}
.theme-pill:hover {
  background: rgba(255, 215, 0, 0.1);
  color: #FFD700;
}
.theme-pill.active {
  background: rgba(255, 215, 0, 0.18);
  color: #FFD700;
  font-weight: 700;
}
body.light-mode .theme-pill.active {
  background: rgba(184, 134, 11, 0.15);
  color: #6b4c0a;
}
.pill-icon { font-size: 13px; line-height: 1; }
.pill-label { line-height: 1; }

@media (max-width: 480px) {
  .theme-nav-inner { padding: 0 10px; gap: 8px; }
  .theme-brand-logo { width: 28px; height: 28px; }
  .theme-brand-text { display: none; }
  .theme-nav-label { display: none; }
  .pill-label { display: none; }
  .theme-pill { padding: 4px 9px; }
}
</style>
