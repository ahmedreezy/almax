<template>
  <div class="video-ad-overlay" role="dialog" aria-modal="true" aria-label="Advertisement" @click.self="skip">
    <div class="video-ad-wrap">
      <div class="ad-top-bar">
        <span class="ad-label">Advertisement</span>
        <button
          class="skip-btn"
          :disabled="skipCountdown > 0"
          @click="skip"
        >
          <template v-if="skipCountdown > 0">
            Skip in {{ skipCountdown }}s
          </template>
          <template v-else>
            Skip Ad &gt;
          </template>
        </button>
      </div>

      <div class="ad-media-container">
        <template v-if="hasAd">
          <iframe
            v-if="isVideoAd && isYoutube"
            :src="youtubeEmbedUrl"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            class="ad-iframe"
          ></iframe>
          <video
            v-else-if="isVideoAd"
            :src="resolvedMediaUrl"
            autoplay
            muted
            playsinline
            class="ad-video"
            @ended="onVideoEnd"
          ></video>
          <img
            v-else-if="isImageAd"
            :src="resolvedMediaUrl"
            alt="Advertisement"
            class="ad-image"
          />
          <a
            v-else-if="isLinkAd"
            :href="mediaUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="link-ad-card"
          >
            <span>Sponsored Link</span>
            <strong>Open Advertisement</strong>
            <small>{{ displayUrl }}</small>
          </a>
        </template>

        <div v-else class="ad-placeholder">
          <div class="ad-pulse">
            <span class="ad-icon">AD</span>
          </div>
          <p class="ad-placeholder-text">Advertisement</p>
          <p class="ad-placeholder-sub">Your ad will appear here</p>
        </div>
      </div>

      <div class="ad-progress-bar">
        <div class="ad-progress-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { getApiBaseUrl } from '../utils/apiBase'

const API = getApiBaseUrl()
const VALID_AD_TYPES = ['image', 'video', 'link']

export default {
  name: 'VideoAdModal',
  emits: ['done'],
  data() {
    return {
      mediaType: 'video',
      mediaUrl: '',
      skipCountdown: 10,
      progressPct: 0,
      _timer: null
    }
  },
  computed: {
    hasAd() {
      return Boolean(this.mediaUrl)
    },
    isImageAd() {
      return this.mediaType === 'image'
    },
    isVideoAd() {
      return this.mediaType === 'video'
    },
    isLinkAd() {
      return this.mediaType === 'link'
    },
    resolvedMediaUrl() {
      if (!this.mediaUrl) return ''
      if (/^(https?:|data:|blob:)/.test(this.mediaUrl)) return this.mediaUrl
      return API + this.mediaUrl
    },
    isYoutube() {
      return this.isYoutubeUrl(this.mediaUrl)
    },
    youtubeEmbedUrl() {
      const videoId = this.youtubeId(this.mediaUrl)
      if (!videoId) return ''
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`
    },
    displayUrl() {
      if (!this.mediaUrl) return ''
      try {
        const url = new URL(this.mediaUrl)
        return url.hostname.replace(/^www\./, '')
      } catch {
        return this.mediaUrl
      }
    }
  },
  async mounted() {
    try {
      const { data } = await axios.get('/api/config/vip-config')
      this.applyConfig(data || {})
    } catch {
      // Keep the placeholder if config cannot be fetched.
    }
    this.startCountdown()
  },
  beforeUnmount() {
    clearInterval(this._timer)
  },
  methods: {
    applyConfig(data) {
      const url = data.ad_media_url || data.ad_video_url || ''
      if (!url) return

      const configuredType = VALID_AD_TYPES.includes(data.ad_media_type)
        ? data.ad_media_type
        : ''

      this.mediaUrl = url
      this.mediaType = configuredType || (data.ad_video_url ? 'video' : this.inferMediaType(url))
    },
    inferMediaType(url) {
      const clean = String(url).split('?')[0].toLowerCase()
      if (/\.(jpe?g|png|webp|gif)$/.test(clean)) return 'image'
      if (/\.(mp4|webm|ogg|ogv|mov)$/.test(clean)) return 'video'
      return this.isYoutubeUrl(url) ? 'video' : 'link'
    },
    isYoutubeUrl(url) {
      try {
        const parsed = new URL(url)
        const host = parsed.hostname.replace(/^www\./, '')
        return host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be'
      } catch {
        return false
      }
    },
    youtubeId(url) {
      try {
        const parsed = new URL(url)
        const host = parsed.hostname.replace(/^www\./, '')
        if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || ''
        if (host === 'youtube.com' || host === 'm.youtube.com') {
          if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || ''
          if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2] || ''
          return parsed.searchParams.get('v') || ''
        }
      } catch {
        return ''
      }
      return ''
    },
    startCountdown() {
      const totalMs = 10000
      const interval = 100
      let elapsed = 0
      this._timer = setInterval(() => {
        elapsed += interval
        this.progressPct = Math.min((elapsed / totalMs) * 100, 100)
        this.skipCountdown = Math.max(0, Math.ceil((totalMs - elapsed) / 1000))
        if (elapsed >= totalMs) {
          clearInterval(this._timer)
          this.skipCountdown = 0
        }
      }, interval)
    },
    skip() {
      clearInterval(this._timer)
      this.$emit('done')
    },
    onVideoEnd() {
      this.$emit('done')
    }
  }
}
</script>

<style scoped>
.video-ad-overlay {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(0,0,0,0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.video-ad-wrap {
  width: min(560px, 94vw);
  background: var(--ad-wrap-bg);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255,215,0,0.2);
  box-shadow: 0 20px 60px rgba(0,0,0,0.7);
}
.ad-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--ad-bar-bg);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ad-label {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 1px;
  font-weight: 600;
  text-transform: uppercase;
}
.skip-btn {
  background: rgba(255,215,0,0.12);
  border: 1px solid rgba(255,215,0,0.3);
  color: #FFD700;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 14px;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}
.skip-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #888;
  border-color: rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
}
.skip-btn:not(:disabled):hover { background: rgba(255,215,0,0.25); }

.ad-media-container {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  position: relative;
}
.ad-iframe,
.ad-video,
.ad-image {
  width: 100%;
  height: 100%;
  display: block;
}
.ad-video,
.ad-image {
  object-fit: contain;
  background: #000;
}

.link-ad-card {
  align-items: center;
  background: radial-gradient(circle at top, rgba(255,215,0,0.13), rgba(10,10,10,0.98) 58%);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  justify-content: center;
  padding: 28px;
  text-align: center;
  text-decoration: none;
}
.link-ad-card span {
  color: #FFD700;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}
.link-ad-card strong {
  color: #fff;
  font-size: clamp(22px, 6vw, 34px);
  font-weight: 900;
  line-height: 1.1;
}
.link-ad-card small {
  border: 1px solid rgba(255,215,0,0.24);
  border-radius: 999px;
  color: #d4d4d4;
  font-size: 12px;
  max-width: 100%;
  overflow-wrap: anywhere;
  padding: 7px 14px;
}
.link-ad-card:hover strong { color: #FFD700; }

.ad-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--dark-3);
}
.ad-pulse {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid rgba(255,215,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: adPulse 2s ease-in-out infinite;
}
@keyframes adPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.3); }
  50%       { box-shadow: 0 0 0 16px rgba(255,215,0,0); }
}
.ad-icon { color: #FFD700; font-size: 21px; font-weight: 900; letter-spacing: 1px; }
.ad-placeholder-text { font-size: 16px; font-weight: 700; color: #FFD700; }
.ad-placeholder-sub  { font-size: 12px; color: var(--text-muted); }

.ad-progress-bar {
  height: 3px;
  background: rgba(255,255,255,0.07);
}
.ad-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #B8860B, #FFD700);
  transition: width 0.1s linear;
}
</style>
