<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <button class="close-btn" @click="$emit('close')" aria-label="Close">✕</button>

      <!-- ── Photo hero ── -->
      <div class="hero-wrap">
        <div v-if="fetchLoading" class="hero-loading">
          <div class="loading-dots"><span></span><span></span><span></span></div>
        </div>
        <template v-else>
          <img
            v-if="imageSrc(odd)"
            :src="imageSrc(odd)"
            alt="Free daily tip"
            class="hero-img"
          />
          <div v-else class="hero-empty">
            <span class="hero-empty-icon">⚡</span>
            <span class="hero-empty-text">FREE DAILY TIP</span>
          </div>
        </template>
        <!-- floating badge over the photo -->
        <div class="hero-badge">⚡ TODAY'S FREE TIP</div>
      </div>

      <!-- ── Caption + CTA ── -->
      <div class="body">
        <p v-if="!fetchLoading" class="tip-caption">{{ odd.caption || 'Today\'s free tip will appear here.' }}</p>
        <p class="modal-sub">Join our VIP group for full daily predictions</p>
        <button class="cta-btn" @click="$emit('openVip')">View Full Tips →</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { getApiBaseUrl } from '../utils/apiBase'

const API = getApiBaseUrl()
const DEFAULT = { caption: '', imageUrl: '', image_url: '' }

export default {
  name: 'IntroModal',
  emits: ['close', 'openVip'],
  data() {
    return {
      odd: { ...DEFAULT },
      fetchLoading: true
    }
  },
  async mounted() {
    await this.fetchOdd()
    this._pollInterval = setInterval(this.fetchOdd, 30000)
  },
  beforeUnmount() {
    clearInterval(this._pollInterval)
  },
  methods: {
    async fetchOdd() {
      try {
        const { data } = await axios.get('/api/config/free-odd2')
        if (data) this.odd = { ...DEFAULT, ...data, caption: data.caption || data.pick || '' }
      } catch {
        // Server not reachable — keep defaults
      } finally {
        this.fetchLoading = false
      }
    },
    imageSrc(odd) {
      const url = odd.imageUrl || odd.image_url || ''
      if (!url) return ''
      if (/^(https?:|data:|blob:)/.test(url)) return url
      return API + url
    }
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.25s ease;
  padding: 16px;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.modal {
  background: var(--dark-card);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 20px;
  max-width: 440px;
  width: 100%;
  position: relative;
  box-shadow: 0 0 80px rgba(255, 215, 0, 0.18), 0 24px 64px rgba(0, 0, 0, 0.6);
  animation: slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
@keyframes slideUp {
  from { transform: translateY(28px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* ── Close button ── */
.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  color: #fff;
  font-size: 16px;
  line-height: 1;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.close-btn:hover { background: rgba(255, 215, 0, 0.18); color: var(--gold); }

/* ── Hero photo ── */
.hero-wrap {
  position: relative;
  width: 100%;
  min-height: 260px;
  max-height: 320px;
  background: #0b0b0b;
  flex-shrink: 0;
  overflow: hidden;
}
.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  min-height: 260px;
  max-height: 320px;
}
.hero-empty {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(135deg, #141414, #0d0d0d);
}
.hero-empty-icon { font-size: 40px; opacity: 0.5; }
.hero-empty-text {
  color: rgba(255, 215, 0, 0.4);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 3px;
}
.hero-loading {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-badge {
  position: absolute;
  bottom: 14px;
  left: 14px;
  background: var(--gold);
  color: #000;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.5px;
  padding: 5px 13px;
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
}

/* ── Body ── */
.body {
  padding: 22px 26px 26px;
  text-align: center;
  overflow-y: auto;
}
.tip-caption {
  color: var(--white);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.6;
  margin: 0 0 14px;
}
.modal-sub {
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 20px;
}
.cta-btn {
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  color: var(--dark);
  border: none;
  border-radius: 8px;
  padding: 13px 36px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.5px;
  width: 100%;
  transition: opacity 0.2s, transform 0.1s;
}
.cta-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.loading-dots { display: flex; gap: 8px; }
.loading-dots span {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--gold);
  opacity: 0.5;
  animation: dotPulse 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
  40%            { transform: scale(1.2); opacity: 1;   }
}
</style>
