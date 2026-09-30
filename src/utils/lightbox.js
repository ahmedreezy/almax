import { reactive } from 'vue'

export const lightbox = reactive({
  url: '',
  visible: false,
  open(url) {
    if (!url) return
    this.url = url
    this.visible = true
  },
  close() {
    this.visible = false
    this.url = ''
  }
})
