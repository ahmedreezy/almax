<template>
  <div class="user-profile-wrap" ref="wrap">

    <!-- Not logged in: show Login / Register button -->
    <button v-if="!user" class="up-login-btn" @click="openAuth">
      Login / Register
    </button>

    <!-- Logged in: avatar + dropdown -->
    <div v-else class="up-avatar-wrap">
      <button class="up-avatar-btn" @click="toggleDropdown" :aria-expanded="showDropdown">
        <span class="up-avatar-char">{{ user.username.charAt(0).toUpperCase() }}</span>
      </button>

      <transition name="up-drop">
        <div v-if="showDropdown" class="up-dropdown">
          <div class="up-dd-header">
            <div class="up-dd-avatar">{{ user.username.charAt(0).toUpperCase() }}</div>
            <div class="up-dd-info">
              <div class="up-dd-name">{{ user.username }}</div>
              <div class="up-dd-phone">{{ user.phone }}</div>
            </div>
          </div>
          <div class="up-dd-divider"></div>
          <div class="up-dd-status">
            <span v-if="loadingStatus" class="up-status-loading">Checking…</span>
            <span v-else-if="activeSub" class="up-status-active">✅ {{ subLabel }}</span>
            <span v-else class="up-status-none">No active subscription</span>
          </div>
          <div class="up-dd-divider"></div>
          <button v-if="activeSub" class="up-view-subs-btn" @click="viewSubscriptions">📋 View My Subscriptions</button>
          <button class="up-logout-btn" @click="logout">Log out</button>
        </div>
      </transition>
    </div>

    <!-- Auth Modal — teleported to body to escape nav's backdrop-filter stacking context -->
    <Teleport to="body">
      <transition name="up-modal">
        <div v-if="showAuthModal" class="up-overlay" @click.self="closeAuth" role="dialog" aria-modal="true" aria-label="Account">
          <div class="up-modal">
            <button class="up-close" @click="closeAuth" aria-label="Close">✕</button>
            <div class="up-modal-header">
              <div class="up-modal-icon">👤</div>
              <h2 class="up-modal-title">YOUR <span class="gold-text">ACCOUNT</span></h2>
            </div>

            <div class="up-tabs">
              <button :class="['up-tab', { active: authTab === 'register' }]" @click="authTab = 'register'; authError = ''">New User</button>
              <button :class="['up-tab', { active: authTab === 'login' }]" @click="authTab = 'login'; authError = ''">Login</button>
            </div>

            <!-- Register form -->
            <form v-if="authTab === 'register'" @submit.prevent="doRegister" class="up-form">
              <div class="up-field">
                <label>Full Name</label>
                <input v-model="regForm.username" type="text" placeholder="Your full name" required autocomplete="name" />
              </div>
              <div class="up-field">
                <label>Phone Number</label>
                <input v-model="regForm.phone" type="tel" placeholder="07XXXXXXXX" required maxlength="10" pattern="[0-9]{10}" autocomplete="tel" />
              </div>
              <div class="up-field">
                <label>Password</label>
                <div class="pw-wrap">
                  <input v-model="regForm.password" :type="showRegPw ? 'text' : 'password'" placeholder="Min. 6 characters" required minlength="6" autocomplete="new-password" />
                  <button type="button" class="pw-eye" @click="showRegPw = !showRegPw" :aria-label="showRegPw ? 'Hide password' : 'Show password'">{{ showRegPw ? '🙈' : '👁' }}</button>
                </div>
              </div>
              <div class="up-field">
                <label>Confirm Password</label>
                <div class="pw-wrap">
                  <input v-model="regForm.confirmPassword" :type="showConfirmPw ? 'text' : 'password'" placeholder="Repeat password" required autocomplete="new-password" />
                  <button type="button" class="pw-eye" @click="showConfirmPw = !showConfirmPw" :aria-label="showConfirmPw ? 'Hide password' : 'Show password'">{{ showConfirmPw ? '🙈' : '👁' }}</button>
                </div>
              </div>
              <div class="up-field">
                <label>Security Answer</label>
                <span class="security-question">{{ magicQuestion || 'Account recovery answer' }}</span>
                <input v-model="regForm.securityAnswer" type="text" placeholder="Your answer" required minlength="2" autocomplete="off" />
              </div>
              <p v-if="authError" class="up-error" role="alert">{{ authError }}</p>
              <button type="submit" class="up-submit-btn" :disabled="authLoading">
                {{ authLoading ? 'Creating account…' : 'Create Account →' }}
              </button>
            </form>

            <!-- Login form -->
            <form v-else @submit.prevent="doLogin" class="up-form">
              <div class="up-field">
                <label>Phone Number</label>
                <input v-model="loginForm.phone" type="tel" placeholder="07XXXXXXXX" required maxlength="10" pattern="[0-9]{10}" autocomplete="tel" />
              </div>
              <div class="up-field">
                <label>Password</label>
                <div class="pw-wrap">
                  <input v-model="loginForm.password" :type="showLoginPw ? 'text' : 'password'" placeholder="Your password" required autocomplete="current-password" />
                  <button type="button" class="pw-eye" @click="showLoginPw = !showLoginPw" :aria-label="showLoginPw ? 'Hide password' : 'Show password'">{{ showLoginPw ? '🙈' : '👁' }}</button>
                </div>
              </div>
              <p v-if="authError" class="up-error" role="alert">{{ authError }}</p>
              <button type="submit" class="up-submit-btn" :disabled="authLoading">
                {{ authLoading ? 'Logging in…' : 'Login →' }}
              </button>
            </form>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script>
import axios from 'axios'
import { saveUser, getUser, clearUser } from '../utils/userAuth.js'

export default {
  name: 'UserProfile',
  emits: ['logged-in', 'logged-out'],
  data() {
    return {
      user: null,
      showDropdown: false,
      showAuthModal: false,
      authTab: 'register',
      regForm: { username: '', phone: '', password: '', confirmPassword: '', securityAnswer: '' },
      loginForm: { phone: '', password: '' },
      magicQuestion: '',
      authError: '',
      authLoading: false,
      activeSub: null,
      loadingStatus: false,
      showRegPw: false,
      showConfirmPw: false,
      showLoginPw: false,
    }
  },
  computed: {
    subLabel() {
      if (!this.activeSub) return ''
      const planLabels = {
        daily: 'Daily', weekly: 'Weekly',
        daily_2: 'Daily Odd 2', daily_5: 'Daily Odd 5',
        weekly_1_5: 'Weekly 1.5', weekly_2: 'Weekly Odd 2', weekly_5: 'Weekly Odd 5',
      }
      const label = planLabels[this.activeSub.planType] || this.activeSub.planType
      const exp = this.activeSub.expiresAt ? new Date(this.activeSub.expiresAt).toLocaleDateString() : ''
      return `${label}${exp ? ' · expires ' + exp : ''}`
    }
  },
  mounted() {
    this.user = getUser()
    if (this.user) this.fetchStatus()
    window.addEventListener('user-auth-changed', this.handleAuthChanged)
    window.addEventListener('open-user-auth', this.openAuth)
    window.addEventListener('user-subscription-updated', this.handleSubscriptionUpdated)
    document.addEventListener('click', this.handleOutsideClick)
    document.addEventListener('keydown', this.handleKeyDown)
  },
  beforeUnmount() {
    window.removeEventListener('user-auth-changed', this.handleAuthChanged)
    window.removeEventListener('open-user-auth', this.openAuth)
    window.removeEventListener('user-subscription-updated', this.handleSubscriptionUpdated)
    document.removeEventListener('click', this.handleOutsideClick)
    document.removeEventListener('keydown', this.handleKeyDown)
    document.body.style.overflow = ''
  },
  methods: {
    getApiErrorMessage(err, fallback) {
      const responseData = err?.response?.data
      if (!responseData) return fallback

      if (typeof responseData.error === 'string' && responseData.error !== 'Validation failed') {
        return responseData.error
      }

      const fieldErrors = responseData.errors
      if (fieldErrors && typeof fieldErrors === 'object') {
        for (const key of Object.keys(fieldErrors)) {
          const msgs = fieldErrors[key]
          if (Array.isArray(msgs) && msgs.length > 0 && typeof msgs[0] === 'string') {
            return msgs[0]
          }
        }
      }

      if (typeof responseData.message === 'string' && responseData.message.trim()) {
        return responseData.message
      }

      if (typeof responseData.error === 'string' && responseData.error.trim()) {
        return responseData.error
      }

      return fallback
    },
    handleOutsideClick(e) {
      if (this.showDropdown && this.$refs.wrap && !this.$refs.wrap.contains(e.target)) {
        this.showDropdown = false
      }
    },
    handleKeyDown(e) {
      if (e.key === 'Escape' && this.showAuthModal) this.closeAuth()
    },
    handleAuthChanged(event) {
      const user = event.detail?.user || getUser()
      this.user = user
      this.activeSub = null
      this.showDropdown = false
      if (user) this.fetchStatus()
    },
    handleSubscriptionUpdated() {
      this.user = getUser()
      if (this.user) this.fetchStatus()
    },
    toggleDropdown() {
      this.showDropdown = !this.showDropdown
      if (this.showDropdown && !this.activeSub) this.fetchStatus()
    },
    openAuth() {
      this.authError = ''
      this.showAuthModal = true
      document.body.style.overflow = 'hidden'
      this.loadMagicQuestion()
    },
    closeAuth() {
      this.showAuthModal = false
      this.authError = ''
      document.body.style.overflow = ''
      // Reset forms
      this.regForm = { username: '', phone: '', password: '', confirmPassword: '', securityAnswer: '' }
      this.loginForm = { phone: '', password: '' }
      this.showRegPw = false
      this.showConfirmPw = false
      this.showLoginPw = false
    },
    async loadMagicQuestion() {
      if (this.magicQuestion) return
      try {
        const { data } = await axios.get('/api/users/magic-question')
        this.magicQuestion = data.question || ''
      } catch {
        this.magicQuestion = ''
      }
    },
    async doRegister() {
      if (this.regForm.password !== this.regForm.confirmPassword) {
        this.authError = 'Passwords do not match'
        return
      }
      this.authLoading = true
      this.authError = ''
      try {
        const { data } = await axios.post('/api/users', {
          username: this.regForm.username,
          phone: this.regForm.phone,
          password: this.regForm.password,
          securityAnswer: this.regForm.securityAnswer
        })
        const { token, ...userInfo } = data
        saveUser(userInfo, token)
        this.user = userInfo
        this.closeAuth()
        this.fetchStatus()
        this.$emit('logged-in', userInfo)
      } catch (err) {
        this.authError = this.getApiErrorMessage(err, 'Registration failed. Try again.')
      } finally {
        this.authLoading = false
      }
    },
    async doLogin() {
      this.authLoading = true
      this.authError = ''
      try {
        const { data } = await axios.post('/api/users/login', {
          phone: this.loginForm.phone,
          password: this.loginForm.password
        })
        const { token, ...userInfo } = data
        saveUser(userInfo, token)
        this.user = userInfo
        this.closeAuth()
        this.fetchStatus()
        this.$emit('logged-in', userInfo)
      } catch (err) {
        this.authError = this.getApiErrorMessage(err, 'Login failed. Check your phone and password.')
      } finally {
        this.authLoading = false
      }
    },
    async fetchStatus() {
      if (!this.user) return
      this.loadingStatus = true
      try {
        const { data } = await axios.get('/api/subscriptions/user/' + this.user.id)
        this.activeSub = Array.isArray(data) ? (data.find(s => s.status === 'active') || null) : null
      } catch {
        this.activeSub = null
      } finally {
        this.loadingStatus = false
      }
    },
    logout() {
      clearUser()
      this.user = null
      this.activeSub = null
      this.showDropdown = false
      this.$emit('logged-out')
    },
    viewSubscriptions() {
      this.showDropdown = false
      document.dispatchEvent(new CustomEvent('open-vip-status'))
    }
  }
}
</script>

<style scoped>
.user-profile-wrap { position: relative; display: flex; align-items: center; }

/* Login button */
.up-login-btn {
  background: linear-gradient(135deg, var(--gold-dark, #b8860b), var(--gold, #ffd700));
  color: #0a0a0a; border: none; border-radius: 20px;
  padding: 7px 16px; font-size: 12px; font-weight: 800;
  cursor: pointer; white-space: nowrap;
  transition: opacity 0.2s, transform 0.15s;
}
.up-login-btn:hover { opacity: 0.88; transform: scale(1.03); }

/* Avatar button */
.up-avatar-wrap { position: relative; }
.up-avatar-btn {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, var(--gold-dark, #b8860b), var(--gold, #ffd700));
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.up-avatar-char { font-weight: 900; font-size: 14px; color: #0a0a0a; }

/* Dropdown */
.up-dropdown {
  position: absolute; top: 44px; right: 0;
  background: var(--dark-2, #151515); border: 1px solid rgba(255,215,0,0.18);
  border-radius: 14px; padding: 14px; min-width: 220px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6); z-index: 1000;
}
.up-dd-header { display: flex; align-items: center; gap: 10px; }
.up-dd-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--gold-dark, #b8860b), var(--gold, #ffd700)); color: #0a0a0a; font-weight: 900; font-size: 15px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.up-dd-name { font-weight: 700; font-size: 14px; color: var(--white, #fff); }
.up-dd-phone { font-size: 12px; color: var(--text-muted, #aaa); }
.up-dd-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 10px 0; }
.up-dd-status { font-size: 13px; text-align: center; padding: 4px 0; }
.up-status-active { color: #4caf50; font-weight: 700; }
.up-status-none { color: var(--text-muted, #aaa); }
.up-status-loading { color: var(--text-muted, #aaa); font-style: italic; }
.up-logout-btn { width: 100%; background: rgba(255,80,80,0.12); border: 1px solid rgba(255,80,80,0.25); border-radius: 8px; color: #ff6b6b; font-size: 13px; font-weight: 700; padding: 8px; cursor: pointer; transition: background 0.2s; }
.up-logout-btn:hover { background: rgba(255,80,80,0.22); }
.up-view-subs-btn { width: 100%; background: rgba(255,215,0,0.08); border: 1px solid rgba(255,215,0,0.2); border-radius: 8px; color: #FFD700; font-size: 13px; font-weight: 700; padding: 8px 10px; cursor: pointer; text-align: left; transition: background 0.18s; margin-bottom: 8px; }
.up-view-subs-btn:hover { background: rgba(255,215,0,0.16); }

/* Modal overlay */
.up-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.72);
  backdrop-filter: blur(6px); display: flex; align-items: center;
  justify-content: center; z-index: 9000; padding: 16px;
}
.up-modal {
  background: var(--dark-2, #151515); border: 1px solid rgba(255,215,0,0.18);
  border-radius: 20px; padding: 28px 24px; width: 100%; max-width: 380px;
  position: relative; max-height: 90vh; overflow-y: auto;
}
.up-close { position: absolute; top: 14px; right: 16px; background: none; border: none; color: var(--text-muted, #aaa); font-size: 18px; cursor: pointer; }
.up-close:hover { color: var(--white, #fff); }
.up-modal-header { text-align: center; margin-bottom: 20px; }
.up-modal-icon { font-size: 36px; margin-bottom: 8px; }
.up-modal-title { font-size: 20px; font-weight: 900; color: var(--white, #fff); text-transform: uppercase; letter-spacing: 1px; }
.gold-text { color: var(--gold, #ffd700); }

/* Tabs */
.up-tabs { display: flex; background: rgba(255,255,255,0.05); border-radius: 10px; padding: 3px; gap: 3px; margin-bottom: 20px; }
.up-tab { flex: 1; padding: 8px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; background: none; color: var(--text-muted, #aaa); transition: all 0.2s; }
.up-tab.active { background: linear-gradient(135deg, var(--gold-dark, #b8860b), var(--gold, #ffd700)); color: #0a0a0a; }

/* Form */
.up-form { display: flex; flex-direction: column; gap: 14px; }
.up-field { display: flex; flex-direction: column; gap: 6px; }
.up-field label { font-size: 12px; font-weight: 700; color: var(--text-muted, #aaa); text-transform: uppercase; letter-spacing: 0.5px; }
.security-question { font-size: 12px; color: rgba(255,255,255,0.62); line-height: 1.35; }
.up-field input {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px; padding: 12px 14px; color: var(--white, #fff);
  font-size: 14px; outline: none; transition: border-color 0.2s; width: 100%;
}
.up-field input:focus { border-color: rgba(255,215,0,0.45); }
.pw-wrap { position: relative; display: flex; }
.pw-wrap input { flex: 1; padding-right: 44px !important; }
.pw-eye { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; color: var(--text-muted, #aaa); padding: 4px; line-height: 1; }
.pw-eye:hover { color: var(--gold, #ffd700); }
.up-error { color: #ff6b6b; font-size: 13px; margin: 0; text-align: center; }
.up-submit-btn {
  background: linear-gradient(135deg, var(--gold-dark, #b8860b), var(--gold, #ffd700));
  color: #0a0a0a; border: none; border-radius: 12px; padding: 13px;
  font-size: 15px; font-weight: 800; cursor: pointer; transition: opacity 0.2s;
}
.up-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.up-submit-btn:not(:disabled):hover { opacity: 0.88; }

/* Transitions */
.up-drop-enter-active, .up-drop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.up-drop-enter-from, .up-drop-leave-to { opacity: 0; transform: translateY(-8px); }
.up-modal-enter-active, .up-modal-leave-active { transition: opacity 0.2s; }
.up-modal-enter-from, .up-modal-leave-to { opacity: 0; }
</style>
