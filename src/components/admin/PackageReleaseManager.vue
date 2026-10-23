<template>
  <section class="release-manager">
    <div class="release-head">
      <div>
        <span class="release-kicker">Ticket tracking</span>
        <h3>Package Releases &amp; Failed Ticket Recovery</h3>
      </div>
      <button class="refresh-btn" :disabled="loading" @click="fetchReleases">Refresh</button>
    </div>

    <form class="publish-form" @submit.prevent="publishRelease">
      <div class="package-field">
        <span>Packages</span>
        <details class="package-picker">
          <summary>
            <span>{{ selectedPackageLabel }}</span>
            <b>{{ form.groupIds.length }}</b>
          </summary>
          <div class="package-menu">
            <div class="package-menu-actions">
              <button type="button" @click="selectAllPackages">Select all</button>
              <button type="button" @click="form.groupIds = []">Clear</button>
            </div>
            <label v-for="pkg in packages" :key="pkg.id" class="package-option">
              <input v-model="form.groupIds" type="checkbox" :value="pkg.id" />
              <span>{{ pkg.name }}</span>
            </label>
          </div>
        </details>
      </div>
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

    <form v-if="selectedReleaseIds.length" class="recovery-form" @submit.prevent="issueRecovery">
      <div class="recovery-selection">
        <strong>{{ selectedReleaseIds.length }} failed {{ selectedReleaseIds.length === 1 ? 'ticket' : 'tickets' }} selected</strong>
        <button type="button" @click="selectedReleaseIds = []">Clear</button>
      </div>
        <label>
          Recovery betslip link
          <input v-model.trim="recoveryForm.betslipLink" type="url" placeholder="https://…" />
        </label>
        <label>
          Recovery betslip code
          <input v-model.trim="recoveryForm.betslipCode" type="text" placeholder="ABC123" />
        </label>
        <button class="recovery-submit" :disabled="issuingRecovery">
          {{ issuingRecovery ? 'Issuing…' : 'Mark failed & issue recovery' }}
        </button>
    </form>

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
            {{ selectedReleaseIds.includes(release.public_id) ? 'Selected as failed' : 'Mark failed & compensate' }}
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
      form: { groupIds: [], cutoffAt: cutoff.toISOString().slice(0, 16), betslipLink: '', betslipCode: '' },
      recoveryForm: { betslipLink: '', betslipCode: '' }
    }
  },
  computed: {
    paidReleases() {
      return this.releases.filter(item => item.type === 'paid')
    },
    selectedPackageLabel() {
      if (!this.form.groupIds.length) return 'Select packages'
      if (this.form.groupIds.length === 1) {
        return this.packages.find(pkg => pkg.id === this.form.groupIds[0])?.name || '1 package selected'
      }
      return `${this.form.groupIds.length} packages selected`
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
        const availableIds = new Set(this.paidReleases.filter(item => item.result === 'pending' && this.canSettle(item)).map(item => item.public_id))
        this.selectedReleaseIds = this.selectedReleaseIds.filter(id => availableIds.has(id))
      } catch (error) {
        this.flash(error.response?.data?.message || 'Could not load ticket releases.', 'error')
      } finally {
        this.loading = false
      }
    },
    async publishRelease() {
      if (!this.form.groupIds.length) {
        this.flash('Select at least one package.', 'error')
        return
      }
      if (!this.form.betslipLink && !this.form.betslipCode) {
        this.flash('Add a betslip link or code.', 'error')
        return
      }
      this.publishing = true
      try {
        await adminApi.post('/api/package-releases', {
          groupIds: this.form.groupIds.map(Number),
          cutoffAt: new Date(this.form.cutoffAt).toISOString(),
          betslipLink: this.form.betslipLink || null,
          betslipCode: this.form.betslipCode || null
        })
        this.flash(`Ticket published to ${this.form.groupIds.length} package${this.form.groupIds.length === 1 ? '' : 's'} and active subscribers updated.`)
        this.$emit('published')
        this.form.betslipLink = ''
        this.form.betslipCode = ''
        this.form.groupIds = []
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
    selectAllPackages() {
      this.form.groupIds = this.packages.map(pkg => pkg.id)
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
.publish-form label,.package-field { display:flex; flex-direction:column; gap:6px; color:rgba(255,255,255,.55); font-size:11px; font-weight:800; text-transform:uppercase; }
.publish-form input,.recovery-form input { width:100%; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.13); color:#fff; border-radius:9px; padding:10px 11px; outline:none; }
.package-picker { position:relative; }
.package-picker summary { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:39px; padding:10px 11px; border:1px solid rgba(255,255,255,.13); border-radius:9px; background:rgba(255,255,255,.06); color:#fff; font-size:12px; text-transform:none; cursor:pointer; list-style:none; }
.package-picker summary::-webkit-details-marker { display:none; }
.package-picker summary b { min-width:22px; height:22px; display:grid; place-items:center; border-radius:999px; background:rgba(255,215,0,.14); color:#ffd700; font-size:10px; }
.package-menu { position:absolute; z-index:20; left:0; top:calc(100% + 6px); width:max(100%,260px); max-height:310px; overflow:auto; padding:8px; border:1px solid rgba(255,215,0,.24); border-radius:11px; background:#181818; box-shadow:0 18px 42px rgba(0,0,0,.48); }
.package-menu-actions { display:flex; justify-content:flex-end; gap:6px; padding:2px 2px 8px; }
.package-menu-actions button,.recovery-selection button { border:0; background:transparent; color:#ffd700; font-size:11px; font-weight:800; cursor:pointer; }
.package-option { flex-direction:row!important; align-items:center; gap:9px!important; padding:8px; border-radius:7px; color:#fff!important; font-size:12px!important; text-transform:none!important; cursor:pointer; }
.package-option:hover { background:rgba(255,255,255,.06); }
.package-option input { width:15px; height:15px; padding:0; accent-color:#ffd700; }
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
.recovery-form { display:grid; grid-template-columns:1fr 1fr auto; gap:12px; align-items:end; margin-top:20px; padding:15px; border:1px solid rgba(255,215,0,.24); border-radius:12px; background:rgba(255,215,0,.045); }
.recovery-selection { grid-column:1/-1; display:flex; justify-content:space-between; align-items:center; gap:12px; color:#fff; font-size:13px; }
.recovery-form > label { display:flex; flex-direction:column; gap:6px; color:rgba(255,255,255,.55); font-size:11px; font-weight:800; text-transform:uppercase; }
.recovery-submit { border:0; border-radius:9px; padding:11px 15px; background:#ffd700; color:#111; font-weight:900; white-space:nowrap; cursor:pointer; }
.recovery-count { margin-top:12px; color:#ffb3b3; font-size:12px; }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
@media (max-width: 1050px) { .publish-form { grid-template-columns:1fr 1fr; } .publish-form .wide { grid-column:auto; } }
@media (max-width: 760px) { .recovery-form { grid-template-columns:1fr; } .recovery-selection { grid-column:auto; } }
@media (max-width: 640px) { .release-manager{padding:17px}.release-head{flex-direction:column}.publish-form{grid-template-columns:1fr}.release-summary{align-items:flex-start}.settle-actions{flex-wrap:wrap}.package-menu{width:100%} }
</style>
