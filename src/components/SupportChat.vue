<template>
  <div class="support-chat">
    <button
      v-if="!isOpen"
      class="support-launcher"
      type="button"
      aria-label="Open Help and Feedback chat"
      @click="openChat"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4.75A2.75 2.75 0 0 1 6.75 2h10.5A2.75 2.75 0 0 1 20 4.75v7.5A2.75 2.75 0 0 1 17.25 15H11l-4.8 4.2A1 1 0 0 1 4.55 18.4L4.8 15A2.75 2.75 0 0 1 2 12.25v-7.5h2Zm2.75-.75A.75.75 0 0 0 6 4.75v7.5c0 .41.34.75.75.75h.22l-.2 2.68L10.25 13h7a.75.75 0 0 0 .75-.75v-7.5a.75.75 0 0 0-.75-.75H6.75Z"/>
        <path d="M7 7h10v1.7H7V7Zm0 3.3h6.5V12H7v-1.7Z"/>
      </svg>
      <span>
        <strong>Help &amp; Feedback</strong>
        <small>Chat with Almax</small>
      </span>
      <span v-if="hasUnread" class="support-unread" aria-label="New support reply"></span>
    </button>

    <Teleport to="body">
      <transition name="support-fade">
        <div v-if="isOpen" class="support-layer">
          <section
            class="support-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-chat-title"
          >
            <header class="support-header">
              <button class="support-back" type="button" aria-label="Back to home" @click="goHome">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15.4 5.4 8.8 12l6.6 6.6-1.8 1.8L5.2 12l8.4-8.4 1.8 1.8Z"/>
                </svg>
                <span>Back</span>
              </button>
              <div class="support-agent-mark" aria-hidden="true">A</div>
              <div class="support-heading">
                <span class="support-eyebrow">Almax assistant</span>
                <h2 id="support-chat-title">Almax Support</h2>
                <p><span class="support-online"></span> Here to guide you</p>
              </div>
            </header>

            <div ref="messages" class="support-messages" aria-live="polite">
              <div v-if="loading" class="support-loading" aria-label="Loading conversation">
                <span></span><span></span><span></span>
              </div>

              <template v-else-if="messages.length">
                <article
                  v-for="message in messages"
                  :key="message.id"
                  :class="['support-message', message.sender === 'user' ? 'from-user' : 'from-support']"
                >
                  <span v-if="message.sender === 'support'" class="message-author">Almax Support</span>
                  <p>{{ message.body }}</p>
                  <time v-if="message.sentAt" :datetime="message.sentAt">{{ formatTime(message.sentAt) }}</time>
                </article>
              </template>

              <div v-else class="support-welcome">
                <div class="welcome-mark" aria-hidden="true">A</div>
                <h3>How can we help?</h3>
                <p>Ask about your account, payment, subscription, predictions, or share feedback.</p>
                <div class="support-suggestions">
                  <button v-for="suggestion in suggestions" :key="suggestion" type="button" @click="useSuggestion(suggestion)">
                    {{ suggestion }}
                  </button>
                </div>
              </div>

              <div v-if="waitingForReply" class="support-typing" aria-label="Almax Support is replying">
                <span></span><span></span><span></span>
                <em>Almax Support is replying</em>
              </div>
            </div>

            <p v-if="error" class="support-error" role="alert">{{ error }}</p>
            <form class="support-composer" @submit.prevent="sendMessage">
              <label for="support-message-input" class="sr-only">Message Almax Support</label>
              <textarea
                id="support-message-input"
                ref="input"
                v-model="draft"
                rows="1"
                maxlength="2000"
                placeholder="Type your message…"
                :disabled="sending"
                @keydown.enter.exact.prevent="sendMessage"
              ></textarea>
              <button
                type="submit"
                :disabled="!draft.trim() || sending"
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m3.4 20.4 18-7.5a1 1 0 0 0 0-1.84l-18-7.5a1 1 0 0 0-1.35 1.16L3.8 11H12v2H3.8l-1.75 6.24a1 1 0 0 0 1.35 1.16Z"/>
                </svg>
              </button>
            </form>
            <p class="support-privacy">Do not share passwords, PINs, or OTP codes.</p>
          </section>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script>
import axios from 'axios'
import { clearUser, getToken, getUser } from '../utils/userAuth.js'

export default {
  name: 'SupportChat',
  data() {
    return {
      isOpen: false,
      loading: false,
      sending: false,
      conversation: null,
      draft: '',
      error: '',
      pollTimer: null,
      pollAttempts: 0,
      hasUnread: false,
      openAfterAuth: false,
      suggestions: [
        'Where can I see my subscription?',
        'Help me check a payment',
        'I want to share feedback'
      ]
    }
  },
  computed: {
    messages() {
      return this.conversation?.messages || []
    },
    waitingForReply() {
      return Boolean(this.conversation?.waitingForReply)
    }
  },
  mounted() {
    window.addEventListener('user-auth-changed', this.handleAuthChange)
    window.addEventListener('user-logged-out', this.handleLogout)
  },
  beforeUnmount() {
    window.removeEventListener('user-auth-changed', this.handleAuthChange)
    window.removeEventListener('user-logged-out', this.handleLogout)
    this.stopPolling()
    document.body.style.overflow = ''
  },
  methods: {
    async openChat() {
      if (!getToken() || !getUser()) {
        this.openAfterAuth = true
        window.dispatchEvent(new CustomEvent('open-user-auth'))
        return
      }
      this.isOpen = true
      this.hasUnread = false
      document.body.style.overflow = 'hidden'
      await this.fetchConversation(true)
      this.$nextTick(() => this.$refs.input?.focus())
    },
    closeChat() {
      this.isOpen = false
      this.stopPolling()
      document.body.style.overflow = ''
    },
    goHome() {
      this.closeChat()
      if (this.$route.path !== '/') this.$router.push('/')
    },
    handleAuthChange(event) {
      if (!event.detail?.user) return
      if (this.openAfterAuth) {
        this.openAfterAuth = false
        this.openChat()
      } else if (this.isOpen) {
        this.fetchConversation(true)
      }
    },
    handleLogout() {
      this.openAfterAuth = false
      this.closeChat()
      this.conversation = null
    },
    handleUnauthorized() {
      clearUser()
      this.conversation = null
      this.closeChat()
      this.openAfterAuth = true
      window.dispatchEvent(new CustomEvent('open-user-auth'))
    },
    authHeaders() {
      return { Authorization: 'Bearer ' + getToken() }
    },
    async fetchConversation(showLoading = false) {
      if (!getToken()) return
      if (showLoading) this.loading = true
      try {
        const previousCount = this.messages.length
        const { data } = await axios.get('/api/support/chat', { headers: this.authHeaders() })
        this.conversation = data.conversation
        this.error = ''
        if (!this.isOpen && this.messages.length > previousCount) this.hasUnread = true
        if (this.waitingForReply) this.startPolling()
        else {
          this.stopPolling()
          this.pollAttempts = 0
        }
        this.scrollToBottom()
      } catch (error) {
        if (error?.response?.status === 401) {
          this.handleUnauthorized()
        } else if (showLoading) {
          this.error = 'We could not load support right now. Please try again.'
        }
      } finally {
        this.loading = false
      }
    },
    async sendMessage() {
      const body = this.draft.trim()
      if (!body || this.sending) return
      this.sending = true
      this.error = ''
      try {
        const { data } = await axios.post('/api/support/chat/messages', {
          body,
          clientMessageId: this.newMessageId()
        }, { headers: this.authHeaders() })
        this.conversation = data.conversation
        this.draft = ''
        this.startPolling(true)
        this.scrollToBottom()
      } catch (error) {
        if (error?.response?.status === 401) {
          this.handleUnauthorized()
          return
        }
        if (error?.response?.status === 409 && error.response.data?.conversation) {
          this.conversation = error.response.data.conversation
          this.startPolling(true)
        }
        this.error = error?.response?.data?.message || 'Your message could not be sent. Please try again.'
      } finally {
        this.sending = false
      }
    },
    useSuggestion(suggestion) {
      this.draft = suggestion
      this.$nextTick(() => this.$refs.input?.focus())
    },
    startPolling(reset = false) {
      if (reset) this.pollAttempts = 0
      if (this.pollTimer || this.pollAttempts >= 90) return
      this.pollTimer = window.setTimeout(async () => {
        this.pollTimer = null
        this.pollAttempts += 1
        if (this.pollAttempts >= 90) {
          this.error = 'This reply is taking longer than expected. Send another message to start a new session.'
          return
        }
        await this.fetchConversation(false)
        if (this.waitingForReply && !this.pollTimer) this.startPolling()
      }, 2000)
    },
    stopPolling() {
      if (this.pollTimer) window.clearTimeout(this.pollTimer)
      this.pollTimer = null
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.messages
        if (el) el.scrollTop = el.scrollHeight
      })
    },
    newMessageId() {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID()
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
        const random = Math.random() * 16 | 0
        const value = char === 'x' ? random : (random & 0x3 | 0x8)
        return value.toString(16)
      })
    },
    formatTime(value) {
      return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    }
  }
}
</script>

<style scoped>
.support-launcher {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 950;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 16px 9px 12px;
  border: 1px solid rgba(255, 215, 0, 0.45);
  border-radius: 30px;
  background: #16140d;
  color: #fff;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.38), 0 0 0 4px rgba(255, 215, 0, 0.06);
  cursor: pointer;
  text-align: left;
  transition: transform .18s ease, box-shadow .18s ease;
}
.support-launcher:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0, 0, 0, .46), 0 0 0 4px rgba(255, 215, 0, .1); }
.support-launcher:active { transform: scale(.98); }
.support-launcher:focus-visible { outline: 3px solid rgba(255, 215, 0, .42); outline-offset: 3px; }
.support-launcher svg { width: 27px; height: 27px; fill: #ffd700; flex: 0 0 auto; }
.support-launcher span:not(.support-unread) { display: flex; flex-direction: column; }
.support-launcher strong { font-size: 13px; line-height: 1.2; }
.support-launcher small { color: #aaa; font-size: 10px; margin-top: 2px; }
.support-unread { position: absolute; top: 3px; right: 5px; width: 10px; height: 10px; border-radius: 50%; background: #ffd700; border: 2px solid #16140d; }

.support-layer {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: clamp(12px, 4vw, 48px);
  background: rgba(4, 5, 4, .52);
  backdrop-filter: blur(12px) saturate(115%);
  -webkit-backdrop-filter: blur(12px) saturate(115%);
}
.support-panel {
  position: relative;
  width: min(720px, 100%);
  height: min(760px, calc(100dvh - clamp(24px, 8vw, 96px)));
  min-height: min(560px, calc(100dvh - 24px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto auto;
  overflow: hidden;
  border: 1px solid rgba(255, 236, 153, .22);
  border-radius: 26px;
  background: linear-gradient(145deg, rgba(31, 31, 25, .82), rgba(11, 12, 10, .7));
  color: var(--white, #fff);
  box-shadow: 0 30px 100px rgba(0, 0, 0, .58), inset 0 1px 0 rgba(255, 255, 255, .12), inset 0 0 0 1px rgba(255, 215, 0, .04);
  backdrop-filter: blur(28px) saturate(130%);
  -webkit-backdrop-filter: blur(28px) saturate(130%);
}
.support-header { display: grid; grid-template-columns: auto auto minmax(0, 1fr); align-items: center; gap: 13px; padding: 18px 20px; border-bottom: 1px solid rgba(255, 255, 255, .09); background: rgba(255, 255, 255, .035); }
.support-back { min-height: 38px; display: inline-flex; align-items: center; gap: 5px; padding: 0 10px 0 7px; border: 1px solid rgba(255, 255, 255, .12); border-radius: 11px; background: rgba(255, 255, 255, .055); color: var(--white, #fff); font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; transition: border-color .2s ease, background .2s ease, transform .2s ease; }
.support-back svg { width: 17px; height: 17px; fill: currentColor; }
.support-back:hover { border-color: rgba(255, 215, 0, .4); background: rgba(255, 215, 0, .08); }
.support-back:active { transform: translateX(-2px); }
.support-back:focus-visible { outline: 3px solid rgba(255, 215, 0, .3); outline-offset: 2px; }
.support-agent-mark, .welcome-mark { display: grid; place-items: center; border-radius: 50%; background: #ffd700; color: #121212; font-weight: 900; }
.support-agent-mark { width: 42px; height: 42px; font-size: 16px; box-shadow: 0 0 0 5px rgba(255, 215, 0, .08); }
.support-heading { min-width: 0; }
.support-eyebrow { display: block; margin-bottom: 2px; color: #d5b829; font-size: 9px; font-weight: 750; letter-spacing: .13em; text-transform: uppercase; }
.support-header h2 { font-size: 15px; line-height: 1.3; }
.support-header p { display: flex; align-items: center; gap: 6px; margin-top: 2px; color: var(--text-muted); font-size: 11px; }
.support-online { width: 7px; height: 7px; border-radius: 50%; background: #25b967; box-shadow: 0 0 0 3px rgba(37, 185, 103, .12); }

.support-messages { min-height: 0; overflow-y: auto; padding: 24px clamp(16px, 4vw, 30px); background: rgba(3, 4, 3, .32); scroll-behavior: smooth; }
.support-loading { height: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; }
.support-loading span, .support-typing span { width: 6px; height: 6px; border-radius: 50%; background: #b89511; animation: supportBounce 1.2s infinite; }
.support-loading span:nth-child(2), .support-typing span:nth-child(2) { animation-delay: .14s; }
.support-loading span:nth-child(3), .support-typing span:nth-child(3) { animation-delay: .28s; }
@keyframes supportBounce { 0%, 60%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-5px); opacity: 1; } }

.support-message { width: fit-content; max-width: min(82%, 520px); margin-bottom: 15px; }
.support-message p { padding: 11px 14px; border-radius: 15px; font-size: 13px; line-height: 1.52; white-space: pre-wrap; overflow-wrap: anywhere; }
.support-message time { display: block; margin-top: 4px; color: var(--text-muted); font-size: 9px; }
.from-user { margin-left: auto; }
.from-user p { border-bottom-right-radius: 4px; background: #caa900; color: #111; }
.from-user time { text-align: right; }
.from-support p { border: 1px solid rgba(255, 255, 255, .1); border-bottom-left-radius: 4px; background: rgba(255, 255, 255, .075); color: var(--white); }
.message-author { display: block; margin: 0 0 4px 3px; color: #c3a314; font-size: 10px; font-weight: 700; }

.support-welcome { min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 18px 8px; }
.welcome-mark { width: 48px; height: 48px; margin-bottom: 14px; box-shadow: 0 0 0 6px rgba(255, 215, 0, .08); }
.support-welcome h3 { font-size: 18px; }
.support-welcome > p { max-width: 290px; margin-top: 7px; color: var(--text-muted); font-size: 12px; line-height: 1.5; }
.support-suggestions { width: 100%; display: grid; gap: 7px; margin-top: 20px; }
.support-suggestions button { width: 100%; padding: 9px 11px; border: 1px solid var(--border); border-radius: 10px; background: var(--dark-card); color: var(--white); font-size: 12px; cursor: pointer; }
.support-suggestions button:hover { border-color: rgba(255, 215, 0, .48); color: #d4b310; }

.support-typing { width: fit-content; display: flex; align-items: center; gap: 4px; padding: 9px 11px; border: 1px solid var(--border); border-radius: 12px; background: var(--dark-card); }
.support-typing em { margin-left: 5px; color: var(--text-muted); font-size: 10px; font-style: normal; }
.support-error { padding: 8px clamp(16px, 4vw, 30px) 0; background: rgba(10, 11, 9, .48); font-size: 11px; }
.support-error { color: #ff7e7e; }
.support-composer { display: flex; align-items: flex-end; gap: 9px; padding: 13px clamp(14px, 3vw, 24px) 8px; background: rgba(10, 11, 9, .62); }
.support-composer textarea { min-height: 46px; max-height: 120px; resize: vertical; flex: 1; padding: 12px 14px; border: 1px solid rgba(255, 255, 255, .12); border-radius: 14px; outline: none; background: rgba(255, 255, 255, .07); color: var(--input-color); font: inherit; font-size: 13px; line-height: 1.4; }
.support-composer textarea:focus { border-color: rgba(255, 215, 0, .58); box-shadow: 0 0 0 3px rgba(255, 215, 0, .08); }
.support-composer textarea:disabled { opacity: .62; }
.support-composer button { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 auto; border: 0; border-radius: 12px; background: #ffd700; color: #111; cursor: pointer; }
.support-composer button:disabled { opacity: .35; cursor: not-allowed; }
.support-composer button:not(:disabled):active { transform: scale(.96); }
.support-composer svg { width: 19px; height: 19px; fill: currentColor; }
.support-privacy { padding: 0 14px 12px; background: rgba(10, 11, 9, .62); color: var(--text-muted); font-size: 9px; text-align: center; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

.support-fade-enter-active, .support-fade-leave-active { transition: opacity .18s ease; }
.support-fade-enter-active .support-panel, .support-fade-leave-active .support-panel { transition: transform .2s ease, opacity .18s ease; }
.support-fade-enter-from, .support-fade-leave-to { opacity: 0; }
.support-fade-enter-from .support-panel, .support-fade-leave-to .support-panel { transform: translateY(12px) scale(.98); opacity: 0; }

body.light-mode .support-launcher { background: #fff; color: #181818; box-shadow: 0 12px 30px rgba(59, 45, 0, .18); }
body.light-mode .support-launcher small { color: #5d5d5d; }
body.light-mode .support-layer { background: rgba(58, 48, 13, .16); }
body.light-mode .support-panel { background: linear-gradient(145deg, rgba(255, 255, 252, .88), rgba(247, 244, 230, .76)); color: #181711; box-shadow: 0 30px 100px rgba(77, 62, 8, .2), inset 0 1px 0 rgba(255, 255, 255, .86); }
body.light-mode .support-header, body.light-mode .support-composer, body.light-mode .support-privacy, body.light-mode .support-error { background: rgba(255, 255, 255, .38); }
body.light-mode .support-messages { background: rgba(255, 252, 237, .3); }
body.light-mode .support-back { color: #242117; border-color: rgba(45, 39, 15, .16); background: rgba(255, 255, 255, .42); }
body.light-mode .from-support p, body.light-mode .support-suggestions button, body.light-mode .support-typing { background: rgba(255, 255, 255, .58); color: #1d1b14; border-color: rgba(45, 39, 15, .14); }
body.light-mode .support-composer textarea { background: rgba(255, 255, 255, .7); border-color: rgba(45, 39, 15, .16); }

@media (max-width: 700px) {
  .support-launcher { right: 14px; bottom: 16px; min-height: 52px; padding: 9px 12px; }
  .support-launcher span:not(.support-unread) { display: none; }
  .support-launcher svg { width: 28px; height: 28px; }
  .support-layer { padding: 8px; }
  .support-panel { width: 100%; height: calc(100dvh - 16px); min-height: 0; border-radius: 20px; }
  .support-header { gap: 10px; padding: 13px 12px; }
  .support-back { min-height: 36px; padding-right: 8px; }
  .support-agent-mark { width: 38px; height: 38px; }
  .support-messages { padding: 18px 14px; }
  .support-message { max-width: 88%; }
}

@media (max-width: 390px) {
  .support-back span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
  .support-back { width: 38px; justify-content: center; padding: 0; }
  .support-eyebrow { font-size: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  .support-fade-enter-active, .support-fade-leave-active,
  .support-fade-enter-active .support-panel, .support-fade-leave-active .support-panel { transition: none; }
}
</style>
