<template>
  <section class="testimonials" id="testimonials">
    <div class="section-header">
      <p class="section-kicker">Member Stories</p>
      <h2>WHAT OUR <span class="gold-text">MEMBERS SAY</span></h2>
      <p class="section-sub">Real results from our verified VIP community</p>
    </div>

    <div v-if="loading" class="state-box">
      <div class="spin-ring"></div>
      <span>Loading testimonials…</span>
    </div>

    <div v-else-if="testimonials.length === 0" class="empty-state">
      <span class="empty-icon">💬</span>
      <p>Testimonials coming soon!</p>
    </div>

    <div v-else class="testimonials-grid">
      <div
        v-for="t in testimonials"
        :key="t.id"
        class="testimonial-card"
      >
        <div class="t-media">
          <img
            :src="imageSrc(t)"
            :alt="t.caption || 'Testimonial'"
            class="t-img"
            loading="lazy"
          />
          <div v-if="t.caption" class="t-caption-bar">
            <span class="t-caption">{{ t.caption }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import axios from 'axios'
import { getApiBaseUrl } from '../utils/apiBase'

const API = getApiBaseUrl()

export default {
  name: 'TestimonialsSection',
  data() {
    return {
      testimonials: [],
      loading: true,
      apiBase: API
    }
  },
  async mounted() {
    await this.fetchTestimonials()
  },
  methods: {
    async fetchTestimonials() {
      this.loading = true
      try {
        const res = await axios.get(`${API}/api/testimonials`)
        this.testimonials = res.data || []
      } catch {
        this.testimonials = []
      } finally {
        this.loading = false
      }
    },
    imageSrc(item) {
      const url = item.imageUrl || item.image_url || ''
      if (!url) return ''
      if (/^(https?:|data:|blob:)/.test(url)) return url
      return this.apiBase + url
    }
  }
}
</script>

<style scoped>
.testimonials {
  padding: 70px 24px 50px;
  max-width: 1100px;
  margin: 0 auto;
  scroll-margin-top: 72px;
}
.section-header {
  text-align: center;
  margin-bottom: 40px;
}
.section-kicker {
  color: var(--gold);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin: 0 0 10px;
}
.section-sub {
  color: var(--text-muted);
  font-size: 14px;
  margin: 8px 0 0;
}
.section-header h2 {
  font-size: clamp(22px, 5vw, 34px);
  font-weight: 900;
  letter-spacing: 2px;
  color: var(--white);
  margin: 0;
}
.gold-text { color: var(--gold); }

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 18px;
}
.testimonial-card {
  background: var(--dark-card);
  border: 1px solid rgba(255,215,0,0.1);
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
}
.testimonial-card:hover {
  transform: translateY(-5px);
  border-color: rgba(255,215,0,0.36);
  box-shadow: 0 18px 52px rgba(0,0,0,0.4);
}
.t-media { position: relative; aspect-ratio: 9/16; overflow: hidden; background: #111; }
.t-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s; }
.testimonial-card:hover .t-img { transform: scale(1.04); }
.t-caption-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 36px 12px 12px;
  background: linear-gradient(to top, rgba(0,0,0,0.84) 0%, transparent 100%);
}
.t-caption { font-size: 11px; color: rgba(255,255,255,0.9); line-height: 1.5; display: block; text-shadow: 0 1px 3px rgba(0,0,0,0.7); }

.state-box, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 48px 20px; color: var(--text-muted); font-size: 14px;
}
.empty-icon { font-size: 40px; }
.spin-ring {
  width: 32px; height: 32px;
  border: 3px solid rgba(255,215,0,0.2);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .testimonials-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .t-img-wrap { aspect-ratio: 3/4; }
}
</style>
