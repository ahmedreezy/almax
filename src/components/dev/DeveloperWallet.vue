<template>
  <section class="tw-space-y-6" aria-labelledby="developer-wallet-title">
    <div class="tw-flex tw-flex-col tw-gap-4 lg:tw-flex-row lg:tw-items-end lg:tw-justify-between">
      <div>
        <p class="tw-m-0 tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-signal">Relworx</p>
        <h2 id="developer-wallet-title" class="tw-mt-2 tw-text-2xl tw-font-semibold tw-text-white">Wallet & payouts</h2>
      </div>
      <button type="button" class="tw-rounded-md tw-border tw-border-line tw-bg-panel tw-px-4 tw-py-2.5 tw-text-sm tw-font-semibold tw-text-slate-200 hover:tw-border-signal hover:tw-text-white disabled:tw-opacity-50" :disabled="loading" @click="load">
        {{ loading ? 'Refreshing…' : 'Refresh wallet' }}
      </button>
    </div>

    <p v-if="error" class="tw-rounded-md tw-border tw-border-red-500/40 tw-bg-red-950/30 tw-p-4 tw-text-sm tw-text-red-200" role="alert">{{ error }}</p>

    <template v-if="data">
      <div class="tw-grid tw-gap-4 sm:tw-grid-cols-2 xl:tw-grid-cols-4">
        <article class="wallet-metric"><span>Today's commission</span><strong>{{ money(wallet.today_credited) }}</strong></article>
        <article class="wallet-metric"><span>Total earned</span><strong>{{ money(wallet.credited) }}</strong></article>
        <article class="wallet-metric"><span>Available balance</span><strong class="tw-text-emerald-300">{{ money(wallet.available) }}</strong></article>
        <article class="wallet-metric"><span>Reserved</span><strong class="tw-text-amber-300">{{ money(wallet.reserved) }}</strong></article>
      </div>

      <div class="tw-grid tw-gap-6 xl:tw-grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <form class="tw-rounded-lg tw-border tw-border-line tw-bg-panel tw-p-5 tw-shadow-panel" @submit.prevent="requestPayout">
          <div class="tw-flex tw-items-center tw-justify-between tw-gap-3">
            <div>
              <h3 class="tw-m-0 tw-text-base tw-font-semibold tw-text-white">Request payout</h3>
            </div>
            <span class="tw-rounded-full tw-bg-amber-400/10 tw-px-2.5 tw-py-1 tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-amber-300">Request only</span>
          </div>
          <label class="tw-mt-6 tw-block tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-400" for="developer-payout-amount">Amount (UGX)</label>
          <input id="developer-payout-amount" v-model.number="amount" type="number" min="1" :max="wallet.available" required class="tw-mt-2 tw-w-full tw-rounded-md tw-border tw-border-line tw-bg-ink tw-px-3 tw-py-3 tw-text-base tw-text-white tw-outline-none focus:tw-border-signal focus:tw-ring-2 focus:tw-ring-signal/20" placeholder="Enter amount" />
          <button type="button" class="tw-mt-2 tw-text-xs tw-font-semibold tw-text-signal hover:tw-text-amber-200" @click="amount = Math.floor(wallet.available || 0)">Use available balance</button>
          <button type="submit" class="tw-mt-6 tw-w-full tw-rounded-md tw-bg-signal tw-px-4 tw-py-3 tw-text-sm tw-font-bold tw-text-ink hover:tw-bg-amber-300 disabled:tw-cursor-not-allowed disabled:tw-opacity-40" :disabled="saving || !data.destination_configured || !Number(amount)">
            {{ saving ? 'Reserving…' : 'Request payout' }}
          </button>
          <p v-if="!data.destination_configured" class="tw-mt-3 tw-text-xs tw-text-red-300">PAYMENT_DEVELOPER_PAYOUT_MSISDN is not configured.</p>
          <p v-if="notice" class="tw-mt-3 tw-text-sm tw-text-emerald-300" role="status">{{ notice }}</p>
        </form>

        <div class="tw-overflow-hidden tw-rounded-lg tw-border tw-border-line tw-bg-panel tw-shadow-panel">
          <div class="tw-border-b tw-border-line tw-px-5 tw-py-4">
            <h3 class="tw-m-0 tw-text-base tw-font-semibold tw-text-white">Payout requests</h3>
          </div>
          <div v-if="!data.requests?.length" class="tw-p-8 tw-text-center tw-text-sm tw-text-slate-500">No payout requests yet.</div>
          <div v-else class="tw-divide-y tw-divide-line">
            <article v-for="item in data.requests" :key="item.id" class="tw-grid tw-gap-3 tw-p-5 sm:tw-grid-cols-[1fr_auto] sm:tw-items-center">
              <div>
                <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                  <strong class="tw-text-sm tw-text-white">{{ money(item.amount) }}</strong>
                  <span :class="statusClass(item.status)">{{ item.status }}</span>
                </div>
                <p class="tw-mt-1 tw-text-xs tw-text-slate-500">{{ item.reference }} · {{ date(item.created_at) }} · {{ item.destination }}</p>
                <p v-if="item.message" class="tw-mt-2 tw-text-xs tw-text-amber-300">{{ item.message }}</p>
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
  data: () => ({ data: null, loading: true, saving: false, amount: '', error: '', notice: '' }),
  computed: {
    wallet() { return this.data?.wallet || {} }
  },
  mounted() { this.load() },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.data = (await devApi.get('/api/developer/wallet')).data
        this.$emit('updated', this.data)
      } catch (error) { this.error = error.response?.data?.message || 'Wallet data could not be loaded.' } finally { this.loading = false }
    },
    async requestPayout() {
      this.saving = true
      this.error = ''
      this.notice = ''
      try {
        const response = await devApi.post('/api/developer/payout-requests', { amount: Number(this.amount) })
        this.notice = response.data.message
        this.amount = ''
        await this.load()
      } catch (error) { this.error = error.response?.data?.errors?.amount?.[0] || error.response?.data?.message || 'Payout request could not be created.' } finally { this.saving = false }
    },
    async cancel(item) {
      if (!window.confirm(`Cancel payout request ${item.reference}?`)) return
      try { await devApi.post(`/api/developer/payout-requests/${item.id}/cancel`); await this.load() } catch (error) { this.error = error.response?.data?.message || 'Payout request could not be cancelled.' }
    },
    money(value) { return `${Number(value || 0).toLocaleString()} UGX` },
    date(value) { return value ? new Date(value).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
    statusClass(status) {
      return status === 'pending'
        ? 'tw-rounded-full tw-bg-amber-400/10 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-amber-300'
        : 'tw-rounded-full tw-bg-slate-700 tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-uppercase tw-text-slate-300'
    }
  }
}
</script>

<style scoped>
.wallet-metric { @apply tw-rounded-lg tw-border tw-border-line tw-bg-panel tw-p-5 tw-shadow-panel; }
.wallet-metric span { @apply tw-block tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-500; }
.wallet-metric strong { @apply tw-mt-3 tw-block tw-text-xl tw-font-semibold tw-text-white; }
</style>
