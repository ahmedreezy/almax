<template>
  <section class="tw-space-y-6" aria-labelledby="developer-wallet-title">
    <div class="tw-flex tw-flex-col tw-gap-4 lg:tw-flex-row lg:tw-items-end lg:tw-justify-between">
      <div>
        <p class="tw-m-0 tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-signal">Relworx</p>
        <h2 id="developer-wallet-title" class="tw-mt-2 tw-text-2xl tw-font-semibold tw-text-white">Wallet & payouts</h2>
      </div>
      <button type="button" class="wallet-refresh tw-rounded-md tw-bg-panel tw-px-4 tw-py-2.5 tw-text-sm tw-font-semibold tw-text-slate-200 hover:tw-text-white disabled:tw-opacity-50" :disabled="loading" @click="load()">
        {{ loading ? 'Refreshing…' : 'Refresh wallet' }}
      </button>
    </div>

    <p v-if="error" class="tw-rounded-md tw-border tw-border-red-500/40 tw-bg-red-950/30 tw-p-4 tw-text-sm tw-text-red-200" role="alert">{{ error }}</p>

    <template v-if="data">
      <div class="tw-grid tw-gap-4 sm:tw-grid-cols-2 xl:tw-grid-cols-4">
        <article class="wallet-metric"><span>Today's commission</span><strong>{{ money(wallet.today_credited) }}</strong></article>
        <article class="wallet-metric"><span>Total earned</span><strong>{{ money(wallet.credited) }}</strong></article>
        <article class="wallet-metric"><span>Available balance</span><strong class="tw-text-emerald-300">{{ money(wallet.available) }}</strong></article>
        <article class="wallet-metric"><span>Reserved</span><strong class="tw-text-slate-300">{{ money(wallet.reserved) }}</strong></article>
      </div>

      <div class="tw-grid tw-gap-6 xl:tw-grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <form class="wallet-panel tw-rounded-lg tw-bg-panel tw-p-5" @submit.prevent="requestPayout">
          <div class="tw-flex tw-items-center tw-justify-between tw-gap-3">
            <div>
              <h3 class="tw-m-0 tw-text-base tw-font-semibold tw-text-white">Send commission payout</h3>
            </div>
            <span class="tw-rounded-full tw-bg-blue-400/10 tw-px-2.5 tw-py-1 tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-blue-200">{{ data.execution_mode === 'immediate' ? 'Live payout' : 'Request only' }}</span>
          </div>
          <label class="tw-mt-6 tw-block tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-400" for="developer-payout-amount">Amount (UGX)</label>
          <input id="developer-payout-amount" v-model.number="amount" type="number" :min="minimumPayout" :max="wallet.available" required class="tw-mt-2 tw-w-full tw-rounded-md tw-border tw-border-line tw-bg-ink tw-px-3 tw-py-3 tw-text-base tw-text-white tw-outline-none focus:tw-border-signal focus:tw-ring-2 focus:tw-ring-signal/20" placeholder="Enter amount" />
          <p class="tw-mt-2 tw-text-xs tw-text-slate-500">Minimum Relworx payout: {{ money(minimumPayout) }}</p>
          <button type="button" class="tw-mt-2 tw-text-xs tw-font-semibold tw-text-signal hover:tw-text-blue-200" @click="amount = Math.floor(wallet.available || 0)">Use available balance</button>
          <button type="submit" class="tw-mt-6 tw-w-full tw-rounded-md tw-bg-signal tw-px-4 tw-py-3 tw-text-sm tw-font-bold tw-text-ink hover:tw-bg-blue-200 disabled:tw-cursor-not-allowed disabled:tw-opacity-40" :disabled="saving || !data.destination_configured || Number(amount) < minimumPayout">
            {{ saving ? 'Sending…' : 'Send payout' }}
          </button>
          <p v-if="!data.destination_configured" class="tw-mt-3 tw-text-xs tw-text-red-300">PAYMENT_DEVELOPER_PAYOUT_MSISDN is not configured.</p>
          <p v-if="notice" class="tw-mt-3 tw-text-sm tw-text-emerald-300" role="status">{{ notice }}</p>
        </form>

        <div class="wallet-panel tw-overflow-hidden tw-rounded-lg tw-bg-panel">
          <div class="wallet-panel-head tw-px-5 tw-py-4">
            <h3 class="tw-m-0 tw-text-base tw-font-semibold tw-text-white">Payout requests</h3>
          </div>
          <div v-if="!data.requests?.length" class="tw-p-8 tw-text-center tw-text-sm tw-text-slate-500">No payout requests yet.</div>
          <div v-else class="tw-divide-y tw-divide-line">
            <article v-for="item in data.requests" :key="item.id" class="tw-grid tw-gap-3 tw-p-5 sm:tw-grid-cols-[1fr_auto] sm:tw-items-center">
              <div>
                <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                  <strong class="tw-text-sm tw-text-white">{{ money(item.amount) }}</strong>
                  <span :class="statusClass(item.display_status || item.status)">{{ item.display_status || item.status }}</span>
                </div>
                <p class="tw-mt-1 tw-text-xs tw-text-slate-500">{{ item.reference }} · {{ date(item.created_at) }} · {{ item.destination }}</p>
                <p v-if="item.message" class="tw-mt-2 tw-text-xs tw-text-blue-200">{{ item.message }}</p>
              </div>
              <button v-if="item.status === 'pending'" type="button" class="tw-rounded-md tw-border tw-border-red-500/30 tw-px-3 tw-py-2 tw-text-xs tw-font-semibold tw-text-red-300 hover:tw-bg-red-500/10" @click="cancel(item)">Cancel</button>
            </article>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script>
import devApi from '../../utils/devApi'

export default {
  name: 'DeveloperWallet',
  emits: ['updated'],
  data: () => ({ data: null, loading: true, saving: false, amount: '', requestToken: '', requestTokenAmount: null, error: '', notice: '', payoutPollTimer: null, pollRequestInFlight: false }),
  computed: {
    wallet() { return this.data?.wallet || {} },
    minimumPayout() { return Number(this.data?.minimum_payout || 500) }
  },
  mounted() { this.load() },
  beforeUnmount() { this.stopPayoutPolling() },
  methods: {
    async load(silent = false) {
      if (silent && this.pollRequestInFlight) return
      if (silent) this.pollRequestInFlight = true
      else { this.loading = true; this.error = '' }
      try {
        this.data = (await devApi.get('/api/developer/wallet')).data
        this.$emit('updated', this.data)
        this.syncPayoutPolling()
      } catch (error) {
        if (!silent) this.error = error.response?.data?.message || 'Wallet data could not be loaded.'
      } finally {
        if (silent) this.pollRequestInFlight = false
        else this.loading = false
      }
    },
    syncPayoutPolling() {
      const hasActivePayout = (this.data?.requests || []).some(item => item.status === 'processing' && !item.is_delayed)
      if (hasActivePayout && !this.payoutPollTimer) this.payoutPollTimer = window.setInterval(() => this.load(true), 15000)
      if (!hasActivePayout) this.stopPayoutPolling()
    },
    stopPayoutPolling() {
      if (this.payoutPollTimer) window.clearInterval(this.payoutPollTimer)
      this.payoutPollTimer = null
    },
    async requestPayout() {
      const payoutAmount = Number(this.amount)
      if (!window.confirm(`Send ${this.money(payoutAmount)} to the configured developer payout number now?`)) return
      if (!this.requestToken || this.requestTokenAmount !== payoutAmount) {
        this.requestToken = this.newRequestToken()
        this.requestTokenAmount = payoutAmount
      }
      this.saving = true
      this.error = ''
      this.notice = ''
      try {
        const response = await devApi.post('/api/developer/payout-requests', { amount: payoutAmount, request_token: this.requestToken })
        this.notice = response.data.message
        this.amount = ''
        this.requestToken = ''
        this.requestTokenAmount = null
        await this.load()
      } catch (error) { this.error = error.response?.data?.errors?.amount?.[0] || error.response?.data?.message || 'Payout request could not be created.' } finally { this.saving = false }
    },
    async cancel(item) {
      if (!window.confirm(`Cancel payout request ${item.reference}?`)) return
      try { await devApi.post(`/api/developer/payout-requests/${item.id}/cancel`); await this.load() } catch (error) { this.error = error.response?.data?.message || 'Payout request could not be cancelled.' }
    },
    money(value) { return `${Number(value || 0).toLocaleString()} UGX` },
    newRequestToken() { return window.crypto?.randomUUID?.() || `payout-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    date(value) { return value ? new Date(value).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
    statusClass(status) {
      const base = 'tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider '
      if (status === 'completed') return base + 'tw-bg-emerald-400/10 tw-text-emerald-300'
      if (status === 'failed') return base + 'tw-bg-red-500/10 tw-text-red-300'
      if (status === 'delayed') return base + 'tw-bg-amber-400/10 tw-text-amber-300'
      if (status === 'processing' || status === 'pending') return base + 'tw-bg-blue-400/10 tw-text-blue-200'
      return base + 'tw-bg-slate-700 tw-text-slate-300'
    }
  }
}
</script>

<style scoped>
.wallet-metric { @apply tw-rounded-lg tw-bg-panel tw-p-5; border: 1px solid rgba(148, 163, 184, .08); box-shadow: 0 16px 40px rgba(2, 6, 12, .14); transition: transform .24s cubic-bezier(.2,.8,.2,1), background .24s ease, border-color .24s ease; }
.wallet-metric:hover { transform: translateY(-2px); background: #151e29; border-color: rgba(143, 179, 217, .18); }
.wallet-metric span { @apply tw-block tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-500; }
.wallet-metric strong { @apply tw-mt-3 tw-block tw-text-xl tw-font-semibold tw-text-white; }
.wallet-panel { border: 0; box-shadow: 0 16px 40px rgba(2, 6, 12, .14); }
.wallet-panel-head { border-bottom: 1px solid rgba(148, 163, 184, .11); }
.wallet-refresh { border: 1px solid rgba(148, 163, 184, .09); min-height: 42px; transition: background .2s ease, border-color .2s ease, transform .15s ease; }
.wallet-refresh:hover { background: #1d2937; border-color: rgba(143, 179, 217, .2); transform: translateY(-1px); }
@media (prefers-reduced-motion: reduce) { .wallet-metric, .wallet-refresh { transition: none; } }
</style>
