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
        <div v-if="isOpen" class="support-layer" @click.self="closeChat">
          <section
            class="support-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-chat-title"
          >
            <header class="support-header">
              <div class="support-agent-mark" aria-hidden="true">A</div>
              <div>
                <h2 id="support-chat-title">Almax Support</h2>
                <p><span class="support-online"></span> Here to guide you</p>
              </div>
              <button class="support-close" type="button" aria-label="Close support chat" @click="closeChat">×</button>
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
            <p v-if="isHumanQueue" class="support-human-note">
              Your conversation is with our support team. A person will reply here.
            </p>

            <form class="support-composer" @submit.prevent="sendMessage">
              <label for="support-message-input" class="sr-only">Message Almax Support</label>
              <textarea
                id="support-message-input"
                ref="input"
                v-model="draft"
                rows="1"
                maxlength="2000"
                placeholder="Type your message…"
                :disabled="sending || waitingForReply"
                @keydown.enter.exact.prevent="sendMessage"
              ></textarea>
              <button
                type="submit"
                :disabled="!draft.trim() || sending || waitingForReply"
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
import { getToken, getUser } from '../utils/userAuth.js'

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
    },
    isHumanQueue() {
      return ['waiting_human', 'human'].includes(this.conversation?.mode)
    }
  },
  mounted() {
    window.addEventListener('user-auth-changed', this.handleAuthChange)
    window.addEventListener('user-logged-out', this.handleLogout)
    document.addEventListener('keydown', this.handleKeydown)
  },
  beforeUnmount() {
    window.removeEventListener('user-auth-changed', this.handleAuthChange)
    window.removeEventListener('user-logged-out', this.handleLogout)
    document.removeEventListener('keydown', this.handleKeydown)
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
    handleKeydown(event) {
      if (event.key === 'Escape' && this.isOpen) this.closeChat()
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
        if (this.waitingForReply || this.isHumanQueue) this.startPolling()
        else this.stopPolling()
        this.scrollToBottom()
      } catch (error) {
        if (error?.response?.status === 401) {
          this.handleLogout()
        } else if (showLoading) {
          this.error = 'We could not load support right now. Please try again.'
        }
      } finally {
        this.loading = false
      }
    },
    async sendMessage() {
      const body = this.draft.trim()
      if (!body || this.sending || this.waitingForReply) return
      this.sending = true
      this.error = ''
      try {
        const { data } = await axios.post('/api/support/chat/messages', {
          body,
          clientMessageId: this.newMessageId()
        }, { headers: this.authHeaders() })
        this.conversation = data.conversation
        this.draft = ''
        this.startPolling()
        this.scrollToBottom()
      } catch (error) {
        if (error?.response?.status === 409 && error.response.data?.conversation) {
          this.conversation = error.response.data.conversation
          this.startPolling()
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
    startPolling() {
      if (this.pollTimer) return
      this.pollTimer = window.setInterval(() => this.fetchConversation(false), 2000)
    },
    stopPolling() {
      if (this.pollTimer) window.clearInterval(this.pollTimer)
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

.support-layer { position: fixed; inset: 0; z-index: 10000; background: rgba(0, 0, 0, .38); }
.support-panel {
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: min(390px, calc(100vw - 32px));
  height: min(650px, calc(100dvh - 40px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto auto;
  overflow: hidden;
  border: 1px solid rgba(255, 215, 0, .22);
  border-radius: 18px;
  background: var(--dark-2, #111);
  color: var(--white, #fff);
  box-shadow: 0 24px 80px rgba(0, 0, 0, .62);
}
.support-header { display: flex; align-items: center; gap: 11px; padding: 15px 16px; border-bottom: 1px solid var(--border); background: var(--dark-card, #1e1e1e); }
.support-agent-mark, .welcome-mark { display: grid; place-items: center; border-radius: 50%; background: #ffd700; color: #121212; font-weight: 900; }
.support-agent-mark { width: 38px; height: 38px; font-size: 16px; }
.support-header h2 { font-size: 15px; line-height: 1.3; }
.support-header p { display: flex; align-items: center; gap: 6px; margin-top: 2px; color: var(--text-muted); font-size: 11px; }
.support-online { width: 7px; height: 7px; border-radius: 50%; background: #25b967; box-shadow: 0 0 0 3px rgba(37, 185, 103, .12); }
.support-close { margin-left: auto; width: 34px; height: 34px; border: 0; border-radius: 50%; background: transparent; color: var(--text-muted); font-size: 26px; line-height: 1; cursor: pointer; }
.support-close:hover { background: rgba(255, 255, 255, .07); color: var(--white); }

.support-messages { min-height: 0; overflow-y: auto; padding: 18px 14px; background: var(--section-bg, #0a0a0a); scroll-behavior: smooth; }
.support-loading { height: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; }
.support-loading span, .support-typing span { width: 6px; height: 6px; border-radius: 50%; background: #b89511; animation: supportBounce 1.2s infinite; }
.support-loading span:nth-child(2), .support-typing span:nth-child(2) { animation-delay: .14s; }
.support-loading span:nth-child(3), .support-typing span:nth-child(3) { animation-delay: .28s; }
@keyframes supportBounce { 0%, 60%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-5px); opacity: 1; } }

.support-message { width: fit-content; max-width: 84%; margin-bottom: 13px; }
.support-message p { padding: 10px 12px; border-radius: 13px; font-size: 13px; line-height: 1.48; white-space: pre-wrap; overflow-wrap: anywhere; }
.support-message time { display: block; margin-top: 4px; color: var(--text-muted); font-size: 9px; }
.from-user { margin-left: auto; }
.from-user p { border-bottom-right-radius: 4px; background: #caa900; color: #111; }
.from-user time { text-align: right; }
.from-support p { border: 1px solid var(--border); border-bottom-left-radius: 4px; background: var(--dark-card); color: var(--white); }
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
.support-error, .support-human-note { padding: 8px 14px 0; background: var(--dark-2); font-size: 11px; }
.support-error { color: #ff7e7e; }
.support-human-note { color: #c3a314; }
.support-composer { display: flex; align-items: flex-end; gap: 8px; padding: 11px 12px 7px; background: var(--dark-2); }
.support-composer textarea { min-height: 42px; max-height: 105px; resize: vertical; flex: 1; padding: 11px 12px; border: 1px solid var(--border); border-radius: 12px; outline: none; background: var(--input-bg); color: var(--input-color); font: inherit; font-size: 13px; line-height: 1.4; }
.support-composer textarea:focus { border-color: rgba(255, 215, 0, .58); box-shadow: 0 0 0 3px rgba(255, 215, 0, .08); }
.support-composer textarea:disabled { opacity: .62; }
.support-composer button { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 auto; border: 0; border-radius: 12px; background: #ffd700; color: #111; cursor: pointer; }
.support-composer button:disabled { opacity: .35; cursor: not-allowed; }
.support-composer button:not(:disabled):active { transform: scale(.96); }
.support-composer svg { width: 19px; height: 19px; fill: currentColor; }
.support-privacy { padding: 0 14px 10px; background: var(--dark-2); color: var(--text-muted); font-size: 9px; text-align: center; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

.support-fade-enter-active, .support-fade-leave-active { transition: opacity .18s ease; }
.support-fade-enter-active .support-panel, .support-fade-leave-active .support-panel { transition: transform .2s ease, opacity .18s ease; }
.support-fade-enter-from, .support-fade-leave-to { opacity: 0; }
.support-fade-enter-from .support-panel, .support-fade-leave-to .support-panel { transform: translateY(12px) scale(.98); opacity: 0; }

body.light-mode .support-launcher { background: #fff; color: #181818; box-shadow: 0 12px 30px rgba(59, 45, 0, .18); }
body.light-mode .support-launcher small { color: #5d5d5d; }
body.light-mode .support-layer { background: rgba(22, 18, 4, .22); }
body.light-mode .support-close:hover { background: rgba(0, 0, 0, .06); }

@media (max-width: 600px) {
  .support-launcher { right: 14px; bottom: 16px; min-height: 52px; padding: 9px 12px; }
  .support-launcher span:not(.support-unread) { display: none; }
  .support-launcher svg { width: 28px; height: 28px; }
  .support-panel { inset: auto 0 0; width: 100%; height: min(720px, calc(100dvh - 52px)); border-radius: 18px 18px 0 0; border-bottom: 0; }
}
</style>
