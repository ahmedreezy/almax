<template>
  <div class="editor">
    <p class="editor-desc">
      Review payment submissions and confirm access. Subscriptions are separated by Daily and Weekly tiers, and further by odds package (1.5, 2, or 5 Odds) with individual betslip codes per package.
    </p>

    <div class="report-wrap">
      <div class="report-head">
        <h3 class="report-title">Payments Report</h3>
        <div class="report-actions">
          <button class="report-refresh" @click="fetchReport" :disabled="reportLoading">
            {{ reportLoading ? 'Refreshing…' : 'Refresh Report' }}
          </button>
        </div>
      </div>
      <div class="report-filter-row">
        <div class="report-filter-field">
          <label>From</label>
          <input v-model="reportRange.from" type="date" />
        </div>
        <div class="report-filter-field">
          <label>To</label>
          <input v-model="reportRange.to" type="date" />
        </div>
        <button class="report-apply" @click="fetchReport" :disabled="reportLoading">Apply</button>
        <button class="report-reset" @click="resetReportRange" :disabled="reportLoading">Reset</button>
        <div class="period-presets">
          <button :class="['preset-btn', { 'preset-active': activePreset === 'today' }]" @click="setPreset('today')">Today</button>
          <button :class="['preset-btn', { 'preset-active': activePreset === 'week' }]" @click="setPreset('week')">This Week</button>
          <button :class="['preset-btn', { 'preset-active': activePreset === 'month' }]" @click="setPreset('month')">This Month</button>
          <button :class="['preset-btn', { 'preset-active': activePreset === 'all' }]" @click="setPreset('all')">All Time</button>
        </div>
      </div>
      <div v-if="reportError" class="error-msg" style="padding:8px 0">{{ reportError }}</div>
      <div v-else class="report-grid">
        <div class="report-card">
          <div class="report-label">Total Payments</div>
          <div class="report-value">{{ report.summary.totalPayments }}</div>
        </div>
        <div class="report-card report-card--green">
          <div class="report-label">Money Received</div>
          <div class="report-value">{{ Number(reportStatusAmount('confirmed') || 0).toLocaleString() }} UGX</div>
          <div class="report-sub">{{ reportStatusCount('confirmed') }} confirmed</div>
        </div>
        <div class="report-card">
          <div class="report-label">Pending</div>
          <div class="report-value">
            {{ reportStatusCount('pending') }}
            <span class="report-sub">({{ Number(reportStatusAmount('pending')).toLocaleString() }} UGX)</span>
          </div>
        </div>
        <div class="report-card">
          <div class="report-label">Total Volume</div>
          <div class="report-value report-value--muted">{{ Number(report.summary.totalAmount || 0).toLocaleString() }} UGX</div>
        </div>
      </div>
    </div>

    <!-- Tier tabs -->
    <div class="tier-tabs">
      <button :class="['tier-tab','daily-tab',{active:activeTier==='daily'}]" @click="activeTier='daily';filterOdds='all'">
        <span class="tier-dot daily-dot"></span> Daily
        <span class="tier-count">{{ countByTier('daily') }}</span>
      </button>
      <button :class="['tier-tab','weekly-tab',{active:activeTier==='weekly'}]" @click="activeTier='weekly';filterOdds='all'">
        <span class="tier-dot weekly-dot"></span> Weekly
        <span class="tier-count">{{ countByTier('weekly') }}</span>
      </button>
      <button :class="['tier-tab','monthly-tab',{active:activeTier==='monthly'}]" @click="activeTier='monthly';filterOdds='all'">
        <span class="tier-dot monthly-dot"></span> Monthly
        <span class="tier-count">{{ countByTier('monthly') }}</span>
      </button>
      <button :class="['tier-tab','special-tab',{active:activeTier==='special'}]" @click="activeTier='special';filterOdds='all'">
        <span class="tier-dot special-dot"></span> Special
        <span class="tier-count">{{ countByTier('special') }}</span>
      </button>
    </div>

    <!-- Odds sub-filter chips -->
    <div class="odds-filter-row">
      <button
        v-for="chip in oddsChips"
        :key="chip.val"
        :class="['odds-chip', { active: filterOdds === chip.val }]"
        @click="filterOdds = chip.val"
      >{{ chip.label }} <span class="count">{{ countByOdds(chip.val) }}</span></button>
    </div>

    <!-- Status filter toolbar -->
    <div class="toolbar">
      <button
        v-for="f in filters"
        :key="f.val"
        :class="['filter-btn', { active: filterStatus === f.val }]"
        @click="filterStatus = f.val"
      >{{ f.label }} <span class="count">{{ countByStatus(f.val) }}</span></button>
    </div>

    <div v-if="loading" class="state-msg">Loading&hellip;</div>
    <div v-else-if="displayed.length === 0" class="empty-state">No {{ filterStatus !== 'all' ? filterStatus : '' }} records for {{ activeTier }}{{ filterOdds !== 'all' ? ' · ' + filterOdds + ' odds' : '' }}.</div>

    <div v-else class="sub-list">
      <div
        v-for="s in displayed"
        :key="s.id"
        :class="['sub-card', s.planType + '-card', { 'highlight-card': highlightId === s.id }]"
        :ref="'card-' + s.id"
      >
        <!-- Tier ribbon -->
        <div class="tier-ribbon-row">
          <div :class="['tier-ribbon', s.planType + '-ribbon']">
            {{ { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', special: 'SPECIAL' }[s.planType] || s.planType.toUpperCase() }}
          </div>
          <div class="odds-ribbon">{{ s.oddsType || '2' }} ODDS</div>
        </div>

        <div class="sub-top">
          <div class="sub-user">
            <span class="sub-name">{{ s.userName || 'Unknown' }}</span>
            <span class="sub-phone">{{ s.userPhone || s.phone || '&mdash;' }}</span>
          </div>
          <div class="sub-meta">
            <span :class="['plan-tag', s.planType]">{{ s.planType }}</span>
            <span class="sub-amount">{{ s.amount ? s.amount.toLocaleString() + ' UGX' : '&mdash;' }}</span>
            <span :class="['status-badge', 'st-' + s.status]">{{ s.status }}</span>
          </div>
        </div>

        <div class="sub-details">
          <span class="detail-row"><strong>Provider:</strong> {{ s.paymentMethod || '&mdash;' }}</span>
          <span class="detail-row"><strong>Submitted:</strong> {{ formatDate(s.createdAt) }}</span>
          <span v-if="s.expiresAt" class="detail-row"><strong>Expires:</strong> {{ formatDate(s.expiresAt) }}</span>
        </div>

        <!-- Payment reference (replaces proof upload) -->
        <div v-if="s.paymentReference" class="payment-ref-row">
          <span class="proof-label">&#128179; Payment Ref:</span>
          <code class="payment-ref">{{ s.paymentReference }}</code>
        </div>

        <!-- Rejection reason -->
        <div v-if="s.status === 'rejected' && s.rejectionReason" class="rejection-info">
          <strong>Rejection reason:</strong> {{ s.rejectionReason }}
        </div>

        <!-- Betslip info (active) -->
        <div v-if="s.status === 'active' && (s.betslipLink || s.betslipCode)" class="betslip-info">
          <span v-if="s.betslipLink">Link: <a :href="s.betslipLink" target="_blank" rel="noopener">{{ s.betslipLink }}</a></span>
          <span v-if="s.betslipCode">Code: <strong class="code">{{ s.betslipCode }}</strong></span>
        </div>

        <!-- Renew / Revoke (active or expired) -->
        <div v-if="s.status === 'active' || s.status === 'expired'" class="action-row">
          <button :class="['renew-btn', s.planType + '-renew']" @click="renewSub(s)" :disabled="renewing[s.id]">
            {{ renewing[s.id] ? 'Renewing&hellip;' : 'Renew' }}
          </button>
          <button v-if="s.status === 'active'" class="revoke-btn" @click="revokeSub(s)" :disabled="revoking[s.id]">
            {{ revoking[s.id] ? 'Revoking&hellip;' : 'Revoke' }}
          </button>
        </div>

        <!-- Pending: show reference info only (activation is automatic) -->
        <div v-if="s.status === 'pending'" class="confirm-panel pending-info-panel">
          <p class="pending-info-msg">Waiting for payment confirmation from the provider. This will activate automatically.</p>
          <div class="pending-actions">
            <button class="pending-activate-btn" @click="reconcileSub(s, 'success')" :disabled="reconciling[s.id]">
              {{ reconciling[s.id] ? 'Applying…' : 'Mark as Paid' }}
            </button>
            <button class="pending-fail-btn" @click="reconcileSub(s, 'failed')" :disabled="reconciling[s.id]">
              {{ reconciling[s.id] ? 'Applying…' : 'Mark Failed' }}
            </button>
          </div>
        </div>

        <!-- Admin edit panel (available on all statuses) -->
        <div v-if="editing[s.id]" class="edit-panel">
          <div class="edit-row">
            <label class="edit-label">Set Status</label>
            <select v-model="editStatus[s.id]" class="edit-select">
              <option value="success">&#10003; Confirm as Paid (Activate)</option>
              <option value="failed">&#10007; Mark as Failed / Revoke</option>
            </select>
          </div>
          <div v-if="editStatus[s.id] === 'success'" class="edit-row">
            <label class="edit-label">Transaction ID <span class="edit-optional">(optional)</span></label>
            <input v-model="editTxnId[s.id]" type="text" class="edit-input" placeholder="e.g. MP123456789" />
          </div>
          <div class="edit-actions">
            <button class="edit-save-btn" @click="saveEdit(s)" :disabled="editSaving[s.id]">
              {{ editSaving[s.id] ? 'Saving\u2026' : 'Apply Change' }}
            </button>
            <button class="edit-cancel-btn" @click="editing = { ...editing, [s.id]: false }">Cancel</button>
          </div>
        </div>

        <div class="card-footer-row">
          <button class="edit-toggle-btn" @click="toggleEdit(s)">
            {{ editing[s.id] ? '\u2715 Cancel Edit' : '\u270E Edit Payment' }}
          </button>
          <button v-if="s.status !== 'pending'" class="icon-del" @click="deleteSub(s.id)" title="Remove">Remove</button>
        </div>
      </div>
    </div>

    <!-- Group Management section -->
    <div class="vip-config-section">
      <h3 class="vc-title">Group Management</h3>
      <p class="editor-desc">Edit the betslip link and code for each package. These are assigned to users automatically on payment confirmation.</p>
      <div v-if="groupsLoading" class="state-msg">Loading groups&hellip;</div>
      <div v-else-if="groupsError" class="error-msg" style="padding:12px">{{ groupsError }}</div>
      <div v-else class="groups-grid">
        <div v-for="g in groups" :key="g.id" class="group-card" :class="{ 'special-group-card': g.isSpecial }">
          <div class="group-title">{{ g.name }}</div>
          <div class="group-meta">{{ g.oddsType }} Odds &middot; {{ planLabel(g.planType) }}</div>

          <!-- Special odds controls -->
          <template v-if="g.isSpecial">
            <div class="special-active-row">
              <label class="toggle-label">
                <input type="checkbox" v-model="groupEdits[g.id].isActive" />
                <span class="toggle-text">{{ groupEdits[g.id].isActive ? '🟢 Visible to users today' : '⚫ Hidden from users' }}</span>
              </label>
            </div>
            <div class="cfg-field" style="margin-bottom:10px">
              <label>Today's Price (UGX)</label>
              <input v-model.number="groupEdits[g.id].specialPrice" type="number" min="0" placeholder="Set today's price" />
            </div>
            <button class="reset-special-btn" :disabled="specialResetting[g.id]" @click="resetSpecial(g)" style="margin-bottom:10px">
              {{ specialResetting[g.id] ? 'Resetting…' : '↺ Reset (hide & clear price)' }}
            </button>
          </template>

          <template v-else>
            <div class="cfg-field" style="margin-bottom:10px">
              <label>Price (UGX)</label>
              <input v-model.number="groupEdits[g.id].price" type="number" min="0" />
            </div>
          </template>

          <div class="cfg-field" style="margin-bottom:10px">
            <label>Betslip Link</label>
            <input v-model="groupEdits[g.id].betslipLink" type="url" placeholder="https://betpawa.ug/share/&hellip;" />
          </div>
          <div class="cfg-field" style="margin-bottom:12px">
            <label>Betslip Code</label>
            <input v-model="groupEdits[g.id].betslipCode" type="text" placeholder="e.g. ABC123" />
          </div>
          <button class="save-btn" :disabled="groupSaving[g.id]" @click="saveGroup(g)">
            {{ groupSaving[g.id] ? 'Saving&hellip;' : '&#10003; Save' }}
          </button>
          <span v-if="groupSaved[g.id]" class="saved-msg">&#10003; Saved!</span>
          <span v-if="groupSaveError[g.id]" class="error-msg">{{ groupSaveError[g.id] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import adminApi from '../../utils/adminApi'

export default {
  name: 'PaymentsOverview',
  props: {
    focusSubscriptionId: { type: Number, default: null }
  },
  data() {
    return {
      subscriptions: [],
      loading: true,
      activeTier: 'daily',
      filterStatus: 'all',
      filterOdds: 'all',
      filters: [
        { val: 'all',      label: 'All' },
        { val: 'pending',  label: 'Pending' },
        { val: 'active',   label: 'Active' },
        { val: 'rejected', label: 'Rejected' },
        { val: 'expired',  label: 'Expired' }
      ],
      confirm:     {},
      confirming:  {},
      renewing:    {},
      revoking:    {},
      rejectOpen:  {},
      rejectReason:{},
      rejecting:   {},
      highlightId: null,
      // Groups management
      groups:         [],
      groupEdits:     {},
      groupSaving:    {},
      groupSaved:     {},
      groupSaveError: {},
      groupsLoading: true,
      groupsError: '',
      specialResetting: {},
      reconciling: {},
      editing:     {},
      editStatus:  {},
      editTxnId:   {},
      editSaving:  {},
      reportLoading: false,
      reportError: '',
      reportRange: {
        from: '',
        to: '',
      },
      activePreset: 'all',
      report: {
        summary: { totalPayments: 0, totalAmount: 0 },
        byStatus: [],
        byMethod: [],
        byPlan: []
      }
    }
  },
  computed: {
    tierSubs() {
      return this.subscriptions.filter(s => s.planType === this.activeTier)
    },
    oddsChips() {
      const map = {
        daily:   [{ val: 'all', label: 'All' }, { val: '5', label: '5 Odds' }],
        weekly:  [{ val: 'all', label: 'All' }, { val: '5', label: '5 Odds' }, { val: '2', label: '2 Odds (Big Staker)' }],
        monthly: [{ val: 'all', label: 'All' }, { val: '1.5', label: '1.5 Odds' }],
        special: [{ val: 'all', label: 'All' }, { val: 'special', label: 'Special Odds' }]
      }
      return map[this.activeTier] || [{ val: 'all', label: 'All' }]
    },
    displayed() {
      let subs = this.tierSubs
      if (this.filterOdds !== 'all') subs = subs.filter(s => (s.oddsType || '2') === this.filterOdds)
      if (this.filterStatus !== 'all') subs = subs.filter(s => s.status === this.filterStatus)
      return subs
    }
  },
  watch: {
    focusSubscriptionId(id) { if (id) this.focusOnSub(id) }
  },
  async mounted() {
    await Promise.all([this.loadSubs(), this.fetchGroups(), this.fetchReport()])
    if (this.focusSubscriptionId) {
      this.$nextTick(() => this.focusOnSub(this.focusSubscriptionId))
    }
  },
  methods: {
    normalizeSub(s) {
      return {
        ...s,
        planType:         s.planType         ?? s.plan_type,
        oddsType:         s.oddsType         ?? s.odds_type,
        paymentMethod:    s.paymentMethod    ?? s.payment_method,
        paymentReference: s.paymentReference ?? s.payment_reference,
        rejectionReason:  s.rejectionReason  ?? s.rejection_reason,
        betslipLink:      s.betslipLink      ?? s.betslip_link,
        betslipCode:      s.betslipCode      ?? s.betslip_code,
        expiresAt:        s.expiresAt        ?? s.expires_at,
        createdAt:        s.createdAt        ?? s.created_at,
        userName:         s.userName         ?? s.user?.username,
        userPhone:        s.userPhone        ?? s.user?.phone,
        transactionId:    s.transactionId    ?? s.payment?.transaction_id,
      }
    },
    async fetchReport() {
      this.reportLoading = true
      this.reportError = ''
      try {
        const params = {}
        if (this.reportRange.from) params.from = this.reportRange.from
        if (this.reportRange.to) params.to = this.reportRange.to

        const { data } = await adminApi.get('/api/payments/report', { params })
        this.report = {
          summary: data.summary || { totalPayments: 0, totalAmount: 0 },
          byStatus: data.byStatus || [],
          byMethod: data.byMethod || [],
          byPlan: data.byPlan || []
        }
      } catch {
        this.reportError = 'Could not load payments report.'
      } finally {
        this.reportLoading = false
      }
    },
    async resetReportRange() {
      this.reportRange.from = ''
      this.reportRange.to = ''
      this.activePreset = 'all'
      await this.fetchReport()
    },
    setPreset(period) {
      this.activePreset = period
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
      const today = fmt(now)
      if (period === 'all') {
        this.reportRange.from = ''; this.reportRange.to = ''
      } else if (period === 'today') {
        this.reportRange.from = today; this.reportRange.to = today
      } else if (period === 'week') {
        const d = new Date(now); d.setDate(d.getDate() - 6)
        this.reportRange.from = fmt(d); this.reportRange.to = today
      } else if (period === 'month') {
        this.reportRange.from = fmt(new Date(now.getFullYear(), now.getMonth(), 1))
        this.reportRange.to = today
      }
      this.fetchReport()
    },
    reportStatusCount(status) {
      const row = this.report.byStatus.find(x => x.status === status)
      return Number(row?.count || 0)
    },
    reportStatusAmount(status) {
      const row = this.report.byStatus.find(x => x.status === status)
      return Number(row?.amount || 0)
    },
    async loadSubs() {
      this.loading = true
      try {
        const { data } = await adminApi.get('/api/subscriptions')
        const normalized = data.map(s => this.normalizeSub(s))
        this.subscriptions = normalized
        normalized.forEach(s => {
          if (!this.rejectReason[s.id]) this.rejectReason[s.id] = ''
          if (this.rejectOpen[s.id] === undefined) this.rejectOpen[s.id] = false
        })
      } catch {
        this.subscriptions = []
      } finally {
        this.loading = false
      }
    },
    async fetchGroups() {
      this.groupsLoading = true
      this.groupsError = ''
      try {
        const { data } = await adminApi.get('/api/groups/admin')
        this.groups = data
        data.forEach(g => {
          this.groupEdits[g.id] = {
            price:        g.price,
            betslipLink:  g.betslipLink  || '',
            betslipCode:  g.betslipCode  || '',
            isActive:     g.isActive     !== false,
            specialPrice: g.specialPrice != null ? g.specialPrice : ''
          }
        })
      } catch {
        this.groupsError = 'Could not load groups.'
      } finally {
        this.groupsLoading = false
      }
    },
    async saveGroup(g) {
      this.groupSaving      = { ...this.groupSaving,      [g.id]: true }
      this.groupSaved       = { ...this.groupSaved,       [g.id]: false }
      this.groupSaveError   = { ...this.groupSaveError,   [g.id]: '' }
      try {
        const edits = this.groupEdits[g.id]
        const payload = {
          betslipLink:  edits.betslipLink,
          betslipCode:  edits.betslipCode
        }
        if (g.isSpecial) {
          payload.isActive     = edits.isActive
          payload.specialPrice = edits.specialPrice !== '' ? edits.specialPrice : null
        } else {
          payload.price = edits.price
        }
        const { data } = await adminApi.patch('/api/groups/' + g.id, payload)
        const idx = this.groups.findIndex(x => x.id === g.id)
        if (idx !== -1) this.groups.splice(idx, 1, data)
        this.groupSaved = { ...this.groupSaved, [g.id]: true }
        setTimeout(() => { this.groupSaved = { ...this.groupSaved, [g.id]: false } }, 3000)
      } catch {
        this.groupSaveError = { ...this.groupSaveError, [g.id]: 'Save failed.' }
      } finally {
        this.groupSaving = { ...this.groupSaving, [g.id]: false }
      }
    },
    planLabel(planType) {
      return { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', special: 'Special' }[planType] || planType
    },
    async resetSpecial(g) {
      this.specialResetting = { ...this.specialResetting, [g.id]: true }
      this.groupEdits[g.id].isActive     = false
      this.groupEdits[g.id].specialPrice = ''
      await this.saveGroup(g)
      this.specialResetting = { ...this.specialResetting, [g.id]: false }
    },
    countByTier(tier) {
      return this.subscriptions.filter(s => s.planType === tier).length
    },
    countByStatus(val) {
      if (val === 'all') return this.tierSubs.length
      return this.tierSubs.filter(s => s.status === val).length
    },
    countByOdds(val) {
      if (val === 'all') return this.tierSubs.length
      return this.tierSubs.filter(s => (s.oddsType || '2') === val).length
    },
    formatDate(ts) {
      if (!ts) return '\u2014'
      return new Date(ts).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    },
    focusOnSub(id) {
      const sub = this.subscriptions.find(s => s.id === id)
      if (!sub) return
      this.activeTier   = sub.planType || 'daily'
      this.filterOdds   = 'all'
      this.filterStatus = 'all'
      this.highlightId = id
      this.$nextTick(() => {
        const el = this.$refs['card-' + id]
        const node = Array.isArray(el) ? el[0] : el
        if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => { this.highlightId = null }, 3000)
      })
    },
    async renewSub(sub) {
      this.renewing = { ...this.renewing, [sub.id]: true }
      try {
        const { data } = await adminApi.post('/api/subscriptions/' + sub.id + '/renew')
        this.updateSub(sub.id, data)
      } catch {
        alert('Renew failed.')
      } finally {
        this.renewing = { ...this.renewing, [sub.id]: false }
      }
    },
    async revokeSub(sub) {
      if (!confirm('Revoke access for ' + (sub.userName || 'this user') + '?')) return
      this.revoking = { ...this.revoking, [sub.id]: true }
      try {
        const { data } = await adminApi.patch('/api/subscriptions/' + sub.id, {
          status: 'rejected',
          rejectionReason: 'Access revoked by admin'
        })
        this.updateSub(sub.id, data)
      } catch {
        alert('Revoke failed.')
      } finally {
        this.revoking = { ...this.revoking, [sub.id]: false }
      }
    },
    openReject(id) {
      this.rejectOpen   = { ...this.rejectOpen,   [id]: true }
      this.rejectReason = { ...this.rejectReason, [id]: '' }
    },
    async rejectSub(sub) {
      this.rejecting = { ...this.rejecting, [sub.id]: true }
      try {
        const { data } = await adminApi.patch('/api/subscriptions/' + sub.id, {
          status: 'rejected',
          rejectionReason: this.rejectReason[sub.id] || ''
        })
        this.updateSub(sub.id, data)
        this.rejectOpen[sub.id] = false
      } catch {
        alert('Rejection failed.')
      } finally {
        this.rejecting = { ...this.rejecting, [sub.id]: false }
      }
    },
    updateSub(id, newData) {
      const idx = this.subscriptions.findIndex(s => s.id === id)
      if (idx !== -1) {
        this.subscriptions.splice(idx, 1, this.normalizeSub({ ...this.subscriptions[idx], ...newData }))
      }
    },
    async reconcileSub(sub, status) {
      const actionLabel = status === 'success' ? 'mark this payment as confirmed' : 'mark this payment as failed'
      if (!confirm('Are you sure you want to ' + actionLabel + '?')) return

      let transactionId = null
      if (status === 'success') {
        transactionId = prompt('Enter provider transaction ID (optional):', sub.transactionId || '')
        if (transactionId === null) return
      }

      this.reconciling = { ...this.reconciling, [sub.id]: true }
      try {
        const payload = {
          reference: sub.paymentReference,
          subscriptionId: sub.id,
          status,
          transactionId: transactionId || null,
        }
        const { data } = await adminApi.post('/api/payments/reconcile', payload)
        if (data?.subscription) this.updateSub(sub.id, data.subscription)
        await this.fetchReport()
      } catch {
        alert('Reconcile failed. Please try again.')
      } finally {
        this.reconciling = { ...this.reconciling, [sub.id]: false }
      }
    },
    toggleEdit(sub) {
      const open = !this.editing[sub.id]
      this.editing    = { ...this.editing,    [sub.id]: open }
      this.editStatus = { ...this.editStatus, [sub.id]: 'success' }
      this.editTxnId  = { ...this.editTxnId,  [sub.id]: sub.transactionId || '' }
    },
    async saveEdit(sub) {
      const status = this.editStatus[sub.id]
      if (!status) return
      const actionLabel = status === 'success'
        ? 'confirm this payment as paid (activate)'
        : 'mark this payment as failed / revoke access'
      if (!confirm('Are you sure you want to ' + actionLabel + '?')) return

      this.editSaving = { ...this.editSaving, [sub.id]: true }
      try {
        const payload = {
          subscriptionId: sub.id,
          reference: sub.paymentReference,
          status,
          transactionId: this.editTxnId[sub.id] || null,
          force: true,
        }
        const { data } = await adminApi.post('/api/payments/reconcile', payload)
        if (data?.subscription) this.updateSub(sub.id, data.subscription)
        this.editing = { ...this.editing, [sub.id]: false }
        await this.fetchReport()
      } catch {
        alert('Could not apply change. Please try again.')
      } finally {
        this.editSaving = { ...this.editSaving, [sub.id]: false }
      }
    },
    async deleteSub(id) {
      if (!confirm('Delete this subscription record?')) return
      try {
        await adminApi.delete('/api/subscriptions/' + id)
        this.subscriptions = this.subscriptions.filter(s => s.id !== id)
      } catch {
        alert('Delete failed.')
      }
    }
  }
}
</script>

<style scoped>
.editor { max-width: 1120px; }
.editor-desc { font-size: 14px; color: rgba(255,255,255,0.58); margin-bottom: 22px; line-height: 1.7; border-left: 3px solid #FFD700; padding: 12px 0 12px 16px; }
.state-msg { font-size: 14px; color: #888; padding: 12px; }
.empty-state { padding: 32px; text-align: center; color: #555; font-size: 14px; background: #111; border-radius: 10px; margin-bottom: 24px; }

/* Report */
.report-wrap { background: rgba(12,12,12,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 18px; margin-bottom: 22px; }
.report-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
.report-title { margin: 0; font-size: 17px; color: #fff; font-weight: 900; letter-spacing: 0.2px; }
.report-actions { display: flex; gap: 8px; align-items: center; }
.report-refresh { padding: 7px 11px; border-radius: 8px; border: 1px solid rgba(255,215,0,0.25); background: rgba(255,215,0,0.08); color: #FFD700; font-size: 12px; font-weight: 700; cursor: pointer; }
.report-refresh:disabled { opacity: 0.55; cursor: not-allowed; }
.report-filter-row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 10px; }
.report-filter-field { display: flex; flex-direction: column; gap: 4px; }
.report-filter-field label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
.report-filter-field input { background: #161616; border: 1px solid rgba(255,255,255,0.12); color: #ddd; border-radius: 8px; padding: 7px 10px; font-size: 12px; }
.report-apply,
.report-reset { padding: 7px 11px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; }
.report-apply { border: 1px solid rgba(79,195,247,0.35); background: rgba(79,195,247,0.08); color: #4fc3f7; }
.report-reset { border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color: #bbb; }
.report-apply:disabled,
.report-reset:disabled { opacity: 0.55; cursor: not-allowed; }
.period-presets { display: inline-flex; gap: 0; flex-wrap: nowrap; align-items: center; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; overflow: hidden; }
.preset-btn { padding: 7px 12px; border-radius: 0; border: none; border-right: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #bbb; font-size: 12px; font-weight: 700; cursor: pointer; transition: border-color 0.18s, color 0.18s, background 0.18s; }
.preset-btn:last-child { border-right: none; }
.preset-btn:hover { border-color: rgba(255,215,0,0.3); color: #FFD700; }
.preset-active { border-color: rgba(255,215,0,0.5) !important; background: rgba(255,215,0,0.1) !important; color: #FFD700 !important; }
.report-grid { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 12px; }
.report-card { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.07); border-left: 3px solid rgba(255,255,255,0.32); border-radius: 12px; padding: 15px; }
.report-card--green { border-color: rgba(76,175,80,0.4); background: rgba(76,175,80,0.07); }
.report-card--green .report-label { color: #81c784; }
.report-card--green .report-value { color: #4caf50; }
.report-label { font-size: 11px; color: #9a9a9a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
.report-value { font-size: 26px; color: #fff; font-weight: 900; line-height: 1.1; }
.report-value--muted { font-size: 19px; color: #ccc; font-weight: 800; }
.report-sub { display: inline-block; font-size: 11px; color: #9a9a9a; font-weight: 600; margin-left: 4px; }

/* Tier tabs */
.tier-tabs { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
.tier-tab { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 11px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.035); color: #888; font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.2s; }
.daily-tab.active   { border-color: #4fc3f7; color: #4fc3f7; background: rgba(79,195,247,0.08); }
.weekly-tab.active  { border-color: #FFD700; color: #FFD700; background: rgba(255,215,0,0.08); }
.monthly-tab.active { border-color: #fb8c00; color: #fb8c00; background: rgba(251,140,0,0.08); }
.special-tab.active { border-color: #ab47bc; color: #ab47bc; background: rgba(171,71,188,0.08); }
.tier-dot { display: none; }
.daily-dot   { background: #4fc3f7; }
.weekly-dot  { background: #FFD700; }
.monthly-dot { background: #fb8c00; }
.special-dot { background: #ab47bc; }
.tier-count { background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 10px; font-size: 11px; }

/* Filter toolbar */
.toolbar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.filter-btn { background: #111; border: 1px solid rgba(255,255,255,0.08); color: #888; font-size: 13px; font-weight: 700; padding: 7px 14px; border-radius: 20px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
.filter-btn.active { border-color: var(--gold, #FFD700); color: #FFD700; background: rgba(255,215,0,0.07); }
.count { background: rgba(255,255,255,0.08); padding: 1px 7px; border-radius: 10px; font-size: 11px; }

/* Sub cards */
.sub-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 40px; }
.sub-card { background: rgba(17,17,17,0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 13px; padding: 18px 20px; position: relative; border-left: 4px solid transparent; transition: box-shadow 0.3s, border-color 0.2s; }
.sub-card:hover { border-color: rgba(255,215,0,0.18); }
.daily-card  { border-left-color: #4fc3f7; }
.weekly-card { border-left-color: #FFD700; }
.highlight-card { box-shadow: 0 0 0 3px rgba(255,215,0,0.45), 0 8px 24px rgba(0,0,0,0.5); }

/* Tier ribbon */
.tier-ribbon { display: inline-block; font-size: 9px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 10px; border-radius: 8px; margin-bottom: 10px; }
.daily-ribbon   { background: rgba(79,195,247,0.12);  color: #4fc3f7; }
.weekly-ribbon  { background: rgba(255,215,0,0.12);   color: #FFD700; }
.monthly-ribbon { background: rgba(251,140,0,0.12);   color: #fb8c00; }
.special-ribbon { background: rgba(171,71,188,0.12);  color: #ab47bc; }

.sub-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
.sub-user { display: flex; flex-direction: column; gap: 4px; }
.sub-name  { font-size: 15px; font-weight: 700; color: #fff; }
.sub-phone { font-size: 12px; color: #888; }
.sub-meta  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.plan-tag { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px; text-transform: uppercase; }
.plan-tag.daily   { background: rgba(79,195,247,0.1);   color: #4fc3f7; }
.plan-tag.weekly  { background: rgba(255,215,0,0.1);    color: #FFD700; }
.plan-tag.monthly { background: rgba(251,140,0,0.1);    color: #fb8c00; }
.plan-tag.special { background: rgba(171,71,188,0.1);   color: #ab47bc; }
.sub-amount { font-size: 13px; font-weight: 700; color: #fff; }
.status-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px; text-transform: uppercase; }
.st-pending  { background: rgba(255,165,0,0.1);   color: #FFA500; }
.st-active   { background: rgba(0,200,83,0.1);    color: #00c853; }
.st-rejected { background: rgba(255,82,82,0.1);   color: #ff5252; }
.st-expired  { background: rgba(255,255,255,0.05); color: #555; }
.st-failed   { background: rgba(255,82,82,0.07);  color: #ff7070; }
.sub-details { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.detail-row { font-size: 12px; color: #888; }
.detail-row strong { color: #aaa; }

/* Proof */
.proof-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.proof-label { font-size: 12px; color: #888; }
.proof-thumb { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,215,0,0.25); cursor: pointer; transition: transform 0.15s; }
.proof-thumb:hover { transform: scale(1.05); }
.proof-missing { font-size: 12px; color: #666; margin-bottom: 12px; }
.rejection-info { font-size: 12px; color: #ff7272; background: rgba(255,82,82,0.07); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; }

/* Betslip info */
.betslip-info { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #888; margin-bottom: 12px; }
.betslip-info a { color: #FFD700; word-break: break-all; }
.code { color: #FFD700; font-size: 15px; font-family: monospace; letter-spacing: 2px; }

/* Renew / Revoke */
.action-row { display: flex; gap: 8px; margin-bottom: 8px; }
.renew-btn { padding: 8px 18px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
.renew-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.daily-renew   { background: rgba(79,195,247,0.15);  color: #4fc3f7; border: 1px solid rgba(79,195,247,0.3); }
.weekly-renew  { background: rgba(255,215,0,0.12);   color: #FFD700; border: 1px solid rgba(255,215,0,0.3); }
.monthly-renew { background: rgba(251,140,0,0.12);   color: #fb8c00; border: 1px solid rgba(251,140,0,0.3); }
.special-renew { background: rgba(171,71,188,0.12);  color: #ab47bc; border: 1px solid rgba(171,71,188,0.3); }
.revoke-btn { padding: 8px 18px; background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.25); color: #ff5252; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.revoke-btn:hover { background: rgba(255,82,82,0.2); }
.revoke-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Confirm panel */
.confirm-panel { border-radius: 10px; padding: 16px; margin-top: 8px; }
.daily-panel   { background: rgba(79,195,247,0.04); border: 1px solid rgba(79,195,247,0.2); }
.weekly-panel  { background: rgba(255,215,0,0.04);  border: 1px solid rgba(255,215,0,0.2); }
.cp-title { font-size: 13px; font-weight: 700; color: #FFD700; margin-bottom: 12px; }
.cp-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }
.cp-hint { font-size: 11px; color: #555; margin-bottom: 12px; }
.cp-field { display: flex; flex-direction: column; gap: 6px; }
.cp-field label { font-size: 10px; font-weight: 700; color: #888; letter-spacing: 1px; text-transform: uppercase; }
.cp-field input { background: #1a1a1a; border: 1px solid rgba(255,215,0,0.2); border-radius: 8px; padding: 9px 12px; color: #fff; font-size: 13px; outline: none; }
.cp-field input:focus { border-color: rgba(255,215,0,0.45); }
.cp-actions { display: flex; gap: 10px; }
.confirm-btn { flex: 1; padding: 10px; border: none; border-radius: 8px; font-size: 13px; font-weight: 800; cursor: pointer; transition: opacity 0.2s; }
.confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.daily-confirm  { background: linear-gradient(135deg,#0288d1,#4fc3f7); color: #000; }
.weekly-confirm { background: linear-gradient(135deg,#B8860B,#FFD700); color: #000; }
.reject-open-btn { padding: 10px 16px; background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.2); color: #ff5252; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; }
.reject-open-btn:hover { background: rgba(255,82,82,0.2); }

/* Inline reject form */
.reject-form { margin-top: 12px; background: rgba(255,82,82,0.05); border: 1px solid rgba(255,82,82,0.15); border-radius: 8px; padding: 12px; }
.reject-label { display: block; font-size: 10px; font-weight: 700; color: #888; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
.reject-input { width: 100%; background: #1a1a1a; border: 1px solid rgba(255,82,82,0.25); border-radius: 7px; padding: 9px 12px; color: #fff; font-size: 13px; outline: none; box-sizing: border-box; }
.reject-input:focus { border-color: rgba(255,82,82,0.5); }
.reject-actions { display: flex; gap: 8px; margin-top: 10px; }
.reject-confirm-btn { flex: 1; padding: 9px; background: #c0392b; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; }
.reject-confirm-btn:disabled { opacity: 0.5; }
.reject-cancel-btn { padding: 9px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #aaa; border-radius: 8px; font-size: 13px; cursor: pointer; }

.icon-del-old-placeholder { display: none; /* superseded by card-footer-row .icon-del */ }

/* Payment reference */
.payment-ref-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.payment-ref { background: #1a1a1a; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #aaa; word-break: break-all; }

/* Pending info panel (replaces confirm panel) */
.pending-info-panel { background: rgba(255,165,0,0.05); border: 1px solid rgba(255,165,0,0.2); border-radius: 10px; padding: 14px; margin-top: 12px; }
.pending-info-msg { font-size: 13px; color: #ffb347; margin: 0; }
.pending-actions { display: flex; gap: 8px; margin-top: 12px; }
.pending-activate-btn,
.pending-fail-btn { padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.pending-activate-btn { background: rgba(0,200,83,0.12); border-color: rgba(0,200,83,0.3); color: #00c853; }
.pending-fail-btn { background: rgba(255,82,82,0.10); border-color: rgba(255,82,82,0.25); color: #ff6b6b; }
.pending-activate-btn:disabled,
.pending-fail-btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* Groups grid */
.groups-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.group-card { background: #111; border: 1px solid rgba(255,215,0,0.12); border-radius: 12px; padding: 18px; }
.group-card.special-group-card { border-color: rgba(171,71,188,0.35); }
.group-title { font-size: 15px; font-weight: 800; color: #fff; margin-bottom: 4px; }
.group-meta { font-size: 11px; color: #666; margin-bottom: 14px; }

/* Special group controls */
.special-active-row { margin-bottom: 12px; }
.toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #ccc; }
.toggle-label input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; accent-color: #ab47bc; }
.reset-special-btn { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #888; border-radius: 8px; padding: 8px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.reset-special-btn:hover:not(:disabled) { background: rgba(255,82,82,0.08); border-color: rgba(255,82,82,0.25); color: #ff7272; }
.reset-special-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Lightbox */
.lightbox-overlay { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.88); display: flex; align-items: center; justify-content: center; }
.lightbox-box { position: relative; max-width: 90vw; max-height: 90vh; }
.lightbox-close { position: absolute; top: -14px; right: -14px; background: #333; border: none; color: #fff; font-size: 18px; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; z-index: 1; }
.lightbox-img { display: block; max-width: 90vw; max-height: 88vh; border-radius: 10px; object-fit: contain; }

/* VIP Config */
.vip-config-section { border-top: 1px solid rgba(255,215,0,0.14); padding-top: 32px; margin-top: 12px; }
.vc-title { font-size: 18px; font-weight: 900; color: #fff; margin-bottom: 12px; }
.cfg-form { background: #111; border: 1px solid rgba(255,215,0,0.1); border-radius: 14px; padding: 24px; }
.cfg-section-label { font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #666; margin-bottom: 12px; margin-top: 8px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.daily-label  { color: #4fc3f7; }
.weekly-label { color: #FFD700; }
.cfg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.cfg-field { display: flex; flex-direction: column; gap: 7px; }
.cfg-field label { font-size: 11px; font-weight: 700; color: #888; letter-spacing: 1px; text-transform: uppercase; }
.cfg-field input { background: #1a1a1a; border: 1px solid rgba(255,215,0,0.15); border-radius: 8px; padding: 11px 14px; color: #fff; font-size: 14px; outline: none; transition: border-color 0.2s; }
.cfg-field input:focus { border-color: rgba(255,215,0,0.45); }
.cfg-actions { display: flex; align-items: center; gap: 16px; margin-top: 4px; }
.save-btn { background: linear-gradient(135deg,#FFD700,#FFA500); color: #000; border: none; border-radius: 9px; padding: 12px 28px; font-size: 14px; font-weight: 800; cursor: pointer; transition: opacity 0.2s; }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.saved-msg { color: #4caf50; font-size: 13px; font-weight: 600; }
.error-msg { color: #ff5252; font-size: 13px; }

@media (max-width: 600px) {
  .cp-fields, .cfg-row { grid-template-columns: 1fr; }
  .sub-top { flex-direction: column; }
  .tier-tabs { flex-direction: column; }
  .report-grid { grid-template-columns: 1fr 1fr; }
  .pending-actions { flex-direction: column; }
  .report-filter-row { align-items: stretch; }
}

/* Odds sub-filter chips */
.odds-filter-row { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 18px; }
.odds-chip { background: #111; border: 1px solid rgba(255,255,255,0.08); color: #888; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 16px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 5px; }
.odds-chip.active { border-color: #a78bfa; color: #a78bfa; background: rgba(167,139,250,0.08); }
.odds-chip .count { background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 8px; font-size: 10px; }

/* Tier ribbon row */
.tier-ribbon-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.odds-ribbon { display: inline-block; font-size: 9px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 10px; border-radius: 8px; background: rgba(167,139,250,0.12); color: #a78bfa; }

/* Package config labels */
.pkg-label { margin-top: 16px; }
.pkg-1-5 { color: #4fc3f7; }
.pkg-2   { color: var(--gold, #FFD700); }
.pkg-5   { color: #ff7043; }
.cfg-field-full { grid-column: 1 / -1; }

/* Card footer row (edit + delete side by side) */
.card-footer-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.edit-toggle-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(100,149,237,0.35); background: rgba(100,149,237,0.07); color: #6495ed; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s, border-color 0.2s; }
.edit-toggle-btn:hover { background: rgba(100,149,237,0.14); border-color: rgba(100,149,237,0.55); }
.icon-del { position: static; background: rgba(255,82,82,0.08); border: 1px solid rgba(255,82,82,0.18); border-radius: 8px; color: #ff7070; padding: 5px 9px; font-size: 11px; font-weight: 800; cursor: pointer; opacity: 0.72; transition: opacity 0.2s, background 0.2s; margin-left: auto; }
.icon-del:hover { opacity: 1; background: rgba(255,82,82,0.16); }

/* Edit panel */
.edit-panel { background: rgba(100,149,237,0.06); border: 1px solid rgba(100,149,237,0.22); border-radius: 10px; padding: 14px 16px; margin-top: 12px; }
.edit-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.edit-label { font-size: 10px; font-weight: 700; color: #9ab3e8; letter-spacing: 1px; text-transform: uppercase; }
.edit-optional { font-size: 10px; color: #666; font-weight: 400; text-transform: none; letter-spacing: 0; }
.edit-select { background: #1a1a1a; border: 1px solid rgba(100,149,237,0.3); border-radius: 8px; color: #ddd; font-size: 13px; padding: 9px 12px; outline: none; width: 100%; cursor: pointer; }
.edit-select:focus { border-color: rgba(100,149,237,0.6); }
.edit-input { background: #1a1a1a; border: 1px solid rgba(100,149,237,0.25); border-radius: 8px; color: #fff; font-size: 13px; padding: 9px 12px; outline: none; width: 100%; box-sizing: border-box; }
.edit-input:focus { border-color: rgba(100,149,237,0.55); }
.edit-actions { display: flex; gap: 8px; margin-top: 4px; }
.edit-save-btn { flex: 1; padding: 9px; background: linear-gradient(135deg, #3a7bd5, #6495ed); color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
.edit-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.edit-cancel-btn { padding: 9px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #aaa; border-radius: 8px; font-size: 13px; cursor: pointer; }
.edit-cancel-btn:hover { background: rgba(255,255,255,0.09); }
</style>
