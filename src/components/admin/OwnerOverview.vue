<template>
  <section class="owner-overview" aria-labelledby="owner-overview-title">
    <div class="overview-lead">
      <div>
        <p class="overview-kicker">Business position</p>
        <h2 id="owner-overview-title">What needs your attention today</h2>
        <p>Revenue, customer activity, and operational exceptions in one view.</p>
      </div>
      <button type="button" class="refresh-btn" :disabled="loading" @click="load">
        {{ loading ? 'Refreshing…' : 'Refresh overview' }}
      </button>
    </div>

    <div v-if="loading && !overview" class="skeleton-grid" aria-label="Loading owner overview">
      <div v-for="index in 4" :key="index" class="skeleton-card"></div>
    </div>
    <div v-else-if="error && !overview" class="overview-error" role="alert">
      <span>{{ error }}</span><button type="button" @click="load">Try again</button>
    </div>

    <template v-else-if="overview">
      <div class="metric-grid">
        <article class="metric metric-primary">
          <span class="metric-graphic metric-graphic-revenue" aria-hidden="true"><svg viewBox="0 0 64 36"><path d="M3 29 16 21l10 4 13-15 9 7 13-13"/><path class="metric-graphic-base" d="M3 33h58"/></svg></span>
          <span>Revenue today</span>
          <strong>{{ money(finance.revenue_today) }}</strong>
          <small>{{ money(finance.revenue_this_month) }} this month</small>
        </article>
        <article class="metric metric-wallet">
          <span class="metric-graphic metric-graphic-wallet" aria-hidden="true"><svg viewBox="0 0 48 48"><rect x="5" y="11" width="38" height="27" rx="6"/><path d="M5 17h32M31 25h12"/><circle cx="34" cy="25" r="1.5"/></svg></span>
          <span>Available wallet</span>
          <strong>{{ money(wallet.available) }}</strong>
          <small>{{ money(wallet.reserved) }} reserved</small>
        </article>
        <article class="metric metric-subscriptions">
          <span class="metric-graphic metric-graphic-members" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="19" cy="17" r="7"/><path d="M7 39c1-8 5-12 12-12s11 4 12 12M31 13c6 0 9 3 9 8s-3 8-8 8"/></svg></span>
          <span>Active subscriptions</span>
          <strong>{{ number(customers.active_subscriptions) }}</strong>
          <small>{{ number(customers.members) }} registered members</small>
        </article>
        <article class="metric" :class="{ 'metric-alert': attentionTotal > 0 }">
          <span class="metric-graphic metric-graphic-attention" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18"/><path d="M24 13v14M24 34h.01"/></svg></span>
          <span>Needs attention</span>
          <strong>{{ number(attentionTotal) }}</strong>
          <small>Payments, payouts, and support</small>
        </article>
      </div>

      <div class="attention-bar">
        <button type="button" @click="$emit('navigate', 'payments')">
          <span>Pending payments</span><strong>{{ number(finance.pending_payments) }}</strong>
        </button>
        <button type="button" @click="$emit('navigate', 'payments')">
          <span>Failed payments</span><strong>{{ number(finance.failed_payments) }}</strong>
        </button>
        <button type="button" @click="$emit('navigate', 'wallet')">
          <span>Pending payouts</span><strong>{{ number(wallet.pending_payouts) }}</strong>
        </button>
        <button type="button" @click="$emit('navigate', 'support')">
          <span>Waiting support</span><strong>{{ number(attention.support_waiting) }}</strong>
        </button>
      </div>

      <div class="overview-layout">
        <article class="overview-panel revenue-panel">
          <div class="panel-heading">
            <div><span>Confirmed collections</span><h3>Revenue movement</h3></div>
            <small>Last 14 days</small>
          </div>
          <DeveloperChart
            :points="overview.chart || []"
            value-key="amount"
            value-type="currency"
            accent="#4fd1c5"
            aria-label="Confirmed owner revenue during the last fourteen days"
            empty-text="No confirmed revenue during this period."
          />
        </article>

        <aside class="overview-panel quick-panel">
          <div class="panel-heading"><div><span>Shortcuts</span><h3>Common actions</h3></div></div>
          <button type="button" @click="$emit('navigate', 'payments')"><strong>Review payments</strong><small>Open the transaction ledger</small></button>
          <button type="button" @click="$emit('navigate', 'free-odd2')"><strong>Publish today’s tip</strong><small>Update the public daily feature</small></button>
          <button type="button" @click="$emit('navigate', 'vip-packages')"><strong>Manage packages</strong><small>Prices, deadlines, and betslips</small></button>
          <button type="button" @click="$emit('navigate', 'support')"><strong>Open customer chats</strong><small>Review conversations requiring help</small></button>
        </aside>
      </div>

      <article class="overview-panel recent-panel">
        <div class="panel-heading">
          <div><span>Latest activity</span><h3>Recent payments</h3></div>
          <button type="button" class="text-action" @click="$emit('navigate', 'payments')">View ledger →</button>
        </div>
        <div class="recent-table-wrap">
          <table class="recent-table">
            <thead><tr><th>Customer</th><th>Package</th><th>Amount</th><th>Status</th><th>Attempted</th></tr></thead>
            <tbody>
              <tr v-for="payment in overview.recent_payments" :key="payment.id">
                <td><strong>{{ payment.user?.username || 'Unknown member' }}</strong><small>{{ payment.user?.phone || payment.phone || '—' }}</small></td>
                <td>{{ packageName(payment) }}</td>
                <td class="money-cell">{{ money(payment.amount) }}</td>
                <td><span :class="['status', 'status-' + payment.status]">{{ payment.status }}</span></td>
                <td>{{ date(payment.created_at) }}</td>
              </tr>
              <tr v-if="!overview.recent_payments?.length"><td colspan="5" class="empty-row">No payment attempts yet.</td></tr>
            </tbody>
          </table>
        </div>
      </article>
      <p class="overview-asof">Updated {{ dateTime(overview.as_of) }} · {{ overview.timezone }}</p>
    </template>
  </section>
</template>

<script>
import adminApi from '../../utils/adminApi'
import DeveloperChart from '../dev/DeveloperChart.vue'

export default {
  name: 'OwnerOverview',
  components: { DeveloperChart },
  emits: ['navigate'],
  data: () => ({ overview: null, loading: true, error: '' }),
  computed: {
    finance() { return this.overview?.finance || {} },
    customers() { return this.overview?.customers || {} },
    wallet() { return this.overview?.wallet || {} },
    attention() { return this.overview?.attention || {} },
    attentionTotal() {
      return Number(this.finance.pending_payments || 0)
        + Number(this.finance.failed_payments || 0)
        + Number(this.wallet.pending_payouts || 0)
        + Number(this.attention.support_waiting || 0)
    }
  },
  mounted() { this.load() },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try { this.overview = (await adminApi.get('/api/admin/overview')).data }
      catch (error) { this.error = error.response?.data?.message || 'The owner overview could not be loaded.' }
      finally { this.loading = false }
    },
    money(value) { return `${Number(value || 0).toLocaleString('en-UG')} UGX` },
    number(value) { return Number(value || 0).toLocaleString('en-UG') },
    date(value) { return value ? new Date(value).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : '—' },
    dateTime(value) { return value ? new Date(value).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
    packageName(payment) { return payment.subscription?.group?.name || payment.plan_type || '—' }
  }
}
</script>

<style scoped>
.owner-overview{max-width:1440px;margin:0 auto;color:#e8edf3;font-family:'Outfit Variable','Avenir Next',system-ui,sans-serif}.overview-lead{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-bottom:28px}.overview-kicker,.panel-heading span{margin:0 0 7px;color:#8fb3d9;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.overview-lead h2{margin:0;color:#f5f7f9;font-size:clamp(26px,3vw,40px);font-weight:560;letter-spacing:-.045em}.overview-lead p:not(.overview-kicker){margin:10px 0 0;color:#7d8998;font-size:14px}.refresh-btn{padding:10px 14px;border:1px solid #303a48;border-radius:7px;background:#141b24;color:#b9c2cd;font:inherit;font-size:12px;font-weight:650;cursor:pointer;transition:.2s}.refresh-btn:hover{border-color:#55799e;color:#a8c6e3;transform:translateY(-1px)}.refresh-btn:disabled{opacity:.5}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:#252e3a}.metric{min-height:142px;padding:22px;background:#111720}.metric span{display:block;color:#8390a0;font-size:11px;font-weight:600}.metric strong{display:block;margin-top:18px;color:#edf1f5;font-size:clamp(22px,2.2vw,32px);font-weight:560;letter-spacing:-.04em;font-variant-numeric:tabular-nums}.metric small{display:block;margin-top:8px;color:#606d7d;font-size:11px}.metric-primary{background:#171b1d}.metric-primary strong{color:#a8c6e3}.metric-alert strong{color:#e5a280}.attention-bar{display:grid;grid-template-columns:repeat(4,1fr);margin:18px 0 24px;background:#10161e}.attention-bar button{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 17px;border:0;border-right:1px solid #27313e;background:transparent;color:#8f9baa;font:inherit;font-size:11px;text-align:left;cursor:pointer;transition:.2s}.attention-bar button:last-child{border-right:0}.attention-bar button:hover{background:#171f29;color:#d3d9e0}.attention-bar strong{color:#e6ebef;font-size:15px;font-variant-numeric:tabular-nums}.overview-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(280px,.65fr);gap:18px}.overview-panel{background:#111720;border:1px solid #252f3c;border-radius:10px}.revenue-panel,.quick-panel,.recent-panel{padding:22px}.panel-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}.panel-heading h3{margin:0;color:#edf1f5;font-size:17px;font-weight:560}.panel-heading small{color:#637080;font-size:10px}.quick-panel{display:flex;flex-direction:column}.quick-panel .panel-heading{margin-bottom:10px}.quick-panel>button{display:flex;flex-direction:column;align-items:flex-start;padding:14px 0;border:0;border-bottom:1px solid #242d38;background:transparent;color:#dde3e9;font:inherit;text-align:left;cursor:pointer;transition:.2s}.quick-panel>button:last-child{border-bottom:0}.quick-panel>button:hover{padding-left:7px;color:#a8c6e3}.quick-panel>button strong{font-size:12px;font-weight:600}.quick-panel>button small{margin-top:4px;color:#697686;font-size:10px}.recent-panel{margin-top:18px}.text-action{border:0;background:transparent;color:#8fb3d9;font:inherit;font-size:11px;cursor:pointer}.recent-table-wrap{overflow-x:auto;margin-top:16px}.recent-table{width:100%;border-collapse:collapse;min-width:680px}.recent-table th{padding:10px 12px;border-bottom:1px solid #2c3541;color:#667382;font-size:9px;font-weight:700;letter-spacing:.11em;text-align:left;text-transform:uppercase}.recent-table td{padding:13px 12px;border-bottom:1px solid #202833;color:#aeb8c4;font-size:11px}.recent-table td strong,.recent-table td small{display:block}.recent-table td strong{color:#e4e9ee;font-size:12px;font-weight:600}.recent-table td small{margin-top:3px;color:#647181;font-size:10px}.money-cell{color:#e5e9ed!important;font-variant-numeric:tabular-nums}.status{display:inline-flex;padding:4px 7px;border-radius:4px;background:#252e39;color:#9ca7b5;font-size:9px;font-weight:700;text-transform:uppercase}.status-confirmed{background:#173328;color:#78caa1}.status-pending{background:#3b3019;color:#ddbd6f}.status-failed{background:#3c2025;color:#e39aa2}.empty-row{text-align:center!important;color:#657180!important}.overview-asof{margin:12px 0 0;color:#526070;font-size:9px;text-align:right}.overview-error{display:flex;justify-content:space-between;align-items:center;padding:18px;border-left: 0;background:#2a171c;color:#e8a5ab}.overview-error button{border:0;background:transparent;color:#8fb3d9;cursor:pointer}.skeleton-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px}.skeleton-card{height:142px;background:linear-gradient(90deg,#111720,#1a222c,#111720);background-size:200% 100%;animation:shimmer 1.2s infinite}@keyframes shimmer{to{background-position:-200% 0}}@media(max-width:1050px){.metric-grid,.attention-bar{grid-template-columns:repeat(2,1fr)}.overview-layout{grid-template-columns:1fr}.quick-panel{display:grid;grid-template-columns:1fr 1fr}.quick-panel .panel-heading{grid-column:1/-1}.quick-panel>button:nth-of-type(odd){border-right:1px solid #242d38;padding-left:12px}}@media(max-width:650px){.overview-lead{align-items:flex-start;flex-direction:column}.metric-grid,.attention-bar,.skeleton-grid{grid-template-columns:1fr}.metric{min-height:124px}.attention-bar button{border-right:0;border-bottom:1px solid #27313e}.quick-panel{display:flex}.quick-panel>button:nth-of-type(odd){border-right:0;padding-left:0}.revenue-panel,.quick-panel,.recent-panel{padding:16px}}
.metric{--tile-rgb:104,167,255;position:relative;overflow:hidden;isolation:isolate;transition:transform .24s cubic-bezier(.22,.8,.2,1),background-color .24s ease,box-shadow .24s ease}.metric::before{content:'';position:absolute;inset:0;z-index:0;background:radial-gradient(240px circle at var(--pointer-x,85%) var(--pointer-y,15%),rgba(var(--tile-rgb),.19),transparent 68%);opacity:.42;pointer-events:none;transition:opacity .24s ease}.metric>*{position:relative;z-index:1}.metric>.metric-graphic{position:absolute;top:17px;right:18px;width:54px;height:38px;display:grid;place-items:center;color:rgb(var(--tile-rgb));opacity:.72;pointer-events:none;transition:transform .3s cubic-bezier(.22,.8,.2,1),opacity .24s ease}.metric-graphic svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.metric-graphic .metric-graphic-base{opacity:.28}.metric-graphic-wallet,.metric-graphic-members,.metric-graphic-attention{width:39px;height:39px;opacity:.56}.metric-primary{--tile-rgb:77,209,197;background:#111c23}.metric-wallet{--tile-rgb:104,167,255;background:#111a27}.metric-subscriptions{--tile-rgb:167,139,250;background:#171725}.metric-alert{--tile-rgb:245,126,126;background:#21171c}.metric-alert .metric-graphic-attention{color:rgb(var(--tile-rgb));opacity:.78}.metric:hover{z-index:1;transform:translateY(-4px);box-shadow:0 22px 44px rgba(2,7,12,.28)}.metric:hover::before{opacity:1}.metric:hover>.metric-graphic{transform:translateY(-2px) scale(1.09);opacity:1}.metric:active{transform:translateY(-1px) scale(.995)}.attention-bar button:active,.quick-panel>button:active,.refresh-btn:active,.text-action:active{transform:scale(.98)}.overview-panel{transition:border-color .22s ease,background-color .22s ease,box-shadow .22s ease}.overview-panel:hover{border-color:#34465a;box-shadow:0 18px 40px rgba(2,7,12,.14)}.recent-table tbody tr{transition:background-color .18s ease}.recent-table tbody tr:hover{background:#151d27}@media(prefers-reduced-motion:reduce){.metric,.metric::before,.metric-graphic,.overview-panel,.recent-table tbody tr{transition:none!important}.metric:hover,.metric:active{transform:none}}
</style>
