<template>
  <div class="support-inbox">
    <aside class="conversation-list">
      <div class="inbox-toolbar">
        <input v-model="search" placeholder="Search customer…" @input="scheduleFetch" />
        <select v-model="status" @change="fetchConversations"><option value="open">Open</option><option value="resolved">Resolved</option><option value="">All</option></select>
      </div>
      <div v-if="loadingList" class="empty-state">Loading chats…</div>
      <button v-for="item in conversations" :key="item.id" :class="['conversation-item', { active: selected?.id === item.id }]" @click="selectConversation(item)">
        <span class="conversation-avatar">{{ initials(item) }}</span>
        <span class="conversation-copy">
          <strong>{{ item.contact?.display_name || item.contact?.phone || 'Customer' }}</strong>
          <small>{{ item.summary || `${item.messages_count || 0} messages` }}</small>
          <em>{{ formatTime(item.last_message_at) }}</em>
        </span>
        <span :class="['mode-pill', item.mode]">{{ item.mode }}</span>
      </button>
      <div v-if="!loadingList && !conversations.length" class="empty-state">No conversations found.</div>
    </aside>

    <section v-if="selected" class="conversation-detail">
      <header class="detail-header">
        <div><span class="eyebrow">Platform customer</span><h3>{{ selected.contact?.display_name || selected.contact?.phone }}</h3><p>{{ selected.contact?.phone }} · {{ selected.category }} · {{ selected.priority }}</p></div>
        <div class="detail-actions">
          <button v-if="selected.mode !== 'human' && selected.status !== 'resolved'" class="primary" @click="takeOver">Take over</button>
          <button v-if="selected.mode === 'human'" @click="releaseToAi">Return to AI</button>
          <button v-if="selected.status !== 'resolved'" @click="resolveConversation">Resolve</button>
        </div>
      </header>

      <div ref="messages" class="admin-messages">
        <article v-for="message in selected.messages || []" :key="message.id" :class="message.direction === 'inbound' ? 'customer-message' : 'support-message'">
          <span>{{ message.sender_type === 'admin' ? 'Administrator' : (message.direction === 'inbound' ? 'Customer' : 'AI Support') }}</span>
          <div v-if="message.attachments?.length" class="admin-attachments">
            <template v-for="attachment in message.attachments" :key="attachment.public_id">
              <img v-if="attachment.kind === 'image' && attachment.blobUrl" :src="attachment.blobUrl" alt="Customer attachment" @click="$lightbox.open(attachment.blobUrl)" />
              <audio v-else-if="attachment.kind === 'audio' && attachment.blobUrl" :src="attachment.blobUrl" controls></audio>
              <small v-if="attachment.transcript">Transcript: {{ attachment.transcript }}</small>
            </template>
          </div>
          <p>{{ message.body }}</p>
          <time>{{ formatTime(message.sent_at || message.created_at) }}</time>
        </article>
      </div>

      <form class="admin-reply" @submit.prevent="sendReply">
        <textarea v-model="reply" rows="2" maxlength="5000" :disabled="selected.mode !== 'human' || sending" :placeholder="selected.mode === 'human' ? 'Reply as Almax Support…' : 'Take over the conversation to reply'"></textarea>
        <button class="primary" :disabled="selected.mode !== 'human' || !reply.trim() || sending">{{ sending ? 'Sending…' : 'Send reply' }}</button>
      </form>
    </section>
    <section v-else class="no-selection"><span>Choose a conversation</span><p>Review customer messages and take over when personal help is needed.</p></section>
  </div>
</template>

<script>
import adminApi from '@/utils/adminApi'

export default {
  name: 'SupportInbox',
  data: () => ({ conversations: [], selected: null, search: '', status: 'open', loadingList: false, sending: false, reply: '', listTimer: null, detailTimer: null, searchTimer: null, attachmentUrls: {} }),
  mounted() {
    this.fetchConversations()
    this.listTimer = setInterval(this.fetchConversations, 12000)
  },
  beforeUnmount() {
    clearInterval(this.listTimer); clearInterval(this.detailTimer); clearTimeout(this.searchTimer)
    Object.values(this.attachmentUrls).forEach(url => URL.revokeObjectURL(url))
  },
  methods: {
    scheduleFetch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(this.fetchConversations, 300) },
    async fetchConversations() {
      this.loadingList = !this.conversations.length
      try {
        const { data } = await adminApi.get('/api/support/admin/conversations', { params: { status: this.status || undefined, channel: 'platform', search: this.search || undefined, perPage: 100 } })
        this.conversations = data.data || []
        if (this.selected) {
          const updated = this.conversations.find(item => item.id === this.selected.id)
          if (updated) Object.assign(this.selected, updated)
        }
      } finally { this.loadingList = false }
    },
    async selectConversation(item) {
      clearInterval(this.detailTimer)
      await this.fetchDetail(item.id)
      this.detailTimer = setInterval(() => this.fetchDetail(item.id, false), 3000)
    },
    async fetchDetail(id, scroll = true) {
      const { data } = await adminApi.get(`/api/support/admin/conversations/${id}`)
      this.selected = data
      await this.hydrateAttachments()
      if (scroll) this.scrollBottom()
    },
    async hydrateAttachments() {
      const attachments = (this.selected?.messages || []).flatMap(message => message.attachments || [])
      await Promise.all(attachments.map(async attachment => {
        if (this.attachmentUrls[attachment.public_id]) return attachment.blobUrl = this.attachmentUrls[attachment.public_id]
        try {
          const { data } = await adminApi.get(`/api/support/admin/attachments/${attachment.public_id}`, { responseType: 'blob' })
          attachment.blobUrl = URL.createObjectURL(data)
          this.attachmentUrls[attachment.public_id] = attachment.blobUrl
        } catch { /* leave unavailable */ }
      }))
    },
    async takeOver() { await adminApi.post(`/api/support/admin/conversations/${this.selected.id}/takeover`); await this.fetchDetail(this.selected.id) },
    async releaseToAi() { await adminApi.post(`/api/support/admin/conversations/${this.selected.id}/release`); await this.fetchDetail(this.selected.id) },
    async resolveConversation() { await adminApi.patch(`/api/support/admin/conversations/${this.selected.id}`, { status: 'resolved' }); await this.fetchDetail(this.selected.id); await this.fetchConversations() },
    async sendReply() {
      if (!this.reply.trim()) return
      this.sending = true
      try { await adminApi.post(`/api/support/admin/conversations/${this.selected.id}/messages`, { body: this.reply.trim() }); this.reply = ''; await this.fetchDetail(this.selected.id) }
      finally { this.sending = false }
    },
    initials(item) { return (item.contact?.display_name || item.contact?.phone || 'C').slice(0, 1).toUpperCase() },
    formatTime(value) { if (!value) return ''; return new Date(value).toLocaleString('en-UG', { timeZone: 'Africa/Kampala', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    scrollBottom() { this.$nextTick(() => { if (this.$refs.messages) this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight }) }
  }
}
</script>

<style scoped>
.support-inbox{height:calc(100vh - 190px);min-height:560px;display:grid;grid-template-columns:340px minmax(0,1fr);overflow:hidden;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:#111}.conversation-list{overflow-y:auto;border-right:1px solid rgba(255,255,255,.08)}.inbox-toolbar{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:1fr 100px;gap:8px;padding:14px;background:#151515;border-bottom:1px solid rgba(255,255,255,.08)}input,select,textarea{border:1px solid rgba(255,255,255,.12);border-radius:10px;background:#0d0d0d;color:#fff;padding:10px;font:inherit}.conversation-item{width:100%;display:grid;grid-template-columns:40px 1fr auto;gap:10px;padding:14px;border:0;border-bottom:1px solid rgba(255,255,255,.06);background:transparent;color:#fff;text-align:left;cursor:pointer}.conversation-item:hover,.conversation-item.active{background:rgba(255,215,0,.07)}.conversation-avatar{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;background:#ffd700;color:#111;font-weight:900}.conversation-copy{min-width:0;display:grid;gap:3px}.conversation-copy strong{font-size:13px}.conversation-copy small{overflow:hidden;color:#888;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.conversation-copy em{color:#555;font-size:9px;font-style:normal}.mode-pill{align-self:start;padding:3px 6px;border-radius:20px;background:#242424;color:#aaa;font-size:8px;font-weight:900;text-transform:uppercase}.mode-pill.human{background:rgba(255,215,0,.14);color:#ffd700}.conversation-detail{min-width:0;display:grid;grid-template-rows:auto 1fr auto}.detail-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.08)}.eyebrow{color:#ffd700;font-size:9px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.detail-header h3{margin:4px 0;font-size:18px}.detail-header p{color:#777;font-size:11px}.detail-actions{display:flex;gap:8px;flex-wrap:wrap}.detail-actions button,.admin-reply button{padding:9px 12px;border:1px solid rgba(255,255,255,.14);border-radius:9px;background:#1b1b1b;color:#ddd;cursor:pointer}.primary{border-color:#ffd700!important;background:#ffd700!important;color:#111!important;font-weight:800}.admin-messages{overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:12px;background:#0b0b0b}.admin-messages article{max-width:72%;padding:11px 13px;border-radius:14px;background:#1b1b1b}.admin-messages article.customer-message{align-self:flex-end;background:#3b3210}.admin-messages span{color:#d4b310;font-size:9px;font-weight:800}.admin-messages p{margin:5px 0;white-space:pre-wrap;font-size:13px;line-height:1.5}.admin-messages time{color:#666;font-size:9px}.admin-attachments{display:grid;gap:7px;margin-top:7px}.admin-attachments img{max-width:320px;max-height:260px;object-fit:contain;border-radius:10px;cursor:zoom-in}.admin-attachments audio{max-width:100%}.admin-attachments small{color:#aaa;font-size:10px}.admin-reply{display:flex;gap:10px;padding:14px;border-top:1px solid rgba(255,255,255,.08);background:#151515}.admin-reply textarea{flex:1;resize:none}.admin-reply button:disabled{opacity:.4}.empty-state,.no-selection{display:grid;place-content:center;padding:30px;color:#777;text-align:center}.no-selection p{max-width:320px;margin-top:8px;font-size:12px}@media(max-width:850px){.support-inbox{height:auto;min-height:700px;grid-template-columns:1fr}.conversation-list{max-height:280px;border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}.conversation-detail{min-height:620px}.admin-messages article{max-width:88%}.detail-header{align-items:flex-start;flex-direction:column}}
</style>
