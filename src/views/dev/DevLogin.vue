<template>
  <div class="dev-login-page">
    <div class="dev-login-card">
      <div class="dev-logo">
        <img class="dev-mark" src="@/assets/almax-mark.png" alt="Almax logo" />
        <div class="dev-wordmark">
          <span class="dev-name">ALMAX</span>
          <span class="dev-sub">DEVELOPER ACCESS</span>
        </div>
      </div>

      <div class="dev-badge-row">
        <span class="dev-badge">PRIVATE</span>
        <span class="dev-badge-text">Analytics &amp; Commission Portal</span>
      </div>

      <form @submit.prevent="handleLogin" class="dev-form">
        <div class="field">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Developer username"
            autocomplete="username"
            required
          />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="pw-wrap">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Developer password"
              autocomplete="current-password"
              required
            />
            <button type="button" class="pw-eye" @click="showPassword = !showPassword" tabindex="-1">
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" class="dev-login-btn" :disabled="loading">
          <span v-if="loading">Authenticating…</span>
          <span v-else>Access Analytics</span>
        </button>
      </form>

      <p class="notice">This portal is restricted to the platform developer. All access is logged.</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { getApiBaseUrl } from '../../utils/apiBase'

export default {
  name: 'DevLogin',
  data() {
    return {
      username: '',
      password: '',
      showPassword: false,
      loading: false,
      error: ''
    }
  },
  methods: {
    async handleLogin() {
      this.error = ''
      this.loading = true
      try {
        const base = getApiBaseUrl()
        const { data } = await axios.post(`${base}/api/auth/login`, {
          username: this.username,
          password: this.password
        })
        if ((data.admin?.role ?? 'owner') !== 'developer') {
          this.error = 'This portal is for the developer account only. Owner login is at /admin/login.'
          return
        }
        localStorage.setItem('devToken', data.token)
        this.$router.push('/dev/dashboard')
      } catch (err) {
        const payload = err.response?.data || {}
        this.error = payload.errors?.username?.[0] || payload.error || 'Invalid credentials.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.dev-login-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 20%, rgba(245,158,11,0.08), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(59,130,246,0.06), transparent 40%),
    linear-gradient(135deg, #0a0e1a 0%, #0d1424 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.dev-login-card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 40px 36px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}

.dev-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.dev-mark {
  width: 44px;
  height: 44px;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.28));
  flex-shrink: 0;
}

.dev-wordmark {
  display: flex;
  flex-direction: column;
}

.dev-name {
  font-size: 18px;
  font-weight: 800;
  color: #f3f4f6;
  letter-spacing: 2px;
  line-height: 1;
}

.dev-sub {
  font-size: 9px;
  font-weight: 700;
  color: #f59e0b;
  letter-spacing: 2px;
  margin-top: 3px;
}

.dev-badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}

.dev-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 2px;
  padding: 3px 8px;
  border-radius: 4px;
}

.dev-badge-text {
  font-size: 12px;
  color: #6b7280;
}

.field {
  margin-bottom: 18px;
}

.field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.field input {
  width: 100%;
  background: #1a2035;
  border: 1px solid #253050;
  border-radius: 8px;
  padding: 11px 14px;
  color: #e5e7eb;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.field input:focus {
  border-color: #f59e0b;
}

.field input::placeholder {
  color: #374151;
}

.pw-wrap {
  position: relative;
}

.pw-wrap input {
  padding-right: 56px;
}

.pw-eye {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  font-size: 11px;
  cursor: pointer;
  padding: 4px;
}

.pw-eye:hover {
  color: #f59e0b;
}

.error-msg {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.dev-login-btn {
  width: 100%;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #0a0e1a;
  border: none;
  border-radius: 8px;
  padding: 13px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: opacity 0.2s, transform 0.1s;
  margin-top: 4px;
}

.dev-login-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.dev-login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notice {
  text-align: center;
  font-size: 11px;
  color: #374151;
  margin-top: 24px;
  line-height: 1.5;
}
</style>
