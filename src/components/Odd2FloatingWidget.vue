<template>
  <div
    class="odd2-float"
    role="button"
    tabindex="0"
    aria-label="View today's free daily tip"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <div class="odd2-icon-wrap" aria-hidden="true">⚡</div>
    <div class="odd2-text">
      <span class="odd2-label">FREE DAILY TIP</span>
      <span class="odd2-value">VIEW</span>
    </div>
    <span class="odd2-arrow" aria-hidden="true">›</span>
    <div class="odd2-pulse" aria-hidden="true"></div>
  </div>
</template>

<script>
export default {
  name: 'Odd2FloatingWidget',
  emits: ['open'],
  methods: {}
}
</script>

<style scoped>
.odd2-float {
  position: fixed;
  top: 54px;
  left: 22px;
  z-index: 900;
  background: var(--widget-bg);
  border: 1px solid var(--gold-dark);
  border-radius: 50px;
  padding: 9px 18px 9px 9px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(255, 215, 0, 0.22), 0 1px 6px rgba(0, 0, 0, 0.6);
  transition: transform 0.2s, box-shadow 0.2s;
  animation: slideInLeft 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  outline: none;
  user-select: none;
}
.odd2-float:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}
@keyframes slideInLeft {
  from { transform: translateX(-130%); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
.odd2-float:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.38), 0 2px 10px rgba(0, 0, 0, 0.6);
}
.odd2-float:active {
  transform: scale(0.97);
}

.odd2-icon-wrap {
  width: 34px;
  height: 34px;
  background: var(--gold);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
}

.odd2-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1;
}
.odd2-label {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.odd2-value {
  font-size: 18px;
  font-weight: 900;
  color: var(--gold);
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.35);
}

.odd2-arrow {
  font-size: 22px;
  font-weight: 700;
  color: var(--gold-dark);
  line-height: 1;
  margin-left: 2px;
  transition: transform 0.2s;
}
.odd2-float:hover .odd2-arrow {
  transform: translateX(3px);
  color: var(--gold);
}

/* Subtle pulsing ring */
.odd2-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50px;
  border: 1px solid rgba(255, 215, 0, 0.35);
  animation: odd2Ring 2.8s ease-out infinite;
  pointer-events: none;
}
@keyframes odd2Ring {
  0%   { transform: scale(1);    opacity: 0.6; }
  70%  { transform: scale(1.12); opacity: 0; }
  100% { transform: scale(1.12); opacity: 0; }
}

/* Mobile: collapse to icon only when viewport is very narrow */
@media (max-width: 360px) {
  .odd2-text  { display: none; }
  .odd2-arrow { display: none; }
  .odd2-float { padding: 9px; }
}
</style>
