<template>
  <div class="editor">
    <p class="editor-desc">
      Manage testimonials with one photo and one caption for each entry.
    </p>

    <div v-if="loading" class="state-msg">Loading testimonials...</div>
    <div v-else>
      <div v-if="testimonials.length === 0" class="empty-state">No testimonials yet. Add the first one below.</div>
      <div v-else class="media-grid">
        <div v-for="item in testimonials" :key="item.id" class="media-item">
          <div v-if="editingId === item.id" class="edit-panel">
            <MediaUploadCard
              v-model:image="editFile"
              v-model:caption="editForm.caption"
              :preview-src="imageSrc(item)"
              :input-id="'testimonial-caption-' + item.id"
            />
            <div class="actions-row">
              <button class="save-btn" @click="saveEdit(item.id)" :disabled="editSaving">
                {{ editSaving ? 'Saving...' : 'Save Changes' }}
              </button>
              <button class="ghost-btn" @click="cancelEdit">Cancel</button>
              <span v-if="editError" class="error-msg">{{ editError }}</span>
            </div>
          </div>

          <template v-else>
            <img v-if="imageSrc(item)" :src="imageSrc(item)" class="media-img" :alt="item.caption || 'Testimonial'" style="cursor:zoom-in" @click="$lightbox.open(imageSrc(item))" />
            <div v-else class="media-placeholder">Photo</div>
            <div class="media-body">
              <p>{{ item.caption || 'No caption added' }}</p>
            </div>
            <div class="card-actions">
              <button class="edit-btn" @click="startEdit(item)">Edit</button>
              <button class="delete-btn" @click="deleteItem(item.id)">Delete</button>
            </div>
          </template>
        </div>
      </div>

      <div class="add-section">
        <h3 class="add-title">Add Testimonial</h3>
        <form @submit.prevent="addItem" class="editor-form">
          <MediaUploadCard v-model:image="imageFile" v-model:caption="newItem.caption" input-id="new-testimonial-caption" />
          <div class="actions-row">
            <button type="submit" class="save-btn" :disabled="saving">
              {{ saving ? 'Uploading...' : 'Add Testimonial' }}
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
  name: 'TestimonialsEditor',
  components: { MediaUploadCard },
  data() {
    return {
      testimonials: [],
      loading: true,
      saving: false,
      saved: false,
      saveError: '',
      imageFile: null,
      newItem: { caption: '' },
      editingId: null,
      editForm: { caption: '' },
      editFile: null,
      editSaving: false,
      editError: ''
    }
  },
  async mounted() {
    await this.load()
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const { data } = await adminApi.get('/api/testimonials')
        this.testimonials = data || []
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
      return API + url
    },
    async addItem() {
      this.saving = true
      this.saved = false
      this.saveError = ''
      try {
        const fd = new FormData()
        fd.append('caption', this.newItem.caption || '')
        if (this.imageFile) fd.append('image', this.imageFile)
        const { data } = await adminApi.post('/api/testimonials', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        this.testimonials.unshift(data)
        this.saved = true
        this.newItem = { caption: '' }
        this.imageFile = null
        setTimeout(() => { this.saved = false }, 2500)
      } catch {
        this.saveError = 'Upload failed. Make sure the server is running.'
      } finally {
        this.saving = false
      }
    },
    startEdit(item) {
      this.editingId = item.id
      this.editForm = { caption: item.caption || '' }
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
        fd.append('caption', this.editForm.caption || '')
        if (this.editFile) fd.append('image', this.editFile)
        const { data } = await adminApi.post('/api/testimonials/' + id, fd)
        const idx = this.testimonials.findIndex(t => t.id === id)
        if (idx !== -1) this.testimonials.splice(idx, 1, data)
        this.cancelEdit()
      } catch {
        this.editError = 'Save failed.'
      } finally {
        this.editSaving = false
      }
    },
    async deleteItem(id) {
      if (!confirm('Delete this testimonial?')) return
      try {
        await adminApi.delete('/api/testimonials/' + id)
        this.testimonials = this.testimonials.filter(t => t.id !== id)
      } catch {
        alert('Delete failed.')
      }
    }
  }
}
</script>

<style scoped>
.editor { max-width: 920px; }
.editor-desc { color: rgba(255,255,255,0.58); font-size: 14px; line-height: 1.7; margin-bottom: 22px; border-left: 3px solid #FFD700; padding: 12px 0 12px 16px; }
.state-msg, .empty-state { background: #111; border-radius: 10px; color: #888; font-size: 14px; margin-bottom: 22px; padding: 16px; text-align: center; }
.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px; margin-bottom: 30px; }
.media-item { background: #0e0e0e; border: 1px solid rgba(255, 215, 0, 0.12); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s; }
.media-item:hover { border-color: rgba(255,215,0,0.32); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.38); }
.media-img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; transition: transform 0.35s; }
.media-item:hover .media-img { transform: scale(1.03); }
.media-placeholder { aspect-ratio: 3 / 4; display: flex; align-items: center; justify-content: center; color: #555; background: #080808; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
.media-body { padding: 11px 13px 8px; flex: 1; }
.media-body p { color: #fff; font-size: 13px; line-height: 1.5; margin: 0; }
.card-actions { display: flex; gap: 8px; padding: 0 12px 12px; }
.edit-panel { padding: 14px; }
.add-section { margin-top: 28px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.07); }
.add-title { color: rgba(255,255,255,0.55); font-size: 11px; font-weight: 900; letter-spacing: 1.8px; text-transform: uppercase; margin: 0 0 18px; }
.editor-form { display: flex; flex-direction: column; gap: 16px; }
.actions-row { align-items: center; display: flex; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
.save-btn, .edit-btn { background: linear-gradient(135deg, #FFD700, #FFA500); border: none; border-radius: 9px; color: #000; cursor: pointer; font-size: 13px; font-weight: 900; min-height: 40px; padding: 10px 18px; }
.ghost-btn, .delete-btn { background: #1a1a1a; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 9px; color: #ddd; cursor: pointer; font-size: 13px; font-weight: 700; padding: 10px 14px; }
.delete-btn { color: #ff8a65; }
.save-btn:disabled { cursor: not-allowed; opacity: 0.6; }
.saved-msg { color: #4caf50; font-size: 13px; font-weight: 700; }
.error-msg { color: #ff5252; font-size: 13px; }
</style>
