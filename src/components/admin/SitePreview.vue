<template>
  <div class="site-preview">
    <!-- Device Toggle Buttons -->
    <div class="device-bar">
      <button
        v-for="d in devices"
        :key="d.id"
        :class="['device-btn', { active: activeDevice === d.id }]"
        @click="activeDevice = d.id"
        :title="d.label"
      >
        <span class="device-icon">{{ d.icon }}</span>
        <span class="device-label">{{ d.label }}</span>
        <span class="device-size">{{ d.size }}</span>
      </button>

      <div class="bar-spacer"></div>

      <a
        :href="siteUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="open-link"
        title="Open site in new tab"
      >
        ↗ Open in Tab
      </a>
    </div>

    <!-- Frame wrapper -->
    <div class="frame-wrap" :class="activeDevice">
      <div class="device-frame" :style="frameStyle">
        <!-- Mobile notch decoration -->
        <div v-if="activeDevice === 'mobile'" class="mobile-notch"></div>

        <iframe
          :src="siteUrl"
          class="preview-iframe"
          :style="iframeStyle"
          title="Site Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        ></iframe>
      </div>
    </div>

    <p class="preview-note">
      ⚠ Some interactions (payments, live data) may behave differently in preview mode.
    </p>
  </div>
</template>

<script>
export default {
  name: 'SitePreview',
  data() {
    return {
      activeDevice: 'desktop',
      devices: [
        { id: 'mobile',  icon: '📱', label: 'Mobile',  size: '390px' },
        { id: 'tablet',  icon: '📟', label: 'Tablet',  size: '768px' },
        { id: 'desktop', icon: '🖥',  label: 'Desktop', size: 'Full'  }
      ]
    }
  },
  computed: {
    siteUrl() {
      // Use the current origin — works for both dev (localhost:8080) and prod
      return window.location.origin + window.location.pathname.replace(/\/admin.*$/, '') + '#/'
    },
    frameStyle() {
      const widths = { mobile: '390px', tablet: '768px', desktop: '100%' }
      return {
        width: widths[this.activeDevice] || '100%',
        maxWidth: '100%'
      }
    },
    iframeStyle() {
      // Scale the mobile/tablet frames so they fit within the panel without scrolling
      if (this.activeDevice === 'desktop') return { width: '100%', height: '100%' }
      const targetWidth = this.activeDevice === 'mobile' ? 390 : 768
      return { width: targetWidth + 'px', height: '100%' }
    }
  }
}
</script>

<style scoped>
.site-preview {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 130px);
  min-height: 500px;
}

/* ── Device Bar ── */
.device-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.device-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(143,179,217,0.15);
  background: transparent;
  color: var(--text-muted, #aaa);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.device-btn:hover {
  background: rgba(143,179,217,0.06);
  color: #fff;
}
.device-btn.active {
  background: rgba(143,179,217,0.14);
  color: #8FB3D9;
  border-color: rgba(143,179,217,0.45);
}
.device-icon { font-size: 16px; }
.device-size {
  font-size: 10px;
  color: inherit;
  opacity: 0.6;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  padding: 1px 5px;
}
.bar-spacer { flex: 1; }
.open-link {
  font-size: 13px;
  color: #8FB3D9;
  text-decoration: none;
  font-weight: 700;
  padding: 8px 14px;
  border: 1px solid rgba(143,179,217,0.2);
  border-radius: 10px;
  transition: background 0.2s;
}
.open-link:hover { background: rgba(143,179,217,0.08); }

/* ── Frame Wrapper ── */
.frame-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(143,179,217,0.1);
  background: #0d0d0d;
  padding: 10px;
}
.frame-wrap.mobile  { background: #1a1a1a; padding: 20px 10px; }
.frame-wrap.tablet  { background: #141414; padding: 14px; }
.frame-wrap.desktop { padding: 0; border-radius: 8px; }

.device-frame {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 40px rgba(0,0,0,0.6);
  transition: width 0.3s ease;
  height: 100%;
}
.frame-wrap.mobile .device-frame {
  border: 3px solid #333;
  border-radius: 28px;
}
.frame-wrap.tablet .device-frame {
  border: 2px solid #2a2a2a;
  border-radius: 16px;
}
.frame-wrap.desktop .device-frame {
  border-radius: 8px;
  border: none;
  width: 100% !important;
}

/* Mobile notch */
.mobile-notch {
  height: 22px;
  background: #222;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}
.mobile-notch::before {
  content: '';
  width: 60px;
  height: 10px;
  background: #111;
  border-radius: 10px;
}

/* ── Iframe ── */
.preview-iframe {
  flex: 1;
  border: none;
  display: block;
  background: #fff;
}

/* ── Note ── */
.preview-note {
  margin-top: 10px;
  font-size: 11px;
  color: #555;
  text-align: center;
}

@media (max-width: 768px) {
  .device-label { display: none; }
  .device-btn { padding: 8px 12px; }
}
</style>
