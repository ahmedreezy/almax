<template>
  <footer class="footer" id="footer">
    <!-- Social links -->
    <div class="social-section">
      <div class="container">
        <div class="footer-brand">
          <img class="footer-brand-logo" src="@/assets/almax-mark.png" alt="Almax Football Prediction logo" />
          <div class="footer-brand-copy">
            <strong>ALMAX</strong>
            <span>Football Predictions</span>
          </div>
        </div>
        <div class="social-divider"></div>
        <p class="social-label">Follow &amp; connect with us</p>
        <div class="social-links">
          <a
            v-for="s in socials"
            :key="s.name"
            :href="s.href"
            class="social-link"
            :title="s.name"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="social-icon" v-html="s.svg" aria-hidden="true"></span>
            <span>{{ s.name }}</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="footer-bottom">
      <div class="container">
        <p class="copyright">© 2026 Almax Football Predictions. All rights reserved.</p>
        <p class="disclaimer">
          Gambling can be addictive. Please play responsibly. Must be 18+.
        </p>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'FooterSection',
  data() {
    return {
      socials: [
        {
          name: 'Facebook',
          href: '#',
          svg: `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
        },
        {
          name: 'Instagram',
          href: '#',
          svg: `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`
        },
        {
          name: 'Twitter / X',
          href: '#',
          svg: `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`
        },
        {
          name: 'Telegram',
          href: '#',
          svg: `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`
        },
        {
          name: 'TikTok',
          href: '#',
          svg: `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`
        }
      ]
    }
  }
}
</script>

<style scoped>
.footer {
  background: var(--dark-2);
}
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Social links */
.social-section { padding: 0 0 40px; }
.footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 0 28px;
}
.footer-brand-logo {
  width: 52px;
  height: 52px;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.32));
}
.footer-brand-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1;
}
.footer-brand-copy strong {
  color: var(--cream);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 2px;
}
.footer-brand-copy span {
  color: var(--gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.8px;
  margin-top: 6px;
  text-transform: uppercase;
}
.social-divider {
  height: 1px;
  background: rgba(255, 215, 0, 0.08);
  margin-bottom: 32px;
}
.social-label {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 20px;
}
.social-links {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
.social-link {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--dark-card);
  border: 1px solid rgba(255, 215, 0, 0.12);
  color: var(--text-muted);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}
.social-link:hover {
  border-color: var(--gold);
  color: var(--cream);
  background: rgba(255, 215, 0, 0.07);
}
.social-icon {
  display: flex;
  align-items: center;
}

/* Bottom bar */
.footer-bottom {
  background: rgba(0, 0, 0, 0.3);
  padding: 20px 0;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.copyright {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.disclaimer {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
}
</style>
