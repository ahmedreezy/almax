<template>
  <div class="editor">
    <p class="editor-desc">
      Manage Today's Almax Picks with one photo, one caption, and the win probability shown on the public card.
    </p>

    <div v-if="loading" class="state-msg">Loading picks...</div>
    <div v-else>
      <div v-if="tips.length === 0" class="empty-state">No picks added yet. Add the first one below.</div>
      <div v-else class="media-grid">
        <div v-for="tip in tips" :key="tip.id" class="media-item">
          <div v-if="editingId === tip.id" class="edit-panel">
            <MediaUploadCard
              v-model:image="editFile"
              v-model:caption="editForm.caption"
              :preview-src="imageSrc(tip)"
              :input-id="'pick-caption-' + tip.id"
            >
              <div class="prob-field">
                <label>Win Probability</label>
                <input v-model.number="editForm.winProb" type="number" min="1" max="99" />
              </div>
              <div class="prob-field">
                <label>Linked VIP Package</label>
                <select v-model="editForm.groupId" class="pkg-select">
                  <option :value="null">— No linked package —</option>
                  <option v-for="p in packages" :key="p.id" :value="p.id">{{ p.name }} ({{ p.planType }})</option>
                </select>
              </div>
            </MediaUploadCard>
            <div class="actions-row">
              <button class="save-btn" @click="saveEdit(tip.id)" :disabled="editSaving">
                {{ editSaving ? 'Saving...' : 'Save Changes' }}
              </button>
              <button class="ghost-btn" @click="cancelEdit">Cancel</button>
              <span v-if="editError" class="error-msg">{{ editError }}</span>
            </div>
          </div>

          <template v-else>
            <img v-if="imageSrc(tip)" :src="imageSrc(tip)" class="media-img" :alt="tip.caption || 'Almax pick'" style="cursor:zoom-in" @click="$lightbox.open(imageSrc(tip))" />
            <div v-else class="media-placeholder">Photo</div>
            <div class="media-body">
              <p>{{ tip.caption || 'No caption added' }}</p>
              <span>{{ normalizedWinProb(tip) }}% win probability</span>
              <span v-if="tip.groupId" class="pkg-link-badge">👑 {{ linkedPkgName(tip) }}</span>
              <span v-else class="pkg-link-badge pkg-link-none">No package linked</span>
            </div>
            <div class="card-actions">
              <button class="edit-btn" @click="startEdit(tip)">Edit</button>
              <button class="delete-btn" @click="deleteTip(tip.id)">Delete</button>
            </div>
          </template>
        </div>
      </div>

      <div class="add-section">
        <h3 class="add-title">Add Today's Pick</h3>
        <form @submit.prevent="addTip" class="editor-form">
          <MediaUploadCard v-model:image="imageFile" v-model:caption="newTip.caption" input-id="new-pick-caption">
            <div class="prob-field">
              <label>Win Probability</label>
              <input v-model.number="newTip.winProb" type="number" min="1" max="99" />
            </div>
            <div class="prob-field">
              <label>Linked VIP Package</label>
              <select v-model="newTip.groupId" class="pkg-select">
                <option :value="null">— No linked package —</option>
                <option v-for="p in packages" :key="p.id" :value="p.id">{{ p.name }} ({{ p.planType }})</option>
              </select>
            </div>
          </MediaUploadCard>

          <div class="actions-row">
            <button type="submit" class="save-btn" :disabled="saving">
              {{ saving ? 'Adding...' : 'Add Pick' }}
            </button>
            <span v-if="saved" class="saved-msg">Saved</span>
            <span v-if="saveError" class="error-msg">{{ saveError }}</span>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import adminApi from '../../utils/adminApi'
import { getApiBaseUrl } from '../../utils/apiBase'
import MediaUploadCard from './MediaUploadCard.vue'

const API = getApiBaseUrl()

export default {
  name: 'FootballTipsEditor',
  components: { MediaUploadCard },
  data() {
    return {
      tips: [],
      packages: [],
      loading: true,
      saving: false,
      saved: false,
      saveError: '',
      imageFile: null,
      newTip: { caption: '', winProb: 75, groupId: null },
      editingId: null,
      editForm: { caption: '', winProb: 75, groupId: null },
      editFile: null,
      editSaving: false,
      editError: ''
    }
  },
  async mounted() {
    await Promise.all([this.loadTips(), this.loadPackages()])
  },
  methods: {
    async loadPackages() {
      try {
        const { data } = await adminApi.get('/api/groups/admin')
        this.packages = data.map(g => ({
          id: g.id,
          name: g.name,
          planType: g.planType ?? g.plan_type ?? ''
        }))
      } catch {
        // non-critical — dropdown stays empty
      }
    },
    linkedPkgName(tip) {
      if (!tip.groupId) return ''
      const pkg = this.packages.find(p => p.id === tip.groupId)
      return pkg ? pkg.name : 'Package #' + tip.groupId
    },
    async loadTips() {
      this.loading = true
      try {
        const { data } = await adminApi.get('/api/football-tips')
        this.tips = data || []
      } catch {
        this.tips = []
      } finally {
        this.loading = false
      }
    },
    imageSrc(tip) {
      const url = tip.imageUrl || tip.image_url || ''
      if (!url) return ''
      if (/^(https?:|data:|blob:)/.test(url)) return url
      return API + url
    },
    normalizedWinProb(tip) {
      return tip.winProb || tip.win_prob || 75
    },
    appendTipFields(fd, source) {
      fd.append('caption', source.caption || '')
      fd.append('winProb', source.winProb || 75)
      if (source.groupId != null) fd.append('group_id', source.groupId)
      else fd.append('group_id', '')
    },
    async addTip() {
      this.saving = true
      this.saved = false
      this.saveError = ''
      try {
        const fd = new FormData()
        this.appendTipFields(fd, this.newTip)
        if (this.imageFile) fd.append('image', this.imageFile)
        const { data } = await adminApi.post('/api/football-tips', fd)
        this.tips.unshift(data)
        this.saved = true
        this.newTip = { caption: '', winProb: 75, groupId: null }
        this.imageFile = null
        setTimeout(() => { this.saved = false }, 2500)
      } catch {
        this.saveError = 'Failed to save. Make sure the server is running.'
      } finally {
        this.saving = false
      }
    },
    startEdit(tip) {
      this.editingId = tip.id
      this.editForm = { caption: tip.caption || '', winProb: this.normalizedWinProb(tip), groupId: tip.groupId ?? null }
      this.editFile = null
      this.editError = ''
    },
    cancelEdit() {
      this.editingId = null
      this.editFile = null
      this.editError = ''
    },
    async saveEdit(id) {
      this.editSaving = true
      this.editError = ''
      try {
        const fd = new FormData()
        this.appendTipFields(fd, this.editForm)
        if (this.editFile) fd.append('image', this.editFile)
        const { data } = await adminApi.post('/api/football-tips/' + id, fd)
        const idx = this.tips.findIndex(t => t.id === id)
        if (idx !== -1) this.tips.splice(idx, 1, data)
        this.cancelEdit()
      } catch {
        this.editError = 'Save failed.'
      } finally {
        this.editSaving = false
      }
    },
    async deleteTip(id) {
      if (!confirm('Delete this pick?')) return
      try {
        await adminApi.delete('/api/football-tips/' + id)
        this.tips = this.tips.filter(t => t.id !== id)
      } catch {
        alert('Delete failed. Make sure the server is running.')
      }
    }
  }
}
</script>

<style scoped>
.editor { max-width: 920px; }
.editor-desc { color: rgba(255,255,255,0.58); font-size: 14px; line-height: 1.7; margin-bottom: 22px; border-left: 3px solid #FFD700; padding: 12px 0 12px 16px; }
.state-msg, .empty-state { background: #111; border-radius: 10px; color: #888; font-size: 14px; margin-bottom: 22px; padding: 16px; text-align: center; }
.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; margin-bottom: 30px; }
.media-item { background: #0e0e0e; border: 1px solid rgba(255, 215, 0, 0.12); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s; }
.media-item:hover { border-color: rgba(255,215,0,0.32); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.38); }
.media-img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; transition: transform 0.35s; }
.media-item:hover .media-img { transform: scale(1.03); }
.media-placeholder { aspect-ratio: 4 / 3; display: flex; align-items: center; justify-content: center; color: #555; background: #080808; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
.media-body { padding: 12px 14px 8px; flex: 1; }
.media-body p { color: #fff; font-size: 13px; line-height: 1.55; margin: 0 0 6px; }
.media-body span { color: #FFD700; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; }
.card-actions { display: flex; gap: 8px; padding: 0 12px 12px; }
.edit-panel { padding: 14px; }
.pkg-select { width: 100%; background: #111; border: 1px solid rgba(255,215,0,0.2); border-radius: 8px; color: #fff; font-size: 13px; padding: 8px 10px; outline: none; cursor: pointer; margin-top: 4px; }
.pkg-select option { background: #111; }
.pkg-link-badge { display: block; margin-top: 6px; font-size: 11px; font-weight: 700; color: #FFD700; letter-spacing: 0.3px; }
.pkg-link-none { color: #555; font-weight: 400; }
.add-section { margin-top: 28px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.07); }
.add-title { color: rgba(255,255,255,0.55); font-size: 11px; font-weight: 900; letter-spacing: 1.8px; text-transform: uppercase; margin: 0 0 18px; }
.editor-form { display: flex; flex-direction: column; gap: 16px; }
.prob-field { display: flex; flex-direction: column; gap: 8px; }
.prob-field label { color: #888; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
.prob-field input { background: #1a1a1a; border: 1px solid rgba(255, 215, 0, 0.16); border-radius: 9px; color: #fff; font-size: 14px; max-width: 180px; outline: none; padding: 11px 13px; }
.actions-row { align-items: center; display: flex; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
.save-btn, .edit-btn { background: linear-gradient(135deg, #FFD700, #FFA500); border: none; border-radius: 9px; color: #000; cursor: pointer; font-size: 13px; font-weight: 900; min-height: 40px; padding: 10px 18px; }
.ghost-btn, .delete-btn { background: #1a1a1a; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 9px; color: #ddd; cursor: pointer; font-size: 13px; font-weight: 700; padding: 10px 14px; }
.delete-btn { color: #ff8a65; }
.save-btn:disabled { cursor: not-allowed; opacity: 0.6; }
.saved-msg { color: #4caf50; font-size: 13px; font-weight: 700; }
.error-msg { color: #ff5252; font-size: 13px; }
</style>
