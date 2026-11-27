<template>
  <div id="home-page">
    <div :class="{ 'main-blurred': showModal || showVideoAd }">
      <HeroSection :show-signup="!isMember" @signup="openSignup" />
      <FeaturedSection class="reveal-section" :openVip="triggerVip" @vipOpened="triggerVip = false" />
      <RecentWinnings class="reveal-section" />
      <TestimonialsSection class="reveal-section" />
      <FooterSection class="reveal-section" />
    </div>

    <VideoAdModal
      v-if="showVideoAd"
      @done="onAdDone"
    />
    <IntroModal
      v-if="showModal"
      @close="closeModal"
      @openVip="openVipFromModal"
    />
    <Odd2FloatingWidget @open="openWidget" />
    <WhatsAppButton />
    <SupportChat />
  </div>
</template>

<script>
import IntroModal from '../components/IntroModal.vue'
import HeroSection from '../components/HeroSection.vue'
import FeaturedSection from '../components/FeaturedSection.vue'
import RecentWinnings from '../components/RecentWinnings.vue'
import FooterSection from '../components/FooterSection.vue'
import WhatsAppButton from '../components/WhatsAppButton.vue'
import SupportChat from '../components/SupportChat.vue'
import Odd2FloatingWidget from '../components/Odd2FloatingWidget.vue'
import VideoAdModal from '../components/VideoAdModal.vue'
import TestimonialsSection from '../components/TestimonialsSection.vue'
import { isLoggedIn } from '../utils/userAuth'
export default {
  name: 'HomePage',
  components: {
    IntroModal,
    HeroSection,
    FeaturedSection,
    RecentWinnings,
    FooterSection,
    WhatsAppButton,
    SupportChat,
    Odd2FloatingWidget,
    VideoAdModal,
    TestimonialsSection
  },
  data() {
    return {
      isMember: isLoggedIn(),
      showVideoAd: false,
      showModal: false,
      triggerVip: false,
      sectionObserver: null
    }
  },
  mounted() {
    window.addEventListener('user-auth-changed', this.syncAuth)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal-section').forEach(section => section.classList.add('is-visible'))
      return
    }
    this.sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        this.sectionObserver?.unobserve(entry.target)
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' })
    this.$nextTick(() => document.querySelectorAll('.reveal-section').forEach(section => this.sectionObserver.observe(section)))
  },
  beforeUnmount() {
    window.removeEventListener('user-auth-changed', this.syncAuth)
    this.sectionObserver?.disconnect()
  },
  methods: {
    syncAuth() {
      this.isMember = isLoggedIn()
    },
    openSignup() {
      window.dispatchEvent(new CustomEvent('open-user-auth', { detail: { tab: 'register' } }))
    },
    openWidget() {
      this.showVideoAd = true
    },
    onAdDone() {
      this.showVideoAd = false
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
    },
    openVipFromModal() {
      this.showModal = false
      this.triggerVip = true
    }
  }
}
</script>

<style>
#home-page {
  min-height: 100vh;
}
.main-blurred {
  filter: blur(4px);
  pointer-events: none;
  user-select: none;
  transition: filter 0.3s ease;
}
</style>
