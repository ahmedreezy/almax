<template>
  <section class="release-manager">
    <div class="release-head">
      <div>
        <span class="release-kicker">Ticket lifecycle</span>
        <h3>Publish &amp; settle package tickets</h3>
        <p>Publish a ticket with its cutoff, then mark it passed or failed. A failed ticket grants one shared recovery ticket to every eligible paid subscriber.</p>
      </div>
      <button class="refresh-btn" :disabled="loading" @click="fetchReleases">Refresh</button>
    </div>

    <form class="publish-form" @submit.prevent="publishRelease">
      <label>
        Package
        <select v-model="form.groupId" required>
          <option value="" disabled>Select package</option>
          <option v-for="pkg in packages" :key="pkg.id" :value="pkg.id">{{ pkg.name }}</option>
        </select>
      </label>
      <label>
        Cutoff time
        <input v-model="form.cutoffAt" type="datetime-local" required />
      </label>
      <label class="wide">
        Betslip link
        <input v-model.trim="form.betslipLink" type="url" placeholder="https://…" />
      </label>
      <label>
        Betslip code
        <input v-model.trim="form.betslipCode" type="text" placeholder="ABC123" />
      </label>
      <button class="publish-btn" :disabled="publishing">
        {{ publishing ? 'Publishing…' : 'Publish ticket' }}
      </button>
    </form>

    <p v-if="notice" :class="['release-notice', noticeType]">{{ notice }}</p>

    <div v-if="loading" class="release-empty">Loading ticket releases…</div>
    <div v-else-if="paidReleases.length === 0" class="release-empty">No tickets have been published through the release tracker yet.</div>
    <div v-else class="release-list">
      <article v-for="release in paidReleases" :key="release.public_id" class="release-card">
        <div class="release-summary">
          <div>
            <div class="release-title">{{ release.group?.name || 'Package' }}</div>
            <div class="release-meta">Published {{ formatDate(release.published_at) }} · cutoff {{ formatDate(release.cutoff_at) }}</div>
          </div>
          <span :class="['result-pill', release.result]">{{ release.result }}</span>
        </div>

        <div class="release-ticket">
          <a v-if="release.betslip_link" :href="release.betslip_link" target="_blank" rel="noopener">Open betslip</a>
          <code v-if="release.betslip_code">{{ release.betslip_code }}</code>
        </div>

        <div v-if="release.result === 'pending'" class="settle-actions">
          <button class="pass-btn" :disabled="!canSettle(release) || settlingId === release.public_id" @click="settle(release, 'passed')">
            Mark passed
          </button>
          <button class="fail-btn" :disabled="!canSettle(release) || settlingId === release.public_id" @click="openRecovery(release)">
            Mark failed
          </button>
          <span v-if="!canSettle(release)" class="settle-hint">Available after cutoff.</span>
        </div>

        <form v-if="recoveryFor === release.public_id" class="recovery-form" @submit.prevent="settle(release, 'failed')">
          <strong>Add the one free recovery ticket</strong>
          <p>This same replacement will be granted to all users who paid for this release before its cutoff.</p>
          <input v-model.trim="recoveryForm.betslipLink" type="url" placeholder="Recovery betslip link" />
          <input v-model.trim="recoveryForm.betslipCode" type="text" placeholder="Recovery betslip code" />
          <div>
            <button class="confirm-fail" :disabled="settlingId === release.public_id">Confirm failure &amp; grant recovery</button>
            <button type="button" class="cancel-btn" @click="recoveryFor = null">Cancel</button>
          </div>
        </form>

        <div v-if="release.result === 'failed'" class="recovery-count">
          Recovery issued. Eligible users receive it in My Subscriptions and an in-app alert.
        </div>
      </article>
    </div>
  </section>
</template>

<script>
import adminApi from '@/utils/adminApi'

export default {
  name: 'PackageReleaseManager',
  emits: ['published'],
  props: {
    packages: { type: Array, default: () => [] }
  },
  data() {
    const cutoff = new Date(Date.now() + 60 * 60 * 1000)
    cutoff.setMinutes(cutoff.getMinutes() - cutoff.getTimezoneOffset())
    return {
      releases: [],
      loading: true,
      publishing: false,
      settlingId: null,
      recoveryFor: null,
      notice: '',
      noticeType: 'success',
      form: { groupId: '', cutoffAt: cutoff.toISOString().slice(0, 16), betslipLink: '', betslipCode: '' },
      recoveryForm: { betslipLink: '', betslipCode: '' }
    }
  },
  computed: {
    paidReleases() {
      return this.releases.filter(item => item.type === 'paid')
    }
  },
  mounted() {
    this.fetchReleases()
  },
  methods: {
    flash(message, type = 'success') {
      this.notice = message
      this.noticeType = type
    },
    async fetchReleases() {
      this.loading = true
      try {
        const { data } = await adminApi.get('/api/package-releases')
        this.releases = Array.isArray(data) ? data : []
      } catch (error) {
        this.flash(error.response?.data?.message || 'Could not load ticket releases.', 'error')
      } finally {
        this.loading = false
      }
    },
    async publishRelease() {
      if (!this.form.betslipLink && !this.form.betslipCode) {
        this.flash('Add a betslip link or code.', 'error')
        return
      }
      this.publishing = true
      try {
        await adminApi.post('/api/package-releases', {
          groupId: Number(this.form.groupId),
          cutoffAt: new Date(this.form.cutoffAt).toISOString(),
          betslipLink: this.form.betslipLink || null,
          betslipCode: this.form.betslipCode || null
        })
        this.flash('Ticket published and active subscribers updated.')
        this.$emit('published')
        this.form.betslipLink = ''
        this.form.betslipCode = ''
        await this.fetchReleases()
      } catch (error) {
        this.flash(error.response?.data?.message || 'Could not publish this ticket.', 'error')
      } finally {
        this.publishing = false
      }
    },
    canSettle(release) {
      return Date.now() >= new Date(release.cutoff_at).getTime()
    },
    openRecovery(release) {
      this.recoveryFor = release.public_id
      this.recoveryForm = { betslipLink: '', betslipCode: '' }
    },
    async settle(release, result) {
      if (result === 'failed' && !this.recoveryForm.betslipLink && !this.recoveryForm.betslipCode) {
        this.flash('Add a recovery betslip link or code.', 'error')
        return
      }
      this.settlingId = release.public_id
      try {
        await adminApi.post(`/api/package-releases/${release.public_id}/result`, {
          result,
          recoveryBetslipLink: result === 'failed' ? this.recoveryForm.betslipLink || null : null,
          recoveryBetslipCode: result === 'failed' ? this.recoveryForm.betslipCode || null : null
        })
        this.recoveryFor = null
        this.flash(result === 'failed' ? 'Failure recorded and recovery tickets granted.' : 'Ticket marked as passed.')
        await this.fetchReleases()
      } catch (error) {
        this.flash(error.response?.data?.message || 'Could not record the result.', 'error')
      } finally {
        this.settlingId = null
      }
    },
    formatDate(value) {
      return value ? new Date(value).toLocaleString('en-UG') : '—'
    }
  }
}
</script>

<style scoped>
.release-manager { margin-top: 28px; padding: 24px; border: 1px solid rgba(255,215,0,.16); border-radius: 16px; background: #111; color: #fff; }
.release-head { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; }
.release-kicker { color:#ffd700; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; }
.release-head h3 { margin:5px 0 6px; font-size:20px; }
.release-head p { margin:0; max-width:720px; color:rgba(255,255,255,.56); font-size:13px; line-height:1.55; }
.refresh-btn,.cancel-btn { background:transparent; color:rgba(255,255,255,.7); border:1px solid rgba(255,255,255,.15); border-radius:8px; padding:8px 12px; cursor:pointer; }
.publish-form { display:grid; grid-template-columns:1fr 1fr 1.6fr 1fr auto; gap:12px; align-items:end; margin-top:22px; }
.publish-form label { display:flex; flex-direction:column; gap:6px; color:rgba(255,255,255,.55); font-size:11px; font-weight:800; text-transform:uppercase; }
.publish-form input,.publish-form select,.recovery-form input { width:100%; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.13); color:#fff; border-radius:9px; padding:10px 11px; outline:none; }
.publish-form select option { background:#151515; }
.publish-btn { border:0; border-radius:9px; padding:11px 16px; background:#ffd700; color:#111; font-weight:900; cursor:pointer; white-space:nowrap; }
button:disabled { opacity:.45; cursor:not-allowed; }
.release-notice { padding:10px 12px; border-radius:9px; margin:14px 0 0; font-size:13px; background:rgba(61,201,113,.1); color:#7ee2a2; }
.release-notice.error { background:rgba(255,82,82,.1); color:#ff8585; }
.release-list { display:grid; gap:12px; margin-top:20px; }
.release-empty { padding:28px 0 6px; color:rgba(255,255,255,.45); text-align:center; }
.release-card { padding:16px; border:1px solid rgba(255,255,255,.09); border-radius:12px; background:rgba(255,255,255,.025); }
.release-summary { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.release-title { font-weight:800; }
.release-meta { color:rgba(255,255,255,.43); font-size:12px; margin-top:4px; }
.result-pill { border-radius:999px; padding:5px 9px; font-size:10px; font-weight:900; text-transform:uppercase; }
.result-pill.pending { background:rgba(255,193,7,.12); color:#ffd45c; }
.result-pill.passed { background:rgba(62,205,119,.12); color:#72df9b; }
.result-pill.failed { background:rgba(255,82,82,.12); color:#ff7e7e; }
.release-ticket { display:flex; gap:12px; align-items:center; margin-top:12px; }
.release-ticket a { color:#ffd700; }
.release-ticket code { background:#050505; border-radius:6px; padding:5px 8px; color:#fff; }
.settle-actions { display:flex; align-items:center; gap:8px; margin-top:14px; }
.pass-btn,.fail-btn,.confirm-fail { border:0; border-radius:8px; padding:9px 12px; font-weight:800; cursor:pointer; }
.pass-btn { color:#72df9b; background:rgba(62,205,119,.12); }
.fail-btn,.confirm-fail { color:#ff8585; background:rgba(255,82,82,.12); }
.settle-hint { color:rgba(255,255,255,.38); font-size:12px; }
.recovery-form { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px; padding:14px; border-radius:10px; background:rgba(255,82,82,.06); }
.recovery-form strong,.recovery-form p,.recovery-form div { grid-column:1/-1; }
.recovery-form p,.recovery-count { color:rgba(255,255,255,.5); font-size:12px; margin:0; }
.recovery-form div { display:flex; gap:8px; }
.recovery-count { margin-top:12px; color:#ffb3b3; }
@media (max-width: 1050px) { .publish-form { grid-template-columns:1fr 1fr; } .publish-form .wide { grid-column:auto; } }
@media (max-width: 640px) { .release-manager{padding:17px}.release-head{flex-direction:column}.publish-form,.recovery-form{grid-template-columns:1fr}.recovery-form strong,.recovery-form p,.recovery-form div{grid-column:auto}.release-summary{align-items:flex-start}.settle-actions{flex-wrap:wrap} }
</style>
