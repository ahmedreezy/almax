<template>
  <section class="financial-report" aria-labelledby="financial-report-title">
    <header class="report-lead">
      <div>
        <p class="report-kicker">Financial intelligence</p>
        <h2 id="financial-report-title">Revenue and payment performance</h2>
        <p>Track confirmed revenue, collection quality, wallet position, and payment mix.</p>
      </div>
      <button class="export-button" type="button" :disabled="loading || exporting" @click="exportCsv">
        {{ exporting ? 'Preparing…' : 'Export CSV' }}
      </button>
    </header>

    <nav class="period-tabs" aria-label="Financial report period">
      <button v-for="option in periods" :key="option.value" type="button" :class="{ active: period === option.value }" @click="setPeriod(option.value)">{{ option.label }}</button>
    </nav>
    <form v-if="period === 'custom'" class="date-range" @submit.prevent="load">
      <label><span>From</span><input v-model="from" type="date" required /></label>
      <label><span>To</span><input v-model="to" type="date" :min="from" required /></label>
      <button type="submit" :disabled="!validRange || loading">Apply range</button>
    </form>

    <p v-if="error" class="report-error" role="alert">{{ error }} <button type="button" @click="load">Try again</button></p>
    <div v-if="loading && !report" class="report-skeleton" aria-label="Loading financial report"><span v-for="item in 6" :key="item"></span></div>

    <template v-else-if="report">
      <div class="finance-metrics">
        <article class="metric-feature"><span>Confirmed revenue</span><strong>{{ money(summary.confirmed_revenue) }}</strong><small>{{ number(summary.confirmed_count) }} completed payments</small></article>
        <article><span>Payment attempts</span><strong>{{ number(summary.attempted_count) }}</strong><small>{{ money(summary.attempted_amount) }} attempted</small></article>
        <article><span>Confirmation rate</span><strong>{{ decimal(summary.confirmation_rate) }}%</strong><small>Successful attempts</small></article>
        <article><span>Average payment</span><strong>{{ money(summary.average_payment) }}</strong><small>Confirmed collections</small></article>
        <article><span>Pending value</span><strong>{{ money(summary.pending_amount) }}</strong><small>Awaiting a final status</small></article>
        <article><span>Failed value</span><strong>{{ money(summary.failed_amount) }}</strong><small>Unsuccessful attempts</small></article>
      </div>

      <div class="report-layout">
        <article class="report-surface trend-panel">
          <div class="surface-heading"><div><span>Confirmed collections</span><h3>Revenue trend</h3></div><small>{{ rangeLabel }}</small></div>
          <DeveloperChart :points="report.trend || []" value-key="amount" value-type="currency" accent="#68a7ff" aria-label="Confirmed revenue for the selected reporting period" empty-text="No confirmed revenue in this period." />
        </article>
        <aside class="report-surface wallet-panel">
          <div class="surface-heading"><div><span>Owner funds</span><h3>Wallet position</h3></div></div>
          <dl><div><dt>Available</dt><dd>{{ money(report.wallet?.available) }}</dd></div><div><dt>Reserved</dt><dd>{{ money(report.wallet?.reserved) }}</dd></div><div><dt>Payout requests</dt><dd>{{ number(payoutCount) }}</dd></div></dl>
        </aside>
      </div>

      <div class="breakdown-grid">
        <article v-for="group in breakdownGroups" :key="group.key" class="report-surface breakdown-panel">
          <div class="surface-heading"><div><span>Payment mix</span><h3>{{ group.title }}</h3></div></div>
          <div v-if="!group.rows.length" class="breakdown-empty">No activity in this period.</div>
          <div v-for="row in group.rows" :key="row.label" class="breakdown-row">
            <div><strong>{{ label(row.label) }}</strong><small>{{ number(row.count) }} payments</small></div>
            <span>{{ money(row.amount) }}</span>
          </div>
        </article>
      </div>
      <p class="report-asof">Generated {{ dateTime(report.generated_at) }} · {{ report.timezone }}</p>
    </template>
  </section>
</template>

<script>
import adminApi from '../../utils/adminApi'
import DeveloperChart from '../dev/DeveloperChart.vue'

export default {
  name: 'FinancialReport',
  components: { DeveloperChart },
  data: () => ({
    report: null, loading: true, exporting: false, error: '', period: 'month', from: '', to: '',
    periods: [{ value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: 'month', label: 'This month' }, { value: 'custom', label: 'Custom' }]
  }),
  computed: {
    summary() { return this.report?.summary || {} },
    validRange() { return this.from && this.to && this.from <= this.to },
    params() { const params = { period: this.period }; if (this.period === 'custom') Object.assign(params, { from: this.from, to: this.to }); return params },
    rangeLabel() { const range = this.report?.range; return range ? `${this.shortDate(range.from)} – ${this.shortDate(range.to)}` : '' },
    payoutCount() { return (this.report?.payouts || []).reduce((total, item) => total + Number(item.count || 0), 0) },
    breakdownGroups() { const rows = this.report?.breakdowns || {}; return [{ key: 'status', title: 'By status', rows: rows.status || [] }, { key: 'method', title: 'By method', rows: rows.method || [] }, { key: 'plan', title: 'By plan', rows: rows.plan || [] }, { key: 'gateway', title: 'By gateway', rows: rows.gateway || [] }] }
  },
  mounted() { this.load() },
  methods: {
    setPeriod(value) { this.period = value; if (value !== 'custom') this.load() },
    async load() { if (this.period === 'custom' && !this.validRange) return; this.loading = true; this.error = ''; try { this.report = (await adminApi.get('/api/admin/financial-report', { params: this.params })).data } catch (error) { this.error = error.response?.data?.message || 'The financial report could not be loaded.' } finally { this.loading = false } },
    async exportCsv() { this.exporting = true; try { const response = await adminApi.get('/api/admin/financial-report/export', { params: this.params, responseType: 'blob' }); const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `almax-financial-report-${this.report?.range?.from || 'export'}.csv`; link.click(); URL.revokeObjectURL(url) } catch (error) { this.error = error.response?.data?.message || 'The report export could not be prepared.' } finally { this.exporting = false } },
    money(value) { return `${Number(value || 0).toLocaleString('en-UG', { maximumFractionDigits: 0 })} UGX` },
    number(value) { return Number(value || 0).toLocaleString('en-UG') },
    decimal(value) { return Number(value || 0).toLocaleString('en-UG', { maximumFractionDigits: 1 }) },
    label(value) { return String(value || 'Unknown').replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase()) },
    shortDate(value) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : '—' },
    dateTime(value) { return value ? new Date(value).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' }) : '—' }
  }
}
</script>

<style scoped>
.financial-report{max-width:1440px;margin:0 auto;color:#e9edf2}.report-lead{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px}.report-kicker,.surface-heading span{margin:0 0 7px;color:#8fb3d9;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase}.report-lead h2{margin:0;font-size:clamp(27px,3vw,40px);font-weight:560;letter-spacing:-.045em}.report-lead p:not(.report-kicker){max-width:62ch;margin:9px 0 0;color:#7d8998;font-size:13px}.export-button,.date-range button{border:0;border-radius:7px;background:#8fb3d9;color:#17130d;padding:11px 16px;font:inherit;font-size:11px;font-weight:750;cursor:pointer;transition:.2s}.export-button:hover,.date-range button:hover{transform:translateY(-1px);background:#a8c6e3}.period-tabs{display:flex;gap:4px;overflow-x:auto;margin-bottom:16px;padding-bottom:2px}.period-tabs button{white-space:nowrap;border:0;border-radius:6px;background:#141b24;color:#7f8b9a;padding:9px 13px;font:inherit;font-size:11px;cursor:pointer;transition:.2s}.period-tabs button:hover{color:#d8dee5;background:#19222d}.period-tabs button.active{background:#18283a;color:#a8c6e3}.date-range{display:flex;align-items:flex-end;gap:10px;margin-bottom:18px}.date-range label{display:grid;gap:5px;color:#687585;font-size:9px;font-weight:700;text-transform:uppercase}.date-range input{height:39px;border:1px solid #303b49;border-radius:7px;background:#0d131a;color:#dce2e8;padding:0 10px;color-scheme:dark}.finance-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-bottom:18px;background:#26303c}.finance-metrics article{min-height:122px;padding:20px;background:#111720}.finance-metrics span{display:block;color:#7e8a99;font-size:10px}.finance-metrics strong{display:block;margin-top:15px;font-size:clamp(20px,2vw,29px);font-weight:560;letter-spacing:-.04em;font-variant-numeric:tabular-nums}.finance-metrics small{display:block;margin-top:7px;color:#5d6a79;font-size:10px}.finance-metrics .metric-feature{background:#1a1b19}.metric-feature strong{color:#dec68e}.report-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(250px,.55fr);gap:16px}.report-surface{background:#111720;border-radius:9px}.trend-panel,.wallet-panel,.breakdown-panel{padding:21px}.surface-heading{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}.surface-heading h3{margin:0;font-size:16px;font-weight:560}.surface-heading small{color:#617080;font-size:10px}.wallet-panel dl{margin:6px 0 0}.wallet-panel dl div{display:flex;justify-content:space-between;gap:14px;padding:14px 0;border-bottom:1px solid #242d38}.wallet-panel dl div:last-child{border:0}.wallet-panel dt{color:#738091;font-size:11px}.wallet-panel dd{margin:0;color:#dce2e8;font-size:12px;font-weight:650;font-variant-numeric:tabular-nums}.breakdown-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:16px}.breakdown-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #222b36}.breakdown-row:last-child{border:0}.breakdown-row strong,.breakdown-row small{display:block}.breakdown-row strong{font-size:11px;font-weight:600}.breakdown-row small{margin-top:3px;color:#637080;font-size:9px}.breakdown-row>span{color:#c7d0d9;font-size:10px;font-variant-numeric:tabular-nums;text-align:right}.breakdown-empty{padding:28px 0;color:#627080;font-size:11px}.report-error{padding:13px 15px;border-radius:7px;background:#2b171c;color:#e5a1a9;font-size:11px}.report-error button{border:0;background:none;color:#8fb3d9;cursor:pointer}.report-skeleton{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#27313c}.report-skeleton span{height:122px;background:#111720;animation:pulse 1.2s ease-in-out infinite alternate}.report-asof{margin:13px 0 0;color:#526070;font-size:9px;text-align:right}@keyframes pulse{to{background:#18212b}}@media(max-width:1100px){.breakdown-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:850px){.finance-metrics{grid-template-columns:repeat(2,1fr)}.report-layout{grid-template-columns:1fr}}@media(max-width:620px){.report-lead{align-items:flex-start;flex-direction:column}.export-button{width:100%}.date-range{align-items:stretch;flex-direction:column}.finance-metrics,.report-skeleton,.breakdown-grid{grid-template-columns:1fr}.finance-metrics article{min-height:105px}.trend-panel,.wallet-panel,.breakdown-panel{padding:16px}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
