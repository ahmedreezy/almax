<template>
  <div class="media-card">
    <div class="media-preview" role="button" tabindex="0" @click="openPicker" @keydown.enter.prevent="openPicker" @keydown.space.prevent="openPicker">
      <img v-if="preview" :src="preview" alt="Selected media preview" @click.stop="$lightbox.open(preview)" />
      <div v-else class="media-empty">
        <span class="media-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg></span>
        <strong>Add a clear photo</strong>
        <small>Drag and drop, paste, or browse · JPEG, PNG, WEBP · 5 MB maximum</small>
      </div>
    </div>

    <div class="media-controls">
      <button type="button" class="media-pick-btn" @click="openPicker">{{ preview ? 'Replace photo' : 'Choose photo' }}</button>
      <button v-if="preview" type="button" class="media-remove-btn" @click="removeFile">Remove</button>
      <span v-if="fileName" class="media-filename">{{ fileName }}</span>
    </div>

    <label class="caption-label" :for="captionId">Caption</label>
    <textarea :id="captionId" :value="caption" class="caption-input" rows="3" placeholder="Write the short caption users should see" @input="$emit('update:caption', $event.target.value)"></textarea>
    <p v-if="uploadError" class="media-error" role="alert">{{ uploadError }}</p>
    <slot></slot>
    <input
      ref="nativePicker"
      class="native-file-input"
      type="file"
      accept="image/*"
      @change="onNativeFileSelected"
    />
    <DashboardModal v-if="!useNativePicker" :uppy="uppy" :open="uppyOpen" :props="dashboardOptions" />
  </div>
</template>

<script>
import Uppy from '@uppy/core'
import DashboardModal from '@uppy/vue/dashboard-modal'
import { markRaw } from 'vue'
import '@uppy/core/css/style.min.css'
import '@uppy/dashboard/css/style.min.css'

export default {
  name: 'MediaUploadCard',
  components: { DashboardModal },
  props: {
    image: { type: Object, default: null },
    caption: { type: String, default: '' },
    previewSrc: { type: String, default: '' },
    inputId: { type: String, default: '' }
  },
  emits: ['update:image', 'update:caption'],
  data() {
    const useNativePicker = window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches
    const uppy = markRaw(new Uppy({
      id: `admin-media-${Math.random().toString(36).slice(2)}`,
      autoProceed: false,
      allowMultipleUploadBatches: false,
      restrictions: {
        maxFileSize: 5 * 1024 * 1024,
        maxNumberOfFiles: 1,
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp']
      }
    }))
    return {
      uppy,
      uppyOpen: false,
      useNativePicker,
      uploadError: '',
      localPreview: '',
      fileName: '',
      generatedId: `media-caption-${Math.random().toString(36).slice(2)}`,
      dashboardOptions: {
        onRequestCloseModal: () => { this.uppyOpen = false },
        closeModalOnClickOutside: true,
        disableStatusBar: true,
        proudlyDisplayPoweredByUppy: false,
        note: 'JPEG, PNG or WEBP · one photo · 5 MB maximum',
        singleFileFullScreen: true,
        theme: 'dark'
      }
    }
  },
  computed: {
    preview() { return this.localPreview || this.previewSrc },
    captionId() { return this.inputId || this.generatedId }
  },
  watch: {
    image(file) {
      if (!file) {
        this.revokePreview()
        this.localPreview = ''
        this.fileName = ''
      }
    }
  },
  mounted() {
    this.uppy.on('file-added', this.onUppyFileAdded)
    this.uppy.on('restriction-failed', this.onRestrictionFailed)
  },
  beforeUnmount() {
    this.revokePreview()
    this.uppy.off('file-added', this.onUppyFileAdded)
    this.uppy.off('restriction-failed', this.onRestrictionFailed)
    this.uppy.destroy()
  },
  methods: {
    openPicker() {
      this.uploadError = ''
      if (this.useNativePicker) {
        this.$refs.nativePicker.value = ''
        this.$refs.nativePicker.click()
        return
      }
      this.uppy.getFiles().forEach(file => this.uppy.removeFile(file.id))
      this.uppyOpen = true
    },
    onNativeFileSelected(event) {
      const file = event.target.files?.[0]
      if (file) this.setFile(file)
    },
    onUppyFileAdded(file) {
      this.uppy.getFiles().filter(item => item.id !== file.id).forEach(item => this.uppy.removeFile(item.id))
      this.setFile(file.data)
      this.uppyOpen = false
    },
    onRestrictionFailed(file, error) {
      const message = error?.message || 'Choose a JPEG, PNG, or WEBP image under 5 MB.'
      this.uploadError = message
      this.uppy.info(message, 'error', 5000)
    },
    setFile(file) {
      if (!file) return
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      const hasSupportedExtension = /\.(jpe?g|png|webp)$/i.test(file.name || '')
      if (!allowedTypes.includes(file.type) && !(!file.type && hasSupportedExtension)) {
        this.uploadError = 'This photo format is not supported. Choose a JPEG, PNG, or WEBP image.'
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        this.uploadError = 'This photo is larger than 5 MB. Choose a smaller image.'
        return
      }
      this.uploadError = ''
      this.revokePreview()
      this.fileName = file.name
      this.localPreview = URL.createObjectURL(file)
      this.$emit('update:image', file)
    },
    removeFile() {
      this.revokePreview()
      this.localPreview = ''
      this.fileName = ''
      this.uploadError = ''
      this.uppy.getFiles().forEach(file => this.uppy.removeFile(file.id))
      this.$emit('update:image', null)
    },
    revokePreview() { if (this.localPreview) URL.revokeObjectURL(this.localPreview) }
  }
}
</script>

<style scoped>
.media-card{display:flex;flex-direction:column;gap:14px;padding:18px;border:0;border-radius:10px;background:#111923}.media-preview{min-height:240px;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px dashed #34465a;border-radius:8px;background:#0c1219;cursor:pointer;transition:border-color .2s ease,background-color .2s ease,transform .2s ease}.media-preview:hover,.media-preview:focus-visible{border-color:#7295ba;background:#101b26;outline:0}.media-preview img{display:block;width:100%;max-height:360px;object-fit:cover;cursor:zoom-in}.media-empty{display:flex;flex-direction:column;align-items:center;gap:9px;padding:28px;color:#7c8998;text-align:center}.media-empty-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:9px;background:#18283a;color:#8fb3d9}.media-empty-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.media-empty strong{color:#eef2f6;font-size:17px;font-weight:600}.media-empty small{max-width:360px;color:#68788a;font-size:12px;line-height:1.5}.media-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.media-pick-btn,.media-remove-btn{border:0;border-radius:7px;padding:10px 15px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.media-pick-btn{background:#8fb3d9;color:#0b131c}.media-pick-btn:hover{background:#a5c3e1}.media-remove-btn{background:#1b2430;color:#9aa8b7}.media-remove-btn:hover{background:#263240;color:#d5dce4}.media-filename{max-width:260px;overflow:hidden;color:#788697;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.caption-label{color:#748294;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.caption-input{min-height:92px;padding:12px 14px;border:1px solid #303c4a;border-radius:7px;outline:0;background:#0c1219;color:#e9edf2;font:inherit;font-size:13px;line-height:1.5;resize:vertical}.caption-input:focus{border-color:#7295ba;box-shadow:0 0 0 3px rgba(114,149,186,.1)}.caption-input::placeholder{color:#526071}.media-error{margin:0;padding:10px 12px;border-radius:7px;background:#2b171c;color:#e9a3ab;font-size:13px;line-height:1.45}.native-file-input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}.uppy-Dashboard--modal{z-index:1200!important}.uppy-Dashboard-inner{border:0!important;border-radius:12px!important;background:#101720!important;box-shadow:0 30px 90px rgba(2,7,12,.62)!important}.uppy-Dashboard-innerWrap{background:#101720!important}.uppy-Dashboard-AddFiles{border-color:#34465a!important}.uppy-Dashboard-browse{color:#8fb3d9!important}.uppy-Dashboard-note{color:#718094!important}@media(max-width:640px){.media-card{padding:14px}.media-preview{min-height:190px}.media-pick-btn,.media-remove-btn{min-height:44px;font-size:14px}.caption-input{font-size:16px}.uppy-Dashboard-inner{width:calc(100vw - 20px)!important;height:min(680px,calc(100dvh - 20px))!important}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
