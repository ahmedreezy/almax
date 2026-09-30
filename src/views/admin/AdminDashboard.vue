<template>
  <div class="dashboard">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <img class="brand-mark" src="@/assets/almax-mark.png" alt="Almax logo" />
        <span class="logo-text">ALMAX<span>CONTROL</span></span>
      </div>
      <p class="sidebar-role">Administration Suite</p>

      <nav class="sidebar-nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          :class="['nav-item', { active: activeSection === item.id }]"
          @click="activeSection = item.id"
        >
          <span class="nav-icon" v-html="navIcons[item.id]"></span>
          <span class="nav-copy">
            <span class="nav-label">{{ item.label }}</span>
            <span class="nav-desc">{{ item.desc }}</span>
          </span>
        </button>
      </nav>

      <div class="admin-strip">
        <span class="admin-avatar">A</span>
        <span>
          <strong>Administrator</strong>
          <small>Full access</small>
        </span>
      </div>

      <button class="logout-btn" @click="logout">
        Log out
      </button>
    </aside>

    <!-- Main content -->
    <main class="main-panel">
      <header class="main-header">
        <div>
          <p class="section-kicker">Control Center</p>
          <h1 class="section-title">{{ currentSection.label }}</h1>
          <p class="section-subtitle">{{ currentSection.desc }}</p>
        </div>
        <div class="header-right">
          <span class="header-date">{{ todayDate }}</span>
          <!-- Notification bell -->
          <div class="notif-bell-wrap" v-click-outside="closeNotif">
            <button class="notif-bell" @click="toggleNotif" title="Status check notifications">
              <span class="bell-shape"></span>
              <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
            </button>
            <div v-if="showNotifDropdown" class="notif-dropdown">
              <div class="notif-header">
                <span class="notif-title">Status Checks</span>
                <button v-if="notifications.some(n => !n.is_read)" class="notif-read-all" @click="markAllRead">Mark all read</button>
              </div>
              <div v-if="notifications.length === 0" class="notif-empty">No notifications yet</div>
              <div
                v-for="n in notifications"
                :key="n.id"
                :class="['notif-item', { unread: !n.is_read }]"
                @click="onNotifClick(n)"
              >
                <div class="notif-user">{{ n.username || n.phone }}</div>
                <div class="notif-detail">
                  <span class="notif-plan" v-if="n.plan_type">{{ n.plan_type }}</span>
                  <span :class="['notif-status', 'ns-' + (n.sub_status || 'none')]">{{ n.sub_status || 'none' }}</span>
                </div>
                <div class="notif-time">{{ formatNotifTime(n.created_at) }}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="panel-body">
        <FreeOdd2Editor      v-if="activeSection === 'free-odd2'" />
        <FootballTipsEditor  v-if="activeSection === 'football-tips'" />
        <RecentWinsEditor    v-if="activeSection === 'recent-wins'" />
        <VipPackagesEditor   v-if="activeSection === 'vip-packages'" />
        <PaymentsOverview    v-if="activeSection === 'payments'" :focusSubscriptionId="focusSubId" @vue:unmounted="focusSubId = null" />
        <TestimonialsEditor  v-if="activeSection === 'testimonials'" />
        <UsersEditor         v-if="activeSection === 'users'" />
        <SitePreview         v-if="activeSection === 'preview'" />
      </div>
    </main>
  </div>
</template>

<script>
import axios from 'axios'
import FreeOdd2Editor     from '../../components/admin/FreeOdd2Editor.vue'
import FootballTipsEditor  from '../../components/admin/FootballTipsEditor.vue'
import RecentWinsEditor    from '../../components/admin/RecentWinsEditor.vue'
import VipPackagesEditor   from '../../components/admin/VipPackagesEditor.vue'
import PaymentsOverview    from '../../components/admin/PaymentsOverview.vue'
import TestimonialsEditor  from '../../components/admin/TestimonialsEditor.vue'
import UsersEditor         from '../../components/admin/UsersEditor.vue'
import SitePreview         from '../../components/admin/SitePreview.vue'

export default {
  name: 'AdminDashboard',
  components: { FreeOdd2Editor, FootballTipsEditor, RecentWinsEditor, VipPackagesEditor, PaymentsOverview, TestimonialsEditor, UsersEditor, SitePreview },
  directives: {
    'click-outside': {
      mounted(el, binding) {
        el._clickOutside = (e) => { if (!el.contains(e.target)) binding.value() }
        document.addEventListener('click', el._clickOutside)
      },
      unmounted(el) { document.removeEventListener('click', el._clickOutside) }
    }
  },
  data() {
    const d = new Date()
    return {
      activeSection: 'free-odd2',
      todayDate: d.toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' }),
      navItems: [
        { id: 'free-odd2',     label: 'Free Daily Tip',     desc: 'Public daily feature' },
        { id: 'football-tips', label: 'Almax Predictions',  desc: 'Prediction feed' },
        { id: 'recent-wins',   label: 'Recent Wins',        desc: 'Published wins' },
        { id: 'vip-packages',  label: 'VIP Packages',       desc: 'Pricing and betslips' },
        { id: 'payments',      label: 'Payments',           desc: 'Subscriptions and revenue' },
        { id: 'users',         label: 'Members',            desc: 'Registered accounts' },
        { id: 'testimonials',  label: 'Testimonials',       desc: 'Social proof content' },
        { id: 'preview',       label: 'Site Preview',       desc: 'Public site view' }
      ],
      navIcons: {
        'free-odd2':     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>',
        'football-tips': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
        'recent-wins':   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8m-4-4v4M5 3h14v5a7 7 0 01-14 0V3z"/><path d="M5 6H3a2 2 0 000 4h2M19 6h2a2 2 0 010 4h-2"/></svg>',
        'vip-packages':  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        'payments':      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
        'users':         '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
        'testimonials':  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
        'preview':       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>'
      },
      notifications: [],
      unreadCount: 0,
      showNotifDropdown: false,
      notifPollInterval: null,
      focusSubId: null
    }
  },
  computed: {
    currentSection() {
      return this.navItems.find(n => n.id === this.activeSection) || {}
    }
  },
  async mounted() {
    await this.fetchNotifCount()
    this.notifPollInterval = setInterval(this.fetchNotifCount, 30000)
  },
  beforeUnmount() {
    if (this.notifPollInterval) clearInterval(this.notifPollInterval)
  },
  methods: {
    logout() {
      localStorage.removeItem('adminToken')
      this.$router.push('/admin/login')
    },
    async fetchNotifCount() {
      try {
        const token = localStorage.getItem('adminToken')
        if (!token) return
        const { data } = await axios.get('/api/notifications/unread-count', {
          headers: { Authorization: 'Bearer ' + token }
        })
        this.unreadCount = data.count || 0
      } catch { /* silent */ }
    },
    async fetchNotifications() {
      try {
        const token = localStorage.getItem('adminToken')
        if (!token) return
        const { data } = await axios.get('/api/notifications', {
          headers: { Authorization: 'Bearer ' + token }
        })
        this.notifications = data || []
      } catch { /* silent */ }
    },
    async toggleNotif() {
      this.showNotifDropdown = !this.showNotifDropdown
      if (this.showNotifDropdown) await this.fetchNotifications()
    },
    closeNotif() { this.showNotifDropdown = false },
    async onNotifClick(notif) {
      this.showNotifDropdown = false
      try {
        const token = localStorage.getItem('adminToken')
        await axios.patch('/api/notifications/' + notif.id + '/read', {}, {
          headers: { Authorization: 'Bearer ' + token }
        })
        notif.is_read = true
        this.unreadCount = Math.max(0, this.unreadCount - 1)
      } catch { /* silent */ }
      this.focusSubId = notif.subscription_id || null
      this.activeSection = 'payments'
    },
    async markAllRead() {
      try {
        const token = localStorage.getItem('adminToken')
        await axios.patch('/api/notifications/read-all', {}, {
          headers: { Authorization: 'Bearer ' + token }
        })
        this.notifications.forEach(n => { n.is_read = true })
        this.unreadCount = 0
      } catch { /* silent */ }
    },
    formatNotifTime(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      const now = new Date()
      const diff = Math.floor((now - d) / 60000)
      if (diff < 1) return 'just now'
      if (diff < 60) return diff + 'm ago'
      if (diff < 1440) return Math.floor(diff / 60) + 'h ago'
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    }
  }
}
</script>

<style scoped>
.dashboard {
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(255,215,0,0.08), transparent 34%),
    linear-gradient(135deg, #070707 0%, #0e0e0e 46%, #111 100%);
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--white);
}
/* Fixed-frame (sticky sidebar) only on screens wide enough to show the sidebar */
@media (min-width: 769px) {
  .dashboard { height: 100vh; overflow: hidden; }
}

/* ── Sidebar ─────────────────────────────────────────────── */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  background: rgba(14,14,14,0.96);
  border-right: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  padding: 30px 18px 24px;
}
@media (min-width: 769px) {
  .sidebar { height: 100vh; overflow-y: auto; }
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 14px;
}
.brand-mark {
  width: 42px;
  height: 42px;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 10px 18px rgba(0,0,0,0.25));
}
.logo-text {
  display: flex;
  flex-direction: column;
  color: var(--white);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 2px;
  line-height: 1.05;
}
.logo-text span { color: #FFD700; font-size: 10px; letter-spacing: 2.8px; margin-top: 5px; }
.gold { color: #FFD700; }

.sidebar-role {
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 0 8px;
  margin-bottom: 28px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 13px 14px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255,255,255,0.58);
  cursor: pointer;
  text-align: left;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}
.nav-item:hover { background: rgba(255,255,255,0.045); color: var(--white); }
.nav-item.active {
  background: rgba(255,215,0,0.1);
  color: #FFD700;
  border-color: rgba(255,215,0,0.25);
}
.nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.55);
  flex-shrink: 0;
}
.nav-icon svg { display: block; }
.nav-item.active .nav-icon { background: #FFD700; color: #050505; }
.nav-copy { display: flex; flex-direction: column; gap: 2px; }
.nav-label { font-size: 14px; font-weight: 800; color: inherit; }
.nav-desc { font-size: 11px; color: rgba(255,255,255,0.36); line-height: 1.3; }
.nav-item.active .nav-desc { color: rgba(255,215,0,0.62); }

.admin-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
}
.admin-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,215,0,0.16);
  color: #FFD700;
  font-size: 13px;
  font-weight: 900;
}
.admin-strip strong { display: block; font-size: 13px; color: #fff; }
.admin-strip small { display: block; font-size: 11px; color: rgba(255,255,255,0.42); margin-top: 2px; }

.logout-btn {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,82,82,0.25);
  background: transparent;
  color: #ff5252;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 16px;
}
.logout-btn:hover { background: rgba(255,82,82,0.1); }

/* ── Main Panel ──────────────────────────────────────────── */
.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 36px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(20,20,20,0.82);
  backdrop-filter: blur(12px);
}
.section-kicker {
  color: #FFD700;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  margin-bottom: 7px;
}
.section-title {
  font-size: 26px;
  font-weight: 800;
  color: var(--white);
  margin: 0;
}
.section-subtitle {
  color: rgba(255,255,255,0.42);
  font-size: 13px;
  margin-top: 7px;
}
.header-right { display: flex; align-items: center; gap: 18px; }
.header-date {
  font-size: 13px;
  color: rgba(255,255,255,0.46);
  padding-right: 18px;
  border-right: 1px solid rgba(255,255,255,0.1);
}
.notif-bell-wrap { position: relative; }
.notif-bell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  cursor: pointer;
}
.notif-bell:hover { border-color: rgba(255,215,0,0.28); background: rgba(255,215,0,0.08); }
.bell-shape {
  position: relative;
  display: block;
  width: 15px;
  height: 17px;
  border: 2px solid rgba(255,255,255,0.75);
  border-bottom: none;
  border-radius: 9px 9px 3px 3px;
}
.bell-shape::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 22px;
  height: 2px;
  background: rgba(255,255,255,0.75);
  transform: translateX(-50%);
  border-radius: 2px;
}
.bell-shape::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -10px;
  width: 5px;
  height: 5px;
  background: #FFD700;
  border-radius: 50%;
  transform: translateX(-50%);
}
.notif-badge {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #ff5252;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  border: 2px solid #141414;
}
.notif-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 12px);
  width: 340px;
  max-height: 430px;
  overflow-y: auto;
  z-index: 20;
  background: #121212;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  box-shadow: 0 22px 60px rgba(0,0,0,0.45);
}
.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.notif-title { font-size: 13px; color: #fff; font-weight: 900; }
.notif-read-all {
  border: none;
  background: transparent;
  color: #FFD700;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}
.notif-empty { padding: 22px 16px; color: rgba(255,255,255,0.42); font-size: 13px; }
.notif-item { padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); cursor: pointer; }
.notif-item:hover { background: rgba(255,255,255,0.04); }
.notif-item.unread { background: rgba(255,215,0,0.05); }
.notif-user { color: #fff; font-size: 13px; font-weight: 800; margin-bottom: 6px; }
.notif-detail { display: flex; align-items: center; gap: 8px; }
.notif-plan { color: rgba(255,255,255,0.45); font-size: 11px; text-transform: uppercase; }
.notif-status { font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 3px 7px; border-radius: 999px; background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.64); }
.ns-active { background: rgba(0,200,83,0.14); color: #00c853; }
.ns-pending { background: rgba(255,165,0,0.14); color: #FFA500; }
.ns-expired, .ns-rejected { background: rgba(255,82,82,0.13); color: #ff7070; }
.notif-time { margin-top: 7px; font-size: 11px; color: rgba(255,255,255,0.34); }

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 34px 36px;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .dashboard { flex-direction: column; }
  .sidebar {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 12px;
    gap: 6px;
  }
  .sidebar-logo, .sidebar-role, .admin-strip { display: none; }
  .sidebar-nav { flex-direction: row; flex: unset; }
  .logout-btn { margin-top: 0; padding: 10px 12px; font-size: 12px; }
  .nav-label, .nav-desc { display: none; }
  .nav-item { padding: 10px; }
  .nav-icon { width: auto; height: auto; background: none; }
  .panel-body { padding: 16px; }
  .main-header { padding: 16px; }
  .section-subtitle, .section-kicker, .header-date { display: none; }
  .notif-dropdown { right: -8px; width: min(320px, calc(100vw - 32px)); }
}
</style>
