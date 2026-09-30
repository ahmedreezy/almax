<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <img class="logo-icon" src="@/assets/almax-mark.png" alt="Almax logo" />
        <span class="logo-text">ALMAX<span>ADMIN</span></span>
      </div>
      <h2 class="login-title">Control Portal</h2>
      <p class="login-sub">Secure access for operations and content management</p>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="field">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Enter username"
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
              placeholder="Enter password"
              autocomplete="current-password"
              required
            />
            <button type="button" class="pw-eye" @click="showPassword = !showPassword" tabindex="-1">
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="loading">Signing in…</span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <a href="/" class="back-link">Back to site</a>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

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
  methods: {
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
.login-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 22% 18%, rgba(255,215,0,0.12), transparent 28%),
    radial-gradient(circle at 80% 78%, rgba(255,255,255,0.06), transparent 32%),
    linear-gradient(135deg, #070707 0%, #111 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  position: relative;
  overflow: hidden;
}
.login-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.25;
}

.login-card {
  position: relative;
  z-index: 1;
  background: rgba(18,18,18,0.88);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 48px 40px;
  width: 100%;
  max-width: 440px;
  text-align: center;
  box-shadow: 0 28px 80px rgba(0,0,0,0.45);
  backdrop-filter: blur(14px);
}

.login-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 28px;
}
.logo-icon {
  width: 44px;
  height: 44px;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 10px 18px rgba(0,0,0,0.28));
}
.logo-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-size: 22px;
  font-weight: 900;
  color: var(--white);
  letter-spacing: 2px;
  line-height: 1;
}
.logo-text span { color: #FFD700; font-size: 10px; letter-spacing: 3px; margin-top: 7px; }
.gold { color: #FFD700; }

.login-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--white);
  margin-bottom: 6px;
}
.login-sub {
  font-size: 14px;
  color: rgba(255,255,255,0.52);
  margin-bottom: 32px;
}

.login-form { text-align: left; }

.field {
  margin-bottom: 18px;
}
.field label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  margin-bottom: 8px;
}
.field input {
  width: 100%;
  background: rgba(255,255,255,0.045);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 13px 16px;
  color: var(--white);
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}
.field input:focus {
  border-color: rgba(255, 215, 0, 0.5);
}
.field input::placeholder { color: var(--text-muted); opacity: 0.6; }

.pw-wrap { position: relative; display: flex; align-items: center; }
.pw-wrap input { flex: 1; padding-right: 62px; }
.pw-eye {
  position: absolute; right: 10px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;
  border-radius: 7px;
  font-size: 11px; color: rgba(255,255,255,0.58);
  padding: 5px 8px; line-height: 1;
  font-weight: 800;
}
.pw-eye:hover { color: var(--gold, #FFD700); }

.error-msg {
  color: #ff5252;
  font-size: 13px;
  margin-bottom: 16px;
  text-align: center;
  background: rgba(255,82,82,0.1);
  border-radius: 8px;
  padding: 10px 12px;
}

.login-btn {
  width: 100%;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  border: none;
  border-radius: 10px;
  padding: 14px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  margin-top: 8px;
  letter-spacing: 0.5px;
}
.login-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.back-link {
  display: inline-block;
  margin-top: 24px;
  font-size: 13px;
  color: rgba(255,255,255,0.46);
  text-decoration: none;
  transition: color 0.2s;
}
.back-link:hover { color: #FFD700; }
</style>
