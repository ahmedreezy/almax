<template>
  <div class="editor">
    <p class="editor-desc">
      View all registered members, their subscription status, and manually manage accounts.
    </p>

    <div class="toolbar">
      <div class="search-wrap">
        <span class="search-mark">⌕</span>
        <input v-model="search" class="search-input" type="search" placeholder="Search by name or phone" @input="queueSearch" />
      </div>
      <span class="count-badge">{{ meta.total }} members</span>
    </div>

    <p v-if="notice" class="inline-notice" role="status">{{ notice }}</p>
    <p v-if="error" class="inline-error" role="alert">{{ error }} <button type="button" @click="load(meta.current_page)">Try again</button></p>

    <div v-if="loading" class="state-msg">Loading members…</div>
    <div v-else-if="filtered.length === 0" class="empty-state">
      <strong>No members found</strong>
      <span>Try a different search term or clear the filter.</span>
    </div>
    <div v-else class="user-list">
      <div
        v-for="u in filtered"
        :key="u.id"
        class="user-card"
        :class="{ 'user-card-warning': u.scamWarning, 'user-card-blacklisted': u.blacklisted }"
      >
        <div class="user-left">
          <div class="avatar">{{ (u.username || '?')[0].toUpperCase() }}</div>
          <div class="user-info">
            <span class="user-name-row">
              <span class="user-name">{{ u.username }}</span>
              <span v-if="u.scamWarning" class="warning-badge">Scam warning</span>
              <span v-if="u.blacklisted" class="blacklist-badge">Blacklisted</span>
            </span>
            <span class="user-phone">Phone: {{ u.phone }}</span>
            <span v-if="u.email" class="user-email">Email: {{ u.email }}</span>
            <span v-if="u.dob" class="user-dob">DOB: {{ u.dob }}</span>
          </div>
        </div>
        <div class="user-right">
          <div class="sub-status" :class="subStatusClass(u)">
            {{ subStatusLabel(u) }}
          </div>
          <div v-if="u.activeSub" class="sub-exp">
            Expires: {{ formatDate(u.activeSub.expiresAt) }}
          </div>
          <div class="user-actions">
            <button
              class="warn-btn"
              :class="{ active: u.scamWarning }"
              :disabled="updating[u.id]"
              @click="toggleWarning(u)"
              title="Toggle red warning badge"
            >
              {{ u.scamWarning ? 'Clear warning' : 'Red badge' }}
            </button>
            <button
              class="blacklist-btn"
              :class="{ active: u.blacklisted }"
              :disabled="updating[u.id]"
              @click="toggleBlacklist(u)"
              title="Block this phone number from logging in"
            >
              {{ u.blacklisted ? 'Remove blacklist' : 'Send to blacklist' }}
            </button>
            <button class="del-btn" @click="deleteUser(u.id)" title="Remove member">Remove</button>
          </div>
        </div>
      </div>
    </div>
    <footer v-if="meta.total" class="member-pagination" aria-label="Member pagination">
      <span>Showing {{ meta.from || 0 }}–{{ meta.to || 0 }} of {{ meta.total }}</span>
      <div><button type="button" :disabled="meta.current_page <= 1 || loading" @click="load(meta.current_page - 1)">←</button><strong>Page {{ meta.current_page }} of {{ meta.last_page }}</strong><button type="button" :disabled="meta.current_page >= meta.last_page || loading" @click="load(meta.current_page + 1)">→</button></div>
      <label>Rows <select v-model.number="perPage" @change="load(1)"><option :value="10">10</option><option :value="25">25</option><option :value="50">50</option></select></label>
    </footer>
  </div>
</template>

<script>
import adminApi from '../../utils/adminApi'

export default {
  name: 'UsersEditor',
  data() {
    return {
      users: [],
      loading: true,
      search: '',
      updating: {},
      perPage: 10,
      meta: { current_page: 1, last_page: 1, total: 0, from: 0, to: 0 },
      searchTimer: null,
      notice: '',
      error: ''
    }
  },
  computed: {
    filtered() {
      const q = this.search.toLowerCase().trim()
      if (!q) return this.users
      return this.users.filter(u =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      )
    }
  },
  async mounted() {
    await this.load()
  },
  beforeUnmount() { clearTimeout(this.searchTimer) },
  methods: {
    queueSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.load(1), 350) },
    async load(page = 1) {
      this.loading = true
      this.error = ''
      try {
        const { data } = await adminApi.get('/api/users', { params: { page, per_page: this.perPage, search: this.search || undefined } })
        this.users = (data.data || []).map(this.normalizeUser)
        this.meta = { current_page: data.current_page || 1, last_page: data.last_page || 1, total: data.total || 0, from: data.from || 0, to: data.to || 0 }
      } catch (error) {
        this.users = []
        this.error = error.response?.data?.message || 'Members could not be loaded.'
      } finally {
        this.loading = false
      }
    },
    normalizeUser(u) {
      const subscriptions = u.subscriptions || []
      const activeSub = subscriptions.find(subscription => subscription.status === 'active')
      const pendingSub = subscriptions.find(subscription => subscription.status === 'pending')
      return {
        ...u,
        activeSub: activeSub ? { ...activeSub, planType: activeSub.plan_type, expiresAt: activeSub.expires_at } : null,
        pendingSub,
        scamWarning: Boolean(u.scamWarning ?? u.scam_warning),
        blacklisted: Boolean(u.blacklisted ?? u.isBlacklisted ?? u.is_blacklisted)
      }
    },
    setUpdating(id, value) {
      this.updating = { ...this.updating, [id]: value }
    },
    replaceUser(user) {
      const normalized = this.normalizeUser(user)
      this.users = this.users.map(u => u.id === normalized.id ? normalized : u)
    },
    async toggleWarning(u) {
      this.setUpdating(u.id, true)
      try {
        const { data } = await adminApi.patch('/api/users/' + u.id, {
          scam_warning: !u.scamWarning
        })
        this.replaceUser(data)
        this.notice = 'Warning badge updated.'
      } catch {
        this.error = 'Could not update the warning badge.'
      } finally {
        this.setUpdating(u.id, false)
      }
    },
    async toggleBlacklist(u) {
      const nextBlacklisted = !u.blacklisted
      if (nextBlacklisted && !confirm(`Send ${u.phone} to the blacklist and block future logins?`)) return

      this.setUpdating(u.id, true)
      try {
        const { data } = await adminApi.patch('/api/users/' + u.id, {
          blacklisted: nextBlacklisted
        })
        this.replaceUser(data)
        this.notice = nextBlacklisted ? 'Member blacklisted.' : 'Member removed from blacklist.'
      } catch {
        this.error = 'Could not update the blacklist.'
      } finally {
        this.setUpdating(u.id, false)
      }
    },
    subStatusClass(u) {
      if (u.activeSub) return 'status-active'
      if (u.pendingSub) return 'status-pending'
      return 'status-none'
    },
    subStatusLabel(u) {
      if (u.activeSub) return 'ACTIVE - ' + (u.activeSub.planType || '').toUpperCase()
      if (u.pendingSub) return 'PENDING PAYMENT'
      return 'No subscription'
    },
    formatDate(ts) {
      if (!ts) return '—'
      return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    },
    async deleteUser(id) {
      if (!confirm('Remove this member and cancel their subscriptions?')) return
      try {
        await adminApi.delete('/api/users/' + id)
        await this.load(this.meta.current_page)
        this.notice = 'Member removed.'
      } catch {
        this.error = 'The member could not be removed.'
      }
    }
  }
}
</script>

<style scoped>
.editor { max-width: 900px; }
.editor-desc { max-width: 64ch; font-size: 14px; color: #7d8998; margin-bottom: 24px; line-height: 1.7; }
.state-msg { font-size: 14px; color: #888; padding: 14px; }
.empty-state { padding: 34px; text-align: center; color: rgba(255,255,255,0.46); font-size: 14px; background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; display: flex; flex-direction: column; gap: 6px; }
.empty-state strong { color: #fff; font-size: 16px; }

.toolbar { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.search-wrap { position: relative; flex: 1; }
.search-mark { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: rgba(143,179,217,0.66); font-size: 18px; }
.search-input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 11px; padding: 12px 16px 12px 42px; color: #fff; font-size: 14px; outline: none; transition: border-color 0.2s, background 0.2s; }
.search-input:focus { border-color: rgba(143,179,217,0.4); }
.search-input::placeholder { color: #444; }
.count-badge { background: rgba(143,179,217,0.1); color: #8FB3D9; font-size: 12px; font-weight: 800; padding: 8px 14px; border-radius: 999px; white-space: nowrap; }

.user-list { display: flex; flex-direction: column; gap: 12px; }
.user-card {
  background: rgba(17,17,17,0.88);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  transition: border-color 0.2s;
}
.user-card:hover { border-color: rgba(143,179,217,0.24); background: rgba(255,255,255,0.035); }
.user-card-warning { border-color: rgba(255,82,82,0.34); background: rgba(255,82,82,0.055); }
.user-card-blacklisted { border-color: rgba(255,82,82,0.54); background:#21161a; }
.user-left { display: flex; align-items: flex-start; gap: 14px; }
.avatar {
  width: 44px; height: 44px; border-radius: 12px;
  background: #8fb3d9;
  color: #000; font-size: 18px; font-weight: 900;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.user-info { display: flex; flex-direction: column; gap: 3px; }
.user-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.user-name  { font-size: 15px; font-weight: 700; color: #fff; }
.user-phone, .user-email, .user-dob { font-size: 12px; color: rgba(255,255,255,0.46); }
.warning-badge,
.blacklist-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  line-height: 1;
}
.warning-badge { background: #ff2d2d; color: #fff; border: 1px solid rgba(255,255,255,0.18); }
.blacklist-badge { background: rgba(0,0,0,0.52); color: #ff8080; border: 1px solid rgba(255,82,82,0.42); }

.user-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.sub-status { font-size: 11px; font-weight: 900; padding: 6px 12px; border-radius: 999px; letter-spacing: 0.4px; }
.status-active  { background: rgba(0,200,83,0.12); color: #00c853; }
.status-pending { background: rgba(255,165,0,0.12); color: #FFA500; }
.status-none    { background: rgba(255,255,255,0.06); color: #666; }
.sub-exp { font-size: 11px; color: #666; }
.user-actions { display: flex; justify-content: flex-end; gap: 7px; flex-wrap: wrap; max-width: 330px; }
.warn-btn,
.blacklist-btn,
.del-btn {
  font-size: 12px; font-weight: 800; padding: 7px 11px;
  border-radius: 8px; cursor: pointer; transition: background 0.2s;
}
.warn-btn {
  background: rgba(255,82,82,0.09); border: 1px solid rgba(255,82,82,0.22);
  color: #ff7b7b;
}
.warn-btn.active { background: rgba(255,82,82,0.22); border-color: rgba(255,82,82,0.45); color: #fff; }
.blacklist-btn {
  background: rgba(255,82,82,0.12); border: 1px solid rgba(255,82,82,0.28);
  color: #ff5252;
}
.blacklist-btn.active { background: rgba(0,200,83,0.1); border-color: rgba(0,200,83,0.26); color: #00c853; }
.warn-btn:disabled,
.blacklist-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.del-btn {
  background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.2);
  color: #ff5252;
}
.del-btn:hover { background: rgba(255,82,82,0.2); }
.inline-notice,.inline-error{padding:11px 13px;border-radius:7px;font-size:12px}.inline-notice{background:#15271f;color:#82cfa7}.inline-error{background:#2b171c;color:#e5a1a9}.inline-error button{border:0;background:none;color:#8fb3d9;cursor:pointer}.member-pagination{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin-top:18px;padding:13px 15px;border-radius:9px;background:#0f151d;color:#687585;font-size:10px}.member-pagination>div{display:flex;align-items:center;gap:9px}.member-pagination button{width:32px;height:32px;border:1px solid #2c3744;border-radius:6px;background:#151d27;color:#aeb8c4;cursor:pointer}.member-pagination button:disabled{opacity:.3}.member-pagination strong{font-weight:600;color:#aeb8c4}.member-pagination label{justify-self:end;display:flex;align-items:center;gap:7px}.member-pagination select{height:32px;border:1px solid #2c3744;border-radius:6px;background:#151d27;color:#c5ccd4;padding:0 7px}

@media (max-width: 600px) {
  .user-card { flex-direction: column; }
  .user-right { align-items: flex-start; }
  .member-pagination{grid-template-columns:1fr}.member-pagination>div,.member-pagination label{justify-self:start}
}
</style>
