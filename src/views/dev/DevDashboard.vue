<template>
  <div class="dev-dash">
    <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
    <aside class="d-sidebar">
      <div class="d-logo">
        <img class="d-mark" src="@/assets/almax-mark.png" alt="Almax logo" />
        <div>
          <div class="d-brand">ALMAX</div>
          <div class="d-brand-sub">DEV CONSOLE</div>
        </div>
      </div>

      <nav class="d-nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          :class="['d-nav-btn', { active: activeSection === item.id }]"
          @click="activeSection = item.id"
        >
          <span class="d-nav-icon" v-html="item.icon"></span>
          <span class="d-nav-copy">
            <span class="d-nav-label">{{ item.label }}</span>
            <span class="d-nav-desc">{{ item.desc }}</span>
          </span>
          <span v-if="item.id === 'commission'" class="d-private-dot"></span>
        </button>
      </nav>

      <div class="d-user-strip">
        <span class="d-user-av">D</span>
        <span class="d-user-info">
          <strong>almaxdev</strong>
          <small>Developer</small>
        </span>
      </div>

      <button class="d-logout" @click="logout">Sign out</button>
    </aside>

    <!-- ── Main Panel ──────────────────────────────────────────────────── -->
    <main class="d-main">
      <header class="d-header">
        <div>
          <p class="d-kicker">Developer Analytics</p>
          <h1 class="d-title">{{ currentSection.label }}</h1>
          <p class="d-subtitle">{{ currentSection.desc }}</p>
        </div>
        <div class="d-header-right">
          <span class="d-date">{{ todayDate }}</span>
          <span class="d-mode-badge">DEV MODE</span>
          <button class="d-refresh" @click="fetchAnalytics" :disabled="loading" title="Refresh data">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="d-loading">
        <div class="d-spinner"></div>
        <p>Loading analytics…</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="d-error-state">
        <p>{{ error }}</p>
        <button @click="fetchAnalytics">Retry</button>
      </div>

      <!-- ── Content ──────────────────────────────────────────────────── -->
      <div v-else-if="analytics" class="d-body">

        <!-- ========== OVERVIEW ========================================= -->
        <div v-if="activeSection === 'overview'">
          <!-- KPI Row 1 -->
          <div class="kpi-grid">
            <div class="kpi-card kpi-green">
              <p class="kpi-label">Total Revenue</p>
              <p class="kpi-value">{{ formatUGX(f.total_revenue) }}</p>
              <p class="kpi-sub">All confirmed payments</p>
            </div>
            <div class="kpi-card kpi-blue">
              <p class="kpi-label">This Month</p>
              <p class="kpi-value">{{ formatUGX(f.revenue_this_month) }}</p>
              <p class="kpi-sub">{{ formatUGX(f.revenue_this_week) }} this week</p>
            </div>
            <div class="kpi-card kpi-gold">
              <p class="kpi-label">Available Commission</p>
              <p class="kpi-value">{{ formatUGX(currentCommission) }}</p>
              <p class="kpi-sub">{{ formatUGX(c.total_withdrawn) }} withdrawn</p>
            </div>
            <div class="kpi-card kpi-teal">
              <p class="kpi-label">Overall Commission</p>
              <p class="kpi-value">{{ formatUGX(c.total_earned) }}</p>
              <p class="kpi-sub">{{ formatUGX(c.wallet_received ?? c.total_paid) }} sent to JPESA</p>
            </div>
          </div>

          <!-- KPI Row 2 -->
          <div class="kpi-grid" style="margin-top:14px">
            <div class="kpi-card">
              <p class="kpi-label">Today's Revenue</p>
              <p class="kpi-value kpi-value--md">{{ formatUGX(f.revenue_today) }}</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">Total Users</p>
              <p class="kpi-value kpi-value--md">{{ formatNum(u.total) }}</p>
              <p class="kpi-sub">+{{ u.new_this_month }} this month</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">Active Subscriptions</p>
              <p class="kpi-value kpi-value--md">{{ formatNum(s.active_total) }}</p>
            </div>
            <div class="kpi-card kpi-warn">
              <p class="kpi-label">Pending Payments</p>
              <p class="kpi-value kpi-value--md">{{ formatNum(analytics.payments.pending_count) }}</p>
              <p class="kpi-sub">Awaiting confirmation</p>
            </div>
          </div>

          <!-- Charts row -->
          <div class="chart-row">
            <!-- Revenue chart -->
            <div class="chart-card">
              <p class="chart-title">Revenue — Last 30 Days</p>
              <p class="chart-total">{{ formatUGX(f.total_revenue) }} total</p>
              <div class="vbar-wrap" v-if="revenueChart.length">
                <div class="vbar-bars">
                  <div
                    v-for="point in revenueChart"
                    :key="point.date"
                    class="vbar-col"
                    :title="`${point.date}: ${formatUGX(point.amount)}`"
                  >
                    <div class="vbar-fill vbar-fill--gold" :style="{ height: barH(point.amount, maxRevenue) + '%' }"></div>
                  </div>
                </div>
                <div class="vbar-x">
                  <span
                    v-for="(point, i) in revenueChart"
                    :key="'rx' + i"
                    class="vbar-x-lbl"
                  >{{ i % 6 === 0 ? shortDate(point.date) : '' }}</span>
                </div>
              </div>
              <p v-else class="chart-empty">No confirmed revenue in the last 30 days</p>
            </div>

            <!-- Signups chart -->
            <div class="chart-card">
              <p class="chart-title">New Users — Last 30 Days</p>
              <p class="chart-total">{{ u.new_this_month }} this month</p>
              <div class="vbar-wrap" v-if="signupsChart.length">
                <div class="vbar-bars">
                  <div
                    v-for="point in signupsChart"
                    :key="point.date"
                    class="vbar-col"
                    :title="`${point.date}: ${point.count} users`"
                  >
                    <div class="vbar-fill vbar-fill--blue" :style="{ height: barH(point.count, maxSignups) + '%' }"></div>
                  </div>
                </div>
                <div class="vbar-x">
                  <span
                    v-for="(point, i) in signupsChart"
                    :key="'sx' + i"
                    class="vbar-x-lbl"
                  >{{ i % 6 === 0 ? shortDate(point.date) : '' }}</span>
                </div>
              </div>
              <p v-else class="chart-empty">No signups in the last 30 days</p>
            </div>
          </div>
        </div>

        <!-- ========== FINANCE ========================================== -->
        <div v-if="activeSection === 'finance'">
          <!-- Summary cards -->
          <div class="kpi-grid">
            <div class="kpi-card kpi-green">
              <p class="kpi-label">Confirmed Revenue</p>
              <p class="kpi-value">{{ formatUGX(f.by_status?.confirmed?.amount ?? 0) }}</p>
              <p class="kpi-sub">{{ formatNum(f.by_status?.confirmed?.count ?? 0) }} payments</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">Pending Amount</p>
              <p class="kpi-value kpi-value--md">{{ formatUGX(f.by_status?.pending?.amount ?? 0) }}</p>
              <p class="kpi-sub">{{ formatNum(f.by_status?.pending?.count ?? 0) }} payments</p>
            </div>
            <div class="kpi-card kpi-red">
              <p class="kpi-label">Failed Payments</p>
              <p class="kpi-value kpi-value--md">{{ formatNum(f.by_status?.failed?.count ?? 0) }}</p>
              <p class="kpi-sub">{{ formatUGX(f.by_status?.failed?.amount ?? 0) }} lost</p>
            </div>
            <div class="kpi-card kpi-blue">
              <p class="kpi-label">This Month</p>
              <p class="kpi-value kpi-value--md">{{ formatUGX(f.revenue_this_month) }}</p>
              <p class="kpi-sub">{{ formatUGX(f.revenue_this_week) }} this week</p>
            </div>
          </div>

          <div class="two-col-grid" style="margin-top:24px">
            <!-- Revenue by Plan -->
            <div class="section-card">
              <p class="section-card-title">Revenue by Plan</p>
              <div class="hbar-list">
                <div v-for="(value, key) in f.by_plan" :key="key" class="hbar-row">
                  <span class="hbar-label">{{ capitalize(key) }}</span>
                  <div class="hbar-track">
                    <div class="hbar-fill hbar-fill--gold" :style="{ width: hBarW(value, maxPlanRevenue) + '%' }"></div>
                  </div>
                  <span class="hbar-value">{{ formatUGX(value) }}</span>
                </div>
                <p v-if="!Object.keys(f.by_plan || {}).length" class="empty-msg">No data yet</p>
              </div>
            </div>

            <!-- Revenue by Payment Method -->
            <div class="section-card">
              <p class="section-card-title">Revenue by Payment Method</p>
              <div class="hbar-list">
                <div v-for="(value, key) in f.by_method" :key="key" class="hbar-row">
                  <span class="hbar-label">{{ key.toUpperCase() }}</span>
                  <div class="hbar-track">
                    <div class="hbar-fill hbar-fill--teal" :style="{ width: hBarW(value, maxMethodRevenue) + '%' }"></div>
                  </div>
                  <span class="hbar-value">{{ formatUGX(value) }}</span>
                </div>
                <p v-if="!Object.keys(f.by_method || {}).length" class="empty-msg">No data yet</p>
              </div>
            </div>
          </div>

          <!-- Revenue trend chart -->
          <div class="chart-card" style="margin-top:24px">
            <p class="chart-title">Daily Revenue Trend — Last 30 Days</p>
            <div class="vbar-wrap vbar-wrap--tall" v-if="revenueChart.length">
              <div class="vbar-bars">
                <div
                  v-for="point in revenueChart"
                  :key="point.date"
                  class="vbar-col"
                  :title="`${point.date}: ${formatUGX(point.amount)}`"
                >
                  <div class="vbar-fill vbar-fill--gold" :style="{ height: barH(point.amount, maxRevenue) + '%' }"></div>
                </div>
              </div>
              <div class="vbar-x">
                <span v-for="(point, i) in revenueChart" :key="'fx' + i" class="vbar-x-lbl">
                  {{ i % 4 === 0 ? shortDate(point.date) : '' }}
                </span>
              </div>
            </div>
            <p v-else class="chart-empty">No confirmed revenue in the last 30 days</p>
          </div>
        </div>

        <!-- ========== COMMISSION ======================================== -->
        <div v-if="activeSection === 'commission'">
          <!-- Rate Banner -->
          <div class="comm-banner" :class="c.enabled ? 'comm-banner--active' : 'comm-banner--inactive'">
            <div class="comm-banner-left">
              <span class="comm-rate-badge">{{ (c.ratio * 100).toFixed(0) }}%</span>
              <div>
                <p class="comm-banner-title">
                  Platform Commission
                  <span :class="['comm-live-pill', c.enabled ? 'comm-live-pill--on' : 'comm-live-pill--off']">
                    {{ c.enabled ? '● LIVE' : '○ DISABLED' }}
                  </span>
                </p>
                <p class="comm-banner-sub">
                  <template v-if="c.enabled">Active - available balance is reduced by recorded JPESA withdrawals.</template>
                  <template v-else>Disabled — set <code>JPESA_AGENT_COMMISSION_ENABLED=true</code> in .env to activate.</template>
                </p>
              </div>
            </div>
            <div class="comm-banner-right">
              <div class="comm-stat">
                <span class="comm-stat-label">Ratio</span>
                <span class="comm-stat-val">{{ (c.ratio * 100).toFixed(1) }}%</span>
              </div>
              <div class="comm-stat">
                <span class="comm-stat-label">Available</span>
                <span class="comm-stat-val" :class="currentCommission > 0 ? 'text-gold' : ''">{{ formatUGX(currentCommission) }}</span>
              </div>
              <div class="comm-stat">
                <span class="comm-stat-label">Overall</span>
                <span class="comm-stat-val">{{ formatUGX(c.total_earned) }}</span>
              </div>
            </div>
          </div>

          <!-- Commission KPI cards -->
          <div class="kpi-grid" style="margin-top:20px">
            <div class="kpi-card kpi-gold">
              <p class="kpi-label">Total Overall</p>
              <p class="kpi-value">{{ formatUGX(c.total_earned) }}</p>
              <p class="kpi-sub">All time commission</p>
            </div>
            <div class="kpi-card kpi-green">
              <p class="kpi-label">Available Now</p>
              <p class="kpi-value">{{ formatUGX(currentCommission) }}</p>
              <p class="kpi-sub">After JPESA withdrawals</p>
            </div>
            <div class="kpi-card kpi-blue">
              <p class="kpi-label">Withdrawn</p>
              <p class="kpi-value kpi-value--md">{{ formatUGX(c.total_withdrawn) }}</p>
              <p class="kpi-sub">{{ formatNum(c.withdrawals?.length ?? 0) }} recent records</p>
            </div>
            <div class="kpi-card kpi-warn">
              <p class="kpi-label">Sent to JPESA</p>
              <p class="kpi-value kpi-value--md">{{ formatUGX(c.wallet_received ?? c.total_paid) }}</p>
              <p class="kpi-sub">{{ formatNum(c.by_status?.completed?.count ?? 0) }} transfers completed</p>
            </div>
          </div>

          <div class="section-card withdrawal-card" style="margin-top:24px">
            <div class="withdrawal-head">
              <div>
                <p class="section-card-title">JPESA Withdrawals</p>
                <p class="section-card-sub">{{ c.wallet_account || 'JPESA wallet' }}</p>
              </div>
              <button
                type="button"
                class="withdrawal-secondary"
                @click="fillWithdrawalBalance"
                :disabled="!currentCommission || withdrawalSaving"
              >
                Full Balance
              </button>
            </div>

            <form class="withdrawal-form" @submit.prevent="recordCommissionWithdrawal">
              <label class="withdrawal-field">
                <span>Amount</span>
                <input
                  v-model="withdrawalForm.amount"
                  type="number"
                  min="1"
                  step="1"
                  :max="currentCommission || null"
                  placeholder="UGX"
                  required
                />
              </label>
              <label class="withdrawal-field">
                <span>Date</span>
                <input
                  v-model="withdrawalForm.withdrawn_at"
                  type="date"
                  :max="todayInputDate"
                />
              </label>
              <label class="withdrawal-field withdrawal-field--wide">
                <span>Reference</span>
                <input
                  v-model.trim="withdrawalForm.reference"
                  type="text"
                  maxlength="200"
                  placeholder="JPESA ref"
                />
              </label>
              <button
                type="submit"
                class="withdrawal-submit"
                :disabled="withdrawalSaving || !Number(withdrawalForm.amount)"
              >
                {{ withdrawalSaving ? 'Recording' : 'Record Withdrawal' }}
              </button>
            </form>

            <p v-if="withdrawalError" class="withdrawal-error">{{ withdrawalError }}</p>

            <div v-if="c.withdrawals && c.withdrawals.length" class="withdrawal-list">
              <div v-for="item in c.withdrawals" :key="item.id" class="withdrawal-row">
                <span class="withdrawal-date">{{ fmtDate(item.withdrawn_at) }}</span>
                <span class="withdrawal-ref">{{ item.reference || 'Withdrawal' }}</span>
                <span class="withdrawal-amount">{{ formatUGX(item.amount) }}</span>
              </div>
            </div>
          </div>

          <div class="two-col-grid" style="margin-top:24px">
            <!-- Commission by plan -->
            <div class="section-card">
              <p class="section-card-title">Commission by Plan</p>
              <div class="hbar-list">
                <div v-for="(value, key) in c.by_plan" :key="key" class="hbar-row">
                  <span class="hbar-label">{{ capitalize(key) }}</span>
                  <div class="hbar-track">
                    <div class="hbar-fill hbar-fill--gold" :style="{ width: hBarW(value, maxPlanComm) + '%' }"></div>
                  </div>
                  <span class="hbar-value">{{ formatUGX(value) }}</span>
                </div>
                <p v-if="!Object.keys(c.by_plan || {}).length" class="empty-msg">No commission data yet</p>
              </div>
            </div>

            <!-- Commission by method -->
            <div class="section-card">
              <p class="section-card-title">Commission by Payment Method</p>
              <div class="hbar-list">
                <div v-for="(value, key) in c.by_method" :key="key" class="hbar-row">
                  <span class="hbar-label">{{ key.toUpperCase() }}</span>
                  <div class="hbar-track">
                    <div class="hbar-fill hbar-fill--teal" :style="{ width: hBarW(value, maxMethodComm) + '%' }"></div>
                  </div>
                  <span class="hbar-value">{{ formatUGX(value) }}</span>
                </div>
                <p v-if="!Object.keys(c.by_method || {}).length" class="empty-msg">No commission data yet</p>
              </div>
            </div>
          </div>

          <!-- Recent commission transactions table -->
          <div class="section-card" style="margin-top:24px">
            <p class="section-card-title">Recent Commission Transactions</p>
            <p class="section-card-sub">Latest 25 payments with commission tracking</p>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Plan</th>
                    <th>Method</th>
                    <th>Payment</th>
                    <th>Commission (20%)</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in c.recent" :key="row.id">
                    <td class="td-muted">{{ row.id }}</td>
                    <td class="td-date">{{ fmtDate(row.created_at) }}</td>
                    <td><span class="plan-chip">{{ capitalize(row.plan_type || '—') }}</span></td>
                    <td class="td-method">{{ (row.payment_method || '—').toUpperCase() }}</td>
                    <td class="td-amount">{{ formatUGX(row.amount) }}</td>
                    <td class="td-commission">{{ formatUGX(row.agent_commission_amount) }}</td>
                    <td>
                      <span :class="['status-badge', statusClass(row.agent_commission_status)]">
                        {{ statusLabel(row.agent_commission_status) }}
                      </span>
                      <p v-if="row.agent_commission_error" class="commission-error" :title="row.agent_commission_error">
                        {{ row.agent_commission_error }}
                      </p>
                    </td>
                    <td class="td-action">
                      <button
                        v-if="canRetryCommission(row)"
                        class="retry-commission-btn"
                        @click="retryCommission(row)"
                        :disabled="retryingCommission[row.id]"
                        :title="commissionRetryTitle(row)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <polyline points="1 20 1 14 7 14"></polyline>
                          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10"></path>
                          <path d="M20.49 15a9 9 0 01-14.85 3.36L1 14"></path>
                        </svg>
                        <span>{{ retryingCommission[row.id] ? 'Retrying' : 'Retry' }}</span>
                      </button>
                      <span v-else class="action-muted">-</span>
                    </td>
                  </tr>
                  <tr v-if="!c.recent || !c.recent.length">
                    <td colspan="8" class="td-empty">
                      <template v-if="c.enabled">Commission is live — records will appear here as payments are confirmed.</template>
                      <template v-else>Commission is disabled. Set <code>JPESA_AGENT_COMMISSION_ENABLED=true</code> to start tracking.</template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ========== USERS ============================================ -->
        <div v-if="activeSection === 'users'">
          <div class="kpi-grid">
            <div class="kpi-card kpi-blue">
              <p class="kpi-label">Total Members</p>
              <p class="kpi-value">{{ formatNum(u.total) }}</p>
              <p class="kpi-sub">Registered accounts</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">New Today</p>
              <p class="kpi-value kpi-value--md">{{ formatNum(u.new_today) }}</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">New This Week</p>
              <p class="kpi-value kpi-value--md">{{ formatNum(u.new_this_week) }}</p>
            </div>
            <div class="kpi-card kpi-teal">
              <p class="kpi-label">New This Month</p>
              <p class="kpi-value kpi-value--md">{{ formatNum(u.new_this_month) }}</p>
            </div>
          </div>

          <div class="chart-card" style="margin-top:24px">
            <p class="chart-title">Daily Signups — Last 30 Days</p>
            <p class="chart-total">{{ u.new_this_month }} new this month</p>
            <div class="vbar-wrap vbar-wrap--tall" v-if="signupsChart.length">
              <div class="vbar-bars">
                <div
                  v-for="point in signupsChart"
                  :key="point.date"
                  class="vbar-col"
                  :title="`${point.date}: ${point.count} signups`"
                >
                  <div class="vbar-fill vbar-fill--blue" :style="{ height: barH(point.count, maxSignups) + '%' }"></div>
                </div>
              </div>
              <div class="vbar-x">
                <span v-for="(point, i) in signupsChart" :key="'ux' + i" class="vbar-x-lbl">
                  {{ i % 4 === 0 ? shortDate(point.date) : '' }}
                </span>
              </div>
            </div>
            <p v-else class="chart-empty">No signups in the last 30 days</p>
          </div>
        </div>

        <!-- ========== SUBSCRIPTIONS ==================================== -->
        <div v-if="activeSection === 'subscriptions'">
          <div class="kpi-grid">
            <div class="kpi-card kpi-green">
              <p class="kpi-label">Active Subscriptions</p>
              <p class="kpi-value">{{ formatNum(s.active_total) }}</p>
              <p class="kpi-sub">Currently running</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">Expired</p>
              <p class="kpi-value kpi-value--md">{{ formatNum(s.by_status?.expired ?? 0) }}</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">Pending Activation</p>
              <p class="kpi-value kpi-value--md">{{ formatNum(s.by_status?.pending ?? 0) }}</p>
            </div>
            <div class="kpi-card kpi-red">
              <p class="kpi-label">Cancelled</p>
              <p class="kpi-value kpi-value--md">{{ formatNum(s.by_status?.cancelled ?? 0) }}</p>
            </div>
          </div>

          <div class="section-card" style="margin-top:24px">
            <p class="section-card-title">Active Subscriptions by Plan</p>
            <div class="hbar-list">
              <div v-for="(value, key) in s.active_by_plan" :key="key" class="hbar-row hbar-row--lg">
                <span class="hbar-label hbar-label--lg">{{ capitalize(key) }}</span>
                <div class="hbar-track">
                  <div class="hbar-fill hbar-fill--green" :style="{ width: hBarW(value, maxActivePlan) + '%' }"></div>
                </div>
                <span class="hbar-value">{{ formatNum(value) }} active</span>
              </div>
              <p v-if="!Object.keys(s.active_by_plan || {}).length" class="empty-msg">No active subscriptions</p>
            </div>
          </div>
        </div>

      </div>
      <!-- /content -->
    </main>
  </div>
</template>

<script>
import devApi from '../../utils/devApi'

export default {
  name: 'DevDashboard',
  data() {
    const d = new Date()
    return {
      activeSection: 'overview',
      loading: true,
      error: '',
      analytics: null,
      retryingCommission: {},
      withdrawalSaving: false,
      withdrawalError: '',
      withdrawalForm: {
        amount: '',
        withdrawn_at: '',
        reference: ''
      },
      todayDate: d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      navItems: [
        {
          id: 'overview',
          label: 'Overview',
          desc: 'System snapshot',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>'
        },
        {
          id: 'finance',
          label: 'Finance',
          desc: 'Revenue breakdown',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
        },
        {
          id: 'commission',
          label: 'Commission',
          desc: '20% platform cut',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'
        },
        {
          id: 'users',
          label: 'Users',
          desc: 'Member analytics',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>'
        },
        {
          id: 'subscriptions',
          label: 'Packages',
          desc: 'Active plans',
          icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
        }
      ]
    }
  },
  computed: {
    currentSection() {
      return this.navItems.find(n => n.id === this.activeSection) || {}
    },
    f() { return this.analytics?.finance || {} },
    c() { return this.analytics?.commission || {} },
    currentCommission() {
      const available = this.c.available ?? this.c.current_total
      if (available !== undefined && available !== null) return Number(available) || 0
      return Math.max(0, Number(this.c.total_paid || 0) - Number(this.c.total_withdrawn || 0))
    },
    todayInputDate() {
      const d = new Date()
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      return d.toISOString().slice(0, 10)
    },
    u() { return this.analytics?.users || {} },
    s() { return this.analytics?.subscriptions || {} },
    revenueChart() { return this.analytics?.charts?.revenue || [] },
    signupsChart() { return this.analytics?.charts?.signups || [] },
    maxRevenue() {
      return Math.max(...this.revenueChart.map(d => Number(d.amount) || 0), 1)
    },
    maxSignups() {
      return Math.max(...this.signupsChart.map(d => Number(d.count) || 0), 1)
    },
    maxPlanRevenue() {
      return Math.max(...Object.values(this.f.by_plan || {}).map(Number), 1)
    },
    maxMethodRevenue() {
      return Math.max(...Object.values(this.f.by_method || {}).map(Number), 1)
    },
    maxPlanComm() {
      return Math.max(...Object.values(this.c.by_plan || {}).map(Number), 1)
    },
    maxMethodComm() {
      return Math.max(...Object.values(this.c.by_method || {}).map(Number), 1)
    },
    maxActivePlan() {
      return Math.max(...Object.values(this.s.active_by_plan || {}).map(Number), 1)
    }
  },
  async mounted() {
    await this.fetchAnalytics()
  },
  methods: {
    async fetchAnalytics() {
      this.loading = true
      this.error = ''
      try {
        const { data } = await devApi.get('/api/analytics/developer')
        this.analytics = data
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          this.$router.push('/dev/login')
        } else {
          this.error = 'Failed to load analytics data. Please try again.'
        }
      } finally {
        this.loading = false
      }
    },
    logout() {
      localStorage.removeItem('devToken')
      this.$router.push('/dev/login')
    },
    formatUGX(n) {
      return Number(n || 0).toLocaleString() + ' UGX'
    },
    formatNum(n) {
      return Number(n || 0).toLocaleString()
    },
    barH(value, max) {
      if (!max) return 1
      return Math.max((Number(value) / Number(max)) * 100, 1).toFixed(1)
    },
    hBarW(value, max) {
      if (!max) return 1
      return Math.max((Number(value) / Number(max)) * 100, 1).toFixed(1)
    },
    shortDate(d) {
      if (!d) return ''
      const dt = new Date(d)
      return `${dt.getDate()}/${dt.getMonth() + 1}`
    },
    fmtDate(d) {
      if (!d) return '—'
      return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    },
    capitalize(s) {
      if (!s) return '—'
      return s.charAt(0).toUpperCase() + s.slice(1)
    },
    statusClass(status) {
      const map = {
        completed:  'st-done',
        processing: 'st-proc',
        pending:    'st-pend',
        failed:     'st-fail'
      }
      return map[status] || 'st-none'
    },
    statusLabel(status) {
      const map = {
        completed:  'Paid',
        processing: 'In Progress',
        pending:    'Pending',
        failed:     'Failed'
      }
      return map[status] || (status ? status : 'Queued')
    },
    canRetryCommission(row) {
      if (!this.c.enabled || !row) return false
      const status = String(row.agent_commission_status || '').toLowerCase()
      return status === 'failed' || status === 'pending'
    },
    commissionRetryTitle(row) {
      if (row?.agent_commission_error) {
        return 'Retry commission payment: ' + row.agent_commission_error
      }
      return 'Retry commission payment'
    },
    fillWithdrawalBalance() {
      this.withdrawalError = ''
      this.withdrawalForm.amount = this.currentCommission ? String(Math.floor(this.currentCommission)) : ''
      if (!this.withdrawalForm.withdrawn_at) {
        this.withdrawalForm.withdrawn_at = this.todayInputDate
      }
    },
    async recordCommissionWithdrawal() {
      const amount = Number(this.withdrawalForm.amount)
      this.withdrawalError = ''

      if (!amount || amount < 1) {
        this.withdrawalError = 'Enter a withdrawal amount.'
        return
      }

      this.withdrawalSaving = true
      try {
        await devApi.post('/api/analytics/developer/commission-withdrawals', {
          amount,
          withdrawn_at: this.withdrawalForm.withdrawn_at || undefined,
          reference: this.withdrawalForm.reference || undefined
        })
        this.withdrawalForm = {
          amount: '',
          withdrawn_at: '',
          reference: ''
        }
        await this.fetchAnalytics()
      } catch (err) {
        const errors = err.response?.data?.errors || {}
        this.withdrawalError = errors.amount?.[0]
          || errors.withdrawn_at?.[0]
          || err.response?.data?.message
          || 'Could not record withdrawal. Please try again.'
      } finally {
        this.withdrawalSaving = false
      }
    },
    async retryCommission(row) {
      if (!this.canRetryCommission(row) || this.retryingCommission[row.id]) return
      if (!confirm('Retry commission payment for payment #' + row.id + '?')) return

      this.retryingCommission = { ...this.retryingCommission, [row.id]: true }
      try {
        const { data } = await devApi.post('/api/analytics/developer/payments/' + row.id + '/retry-commission')
        await this.fetchAnalytics()

        if (data && data.success === false) {
          alert(data.message || 'Commission retry did not complete.')
        }
      } catch (err) {
        const message = err.response?.data?.message
          || err.response?.data?.error
          || 'Commission retry failed. Please try again.'
        alert(message)
      } finally {
        this.retryingCommission = { ...this.retryingCommission, [row.id]: false }
      }
    }
  }
}
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────────── */
.dev-dash {
  display: flex;
  min-height: 100vh;
  background: #0a0e1a;
  color: #e5e7eb;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.d-sidebar {
  width: 230px;
  background: #0f1623;
  border-right: 1px solid #1a2540;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 100;
  overflow-y: auto;
}

.d-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid #1a2540;
}

.d-mark {
  width: 36px;
  height: 36px;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.25));
  flex-shrink: 0;
}

.d-brand {
  font-size: 14px;
  font-weight: 800;
  color: #f3f4f6;
  letter-spacing: 2px;
  line-height: 1;
}

.d-brand-sub {
  font-size: 8px;
  font-weight: 700;
  color: #f59e0b;
  letter-spacing: 1.5px;
  margin-top: 3px;
}

.d-nav {
  flex: 1;
  padding: 12px 10px;
}

.d-nav-btn {
  width: 100%;
  background: none;
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #6b7280;
  text-align: left;
  transition: background 0.15s, color 0.15s;
  position: relative;
  margin-bottom: 2px;
}

.d-nav-btn:hover {
  background: #1a2540;
  color: #d1d5db;
}

.d-nav-btn.active {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.d-nav-icon {
  flex-shrink: 0;
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.d-nav-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.d-nav-label {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.d-nav-desc {
  font-size: 10px;
  color: #4b5563;
  margin-top: 2px;
  line-height: 1;
}

.d-nav-btn.active .d-nav-desc {
  color: #92400e;
}

.d-private-dot {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
}

.d-user-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid #1a2540;
}

.d-user-av {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #0a0e1a;
  font-size: 13px;
  font-weight: 800;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.d-user-info {
  display: flex;
  flex-direction: column;
}

.d-user-info strong {
  font-size: 13px;
  color: #e5e7eb;
}

.d-user-info small {
  font-size: 10px;
  color: #6b7280;
  margin-top: 1px;
}

.d-logout {
  background: none;
  border: 1px solid #1a2540;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  padding: 10px 16px;
  text-align: left;
  transition: color 0.15s, border-color 0.15s;
}

.d-logout:hover {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

/* ── Main ────────────────────────────────────────────────────────────────── */
.d-main {
  margin-left: 230px;
  flex: 1;
  min-height: 100vh;
}

.d-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 28px 32px 20px;
  border-bottom: 1px solid #1a2540;
  background: #0a0e1a;
  position: sticky;
  top: 0;
  z-index: 50;
}

.d-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #f59e0b;
  text-transform: uppercase;
  margin: 0 0 4px;
}

.d-title {
  font-size: 22px;
  font-weight: 800;
  color: #f3f4f6;
  margin: 0;
  line-height: 1.2;
}

.d-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin: 4px 0 0;
}

.d-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  margin-top: 4px;
}

.d-date {
  font-size: 11px;
  color: #4b5563;
}

.d-mode-badge {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.25);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.5px;
  padding: 3px 8px;
  border-radius: 4px;
}

.d-refresh {
  background: #1a2540;
  border: 1px solid #253050;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.d-refresh:hover:not(:disabled) { color: #f59e0b; }
.d-refresh:disabled { opacity: 0.4; cursor: not-allowed; }

.d-body {
  padding: 28px 32px;
}

/* ── Loading / Error ─────────────────────────────────────────────────────── */
.d-loading {
  padding: 80px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #4b5563;
  font-size: 13px;
}

.d-spinner {
  width: 32px; height: 32px;
  border: 3px solid #1a2540;
  border-top-color: #f59e0b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.d-error-state {
  padding: 60px 32px;
  text-align: center;
  color: #f87171;
}

.d-error-state button {
  margin-top: 12px;
  background: #1a2540;
  border: 1px solid #253050;
  color: #e5e7eb;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

/* ── KPI Grid ────────────────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.kpi-card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 20px;
}

.kpi-card.kpi-green  { border-left: 3px solid #10b981; }
.kpi-card.kpi-blue   { border-left: 3px solid #3b82f6; }
.kpi-card.kpi-gold   { border-left: 3px solid #f59e0b; }
.kpi-card.kpi-teal   { border-left: 3px solid #14b8a6; }
.kpi-card.kpi-warn   { border-left: 3px solid #f97316; }
.kpi-card.kpi-red    { border-left: 3px solid #ef4444; }

.kpi-label {
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin: 0 0 8px;
}

.kpi-value {
  font-size: 22px;
  font-weight: 800;
  color: #f3f4f6;
  margin: 0;
  line-height: 1;
}

.kpi-value--md {
  font-size: 18px;
}

.kpi-sub {
  font-size: 11px;
  color: #4b5563;
  margin: 6px 0 0;
}

/* ── Charts ──────────────────────────────────────────────────────────────── */
.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 20px;
}

.chart-card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 20px;
}

.chart-title {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 4px;
}

.chart-total {
  font-size: 14px;
  font-weight: 700;
  color: #e5e7eb;
  margin: 0 0 16px;
}

.chart-empty {
  font-size: 12px;
  color: #374151;
  margin: 24px 0;
  text-align: center;
}

.vbar-wrap {
  height: 140px;
  display: flex;
  flex-direction: column;
}

.vbar-wrap--tall {
  height: 200px;
}

.vbar-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding-bottom: 4px;
}

.vbar-col {
  flex: 1;
  display: flex;
  align-items: flex-end;
  height: 100%;
  cursor: default;
}

.vbar-fill {
  width: 100%;
  border-radius: 2px 2px 0 0;
  min-height: 2px;
  transition: opacity 0.15s;
}

.vbar-fill:hover { opacity: 0.75; }

.vbar-fill--gold  { background: #f59e0b; }
.vbar-fill--blue  { background: #3b82f6; }
.vbar-fill--green { background: #10b981; }

.vbar-x {
  display: flex;
  margin-top: 4px;
}

.vbar-x-lbl {
  flex: 1;
  font-size: 8px;
  color: #374151;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
}

/* ── Two column grid ─────────────────────────────────────────────────────── */
.two-col-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* ── Section cards ───────────────────────────────────────────────────────── */
.section-card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 20px;
}

.section-card-title {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 4px;
}

.section-card-sub {
  font-size: 11px;
  color: #374151;
  margin: 0 0 16px;
}

/* ── Horizontal bars ─────────────────────────────────────────────────────── */
.hbar-list {
  margin-top: 12px;
}

.hbar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.hbar-row--lg {
  margin-bottom: 14px;
}

.hbar-label {
  font-size: 11px;
  color: #9ca3af;
  width: 64px;
  flex-shrink: 0;
  text-align: right;
}

.hbar-label--lg {
  font-size: 12px;
  width: 80px;
}

.hbar-track {
  flex: 1;
  background: #1a2540;
  border-radius: 4px;
  height: 8px;
  overflow: hidden;
}

.hbar-fill {
  height: 100%;
  border-radius: 4px;
  min-width: 2px;
  transition: width 0.4s ease;
}

.hbar-fill--gold  { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.hbar-fill--teal  { background: linear-gradient(90deg, #14b8a6, #2dd4bf); }
.hbar-fill--green { background: linear-gradient(90deg, #10b981, #34d399); }

.hbar-value {
  font-size: 11px;
  color: #6b7280;
  width: 110px;
  flex-shrink: 0;
  text-align: right;
}

.empty-msg {
  font-size: 12px;
  color: #374151;
  text-align: center;
  padding: 16px 0;
}

/* ── Commission Banner ───────────────────────────────────────────────────── */
.comm-banner {
  background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.comm-banner--active {
  border-color: rgba(16, 185, 129, 0.35);
  background: linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(245,158,11,0.05) 100%);
}
.comm-banner--inactive {
  border-color: rgba(239, 68, 68, 0.25);
  background: linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(245,158,11,0.03) 100%);
}
.comm-live-pill {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 20px;
  margin-left: 8px;
  vertical-align: middle;
}
.comm-live-pill--on  { background: rgba(16,185,129,0.18); color: #10b981; border: 1px solid rgba(16,185,129,0.4); }
.comm-live-pill--off { background: rgba(239,68,68,0.15);  color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }

.comm-banner-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.comm-rate-badge {
  font-size: 32px;
  font-weight: 900;
  color: #f59e0b;
  line-height: 1;
  flex-shrink: 0;
}

.comm-banner-title {
  font-size: 15px;
  font-weight: 700;
  color: #f3f4f6;
  margin: 0 0 4px;
}

.comm-banner-sub {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.comm-banner-right {
  display: flex;
  gap: 24px;
  flex-shrink: 0;
}

.comm-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.comm-stat-label {
  font-size: 9px;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.comm-stat-val {
  font-size: 15px;
  font-weight: 700;
  color: #e5e7eb;
  margin-top: 2px;
}

.text-gold { color: #f59e0b; }

/* ── JPESA withdrawal ledger ─────────────────────────────────────────────── */
.withdrawal-card {
  border-color: rgba(20, 184, 166, 0.22);
}

.withdrawal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.withdrawal-form {
  display: grid;
  grid-template-columns: minmax(140px, 0.8fr) minmax(140px, 0.8fr) minmax(180px, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.withdrawal-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.withdrawal-field span {
  color: #6b7280;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.withdrawal-field input {
  width: 100%;
  height: 38px;
  background: #0f1623;
  border: 1px solid #253050;
  border-radius: 6px;
  color: #e5e7eb;
  font-size: 13px;
  outline: none;
  padding: 0 10px;
}

.withdrawal-field input:focus {
  border-color: rgba(20, 184, 166, 0.58);
}

.withdrawal-submit,
.withdrawal-secondary {
  height: 38px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

.withdrawal-submit {
  background: rgba(20, 184, 166, 0.18);
  border: 1px solid rgba(20, 184, 166, 0.36);
  color: #2dd4bf;
  padding: 0 14px;
}

.withdrawal-secondary {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.32);
  color: #f59e0b;
  padding: 0 12px;
}

.withdrawal-submit:hover,
.withdrawal-secondary:hover {
  filter: brightness(1.12);
}

.withdrawal-submit:disabled,
.withdrawal-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.withdrawal-error {
  color: #ef4444;
  font-size: 11px;
  margin: 10px 0 0;
}

.withdrawal-list {
  border-top: 1px solid #1a2540;
  margin-top: 14px;
  padding-top: 8px;
}

.withdrawal-row {
  display: grid;
  grid-template-columns: 90px 1fr 120px;
  gap: 10px;
  align-items: center;
  min-height: 30px;
  color: #9ca3af;
  font-size: 12px;
}

.withdrawal-date {
  color: #6b7280;
  white-space: nowrap;
}

.withdrawal-ref {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.withdrawal-amount {
  color: #2dd4bf;
  font-weight: 800;
  text-align: right;
}

/* ── Data Table ──────────────────────────────────────────────────────────── */
.table-wrap {
  overflow-x: auto;
  margin-top: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-table th {
  text-align: left;
  padding: 8px 10px;
  font-size: 9px;
  font-weight: 700;
  color: #4b5563;
  letter-spacing: 1px;
  text-transform: uppercase;
  border-bottom: 1px solid #1a2540;
  white-space: nowrap;
}

.data-table td {
  padding: 10px 10px;
  border-bottom: 1px solid #111827;
  color: #9ca3af;
  vertical-align: middle;
}

.data-table tr:hover td {
  background: #0f1623;
}

.td-muted   { color: #374151; font-size: 11px; }
.td-date    { color: #6b7280; white-space: nowrap; }
.td-method  { font-weight: 600; color: #3b82f6; }
.td-amount  { font-weight: 700; color: #e5e7eb; text-align: right; }
.td-commission { font-weight: 800; color: #f59e0b; text-align: right; }
.td-action  { text-align: right; white-space: nowrap; }
.td-empty   { text-align: center; color: #374151; padding: 24px; font-size: 12px; }

code {
  background: #1a2540;
  color: #f59e0b;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.plan-chip {
  background: #1a2540;
  color: #9ca3af;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

/* ── Status Badges ───────────────────────────────────────────────────────── */
.status-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.st-done { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
.st-proc { background: rgba(59,130,246,0.12);  color: #3b82f6; border: 1px solid rgba(59,130,246,0.2); }
.st-pend { background: rgba(245,158,11,0.12);  color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
.st-fail { background: rgba(239,68,68,0.12);   color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
.st-none { background: rgba(107,114,128,0.12); color: #6b7280; border: 1px solid rgba(107,114,128,0.2); }

.commission-error {
  max-width: 230px;
  margin: 6px 0 0;
  color: #ef4444;
  font-size: 10px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retry-commission-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 72px;
  height: 28px;
  padding: 0 9px;
  border: 1px solid rgba(245,158,11,0.32);
  border-radius: 6px;
  background: rgba(245,158,11,0.12);
  color: #f59e0b;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.retry-commission-btn svg {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
}

.retry-commission-btn:hover {
  background: rgba(245,158,11,0.2);
  border-color: rgba(245,158,11,0.48);
}

.retry-commission-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-muted {
  color: #374151;
  font-size: 12px;
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .kpi-grid       { grid-template-columns: repeat(2, 1fr); }
  .two-col-grid   { grid-template-columns: 1fr; }
  .chart-row      { grid-template-columns: 1fr; }
  .withdrawal-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .withdrawal-submit { width: 100%; }
}

@media (max-width: 768px) {
  .d-sidebar      { display: none; }
  .d-main         { margin-left: 0; }
  .kpi-grid       { grid-template-columns: 1fr 1fr; }
  .d-body         { padding: 16px; }
  .d-header       { padding: 16px; }
  .withdrawal-head { flex-direction: column; }
  .withdrawal-form { grid-template-columns: 1fr; }
  .withdrawal-row  { grid-template-columns: 78px 1fr 104px; }
}
</style>
