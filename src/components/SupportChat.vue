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
                <span class="support-eyebrow">{{ conversation?.mode === 'human' ? 'Human support' : 'Almax assistant' }}</span>
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
                  <div v-if="message.attachments?.length" class="message-attachments">
                    <template v-for="attachment in message.attachments" :key="attachment.id">
                      <img
                        v-if="attachment.kind === 'image' && attachment.blobUrl"
                        :src="attachment.blobUrl"
                        alt="Chat attachment"
                        class="chat-image"
                        @click="$lightbox.open(attachment.blobUrl)"
                      />
                      <audio v-else-if="attachment.kind === 'audio' && attachment.blobUrl" :src="attachment.blobUrl" controls preload="metadata"></audio>
                      <span v-else class="attachment-processing">Processing {{ attachment.kind }}…</span>
                    </template>
                  </div>
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
                <em>{{ replyStatus }}</em>
              </div>
            </div>

            <p v-if="error" class="support-error" role="alert">{{ error }}</p>
            <div v-if="selectedFiles.length || recording" class="attachment-preview" role="status" aria-live="polite">
              <span v-if="recording" class="recording-dot">Recording {{ recordingSeconds }}s / 120s</span>
              <span v-for="file in selectedFiles" :key="file.name + file.size">{{ file.type.startsWith('image/') ? 'Image' : 'Voice note' }} · {{ file.name }}</span>
              <button type="button" @click="clearAttachments">Remove</button>
            </div>
            <form class="support-composer" @submit.prevent="sendMessage">
              <input ref="imageInput" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple @change="selectImages" />
              <button type="button" class="composer-tool" aria-label="Attach screenshots" :disabled="sending || recording" @click="$refs.imageInput.click()">＋</button>
              <label for="support-message-input" class="sr-only">Message Almax Support</label>
              <textarea
                id="support-message-input"
                ref="input"
                v-model="draft"
                rows="1"
                maxlength="2000"
                :placeholder="recording ? 'Recording voice note…' : 'Type your message…'"
                :disabled="sending || recording"
                @keydown.enter.exact.prevent="sendMessage"
              ></textarea>
              <button
                type="button"
                :class="['composer-primary', `is-${primaryActionMode}`]"
                :disabled="sending"
                :aria-label="primaryActionLabel"
                :title="primaryActionLabel"
                @click="handlePrimaryAction"
              >
                <transition name="composer-action" mode="out-in">
                  <svg v-if="primaryActionMode === 'send'" key="send" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m3.4 20.4 18-7.5a1 1 0 0 0 0-1.84l-18-7.5a1 1 0 0 0-1.35 1.16L3.8 11H12v2H3.8l-1.75 6.24a1 1 0 0 0 1.35 1.16Z"/>
                  </svg>
                  <svg v-else-if="primaryActionMode === 'stop'" key="stop" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="7" y="7" width="10" height="10" rx="2" />
                  </svg>
                  <svg v-else key="record" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 15.25a4.25 4.25 0 0 0 4.25-4.25V6a4.25 4.25 0 0 0-8.5 0v5A4.25 4.25 0 0 0 12 15.25Zm-2.25-9.25a2.25 2.25 0 0 1 4.5 0v5a2.25 2.25 0 0 1-4.5 0V6Z"/>
                    <path d="M5.75 10.5a1 1 0 1 0-2 0 8.25 8.25 0 0 0 7.25 8.18V21H8.5a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2H13v-2.32a8.25 8.25 0 0 0 7.25-8.18 1 1 0 1 0-2 0 6.25 6.25 0 0 1-12.5 0Z"/>
                  </svg>
                </transition>
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
      pendingMessage: null,
      draft: '',
      error: '',
      pollTimer: null,
      pollAttempts: 0,
      pollStartedAt: 0,
      waitingSeconds: 0,
      hasUnread: false,
      selectedFiles: [],
      attachmentUrls: {},
      mediaRecorder: null,
      recording: false,
      recordingSeconds: 0,
      recordingTimer: null,
      audioChunks: [],
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
      const messages = this.conversation?.messages || []
      return this.pendingMessage ? [...messages, this.pendingMessage] : messages
    },
    waitingForReply() {
      return Boolean(this.pendingMessage || this.conversation?.waitingForReply)
    },
    replyStatus() {
      if (this.conversation?.mode === 'human') return 'A support specialist is reviewing your message…'
      if (this.waitingSeconds >= 30) return 'This is taking longer than usual. We are still trying.'
      if (this.waitingSeconds >= 8) return 'Preparing your reply…'
      return 'Checking your request…'
    },
    hasSendableContent() {
      return Boolean(this.draft.trim() || this.selectedFiles.length)
    },
    primaryActionMode() {
      if (this.recording) return 'stop'
      return this.hasSendableContent ? 'send' : 'record'
    },
    primaryActionLabel() {
      return {
        record: 'Record voice note',
        stop: 'Stop recording',
        send: 'Send message'
      }[this.primaryActionMode]
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
    this.stopRecording(true)
    Object.values(this.attachmentUrls).forEach(url => URL.revokeObjectURL(url))
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
      this.pollStartedAt = 0
      this.waitingSeconds = 0
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
    handlePrimaryAction() {
      if (this.recording) {
        this.stopRecording(false)
        return
      }
      if (this.hasSendableContent) {
        this.sendMessage()
        return
      }
      this.toggleRecording()
    },
    async fetchConversation(showLoading = false) {
      if (!getToken()) return
      if (showLoading) this.loading = true
      try {
        const previousCount = this.messages.length
        const { data } = await axios.get('/api/support/chat', { headers: this.authHeaders() })
        this.conversation = data.conversation
        await this.hydrateAttachments()
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
      if ((!body && !this.selectedFiles.length) || this.sending || this.recording) return
      const clientMessageId = this.newMessageId()
      this.sending = true
      this.error = ''
      this.draft = ''
      this.pendingMessage = {
        id: `pending-${clientMessageId}`,
        sender: 'user',
        senderType: 'customer',
        body: body || (this.selectedFiles[0]?.type.startsWith('image/') ? 'Please review this screenshot.' : 'Voice note'),
        attachments: this.selectedFiles.map((file, index) => ({ id: `pending-file-${index}`, kind: file.type.startsWith('image/') ? 'image' : 'audio' })),
        sentAt: new Date().toISOString()
      }
      this.scrollToBottom()
      try {
        const form = new FormData()
        form.append('body', body)
        form.append('clientMessageId', clientMessageId)
        this.selectedFiles.forEach(file => form.append('attachments[]', file, file.name))
        if (this.selectedFiles.some(file => !file.type.startsWith('image/'))) form.append('audioDuration', String(Math.max(1, this.recordingSeconds || 1)))
        const { data } = await axios.post('/api/support/chat/messages', form, { headers: this.authHeaders() })
        this.pendingMessage = null
        this.clearAttachments()
        this.conversation = data.conversation
        await this.hydrateAttachments()
        if (this.waitingForReply) this.startPolling(true)
        else this.stopPolling()
        this.scrollToBottom()
      } catch (error) {
        this.pendingMessage = null
        this.draft = body
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
        this.pendingMessage = null
        this.sending = false
      }
    },
    useSuggestion(suggestion) {
      this.draft = suggestion
      this.$nextTick(() => this.$refs.input?.focus())
    },
    selectImages(event) {
      const files = Array.from(event.target.files || []).slice(0, 3)
      if (files.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) {
        this.error = 'Please choose PNG, JPEG, or WEBP images.'
        return
      }
      if (files.some(file => file.size > 8 * 1024 * 1024)) {
        this.error = 'Each image must be 8 MB or smaller.'
        return
      }
      this.selectedFiles = files
      this.error = ''
      event.target.value = ''
    },
    async toggleRecording() {
      if (this.recording) {
        this.stopRecording(false)
        return
      }
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        this.error = 'Voice recording is not supported by this browser.'
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        this.audioChunks = []
        this.recordingSeconds = 0
        const preferred = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type))
        this.mediaRecorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined)
        this.mediaRecorder.ondataavailable = event => { if (event.data.size) this.audioChunks.push(event.data) }
        this.mediaRecorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop())
          if (!this.audioChunks.length) return
          const type = this.mediaRecorder.mimeType || 'audio/webm'
          const extension = type.includes('ogg') ? 'ogg' : (type.includes('mp4') ? 'm4a' : 'webm')
          const blob = new Blob(this.audioChunks, { type })
          this.selectedFiles = [new File([blob], `voice-note-${Date.now()}.${extension}`, { type })]
        }
        this.mediaRecorder.start(250)
        this.recording = true
        this.recordingTimer = window.setInterval(() => {
          this.recordingSeconds += 1
          if (this.recordingSeconds >= 120) this.stopRecording(false)
        }, 1000)
      } catch {
        this.error = 'Microphone permission was not granted.'
      }
    },
    stopRecording(discard = false) {
      if (this.recordingTimer) window.clearInterval(this.recordingTimer)
      this.recordingTimer = null
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        if (discard) {
          this.mediaRecorder.ondataavailable = null
          this.mediaRecorder.onstop = null
        }
        this.mediaRecorder.stop()
        this.mediaRecorder.stream?.getTracks().forEach(track => track.stop())
      }
      this.recording = false
      if (discard) this.audioChunks = []
    },
    clearAttachments() {
      if (this.recording) this.stopRecording(true)
      this.selectedFiles = []
      this.recordingSeconds = 0
    },
    async hydrateAttachments() {
      const attachments = (this.conversation?.messages || []).flatMap(message => message.attachments || [])
      await Promise.all(attachments.map(async attachment => {
        if (this.attachmentUrls[attachment.id]) {
          attachment.blobUrl = this.attachmentUrls[attachment.id]
          return
        }
        try {
          const { data } = await axios.get(attachment.url, { headers: this.authHeaders(), responseType: 'blob' })
          const url = URL.createObjectURL(data)
          this.attachmentUrls[attachment.id] = url
          attachment.blobUrl = url
        } catch { /* keep the processing placeholder */ }
      }))
    },
    startPolling(reset = false) {
      if (reset) {
        this.pollAttempts = 0
        this.pollStartedAt = Date.now()
        this.waitingSeconds = 0
      }
      if (!this.pollStartedAt) this.pollStartedAt = Date.now()
      if (this.pollTimer) return

      const elapsed = Date.now() - this.pollStartedAt
      if (elapsed >= 75000) {
        this.error = 'This reply is taking longer than expected. Please try again in a moment.'
        return
      }

      const delays = [1000, 1500, 2500, 4000, 5000]
      const delay = delays[Math.min(this.pollAttempts, delays.length - 1)]
      this.pollTimer = window.setTimeout(async () => {
        this.pollTimer = null
        this.pollAttempts += 1
        this.waitingSeconds = Math.floor((Date.now() - this.pollStartedAt) / 1000)
        await this.fetchConversation(false)
        if (this.waitingForReply && !this.pollTimer) this.startPolling()
      }, delay)
    },
    stopPolling() {
      if (this.pollTimer) window.clearTimeout(this.pollTimer)
      this.pollTimer = null
      if (!this.waitingForReply) {
        this.pollStartedAt = 0
        this.waitingSeconds = 0
      }
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
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''

      const time = new Intl.DateTimeFormat('en-UG', {
        timeZone: 'Africa/Kampala',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date)

      return `${time} EAT`
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
.message-attachments { display: grid; gap: 7px; margin-bottom: 7px; }
.chat-image { width: min(300px, 100%); max-height: 260px; object-fit: contain; border-radius: 12px; cursor: zoom-in; background: rgba(0,0,0,.28); }
.message-attachments audio { width: min(310px, 100%); height: 38px; }
.attachment-processing { color: var(--text-muted); font-size: 11px; }

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
.attachment-preview { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 9px clamp(14px, 3vw, 24px); border-top: 1px solid rgba(255,255,255,.08); background: rgba(10,11,9,.72); color: var(--text-muted); font-size: 11px; }
.attachment-preview button { margin-left: auto; border: 0; background: transparent; color: #ff8585; cursor: pointer; }
.recording-dot { display: inline-flex; align-items: center; gap: 7px; color: #ff8b8b; font-weight: 750; }
.recording-dot::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #ff5252; box-shadow: 0 0 0 0 rgba(255,82,82,.5); animation: recordingPulse 1.35s ease-out infinite; }
@keyframes recordingPulse { 70% { box-shadow: 0 0 0 7px rgba(255,82,82,0); } 100% { box-shadow: 0 0 0 0 rgba(255,82,82,0); } }
.support-composer { display: flex; align-items: flex-end; gap: 9px; padding: 13px clamp(14px, 3vw, 24px) 8px; background: rgba(10, 11, 9, .62); }
.support-composer textarea { min-height: 46px; max-height: 120px; resize: vertical; flex: 1; padding: 12px 14px; border: 1px solid rgba(255, 255, 255, .12); border-radius: 14px; outline: none; background: rgba(255, 255, 255, .07); color: var(--input-color); font: inherit; font-size: 13px; line-height: 1.4; }
.support-composer textarea:focus { border-color: rgba(255, 215, 0, .58); box-shadow: 0 0 0 3px rgba(255, 215, 0, .08); }
.support-composer textarea:disabled { opacity: .62; }
.support-composer button { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 auto; border: 0; border-radius: 12px; background: #ffd700; color: #111; cursor: pointer; }
.support-composer button:disabled { opacity: .35; cursor: not-allowed; }
.support-composer button:not(:disabled):active { transform: scale(.96); }
.support-composer .composer-tool { width: 36px; height: 42px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); color: #ffd700; font-size: 17px; }
.support-composer .composer-primary { width: 44px; height: 44px; border-radius: 50%; transition: transform .16s ease, background .18s ease, color .18s ease, box-shadow .18s ease; }
.support-composer .composer-primary.is-record { background: #ffd700; color: #111; box-shadow: 0 5px 16px rgba(255,215,0,.2); }
.support-composer .composer-primary.is-send { background: #ffd700; color: #111; box-shadow: 0 5px 18px rgba(255,215,0,.28); }
.support-composer .composer-primary.is-stop { background: #ff5252; color: #fff; box-shadow: 0 5px 18px rgba(255,82,82,.28); }
.support-composer svg { width: 19px; height: 19px; fill: currentColor; }
.composer-action-enter-active, .composer-action-leave-active { transition: opacity .1s ease, transform .1s ease; }
.composer-action-enter-from { opacity: 0; transform: scale(.72) rotate(-8deg); }
.composer-action-leave-to { opacity: 0; transform: scale(.72) rotate(8deg); }
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
  .support-composer { gap: 7px; padding-inline: 11px; }
  .support-composer textarea { min-height: 44px; }
  .support-composer .composer-primary { width: 44px; height: 44px; }
}

@media (max-width: 390px) {
  .support-back span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
  .support-back { width: 38px; justify-content: center; padding: 0; }
  .support-eyebrow { font-size: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  .support-fade-enter-active, .support-fade-leave-active,
  .support-fade-enter-active .support-panel, .support-fade-leave-active .support-panel,
  .composer-action-enter-active, .composer-action-leave-active { transition: none; }
  .recording-dot::before { animation: none; }
}
</style>
