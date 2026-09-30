<template>
  <section class="winnings" id="winnings">
    <div class="container">
      <div class="section-header">
        <div class="header-left">
          <h2>RECENT <span class="gold-text">WINNINGS</span></h2>
          <span class="verified-badge">Admin Verified</span>
        </div>
        <p class="section-sub">Latest winning proof from our VIP members</p>
      </div>

      <div class="winnings-grid">
        <div v-for="win in winnings" :key="win.id" class="win-card">
          <div class="win-media">
            <img v-if="imageSrc(win)" :src="imageSrc(win)" :alt="captionFor(win) || 'Winning proof'" class="win-image" loading="lazy" style="cursor:zoom-in" @click="$lightbox.open(imageSrc(win))" />
            <div v-else class="win-image-empty">Winning Proof</div>
            <div class="win-caption-bar">
              <p class="win-caption">{{ captionFor(win) }}</p>
            </div>
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

const STATIC_WINS = [
  { id: 1, caption: 'VIP winning slip verified by the admin team.', imageUrl: '' },
  { id: 2, caption: 'Another member cashed out from the latest Almax picks.', imageUrl: '' },
  { id: 3, caption: 'Fresh proof from today\'s football predictions.', imageUrl: '' }
]

export default {
  name: 'RecentWinnings',
  data() {
    return {
      winnings: [...STATIC_WINS]
    }
  },
  mounted() {
    this.fetchWins()
    this._pollInterval = setInterval(this.fetchWins, 30000)
    this._onVisible = () => { if (!document.hidden) this.fetchWins() }
    document.addEventListener('visibilitychange', this._onVisible)
  },
  beforeUnmount() {
    clearInterval(this._pollInterval)
    document.removeEventListener('visibilitychange', this._onVisible)
  },
  methods: {
    async fetchWins() {
      try {
        const { data } = await axios.get('/api/recent-wins')
        this.winnings = (data && data.length > 0) ? data : [...STATIC_WINS]
      } catch {
        this.winnings = [...STATIC_WINS]
      }
    },
    imageSrc(win) {
      const url = win.imageUrl || win.image_url || ''
      if (!url) return ''
      if (/^(https?:|data:|blob:)/.test(url)) return url
      return API + url
    },
    captionFor(win) {
      if (win.caption) return win.caption
      const parts = [win.betType || win.bet_type, win.returned, win.odds ? `Odds ${win.odds}` : ''].filter(Boolean)
      return parts.join(' - ') || 'Verified winning proof from Almax Predictions.'
    }
  }
}
</script>

<style scoped>
.winnings {
  padding: 70px 0;
  background: var(--dark);
  scroll-margin-top: 72px;
}
.container {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 24px;
}
.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 30px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
h2 {
  color: var(--white);
  font-size: clamp(24px, 5vw, 36px);
  font-weight: 900;
  letter-spacing: 2px;
  margin: 0;
}
.gold-text { color: var(--gold); }
.verified-badge {
  border: 1px solid rgba(255, 215, 0, 0.35);
  border-radius: 999px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1px;
  padding: 6px 12px;
  text-transform: uppercase;
}
.section-sub { color: var(--text-muted); font-size: 14px; margin: 0; }
.winnings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}
.win-card {
  background: var(--dark-card);
  border: 1px solid rgba(255, 215, 0, 0.12);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.22);
  transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
}
.win-card:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 215, 0, 0.36);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.4);
}
.win-media {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
}
.win-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s;
}
.win-card:hover .win-image { transform: scale(1.05); }
.win-image-empty {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 255, 255, 0.03));
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.win-caption-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 44px 14px 14px;
  background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%);
}
.win-caption {
  color: #fff;
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  text-shadow: 0 1px 4px rgba(0,0,0,0.6);
}
@media (max-width: 700px) {
  .section-header { align-items: flex-start; flex-direction: column; }
  .winnings { padding: 52px 0; }
}
</style>
