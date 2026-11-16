<template>
  <main class="admin-login-page">
    <section class="login-story" aria-labelledby="admin-login-title">
      <a class="brand" href="/#/" aria-label="Almax home">
        <img src="@/assets/almax-mark.png" alt="" />
        <span><strong>ALMAX</strong><small>Owner control</small></span>
      </a>

      <div class="story-copy">
        <p class="eyebrow">Private administration</p>
        <h1 id="admin-login-title">A clear view of the whole operation.</h1>
        <p class="story-lede">Manage content, customers, payments, and daily performance from one focused control room.</p>

        <div class="story-metrics" aria-label="Control portal capabilities">
          <div><strong>Live</strong><span>revenue position</span></div>
          <div><strong>One</strong><span>operations view</span></div>
          <div><strong>24/7</strong><span>customer visibility</span></div>
        </div>
      </div>

      <div class="environment-note"><i aria-hidden="true"></i><span>Secure owner environment</span></div>
    </section>

    <section class="login-access" aria-label="Administrator sign in">
      <div class="access-card">
        <div class="access-heading">
          <span class="access-index">01 / ACCESS</span>
          <h2>Welcome back</h2>
          <p>Enter your administrator credentials to continue.</p>
        </div>

        <form class="admin-form" @submit.prevent="handleLogin">
          <div class="field">
            <label for="username">Username</label>
            <input id="username" v-model.trim="username" type="text" placeholder="Your administrator username" autocomplete="username" required autofocus />
          </div>

          <div class="field">
            <div class="field-label-row">
              <label for="password">Password</label>
              <span>Protected access</span>
            </div>
            <div class="pw-wrap">
              <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Your password" autocomplete="current-password" required />
              <button type="button" class="pw-eye" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <p v-if="error" class="error-msg" role="alert">{{ error }}</p>

          <button type="submit" class="admin-login-btn" :disabled="loading">
            <span>{{ loading ? 'Verifying access…' : 'Enter owner control' }}</span>
            <svg v-if="!loading" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
          </button>
        </form>

        <div v-if="previewAvailable" class="preview-block">
          <span>Local seeded environment</span>
          <button type="button" @click="openPreview">View seeded owner dashboard</button>
          <p>Includes sample revenue, payments, customers, wallet activity, and pagination.</p>
        </div>

        <p class="security-note">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
          Access is restricted and activity is recorded.
        </p>
        <a href="/#/" class="back-link">Return to the public site</a>
      </div>
    </section>
  </main>
</template>

<script>
import axios from 'axios'
import { enableAdminPreview, isAdminPreviewAvailable } from '../../utils/adminPreviewMode'

export default {
  name: 'AdminLogin',
  data() {
    return {
      username: '',
      password: '',
      showPassword: false,
      loading: false,
      error: ''
    }
  },
  computed: { previewAvailable() { return isAdminPreviewAvailable() } },
  methods: {
    openPreview() {
      localStorage.removeItem('adminToken')
      enableAdminPreview()
      this.$router.replace('/admin/dashboard')
    },
    async handleLogin() {
      this.error = ''
      this.loading = true
      try {
        const { data } = await axios.post('/api/auth/login', {
          username: this.username,
          password: this.password
        })
        if ((data.admin?.role ?? 'owner') === 'developer') {
          this.error = 'This portal is for the owner account. Developer login is at /dev/login.'
          return
        }
        localStorage.setItem('adminToken', data.token)
        localStorage.removeItem('almaxAdminPreview')
        this.$router.push('/admin/dashboard')
      } catch (err) {
        const payload = err.response?.data || {}
        this.error = payload.errors?.username?.[0] || payload.error || 'Invalid username or password.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
@font-face {
  font-family: 'Outfit Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('~@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2') format('woff2-variations');
}
* { box-sizing: border-box; }
.admin-login-page { min-height:100dvh; display:grid; grid-template-columns:minmax(0,1.08fr) minmax(420px,.92fr); background:#0b0f14; color:#f2f5f7; font-family:'Outfit Variable','Avenir Next',system-ui,sans-serif; }
.login-story { min-height:100dvh; display:flex; flex-direction:column; justify-content:space-between; padding:clamp(32px,5vw,72px); overflow:hidden; position:relative; background:#0e141d; }
.login-story::before { content:''; position:absolute; width:min(48vw,680px); aspect-ratio:1; right:-24%; bottom:-24%; border:1px solid rgba(143,179,217,.13); border-radius:50%; box-shadow:0 0 0 90px rgba(143,179,217,.025),0 0 0 180px rgba(143,179,217,.018); pointer-events:none; }
.brand { width:fit-content; display:inline-flex; align-items:center; gap:13px; color:inherit; text-decoration:none; position:relative; z-index:1; }
.brand img { width:42px; height:42px; object-fit:contain; }
.brand span { display:flex; flex-direction:column; }
.brand strong { font-size:15px; font-weight:750; letter-spacing:.18em; }
.brand small { margin-top:3px; color:#a3aebe; font-size:10px; letter-spacing:.08em; }
.story-copy { max-width:690px; position:relative; z-index:1; }
.eyebrow { margin:0 0 20px; color:#9fbee0; font-size:10px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; }
.story-copy h1 { max-width:10ch; margin:0; color:#f5f6f7; font-size:clamp(48px,5.6vw,82px); font-weight:520; letter-spacing:-.055em; line-height:.95; text-wrap:balance; }
.story-lede { max-width:56ch; margin:28px 0 0; color:#a4afbf; font-size:clamp(15px,1.25vw,18px); line-height:1.65; }
.story-metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; max-width:600px; margin-top:54px; }
.story-metrics div { display:flex; flex-direction:column; min-width:0; padding:16px 18px; border:1px solid #27313d; border-radius:9px; background:#111923; }
.story-metrics strong { color:#edf2f6; font-size:20px; font-weight:600; letter-spacing:-.02em; }
.story-metrics span { margin-top:4px; color:#8996a8; font-size:10px; }
.environment-note { display:flex; align-items:center; gap:9px; color:#8995a6; font-size:10px; letter-spacing:.06em; position:relative; z-index:1; }
.environment-note i { width:7px; height:7px; border-radius:50%; background:#71b28f; box-shadow:0 0 0 5px rgba(96,162,127,.09); }
.login-access { min-height:100dvh; display:grid; place-items:center; padding:clamp(28px,6vw,82px); background:#0b0f14; }
.access-card { width:min(100%,430px); }
.access-index { color:#9fbee0; font-size:9px; font-weight:750; letter-spacing:.18em; }
.access-heading h2 { margin:18px 0 7px; color:#f2f5f7; font-size:34px; font-weight:560; letter-spacing:-.035em; }
.access-heading p { margin:0; color:#929fb0; font-size:13px; }
.admin-form { margin-top:38px; }
.field { margin-bottom:20px; }
.field label { display:block; color:#c0c8d2; font-size:11px; font-weight:600; }
.field-label-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.field-label-row span { color:#788595; font-size:9px; }
.field > label { margin-bottom:8px; }
.field input { width:100%; height:52px; padding:0 15px; border:1px solid #303b49; border-radius:8px; outline:0; background:#121923; color:#eef1f4; font:inherit; font-size:13px; transition:border-color .2s ease,background .2s ease,box-shadow .2s ease; }
.field input::placeholder { color:#718092; }
.field input:-webkit-autofill,
.field input:-webkit-autofill:hover,
.field input:-webkit-autofill:focus { -webkit-text-fill-color:#eef1f4; caret-color:#eef1f4; box-shadow:0 0 0 1000px #121923 inset; transition:background-color 9999s ease-out; }
.field input:hover { background:#151e29; }
.field input:focus { border-color:#8fb3d9; box-shadow:0 0 0 3px rgba(143,179,217,.1); }
.pw-wrap { position:relative; }
.pw-wrap input { padding-right:65px; }
.pw-eye { position:absolute; right:9px; top:50%; min-width:46px; height:34px; transform:translateY(-50%); border:0; border-radius:6px; background:transparent; color:#9aa7b8; font:inherit; font-size:10px; cursor:pointer; }
.pw-eye:hover { background:rgba(255,255,255,.04); color:#d1e0ed; }
.error-msg { margin:0 0 16px; padding:11px 13px; border:1px solid rgba(218,130,139,.28); border-radius:8px; background:rgba(189,116,116,.1); color:#f0a9af; font-size:11px; line-height:1.45; }
.admin-login-btn { width:100%; min-height:52px; display:flex; align-items:center; justify-content:space-between; padding:0 17px; border:0; border-radius:8px; background:#8fb3d9; color:#09111a; font:inherit; font-size:12px; font-weight:700; cursor:pointer; transition:background .2s ease,transform .15s ease,box-shadow .2s ease; }
.admin-login-btn svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.8; }
.admin-login-btn:hover:not(:disabled) { background:#abc7e2; transform:translateY(-1px); box-shadow:0 14px 30px rgba(83,130,176,.18); }
.admin-login-btn:active:not(:disabled) { transform:translateY(0) scale(.99); }
.admin-login-btn:disabled { opacity:.55; cursor:wait; }
.preview-block { margin-top:26px; padding:18px; border:1px solid #27313d; border-radius:10px; background:#111821; }
.preview-block span { display:block; color:#8996a8; font-size:9px; font-weight:700; letter-spacing:.13em; text-transform:uppercase; }
.preview-block button { margin:8px 0 0; padding:0; border:0; background:none; color:#afd0ed; font:inherit; font-size:12px; font-weight:600; cursor:pointer; }
.preview-block button:hover { color:#d3e5f4; text-decoration:underline; text-underline-offset:4px; }
.preview-block p { margin:6px 0 0; color:#7f8c9e; font-size:10px; line-height:1.45; }
.security-note { display:flex; align-items:center; justify-content:center; gap:8px; margin:26px 0 0; color:#7d8999; font-size:9px; }
.security-note svg { width:13px; height:13px; fill:none; stroke:currentColor; stroke-width:1.6; }
.back-link { display:block; width:fit-content; margin:15px auto 0; color:#93a0b1; font-size:10px; text-decoration:none; }
.back-link:hover { color:#c9d9e7; }
button:focus-visible,a:focus-visible { outline:2px solid #8fb3d9; outline-offset:3px; }
@media(max-width:900px){.admin-login-page{grid-template-columns:1fr}.login-story{min-height:auto;padding:28px 24px 32px}.story-copy{margin-top:58px}.story-copy h1{max-width:11ch;font-size:clamp(42px,12vw,66px)}.story-metrics{margin-top:36px}.environment-note{display:none}.login-access{min-height:auto;padding:48px 24px 64px}}
@media(max-width:520px){.story-metrics{grid-template-columns:1fr 1fr}.story-metrics div:last-child{display:none}.login-access{place-items:start stretch}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style>
