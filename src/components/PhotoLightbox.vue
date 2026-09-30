<template>
  <Teleport to="body">
    <transition name="lb">
      <div
        v-if="$lightbox.visible"
        class="lb-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Photo viewer"
        @click.self="$lightbox.close()"
      >
        <button class="lb-close" @click="$lightbox.close()" aria-label="Close photo viewer">&#x2715;</button>
        <img class="lb-img" :src="$lightbox.url" alt="Full size preview" @click.stop />
      </div>
    </transition>
  </Teleport>
</template>

<script>
export default {
  name: 'PhotoLightbox',
  mounted() {
    document.addEventListener('keydown', this._onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this._onKey)
    document.body.style.overflow = ''
  },
  watch: {
    '$lightbox.visible'(val) {
      document.body.style.overflow = val ? 'hidden' : ''
    }
  },
  methods: {
    _onKey(e) {
      if (e.key === 'Escape' && this.$lightbox.visible) {
        this.$lightbox.close()
      }
    }
  }
}
</script>

<style>
.lb-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}
.lb-img {
  max-width: 92vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.7);
  cursor: default;
  user-select: none;
}
.lb-close {
  position: absolute;
  top: 18px;
  right: 22px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s;
  z-index: 1;
}
.lb-close:hover { background: rgba(255, 255, 255, 0.22); }
.lb-enter-active,
.lb-leave-active { transition: opacity 0.2s ease; }
.lb-enter-from,
.lb-leave-to    { opacity: 0; }
</style>
