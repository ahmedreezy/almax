<template>
  <div id="home-page">
    <div :class="{ 'main-blurred': showModal || showVideoAd }">
      <HeroSection />
      <FeaturedSection :openVip="triggerVip" @vipOpened="triggerVip = false" />
      <RecentWinnings />
      <TestimonialsSection />
      <FooterSection />
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
    <SupportChat />
  </div>
</template>

<script>
import IntroModal from '../components/IntroModal.vue'
import HeroSection from '../components/HeroSection.vue'
import FeaturedSection from '../components/FeaturedSection.vue'
import RecentWinnings from '../components/RecentWinnings.vue'
import FooterSection from '../components/FooterSection.vue'
import SupportChat from '../components/SupportChat.vue'
import Odd2FloatingWidget from '../components/Odd2FloatingWidget.vue'
import VideoAdModal from '../components/VideoAdModal.vue'
import TestimonialsSection from '../components/TestimonialsSection.vue'
export default {
  name: 'HomePage',
  components: {
    IntroModal,
    HeroSection,
    FeaturedSection,
    RecentWinnings,
    FooterSection,
    SupportChat,
    Odd2FloatingWidget,
    VideoAdModal,
    TestimonialsSection
  },
  data() {
    return {
      showVideoAd: false,
      showModal: false,
      triggerVip: false
    }
  },
  methods: {
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
