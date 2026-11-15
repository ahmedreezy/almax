<template>
  <figure class="developer-chart" :aria-label="ariaLabel">
    <div v-if="points.length" class="developer-chart__canvas">
      <canvas ref="canvas" role="img" :aria-label="ariaLabel"></canvas>
    </div>
    <p v-else class="developer-chart__empty">{{ emptyText }}</p>
    <figcaption class="sr-only">{{ accessibleSummary }}</figcaption>
  </figure>
</template>

<script>
import { Chart } from '../../utils/developerChartRegistry'

export default {
  name: 'DeveloperChart',
  props: {
    points: { type: Array, default: () => [] },
    valueKey: { type: String, required: true },
    type: { type: String, default: 'line' },
    accent: { type: String, default: '#8fb3d9' },
    ariaLabel: { type: String, required: true },
    emptyText: { type: String, default: 'No data is available for this period.' },
    valueType: { type: String, default: 'number' }
  },
  data() {
    return { chart: null, isUnmounting: false }
  },
  computed: {
    accessibleSummary() {
      if (!this.points.length) return this.emptyText
      return this.points
        .map(point => `${this.formatDate(point.date)}: ${this.formatValue(point[this.valueKey])}`)
        .join('; ')
    }
  },
  watch: {
    points: { deep: true, handler() { this.renderChart() } },
    type() { this.renderChart() }
  },
  mounted() {
    this.isUnmounting = false
    this.renderChart()
  },
  beforeUnmount() {
    this.isUnmounting = true
    this.destroyChart()
  },
  methods: {
    colorWithAlpha(color, alpha) {
      const hex = String(color || '').replace('#', '')
      if (/^[\da-f]{6}$/i.test(hex)) {
        const value = Number.parseInt(hex, 16)
        return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
      }
      return color
    },
    destroyChart() {
      if (this.chart) {
        this.chart.stop()
        this.chart.destroy()
        this.chart = null
      }
    },
    formatDate(value) {
      if (!value) return ''
      return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    },
    formatValue(value) {
      const number = Number(value || 0)
      if (this.valueType === 'currency') return `${number.toLocaleString('en-UG')} UGX`
      return number.toLocaleString('en-UG')
    },
    renderChart() {
      this.$nextTick(() => {
        if (this.isUnmounting) return
        this.destroyChart()
        if (!this.points.length || !this.$refs.canvas) return

        const isLine = this.type === 'line'
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        const chartColors = ['#68a7ff', '#4fd1c5', '#a78bfa', '#5fd38d', '#f59e7a', '#60c8f2']
        const barColors = this.points.map((_, index) => this.colorWithAlpha(chartColors[index % chartColors.length], .76))
        const barHoverColors = this.points.map((_, index) => chartColors[index % chartColors.length])
        this.chart = new Chart(this.$refs.canvas, {
          type: this.type,
          data: {
            labels: this.points.map(point => this.formatDate(point.date)),
            datasets: [{
              data: this.points.map(point => Number(point[this.valueKey] || 0)),
              backgroundColor: isLine
                ? context => {
                    const { chart } = context
                    const area = chart.chartArea
                    if (!area) return this.colorWithAlpha(this.accent, .16)
                    const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom)
                    gradient.addColorStop(0, this.colorWithAlpha(this.accent, .34))
                    gradient.addColorStop(.58, this.colorWithAlpha(this.accent, .1))
                    gradient.addColorStop(1, this.colorWithAlpha(this.accent, 0))
                    return gradient
                  }
                : barColors,
              hoverBackgroundColor: isLine ? this.colorWithAlpha(this.accent, .32) : barHoverColors,
              borderWidth: isLine ? 2.25 : 1,
              borderColor: isLine ? this.accent : barHoverColors,
              borderRadius: isLine ? 0 : 6,
              borderSkipped: false,
              fill: isLine,
              tension: isLine ? 0.36 : 0,
              pointRadius: isLine ? 1.75 : 0,
              pointBackgroundColor: '#121923',
              pointBorderColor: this.accent,
              pointBorderWidth: isLine ? 1.5 : 0,
              pointHoverRadius: isLine ? 5.5 : 0,
              pointHoverBorderWidth: 2.5,
              pointHoverBackgroundColor: '#0b0f14',
              pointHoverBorderColor: this.accent,
              maxBarThickness: 18
            }]
          },
          options: {
            responsive: true,
            resizeDelay: 120,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            animation: reduceMotion ? false : { duration: 760, easing: 'easeOutQuart' },
            animations: reduceMotion ? {} : {
              colors: { duration: 280 },
              radius: { duration: 180, easing: 'easeOutCubic' },
              y: { duration: 720, easing: 'easeOutQuart', from: context => context.chart.scales.y?.getPixelForValue(0) }
            },
            transitions: { active: { animation: { duration: reduceMotion ? 0 : 180 } }, resize: { animation: { duration: reduceMotion ? 0 : 260 } } },
            plugins: {
              legend: { display: false },
              tooltip: {
                displayColors: false,
                backgroundColor: '#18212c',
                borderColor: 'rgba(143, 179, 217, .28)',
                borderWidth: 1,
                titleColor: '#f2f5f7',
                bodyColor: '#c8d0da',
                padding: 12,
                cornerRadius: 9,
                caretPadding: 8,
                titleFont: { family: 'Outfit Variable', size: 11, weight: '600' },
                bodyFont: { family: 'Outfit Variable', size: 11 },
                callbacks: {
                  label: context => this.formatValue(context.parsed.y)
                }
              }
            },
            scales: {
              x: {
                border: { display: false },
                grid: { display: false },
                ticks: { color: '#647184', maxTicksLimit: 6, maxRotation: 0, font: { size: 10, family: 'Outfit Variable' } }
              },
              y: {
                beginAtZero: true,
                border: { display: false },
                grid: { color: 'rgba(148, 163, 184, .08)', drawTicks: false },
                ticks: {
                  color: '#647184',
                  maxTicksLimit: 5,
                  padding: 10,
                  font: { size: 10, family: 'Outfit Variable' },
                  callback: value => {
                    if (this.valueType === 'currency' && Number(value) >= 1000000) return `${(Number(value) / 1000000).toFixed(1)}m`
                    if (this.valueType === 'currency' && Number(value) >= 1000) return `${Math.round(Number(value) / 1000)}k`
                    return Number(value).toLocaleString('en-UG')
                  }
                }
              }
            }
          }
        })
      })
    }
  }
}
</script>

<style scoped>
.developer-chart { min-width: 0; margin: 0; }
.developer-chart__canvas { position: relative; height: clamp(220px, 24vw, 310px); min-height: 220px; margin-top: 16px; transition: transform .24s cubic-bezier(.22,.8,.2,1), filter .24s ease; }
.developer-chart:hover .developer-chart__canvas { transform: translateY(-2px); filter: saturate(1.12); }
.developer-chart__empty { display: grid; min-height: 220px; place-items: center; margin: 0; color: #647184; font-size: 12px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 640px) { .developer-chart__canvas { height: 235px; min-height: 235px; } }
@media (prefers-reduced-motion: reduce) { .developer-chart__canvas { transition: none; } .developer-chart:hover .developer-chart__canvas { transform: none; } }
</style>
