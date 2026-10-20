<template>
  <section class="release-manager">
    <div class="release-head">
      <div>
        <span class="release-kicker">Package tickets</span>
        <h3>Package releases</h3>
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

    <section class="recovery-panel" aria-labelledby="recovery-title">
      <div class="recovery-heading">
        <div>
          <span class="release-kicker">Compensation</span>
          <h3 id="recovery-title">Recovery tickets</h3>
        </div>
        <span class="selection-count">{{ selectedReleaseIds.length }} selected</span>
      </div>

      <form class="recovery-form" @submit.prevent="issueRecovery">
        <fieldset v-if="recoveryCandidates.length" class="recovery-packages">
          <legend class="sr-only">Select failed packages</legend>
          <label v-for="release in recoveryCandidates" :key="release.public_id" :class="['recovery-option', { selected: selectedReleaseIds.includes(release.public_id) }]">
            <input v-model="selectedReleaseIds" type="checkbox" :value="release.public_id" />
            <span>{{ release.group?.name || 'Package' }}</span>
            <small>{{ formatDate(release.cutoff_at) }}</small>
          </label>
        </fieldset>
        <div v-else class="recovery-empty">No packages ready for recovery.</div>
        <label>
          Recovery betslip link
          <input v-model.trim="recoveryForm.betslipLink" type="url" placeholder="https://…" />
        </label>
        <label>
          Recovery betslip code
          <input v-model.trim="recoveryForm.betslipCode" type="text" placeholder="ABC123" />
        </label>
        <button class="recovery-submit" :disabled="issuingRecovery || selectedReleaseIds.length === 0">
          {{ issuingRecovery ? 'Issuing…' : 'Issue recovery ticket' }}
        </button>
      </form>
    </section>

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
          <button class="fail-btn" :disabled="!canSettle(release) || settlingId === release.public_id" @click="toggleRecovery(release)">
            {{ selectedReleaseIds.includes(release.public_id) ? 'Remove recovery' : 'Add recovery' }}
          </button>
          <span v-if="!canSettle(release)" class="settle-hint">Available after cutoff.</span>
        </div>

        <div v-if="release.result === 'failed'" class="recovery-count">Recovery issued</div>
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
      issuingRecovery: false,
      selectedReleaseIds: [],
      notice: '',
      noticeType: 'success',
      form: { groupId: '', cutoffAt: cutoff.toISOString().slice(0, 16), betslipLink: '', betslipCode: '' },
      recoveryForm: { betslipLink: '', betslipCode: '' }
    }
  },
  computed: {
    paidReleases() {
      return this.releases.filter(item => item.type === 'paid')
    },
    recoveryCandidates() {
      return this.paidReleases.filter(item => item.result === 'pending' && this.canSettle(item))
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
        const availableIds = new Set(this.recoveryCandidates.map(item => item.public_id))
        this.selectedReleaseIds = this.selectedReleaseIds.filter(id => availableIds.has(id))
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
    toggleRecovery(release) {
      const index = this.selectedReleaseIds.indexOf(release.public_id)
      if (index >= 0) this.selectedReleaseIds.splice(index, 1)
      else this.selectedReleaseIds.push(release.public_id)
    },
    async settle(release, result) {
      this.settlingId = release.public_id
      try {
        await adminApi.post(`/api/package-releases/${release.public_id}/result`, {
          result
        })
        this.flash('Ticket marked as passed.')
        await this.fetchReleases()
      } catch (error) {
        this.flash(error.response?.data?.message || 'Could not record the result.', 'error')
      } finally {
        this.settlingId = null
      }
    },
    async issueRecovery() {
      if (!this.selectedReleaseIds.length) {
        this.flash('Select at least one package.', 'error')
        return
      }
      if (!this.recoveryForm.betslipLink && !this.recoveryForm.betslipCode) {
        this.flash('Add a recovery betslip link or code.', 'error')
        return
      }
      this.issuingRecovery = true
      try {
        await adminApi.post('/api/package-releases/recovery', {
          releaseIds: this.selectedReleaseIds,
          recoveryBetslipLink: this.recoveryForm.betslipLink || null,
          recoveryBetslipCode: this.recoveryForm.betslipCode || null
        })
        this.flash(`Recovery ticket issued for ${this.selectedReleaseIds.length} package${this.selectedReleaseIds.length === 1 ? '' : 's'}.`)
        this.selectedReleaseIds = []
        this.recoveryForm = { betslipLink: '', betslipCode: '' }
        await this.fetchReleases()
      } catch (error) {
        this.flash(error.response?.data?.message || 'Could not issue the recovery ticket.', 'error')
      } finally {
        this.issuingRecovery = false
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
.pass-btn,.fail-btn { border:0; border-radius:8px; padding:9px 12px; font-weight:800; cursor:pointer; }
.pass-btn { color:#72df9b; background:rgba(62,205,119,.12); }
.fail-btn { color:#ffd45c; background:rgba(255,193,7,.12); }
.settle-hint { color:rgba(255,255,255,.38); font-size:12px; }
.recovery-panel { margin-top:20px; padding:18px; border:1px solid rgba(255,215,0,.24); border-radius:13px; background:rgba(255,215,0,.045); }
.recovery-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.recovery-heading h3 { margin:4px 0 0; font-size:18px; }
.selection-count { padding:5px 8px; border-radius:999px; background:rgba(255,215,0,.11); color:#ffd700; font-size:10px; font-weight:850; text-transform:uppercase; }
.recovery-form { display:grid; grid-template-columns:1fr 1fr auto; gap:12px; align-items:end; margin-top:15px; }
.recovery-form > label { display:flex; flex-direction:column; gap:6px; color:rgba(255,255,255,.55); font-size:11px; font-weight:800; text-transform:uppercase; }
.recovery-packages { grid-column:1/-1; display:flex; flex-wrap:wrap; gap:8px; padding:0; border:0; }
.recovery-option { display:grid; grid-template-columns:auto 1fr; column-gap:8px; align-items:center; min-width:180px; padding:9px 11px; border:1px solid rgba(255,255,255,.12); border-radius:9px; background:rgba(255,255,255,.035); cursor:pointer; }
.recovery-option.selected { border-color:rgba(255,215,0,.55); background:rgba(255,215,0,.1); }
.recovery-option input { width:15px; height:15px; grid-row:1/3; accent-color:#ffd700; }
.recovery-option span { color:#fff; font-size:12px; font-weight:800; }
.recovery-option small { color:rgba(255,255,255,.42); font-size:9px; }
.recovery-empty { grid-column:1/-1; color:rgba(255,255,255,.4); font-size:12px; }
.recovery-submit { border:0; border-radius:9px; padding:11px 15px; background:#ffd700; color:#111; font-weight:900; white-space:nowrap; cursor:pointer; }
.recovery-count { margin-top:12px; color:#ffb3b3; font-size:12px; }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
@media (max-width: 1050px) { .publish-form { grid-template-columns:1fr 1fr; } .publish-form .wide { grid-column:auto; } }
@media (max-width: 760px) { .recovery-form { grid-template-columns:1fr; } .recovery-packages,.recovery-empty { grid-column:auto; } }
@media (max-width: 640px) { .release-manager{padding:17px}.release-head{flex-direction:column}.publish-form{grid-template-columns:1fr}.release-summary{align-items:flex-start}.settle-actions{flex-wrap:wrap}.recovery-heading{align-items:flex-start}.recovery-option{width:100%} }
</style>
