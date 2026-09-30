<template>
  <section class="hero">
    <!-- Animated floating background icons -->
    <div class="bg-icons" aria-hidden="true">
      <span
        v-for="icon in bgIcons"
        :key="icon.id"
        class="bg-icon"
        :style="icon.style"
      >{{ icon.char }}</span>
    </div>
    <!-- Main content -->
    <div class="hero-content">
      <div class="hero-badge">🏆 ALMAX FOOTBALL PREDICTIONS</div>
      <div class="glow-wrapper">
        <figure class="glow-figure">
          <div class="glow-layer" v-for="n in 10" :key="n">ALMAX FOOTBALL PREDICTIONS</div>
        </figure>
      </div>

      <!-- Calligraphic slogan -->
      <p class="hero-slogan">✨ We shall make it in life ✨</p>

      <p class="hero-sub">
        Daily free tips, live scores &amp; VIP winnings — powered by Almax.
      </p>
      <div class="hero-stats">
        <div class="stat">
          <span class="stat-num">94%</span>
          <span class="stat-label">Win Rate</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat" ref="memberStat">
          <span :class="['stat-num', 'members-counter', { 'stat-pop': counterDone }]">{{ displayCounter }}</span>
          <span class="stat-label">Members</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-num">Daily</span>
          <span class="stat-label">Free Tips</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'HeroSection',
  data() {
    return {
      counterValue: 0,
      counterDone: false,
      bgIcons: [
        { id: 1,  char: '⚽', style: { top: '10%',  left: '5%',   animationDelay: '0s',    fontSize: '40px' } },
        { id: 2,  char: '🏆', style: { top: '20%',  left: '80%',  animationDelay: '1s',    fontSize: '35px' } },
        { id: 3,  char: '💰', style: { top: '60%',  left: '10%',  animationDelay: '2s',    fontSize: '30px' } },
        { id: 4,  char: '🎰', style: { top: '75%',  left: '85%',  animationDelay: '0.5s',  fontSize: '38px' } },
        { id: 5,  char: '₿',  style: { top: '40%',  left: '90%',  animationDelay: '1.5s',  fontSize: '32px', color: '#F7931A' } },
        { id: 6,  char: '🃏', style: { top: '85%',  left: '30%',  animationDelay: '2.5s',  fontSize: '36px' } },
        { id: 7,  char: '🏅', style: { top: '15%',  left: '50%',  animationDelay: '3s',    fontSize: '28px' } },
        { id: 8,  char: '💎', style: { top: '50%',  left: '3%',   animationDelay: '1.2s',  fontSize: '34px' } },
        { id: 9,  char: '🎯', style: { top: '30%',  left: '70%',  animationDelay: '0.8s',  fontSize: '30px' } },
        { id: 10, char: '🤑', style: { top: '70%',  left: '60%',  animationDelay: '2.2s',  fontSize: '38px' } },
        { id: 11, char: '🏟', style: { top: '5%',   left: '35%',  animationDelay: '1.7s',  fontSize: '32px' } },
        { id: 12, char: '💵', style: { top: '90%',  left: '70%',  animationDelay: '0.3s',  fontSize: '28px' } },
      ]
    }
  },
  computed: {
    displayCounter() {
      if (this.counterValue >= 1000) {
        return Math.round(this.counterValue / 1000) + 'K+'
      }
      return this.counterValue + '+'
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.animateCounter()
    })
  },
  methods: {
    animateCounter() {
      const TARGET = 12000
      const DURATION = 2000
      const start = performance.now()
      const step = (now) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / DURATION, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        this.counterValue = Math.round(eased * TARGET)
        if (progress < 1) {
          requestAnimationFrame(step)
        } else {
          this.counterValue = TARGET
          this.counterDone = true
        }
      }
      requestAnimationFrame(step)
    }
  }
}
</script>

<style scoped>
.hero {
  min-height: 100vh;
  background: var(--hero-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  overflow: hidden;
  padding: clamp(82px, 9vh, 112px) 20px 48px;
  text-align: center;
}

/* Background floating icons */
.bg-icons {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.bg-icon {
  position: absolute;
  opacity: 0.55;
  animation: floatIcon 6s ease-in-out infinite;
  user-select: none;
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5));
}
@keyframes floatIcon {
  0%, 100% { transform: translateY(0)    rotate(0deg); }
  50%       { transform: translateY(-22px) rotate(8deg); }
}

/* Hero content */
.hero-content {
  position: relative;
  z-index: 2;
  max-width: 700px;
}
.hero-badge {
  display: inline-block;
  border: 1px solid var(--gold);
  color: var(--gold);
  font-size: 12px;
  font-weight: 700;
  padding: 6px 20px;
  border-radius: 20px;
  letter-spacing: 2px;
  margin-bottom: 28px;
}
/* ── 3D Glow Title ── */
.glow-wrapper {
  perspective: 600px;
  margin-bottom: 28px;
  width: 100%;
}
.glow-figure {
  animation: wobble 5s ease-in-out infinite;
  transform-origin: center center;
  transform-style: preserve-3d;
  position: relative;
  height: clamp(80px, 14vw, 160px);
  width: 100%;
  margin: 0;
}
.glow-layer {
  animation: glow 10s ease-in-out infinite;
  display: block;
  width: 100%;
  text-align: center;
  font: 900 clamp(22px, 5.5vw, 58px) 'Concert One', sans-serif;
  text-transform: uppercase;
  letter-spacing: 3px;
  position: absolute;
  top: 0;
  left: 0;
  color: #0a0a0a;
  line-height: 1.3;
}
@keyframes wobble {
  0%,100% { transform: rotate3d(1,1,0,40deg); }
  25%     { transform: rotate3d(-1,1,0,40deg); }
  50%     { transform: rotate3d(-1,-1,0,40deg); }
  75%     { transform: rotate3d(1,-1,0,40deg); }
}
@keyframes glow {
  0%,100% { text-shadow: 0 0 30px red; }
  25%     { text-shadow: 0 0 30px orange; }
  50%     { text-shadow: 0 0 30px forestgreen; }
  75%     { text-shadow: 0 0 30px cyan; }
}
.glow-layer:nth-child(2)  { transform: translateZ(5px); }
.glow-layer:nth-child(3)  { transform: translateZ(10px); }
.glow-layer:nth-child(4)  { transform: translateZ(15px); }
.glow-layer:nth-child(5)  { transform: translateZ(20px); }
.glow-layer:nth-child(6)  { transform: translateZ(25px); }
.glow-layer:nth-child(7)  { transform: translateZ(30px); }
.glow-layer:nth-child(8)  { transform: translateZ(35px); }
.glow-layer:nth-child(9)  { transform: translateZ(40px); }
.glow-layer:nth-child(10) { transform: translateZ(45px); }
.hero-sub {
  font-size: 17px;
  color: var(--text-muted);
  margin-bottom: 44px;
  line-height: 1.7;
}

/* Stats row */
.hero-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat-num {
  font-size: 30px;
  font-weight: 900;
  color: var(--gold);
}
.members-counter {
  display: inline-block;
  transition: transform 0.15s;
}
@keyframes statPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.3); }
  70%  { transform: scale(0.92); }
  100% { transform: scale(1); }
}
.stat-pop {
  animation: statPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
}
.stat-divider {
  width: 1px;
  height: 44px;
  background: rgba(255, 215, 0, 0.25);
}

/* Floating cards removed */

@media (max-width: 600px) {
  .hero-stats { gap: 14px; }
}

/* ── Calligraphic slogan ── */
.hero-slogan {
  font-family: 'Dancing Script', 'Great Vibes', cursive;
  font-size: clamp(22px, 4.5vw, 32px);
  font-weight: 700;
  color: var(--gold);
  text-shadow: 0 0 18px rgba(255, 215, 0, 0.45);
  margin-bottom: 32px;
  letter-spacing: 1px;
  line-height: 1.3;
}</style>
