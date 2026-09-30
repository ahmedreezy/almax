<template>
  <div class="editor">
    <p class="editor-desc">
      Update the Free Daily Tip with one photo, one caption, and the 10-second advertisement shown before it.
    </p>

    <div v-if="fetchLoading" class="state-msg">Loading current tip...</div>
    <div v-else-if="fetchError" class="state-msg error">Could not load. Make sure the server is running.</div>

    <form @submit.prevent="save" class="editor-form">
      <MediaUploadCard
        v-model:image="imageFile"
        v-model:caption="form.caption"
        :preview-src="imageSrc(form.imageUrl || form.image_url)"
        input-id="free-tip-caption"
      />

      <section class="ad-card">
        <div class="ad-head">
          <div>
            <h3>Free Tip Advertisement</h3>
            <p>Shown before the Free Daily Tip opens.</p>
          </div>
          <span class="ad-kind">{{ adTypeLabel }}</span>
        </div>

        <div class="ad-type-row" role="group" aria-label="Advertisement type">
          <button
            v-for="type in adTypes"
            :key="type.value"
            type="button"
            :class="['ad-type-btn', { active: ad.type === type.value }]"
            @click="setAdType(type.value)"
          >
            {{ type.label }}
          </button>
        </div>

        <div v-if="ad.type === 'link'" class="ad-link-fields">
          <label for="free-tip-ad-link">Advertisement Link</label>
          <input
            id="free-tip-ad-link"
            v-model.trim="ad.url"
            type="url"
            placeholder="https://example.com/promo"
          />
        </div>

        <div
          v-else
          class="ad-upload-wrap"
          @dragover.prevent
          @drop.prevent="onAdDrop"
        >
          <div class="ad-preview" @click="openAdPicker">
            <img
              v-if="ad.type === 'image' && adPreviewSrc"
              :src="adPreviewSrc"
              alt="Advertisement preview"
            />
            <video
              v-else-if="ad.type === 'video' && adPreviewSrc"
              :src="adPreviewSrc"
              controls
              muted
              playsinline
            ></video>
            <div v-else class="ad-empty">
              <span>{{ ad.type === 'image' ? 'Picture' : 'Video' }}</span>
              <strong>{{ adEmptyTitle }}</strong>
              <small>{{ adEmptyHint }}</small>
            </div>
          </div>

          <input
            ref="adFileInput"
            class="hidden-file"
            type="file"
            :accept="adAccept"
            @change="onAdFileChange"
          />

          <div class="ad-controls">
            <button type="button" class="ad-pick-btn" @click="openAdPicker">
              {{ adFile || ad.url ? 'Replace Ad' : 'Choose Ad' }}
            </button>
            <span v-if="adFileName" class="ad-filename">{{ adFileName }}</span>
            <span v-else-if="ad.url" class="ad-filename">Current media selected</span>
          </div>

          <div v-if="ad.url && !adFile" class="ad-current">
            <span>Current URL</span>
            <code>{{ ad.url }}</code>
          </div>
        </div>
      </section>

      <div class="form-actions">
        <button type="submit" class="save-btn" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save & Publish' }}
        </button>
        <span v-if="saved" class="saved-msg">Saved successfully</span>
        <span v-if="saveError" class="error-msg">{{ saveError }}</span>
      </div>
    </form>

    <div class="preview-wrap">
      <p class="preview-label">Live Preview</p>
      <div class="preview-card">
        <img v-if="previewImage" :src="previewImage" class="preview-img" alt="Free daily tip preview" style="cursor:zoom-in" @click="$lightbox.open(previewImage)" />
        <div v-else class="preview-empty">Photo</div>
        <p>{{ form.caption || 'Caption will appear here' }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import adminApi from '../../utils/adminApi'
import { getApiBaseUrl } from '../../utils/apiBase'
import MediaUploadCard from './MediaUploadCard.vue'

const API = getApiBaseUrl()
const VALID_AD_TYPES = ['image', 'video', 'link']

export default {
  name: 'FreeOdd2Editor',
  components: { MediaUploadCard },
  data() {
    return {
      form: { caption: '', imageUrl: '' },
      ad: {
        type: 'video',
        url: '',
        originalType: 'video',
        originalUrl: ''
      },
      adTypes: [
        { value: 'image', label: 'Picture' },
        { value: 'video', label: 'Video' },
        { value: 'link', label: 'Link' }
      ],
      adFile: null,
      adFileName: '',
      adPreview: '',
      imageFile: null,
      fetchLoading: true,
      fetchError: false,
      saving: false,
      saved: false,
      saveError: ''
    }
  },
  computed: {
    previewImage() {
      if (this.imageFile) return URL.createObjectURL(this.imageFile)
      return this.imageSrc(this.form.imageUrl || this.form.image_url || '')
    },
    adTypeLabel() {
      const type = this.adTypes.find(item => item.value === this.ad.type)
      return type ? type.label : 'Ad'
    },
    adAccept() {
      return this.ad.type === 'video'
        ? 'video/mp4,video/webm,video/ogg,video/quicktime'
        : 'image/jpeg,image/png,image/webp,image/gif'
    },
    adPreviewSrc() {
      if (this.adPreview) return this.adPreview
      if (!this.ad.url || this.ad.type === 'link') return ''
      if (this.ad.type === 'video' && this.isYoutubeUrl(this.ad.url)) return ''
      return this.mediaSrc(this.ad.url)
    },
    adEmptyTitle() {
      if (this.ad.url) return 'Current ad saved'
      return this.ad.type === 'image' ? 'Upload picture ad' : 'Upload video ad'
    },
    adEmptyHint() {
      if (this.ad.url) return 'Choose a file to replace it'
      return this.ad.type === 'image'
        ? 'JPEG, PNG, WebP, or GIF'
        : 'MP4, WebM, OGG, or MOV'
    },
    hasAdChanges() {
      if (this.adFile) return true
      if (this.ad.type !== this.ad.originalType) return true
      if (this.ad.type === 'link' && (this.ad.url || '').trim() !== this.ad.originalUrl) return true
      return false
    }
  },
  async mounted() {
    const [tipLoaded] = await Promise.all([
      this.fetchFreeTip(),
      this.fetchAdConfig()
    ])
    this.fetchError = !tipLoaded
    this.fetchLoading = false
  },
  beforeUnmount() {
    this.revokeAdPreview()
  },
  methods: {
    async fetchFreeTip() {
      try {
        const { data } = await adminApi.get('/api/config/free-odd2')
        if (data) {
          this.form.caption = data.caption || data.pick || ''
          this.form.imageUrl = data.imageUrl || data.image_url || ''
        }
        return true
      } catch {
        return false
      }
    },
    async fetchAdConfig() {
      try {
        const { data } = await adminApi.get('/api/config/vip-config')
        if (data) this.applyAdConfig(data)
      } catch {
        // The free tip remains editable even if ad config cannot be read.
      }
    },
    applyAdConfig(data) {
      const url = data.ad_media_url || data.ad_video_url || ''
      const type = VALID_AD_TYPES.includes(data.ad_media_type)
        ? data.ad_media_type
        : (url ? 'video' : 'video')

      this.ad.type = type
      this.ad.url = url
      this.ad.originalType = type
      this.ad.originalUrl = url
    },
    imageSrc(url) {
      return this.mediaSrc(url)
    },
    mediaSrc(url) {
      if (!url) return ''
      if (/^(https?:|data:|blob:)/.test(url)) return url
      return API + url
    },
    isYoutubeUrl(url) {
      return /(^|\/\/)(www\.)?(youtube\.com|youtu\.be)/.test(url || '')
    },
    setAdType(type) {
      if (!VALID_AD_TYPES.includes(type)) return
      this.revokeAdPreview()
      this.adFile = null
      this.adFileName = ''
      this.ad.type = type
      this.ad.url = type === this.ad.originalType ? this.ad.originalUrl : ''
    },
    openAdPicker() {
      if (this.ad.type === 'link') return
      this.$refs.adFileInput.click()
    },
    onAdFileChange(event) {
      this.setAdFile(event.target.files[0])
      event.target.value = ''
    },
    onAdDrop(event) {
      this.setAdFile(event.dataTransfer.files[0])
    },
    setAdFile(file) {
      if (!file) return
      const expected = this.ad.type === 'video' ? 'video/' : 'image/'
      if (!file.type.startsWith(expected)) {
        this.saveError = this.ad.type === 'video'
          ? 'Choose a valid video file for the advertisement.'
          : 'Choose a valid picture file for the advertisement.'
        return
      }

      this.revokeAdPreview()
      this.saveError = ''
      this.adFile = file
      this.adFileName = file.name
      this.ad.url = ''
      this.adPreview = URL.createObjectURL(file)
    },
    revokeAdPreview() {
      if (this.adPreview) URL.revokeObjectURL(this.adPreview)
      this.adPreview = ''
    },
    async save() {
      this.saving = true
      this.saved = false
      this.saveError = ''
      try {
        await this.saveFreeTip()
        await this.saveAdIfNeeded()
        this.saved = true
        setTimeout(() => { this.saved = false }, 2500)
      } catch (error) {
        this.saveError = this.errorMessage(error)
      } finally {
        this.saving = false
      }
    },
    async saveFreeTip() {
      const fd = new FormData()
      fd.append('caption', this.form.caption || '')
      if (this.imageFile) fd.append('image', this.imageFile)
      const { data } = await adminApi.post('/api/config/free-odd2', fd)
      this.form.caption = data.caption || data.pick || this.form.caption
      this.form.imageUrl = data.imageUrl || data.image_url || this.form.imageUrl
      this.imageFile = null
    },
    async saveAdIfNeeded() {
      if (!this.hasAdChanges) return

      const fd = new FormData()
      fd.append('ad_media_type', this.ad.type)

      if (this.ad.type === 'link') {
        if (!this.ad.url) throw new Error('Enter an advertisement link.')
        fd.append('ad_url', this.ad.url)
      } else if (this.adFile) {
        fd.append('ad_file', this.adFile)
      } else {
        throw new Error(this.ad.type === 'video'
          ? 'Choose a video file for the advertisement.'
          : 'Choose a picture file for the advertisement.')
      }

      const { data } = await adminApi.post('/api/config/ad-media', fd)
      this.applyAdConfig(data)
      this.adFile = null
      this.adFileName = ''
      this.revokeAdPreview()
    },
    errorMessage(error) {
      const errors = error?.response?.data?.errors
      if (errors) {
        const first = Object.values(errors)[0]
        if (Array.isArray(first) && first.length) return first[0]
      }

      return error?.message || 'Save failed. Make sure the server is running.'
    }
  }
}
</script>

<style scoped>
.editor { max-width: 760px; }
.editor-desc { color: rgba(255,255,255,0.58); font-size: 14px; line-height: 1.7; margin-bottom: 24px; border-left: 3px solid #FFD700; padding: 12px 0 12px 16px; }
.state-msg { background: #111; border-radius: 10px; color: #888; font-size: 14px; margin-bottom: 20px; padding: 14px 18px; }
.state-msg.error { border: 1px solid rgba(255, 82, 82, 0.2); color: #ff8a65; }
.editor-form { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
.form-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 14px; }
.save-btn { background: linear-gradient(135deg, #FFD700, #FFA500); border: none; border-radius: 9px; color: #000; cursor: pointer; font-size: 14px; font-weight: 900; min-height: 42px; padding: 11px 24px; }
.save-btn:disabled { cursor: not-allowed; opacity: 0.6; }
.saved-msg { color: #4caf50; font-size: 13px; font-weight: 700; }
.error-msg { color: #ff5252; font-size: 13px; }
.ad-card { background: #111; border: 1px solid rgba(255, 215, 0, 0.14); border-radius: 14px; display: flex; flex-direction: column; gap: 16px; padding: 18px; }
.ad-head { align-items: flex-start; display: flex; gap: 16px; justify-content: space-between; }
.ad-head h3 { color: #fff; font-size: 18px; font-weight: 900; line-height: 1.2; margin: 0 0 6px; }
.ad-head p { color: #777; font-size: 13px; line-height: 1.5; margin: 0; }
.ad-kind { background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.2); border-radius: 999px; color: #FFD700; flex-shrink: 0; font-size: 11px; font-weight: 900; letter-spacing: 1px; padding: 6px 12px; text-transform: uppercase; }
.ad-type-row { border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; display: inline-flex; overflow: hidden; width: fit-content; }
.ad-type-btn { background: rgba(255,255,255,0.04); border: none; border-right: 1px solid rgba(255,255,255,0.1); color: #aaa; cursor: pointer; font-size: 13px; font-weight: 800; min-height: 38px; padding: 9px 16px; }
.ad-type-btn:last-child { border-right: none; }
.ad-type-btn.active { background: rgba(255,215,0,0.14); color: #FFD700; }
.ad-link-fields { display: flex; flex-direction: column; gap: 8px; }
.ad-link-fields label { color: #888; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
.ad-link-fields input { background: #1a1a1a; border: 1px solid rgba(255, 215, 0, 0.16); border-radius: 9px; color: #fff; font-size: 14px; min-height: 42px; outline: none; padding: 11px 14px; }
.ad-link-fields input:focus { border-color: rgba(255, 215, 0, 0.5); }
.ad-upload-wrap { display: flex; flex-direction: column; gap: 12px; }
.ad-preview { align-items: center; aspect-ratio: 16 / 9; background: #0b0b0b; border: 1px dashed rgba(255, 215, 0, 0.25); border-radius: 12px; cursor: pointer; display: flex; justify-content: center; overflow: hidden; width: 100%; }
.ad-preview img,
.ad-preview video { display: block; height: 100%; object-fit: contain; width: 100%; }
.ad-empty { align-items: center; color: #888; display: flex; flex-direction: column; gap: 8px; padding: 28px; text-align: center; }
.ad-empty span { background: linear-gradient(135deg, #FFD700, #FFA500); border-radius: 999px; color: #000; font-size: 11px; font-weight: 900; letter-spacing: 1px; padding: 7px 14px; text-transform: uppercase; }
.ad-empty strong { color: #fff; font-size: 18px; }
.ad-empty small { color: #666; font-size: 13px; }
.hidden-file { display: none; }
.ad-controls { align-items: center; display: flex; flex-wrap: wrap; gap: 12px; }
.ad-pick-btn { background: linear-gradient(135deg, #FFD700, #FFA500); border: none; border-radius: 9px; color: #000; cursor: pointer; font-size: 13px; font-weight: 900; padding: 10px 18px; }
.ad-filename { color: #888; font-size: 12px; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ad-current { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; }
.ad-current span { color: #777; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
.ad-current code { color: #ccc; font-size: 12px; overflow-wrap: anywhere; white-space: normal; }
.preview-label { color: #555; font-size: 11px; font-weight: 800; letter-spacing: 2px; margin-bottom: 12px; text-transform: uppercase; }
.preview-card { background: #111; border: 1px solid rgba(255, 215, 0, 0.16); border-radius: 14px; max-width: 360px; overflow: hidden; }
.preview-img, .preview-empty { aspect-ratio: 4 / 3; display: flex; width: 100%; }
.preview-img { object-fit: cover; }
.preview-empty { align-items: center; background: #080808; color: #666; justify-content: center; }
.preview-card p { color: #fff; font-size: 14px; line-height: 1.5; margin: 0; padding: 16px; }
@media (max-width: 640px) {
  .ad-head { flex-direction: column; }
  .ad-type-row { display: flex; width: 100%; }
  .ad-type-btn { flex: 1; padding-left: 10px; padding-right: 10px; }
}
</style>
