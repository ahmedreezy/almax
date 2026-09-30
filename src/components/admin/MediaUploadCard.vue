<template>
  <div class="media-card" @dragover.prevent @drop.prevent="onDrop">
    <div class="media-preview" @click="openPicker">
      <img v-if="preview" :src="preview" alt="Selected media preview" style="cursor:zoom-in" @click="$lightbox.open(preview)" />
      <div v-else class="media-empty">
        <span class="media-empty-icon">Photo</span>
        <strong>Upload photo</strong>
        <small>Click or drag an image here</small>
      </div>
    </div>

    <div class="media-controls">
      <input ref="fileInput" class="hidden-file" type="file" accept="image/*" @change="onFileChange" />
      <button type="button" class="media-pick-btn" @click="openPicker">
        {{ preview ? 'Replace Photo' : 'Choose Photo' }}
      </button>
      <span v-if="fileName" class="media-filename">{{ fileName }}</span>
    </div>

    <label class="caption-label" :for="captionId">Caption</label>
    <textarea
      :id="captionId"
      :value="caption"
      class="caption-input"
      rows="3"
      placeholder="Write the short caption users should see"
      @input="$emit('update:caption', $event.target.value)"
    ></textarea>

    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'MediaUploadCard',
  props: {
    image: { type: Object, default: null },
    caption: { type: String, default: '' },
    previewSrc: { type: String, default: '' },
    inputId: { type: String, default: '' }
  },
  emits: ['update:image', 'update:caption'],
  data() {
    return {
      localPreview: '',
      fileName: '',
      generatedId: `media-caption-${Math.random().toString(36).slice(2)}`
    }
  },
  computed: {
    preview() {
      return this.localPreview || this.previewSrc
    },
    captionId() {
      return this.inputId || this.generatedId
    }
  },
  watch: {
    image(file) {
      if (!file) {
        this.localPreview = ''
        this.fileName = ''
      }
    }
  },
  beforeUnmount() {
    this.revokePreview()
  },
  methods: {
    openPicker() {
      this.$refs.fileInput.click()
    },
    onFileChange(event) {
      this.setFile(event.target.files[0])
      event.target.value = ''
    },
    onDrop(event) {
      this.setFile(event.dataTransfer.files[0])
    },
    setFile(file) {
      if (!file || !file.type.startsWith('image/')) return
      this.revokePreview()
      this.fileName = file.name
      this.localPreview = URL.createObjectURL(file)
      this.$emit('update:image', file)
    },
    revokePreview() {
      if (this.localPreview) URL.revokeObjectURL(this.localPreview)
    }
  }
}
</script>

<style scoped>
.media-card {
  background: #111;
  border: 1px solid rgba(255, 215, 0, 0.14);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.media-preview {
  min-height: 240px;
  border: 1px dashed rgba(255, 215, 0, 0.25);
  border-radius: 12px;
  background: #0b0b0b;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
}
.media-preview img {
  width: 100%;
  max-height: 360px;
  object-fit: cover;
  display: block;
}
.media-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #888;
  text-align: center;
  padding: 28px;
}
.media-empty-icon {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.media-empty strong { color: #fff; font-size: 18px; }
.media-empty small { color: #666; font-size: 13px; }
.hidden-file { display: none; }
.media-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.media-pick-btn {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  border: none;
  border-radius: 9px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}
.media-filename { color: #888; font-size: 12px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.caption-label { color: #888; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
.caption-input {
  background: #1a1a1a;
  border: 1px solid rgba(255, 215, 0, 0.16);
  border-radius: 9px;
  color: #fff;
  font-size: 14px;
  line-height: 1.5;
  min-height: 92px;
  outline: none;
  padding: 12px 14px;
  resize: vertical;
}
.caption-input:focus { border-color: rgba(255, 215, 0, 0.5); }
.caption-input::placeholder { color: #555; }
@media (max-width: 640px) {
  .media-preview { min-height: 190px; }
}
</style>
