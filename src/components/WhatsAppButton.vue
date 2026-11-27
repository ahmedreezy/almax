<template>
  <div class="whatsapp-stack" :class="{ 'has-channel-notice': showNotice, 'is-guest-notice': isGuestNotice }">
    <span class="channel-announcement" role="status">{{ showNotice ? noticeAnnouncement : '' }}</span>
    <transition name="channel-notice">
      <aside v-if="showNotice" class="channel-notice">
        <div class="channel-notice-heading">
          <span class="channel-notice-label">Official Almax channel</span>
          <strong>{{ noticeTitle }}</strong>
        </div>
        <p class="channel-notice-copy">{{ noticeCopy }}</p>
        <p id="whatsapp-channel-notice" class="channel-notice-cue">
          <span aria-hidden="true">↓</span>
          {{ noticeCue }}
        </p>
        <button ref="dismissButton" class="channel-notice-close" type="button" aria-label="Dismiss WhatsApp channel notice" @click="dismissNotice">
          <span aria-hidden="true">×</span>
        </button>
      </aside>
    </transition>
    <a
      ref="channelLink"
      class="whatsapp-btn"
      :href="channelUrl"
      target="_blank"
      title="Join our WhatsApp channel"
      rel="noopener noreferrer"
      aria-label="Join our WhatsApp channel"
      :aria-describedby="showNotice ? 'whatsapp-channel-notice' : undefined"
      @click="dismissNotice"
    >
      <svg class="wa-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span class="wa-pulse" aria-hidden="true"></span>
    </a>
    <span class="app-version" aria-label="Application version">v{{ appVersion }}</span>
  </div>
</template>

<script>
import axios from 'axios'
import packageInfo from '../../package.json'
import { DEFAULT_WHATSAPP_CHANNEL, resolveWhatsAppChannel } from '../utils/whatsappChannel'
import { isLoggedIn } from '../utils/userAuth'

export default {
  name: 'WhatsAppButton',
  data: () => ({
    appVersion: packageInfo.version,
    channelUrl: DEFAULT_WHATSAPP_CHANNEL,
    noticeTitle: 'Stay in the loop on match day.',
    noticeCopy: 'Follow Almax for football tips and updates in WhatsApp.',
    noticeCue: 'Tap the WhatsApp icon to follow',
    showNotice: false,
    isGuestNotice: false,
    showTimer: null,
    dismissTimer: null
  }),
  computed: {
    noticeAnnouncement() {
      return [this.noticeTitle, this.noticeCopy, this.noticeCue].join(' ')
    }
  },
  mounted() {
    window.addEventListener('user-logged-in', this.handleLogin)
    window.addEventListener('user-logged-out', this.dismissNotice)
    window.addEventListener('user-auth-opened', this.dismissGuestNotice)
    if (!isLoggedIn()) this.scheduleNotice({ guest: true })
    this.loadChannel()
  },
  beforeUnmount() {
    window.removeEventListener('user-logged-in', this.handleLogin)
    window.removeEventListener('user-logged-out', this.dismissNotice)
    window.removeEventListener('user-auth-opened', this.dismissGuestNotice)
    this.clearNoticeTimers()
  },
  methods: {
    async loadChannel() {
      try {
        const { data } = await axios.get('/api/config/vip-config')
        this.channelUrl = resolveWhatsAppChannel(data?.whatsapp_link)
      } catch {
        // The default link is available even if site configuration cannot load.
      }
    },
    handleLogin(event) {
      if (event.detail?.token) this.scheduleNotice()
    },
    scheduleNotice({ guest = false } = {}) {
      this.dismissNotice()
      this.isGuestNotice = guest
      this.showTimer = window.setTimeout(() => {
        this.showTimer = null
        if (guest && (isLoggedIn() || document.querySelector('[aria-modal="true"]'))) {
          this.dismissNotice()
          return
        }
        this.showNotice = true
        this.dismissTimer = window.setTimeout(this.dismissNotice, 8000)
      }, 700)
    },
    dismissGuestNotice() {
      if (this.isGuestNotice) this.dismissNotice()
    },
    clearNoticeTimers() {
      window.clearTimeout(this.showTimer)
      window.clearTimeout(this.dismissTimer)
      this.showTimer = null
      this.dismissTimer = null
    },
    dismissNotice() {
      this.clearNoticeTimers()
      if (this.$refs.dismissButton && document.activeElement === this.$refs.dismissButton) {
        this.$refs.channelLink?.focus({ preventScroll: true })
      }
      this.showNotice = false
      this.isGuestNotice = false
    }
  }
}
</script>

<style scoped>
.whatsapp-stack {
  position: fixed;
  bottom: 8px;
  left: 24px;
  z-index: 999;
  transition-property: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.whatsapp-stack.has-channel-notice:not(.is-guest-notice) {
  z-index: 9100;
}
.channel-announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.channel-notice {
  position: absolute;
  bottom: calc(100% + 14px);
  left: 0;
  width: min(19.5rem, calc(100vw - 48px));
  padding: 16px 16px 12px;
  border: 1px solid #31543e;
  border-radius: 16px;
  background: radial-gradient(ellipse at top left, #203d2d, transparent 75%), #101d16;
  color: #f3f9f5;
  box-shadow: 0 14px 36px #0008, inset 0 1px #ffffff0d;
  transform-origin: 26px 100%;
}
.channel-notice::after {
  content: '';
  position: absolute;
  left: 19px;
  bottom: -7px;
  width: 13px;
  height: 13px;
  transform: rotate(45deg);
  background: #101d16;
  border-right: inherit;
  border-bottom: inherit;
}
.channel-notice-heading {
  padding-right: 32px;
}
.channel-notice-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #a2ebb8;
  font-size: .6875rem;
  font-weight: 750;
  letter-spacing: .09em;
  line-height: 1.4;
  text-transform: uppercase;
}
.channel-notice-label::before {
  content: '';
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: #63ed98;
  box-shadow: 0 0 0 3px #63ed9824;
}
.channel-notice-heading strong {
  display: block;
  margin-top: 8px;
  font-size: 1.25rem;
  font-weight: 750;
  letter-spacing: -.025em;
  line-height: 1.12;
  text-wrap: balance;
}
.channel-notice-copy {
  margin-top: 8px;
  color: #c0d3c6;
  font-size: .875rem;
  line-height: 1.4;
}
.channel-notice-cue {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #365240;
  color: #a2ebb8;
  font-size: .8125rem;
  font-weight: 700;
  line-height: 1.35;
}
.channel-notice-cue span {
  display: grid;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  place-items: center;
  border-radius: 50%;
  background: #294c36;
  color: #bdf7ce;
  font-size: 1rem;
}
.channel-notice-close {
  position: absolute;
  top: 3px;
  right: 3px;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #c0d3c6;
  font: inherit;
  cursor: pointer;
}
.channel-notice-close span {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 1px solid #ffffff19;
  border-radius: 50%;
  font-size: 1.125rem;
  line-height: 1;
}
.channel-notice-close:hover span {
  background: #294c36;
  color: #fff;
}
.channel-notice-close:focus-visible {
  outline: 2px solid #8cf5ab;
  outline-offset: -4px;
}
.channel-notice-enter-active,
.channel-notice-leave-active {
  transition: opacity .2s ease, transform .25s cubic-bezier(.2,.8,.2,1);
}
.channel-notice-enter-from,
.channel-notice-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(.97);
}
.whatsapp-btn {
  position: relative;
  background: #25D366;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  box-shadow: 0 4px 22px rgba(37, 211, 102, 0.45);
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}
.app-version { padding: 2px 6px; border-radius: 6px; background: rgba(8,8,8,.82); color: rgba(255,255,255,.72); font-size: 12px; font-weight: 700; line-height: 1.3; letter-spacing: .03em; backdrop-filter: blur(6px); }
.whatsapp-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(37, 211, 102, 0.6);
  color: #ffffff;
}
.wa-icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}

/* Pulsing ring effect */
.wa-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(37, 211, 102, 0.5);
  animation: waPulse 2s ease-out infinite;
  pointer-events: none;
}
@keyframes waPulse {
  0%   { transform: scale(1);    opacity: 0.8; }
  100% { transform: scale(1.18); opacity: 0; }
}

@media (max-width: 700px) {
  .whatsapp-stack {
    left: 14px;
    bottom: 5px;
  }
  .whatsapp-btn {
    width: 52px;
    height: 52px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .channel-notice-enter-active,
  .channel-notice-leave-active,
  .whatsapp-btn {
    transition: none;
  }
  .wa-pulse {
    animation: none;
  }
}
</style>
