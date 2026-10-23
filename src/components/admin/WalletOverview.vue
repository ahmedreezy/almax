<template>
  <section class="wallet-admin">
    <div class="wallet-head">
      <div>
        <p class="wallet-kicker">Relworx</p>
        <h2>Wallet & payouts</h2>
      </div>
      <button type="button" class="refresh-btn" :disabled="loading" @click="load">{{ loading ? 'Refreshing…' : 'Refresh balances' }}</button>
    </div>

    <p v-if="error" class="wallet-error" role="alert">{{ error }}</p>
    <template v-if="data">
      <div class="balance-grid">
        <article><span>Today's revenue</span><strong>{{ money(data.today_revenue) }}</strong></article>
        <article><span>Live wallet cash</span><strong>{{ liveBalance }}</strong></article>
        <article><span>Owner balance</span><strong>{{ money(wallet.available) }}</strong><small>{{ money(wallet.reserved) }} reserved</small></article>
        <article><span>Developer commission</span><strong>{{ money(data.developer_liability?.available) }}</strong></article>
      </div>

      <div class="wallet-layout">
        <form class="payout-form" @submit.prevent="requestPayout">
          <span class="mode-pill">REQUEST ONLY</span>
          <h3>Request owner payout</h3>
          <label for="owner-payout-amount">Amount (UGX)</label>
          <input id="owner-payout-amount" v-model.number="amount" type="number" min="1" :max="wallet.available" required placeholder="Enter amount" />
          <button type="button" class="use-balance" @click="amount = Math.floor(wallet.available || 0)">Use available balance</button>
          <button type="submit" class="request-btn" :disabled="saving || !data.destination_configured || !Number(amount)">{{ saving ? 'Reserving…' : 'Request payout' }}</button>
          <p v-if="!data.destination_configured" class="config-warning">PAYMENT_OWNER_PAYOUT_MSISDN is not configured.</p>
          <p v-if="notice" class="wallet-notice" role="status">{{ notice }}</p>
        </form>

        <div class="requests-card">
          <div class="requests-title"><div><h3>Payout requests</h3></div><span>{{ data.requests?.length || 0 }}</span></div>
          <p v-if="!data.requests?.length" class="empty-wallet">No payout requests yet.</p>
          <article v-for="item in data.requests" :key="item.id" class="request-row">
            <div>
              <div class="request-main"><strong>{{ money(item.amount) }}</strong><span :class="['request-status', 'is-' + item.status]">{{ item.status }}</span><em>{{ item.beneficiary }}</em></div>
              <p>{{ item.reference }} · {{ date(item.created_at) }} · {{ item.destination }}</p>
              <small v-if="item.message">{{ item.message }}</small>
            </div>
            <button v-if="item.status === 'pending' && item.beneficiary === 'owner'" type="button" @click="cancel(item)">Cancel</button>
          </article>
        </div>
      </div>
    </template>
  </section>
</template>

<script>
import adminApi from '../../utils/adminApi'

export default {
  name: 'WalletOverview',
  data: () => ({ data: null, loading: true, saving: false, amount: '', error: '', notice: '' }),
  computed: {
    wallet() { return this.data?.wallet || {} },
    liveBalance() { return this.data?.relworx_wallet?.available ? this.money(this.data.relworx_wallet.balance) : 'Unavailable' }
  },
  mounted() { this.load() },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try { this.data = (await adminApi.get('/api/admin/wallet')).data } catch (error) { this.error = error.response?.data?.message || 'Wallet data could not be loaded.' } finally { this.loading = false }
    },
    async requestPayout() {
      this.saving = true
      this.error = ''
      this.notice = ''
      try {
        const response = await adminApi.post('/api/admin/payout-requests', { amount: Number(this.amount) })
        this.notice = response.data.message
        this.amount = ''
        await this.load()
      } catch (error) { this.error = error.response?.data?.errors?.amount?.[0] || error.response?.data?.message || 'Payout request could not be created.' } finally { this.saving = false }
    },
    async cancel(item) {
      if (!window.confirm(`Cancel payout request ${item.reference}?`)) return
      try { await adminApi.post(`/api/admin/payout-requests/${item.id}/cancel`); await this.load() } catch (error) { this.error = error.response?.data?.message || 'Payout request could not be cancelled.' }
    },
    money(value) { return `${Number(value || 0).toLocaleString()} UGX` },
    date(value) { return value ? new Date(value).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' }) : '—' }
  }
}
</script>

<style scoped>
.wallet-admin{color:#f3f4f6}.wallet-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin-bottom:22px}.wallet-kicker{margin:0 0 6px;color:#d7aa35;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.16em}.wallet-head h2{margin:0;font-size:24px}.refresh-btn,.request-btn{border:0;border-radius:7px;padding:11px 16px;font-weight:800;cursor:pointer}.refresh-btn{background:#202733;color:#e5e7eb;border:1px solid #394252}.balance-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.balance-grid article,.payout-form,.requests-card{background:#151a22;border:1px solid #2b3442;border-radius:10px}.balance-grid article{padding:18px}.balance-grid span{display:block;color:#8f9aaa;font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:800}.balance-grid strong{display:block;margin-top:12px;font-size:20px}.balance-grid small{display:block;margin-top:5px;color:#6f7a89}.wallet-layout{display:grid;grid-template-columns:minmax(280px,.75fr) minmax(0,1.25fr);gap:18px;margin-top:18px}.payout-form{padding:22px}.payout-form h3{margin:14px 0 6px}.mode-pill{display:inline-flex;padding:5px 8px;border-radius:99px;background:#4a350c;color:#f4cb63;font-size:10px;font-weight:900;letter-spacing:.12em}.payout-form label{display:block;margin-top:22px;color:#aab2bf;font-size:11px;font-weight:800;text-transform:uppercase}.payout-form input{width:100%;box-sizing:border-box;margin-top:8px;padding:12px;border:1px solid #354052;border-radius:7px;background:#0c1016;color:#fff;font-size:16px}.use-balance{margin-top:8px;border:0;background:none;color:#e2b747;font-weight:700;cursor:pointer}.request-btn{width:100%;margin-top:20px;background:#e2b747;color:#111}.request-btn:disabled,.refresh-btn:disabled{opacity:.45;cursor:not-allowed}.requests-card{overflow:hidden}.requests-title{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #2b3442}.requests-title h3{margin:0}.requests-title>span{font-weight:800;color:#e2b747}.request-row{display:flex;justify-content:space-between;gap:16px;padding:17px 20px;border-bottom:1px solid #242c38}.request-main{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.request-main em{font-style:normal;color:#8b95a3;font-size:11px;text-transform:uppercase}.request-row p{margin:6px 0 0;color:#788391;font-size:12px}.request-row small{display:block;margin-top:6px;color:#e1b954}.request-row button{align-self:center;border:1px solid #713a42;background:transparent;color:#f1949f;border-radius:6px;padding:8px 11px;cursor:pointer}.request-status{padding:3px 7px;border-radius:99px;font-size:9px;font-weight:900;text-transform:uppercase;background:#3b2f12;color:#f2cc6d}.is-cancelled{background:#2e3540;color:#9ca3af}.wallet-error,.config-warning{padding:12px;border:1px solid #7f3741;border-radius:7px;background:#35171c;color:#f5a3ad}.wallet-notice{color:#71d6a4!important}.empty-wallet{padding:34px;text-align:center;color:#77818f}@media(max-width:1000px){.balance-grid{grid-template-columns:repeat(2,1fr)}.wallet-layout{grid-template-columns:1fr}}@media(max-width:620px){.wallet-head{align-items:stretch;flex-direction:column}.balance-grid{grid-template-columns:1fr}.request-row{flex-direction:column}}
</style>
