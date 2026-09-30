<template>
  <div class="vpe">

    <div class="section-lead">
      Fixed VIP packages stay separate from the daily Special Odds offer. Edit prices, deadlines, and betslips here without converting any package into a special ticket.
    </div>

    <!-- ── Packages Table ── -->
    <div v-if="loading" class="vpe-loading">Loading packages…</div>
    <div v-else-if="fetchError" class="vpe-error">{{ fetchError }}</div>
    <template v-else>
      <div class="vpe-table-wrap">
        <table class="vpe-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Type</th>
              <th>Base Price</th>
              <th>Active</th>
              <th>Deadline</th>
              <th>Betslip Link</th>
              <th>Betslip Code</th>
              <th>Photo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pkg in packages"
              :key="pkg.id"
              :class="{ 'row-inactive': !pkg.isActive }"
            >
              <!-- Name -->
              <td class="td-name">
                {{ pkg.name }}
                <span class="td-sub">{{ pkg.oddsType }}x odds · {{ pkg.planType }}</span>
              </td>

              <!-- Type badge -->
              <td>
                <span :class="['badge', 'badge-' + pkg.planType]">{{ pkg.planType }}</span>
              </td>

              <!-- Base price -->
              <td class="td-num">
                <input
                  v-model.number="pkg._price"
                  type="number"
                  class="field-sm"
                  min="0"
                  step="500"
                  @change="pkg._dirty = true"
                />
              </td>

              <!-- Active toggle -->
              <td class="td-center">
                <label class="toggle">
                  <input type="checkbox" v-model="pkg._isActive" @change="onActiveChange(pkg)" />
                  <span class="toggle-track"></span>
                </label>
              </td>

              <!-- Subscription deadline -->
              <td>
                <input
                  v-model="pkg._deadline"
                  type="datetime-local"
                  class="field-deadline"
                  @change="pkg._dirty = true"
                  title="Block new subscriptions after this date and time (leave blank for no deadline)"
                />
                <span v-if="pkg._deadline" class="field-hint">Closes {{ formatDeadline(pkg._deadline) }}</span>
              </td>

              <!-- Betslip link -->
              <td>
                <input
                  v-model="pkg._betslipLink"
                  type="url"
                  class="field-url"
                  placeholder="https://…"
                  @input="pkg._dirty = true"
                />
              </td>

              <!-- Betslip code -->
              <td>
                <input
                  v-model="pkg._betslipCode"
                  type="text"
                  class="field-code"
                  placeholder="e.g. ABC123"
                  @input="pkg._dirty = true"
                />
              </td>

              <!-- Package photo -->
              <td class="td-photo">
                <div class="photo-upload-wrap">
                  <img v-if="pkgPhotoSrc(pkg)" :src="pkgPhotoSrc(pkg)" class="pkg-photo-thumb" alt="package photo" style="cursor:zoom-in" @click="$lightbox.open(pkgPhotoSrc(pkg))" />
                  <label class="photo-upload-btn" :for="'pkg-photo-' + pkg.id">+ Upload</label>
                  <button v-if="pkgPhotoSrc(pkg)" type="button" class="photo-delete-btn" @click="deletePkgPhoto(pkg)">🗑 Delete</button>
                  <input :id="'pkg-photo-' + pkg.id" type="file" accept="image/jpeg,image/png,image/webp" class="photo-file-input" @change="onPkgPhotoChange(pkg, $event)" />
                </div>
              </td>

              <!-- Actions -->
              <td class="td-actions">
                <button
                  class="btn-save"
                  :disabled="!pkg._dirty || pkg._saving"
                  @click="savePackage(pkg)"
                  title="Save changes"
                >
                  {{ pkg._saving ? 'Saving' : 'Save' }}
                </button>
                <button
                  class="btn-del"
                  :disabled="pkg._deleting"
                  @click="deletePackage(pkg)"
                  title="Delete package"
                >
                  Del
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="saveError" class="vpe-error" style="margin-top:10px">{{ saveError }}</p>

      <section class="special-panel">
        <div class="special-panel-head">
          <div>
            <span class="panel-kicker">Special Odds</span>
            <h3>Daily Special Offer</h3>
          </div>
          <span :class="['special-status', specialPackage && specialPackage._isActive && specialPackage._specialPrice !== '' ? 'is-live' : 'is-hidden']">
            {{ specialPackage && specialPackage._isActive && specialPackage._specialPrice !== '' ? 'Visible to users' : 'Hidden from users' }}
          </span>
        </div>

        <div v-if="specialPackage" class="special-grid">
          <div class="special-field special-field-wide">
            <label>Name</label>
            <input v-model="specialPackage._name" type="text" placeholder="Special Odds" @input="specialPackage._dirty = true" />
          </div>
          <div class="special-field">
            <label>Odds Value</label>
            <input v-model="specialPackage._specialOdds" type="text" placeholder="e.g. 3.75" @input="specialPackage._dirty = true" />
          </div>
          <div class="special-field">
            <label>Today's Price</label>
            <input v-model="specialPackage._specialPrice" type="number" min="0" step="500" placeholder="Set price" @change="specialPackage._dirty = true" />
          </div>
          <div class="special-field special-toggle-field">
            <label>Active</label>
            <label class="toggle">
              <input type="checkbox" v-model="specialPackage._isActive" @change="onActiveChange(specialPackage)" />
              <span class="toggle-track"></span>
            </label>
          </div>
          <div class="special-field">
            <label>Deadline</label>
            <input v-model="specialPackage._deadline" type="datetime-local" @change="specialPackage._dirty = true" />
          </div>
          <div class="special-field special-field-wide">
            <label>Betslip Link</label>
            <input v-model="specialPackage._betslipLink" type="url" placeholder="https://..." @input="specialPackage._dirty = true" />
          </div>
          <div class="special-field">
            <label>Betslip Code</label>
            <input v-model="specialPackage._betslipCode" type="text" placeholder="e.g. ABC123" @input="specialPackage._dirty = true" />
          </div>
          <div class="special-field special-field-wide">
            <label>Package Photo</label>
            <div class="special-photo-block">
              <img v-if="pkgPhotoSrc(specialPackage)" :src="pkgPhotoSrc(specialPackage)" class="special-photo-thumb" alt="package photo" style="cursor:zoom-in" @click="$lightbox.open(pkgPhotoSrc(specialPackage))" />
              <div class="special-photo-btns">
                <label class="photo-upload-btn" :for="'pkg-photo-' + specialPackage.id">+ Upload Photo</label>
                <button v-if="pkgPhotoSrc(specialPackage)" type="button" class="photo-delete-btn" @click="deletePkgPhoto(specialPackage)">🗑 Delete Photo</button>
              </div>
              <input
                :id="'pkg-photo-' + specialPackage.id"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="photo-file-input"
                @change="onPkgPhotoChange(specialPackage, $event)"
              />
            </div>
          </div>
          <div class="special-actions">
            <button class="btn-save btn-save-large" :disabled="!specialPackage._dirty || specialPackage._saving" @click="savePackage(specialPackage)">
              {{ specialPackage._saving ? 'Saving' : 'Save Special Odds' }}
            </button>
            <button class="btn-del" @click="deletePackage(specialPackage)" title="Delete special odds package">Del</button>
            <span class="field-hint">Clear today's price to hide it from users.</span>
          </div>
        </div>
        <div v-else class="special-empty">No special odds package exists yet.</div>
      </section>

      <!-- ── Add New Package ── -->
      <div class="add-section">
        <h3 class="add-title">Add Fixed VIP Package</h3>
        <form @submit.prevent="addPackage" class="add-form">
          <div class="add-row">
            <div class="add-field">
              <label>Name</label>
              <input v-model="newPkg.name" type="text" placeholder="e.g. Weekly VIP" required />
            </div>
            <div class="add-field add-field-sm">
              <label>Odds Type</label>
              <select v-model="newPkg.oddsType" required>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
                <option value="5">5x</option>
                <option value="10">10x</option>
              </select>
            </div>
            <div class="add-field add-field-sm">
              <label>Plan</label>
              <select v-model="newPkg.planType" required>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div class="add-field add-field-sm">
              <label>Base Price (UGX)</label>
              <input v-model.number="newPkg.price" type="number" min="0" step="500" placeholder="5000" required />
            </div>
          </div>
          <p v-if="addError" class="vpe-error">{{ addError }}</p>
          <button type="submit" class="btn-add" :disabled="addLoading">
            {{ addLoading ? 'Adding…' : '+ Add Package' }}
          </button>
        </form>
      </div>
    </template>
  </div>
</template>

<script>
import adminApi from '@/utils/adminApi'
import { getApiBaseUrl } from '@/utils/apiBase'

const API = getApiBaseUrl()

export default {
  name: 'VipPackagesEditor',
  data() {
    return {
      packages:   [],
      loading:    true,
      fetchError: '',
      saveError:  '',
      addError:   '',
      addLoading: false,
      specialPackage: null,
      pkgPhotoFiles: {},
      newPkg: { name: '', oddsType: '2', planType: 'weekly', price: 5000, photoFile: null }
    }
  },
  async mounted() {
    await this.fetchPackages()
  },
  beforeUnmount() {
    if (this.noticeTimer) clearTimeout(this.noticeTimer)
  },
  methods: {
    showNotice(type, message) {
      if (this.noticeTimer) clearTimeout(this.noticeTimer)
      this.notice = { type, message }
      this.noticeTimer = setTimeout(() => {
        this.clearNotice()
      }, 7000)
    },
    clearNotice() {
      if (this.noticeTimer) clearTimeout(this.noticeTimer)
      this.noticeTimer = null
      this.notice = { type: 'success', message: '' }
    },
    todayInputDate() {
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    formatDateTimeInput(d) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${day}T${h}:${min}`
    },
    currentDeadlineInput() {
      return this.formatDateTimeInput(new Date())
    },
    normalizeDeadlineInput(value) {
      if (!value) return ''
      if (/^\d{2}:\d{2}$/.test(value)) return `${this.todayInputDate()}T${value}`
      return String(value).slice(0, 16)
    },
    isPastDeadline(value) {
      if (!value) return false
      return this.normalizeDeadlineInput(value) <= this.currentDeadlineInput()
    },
    formatDeadline(value) {
      if (!value) return ''
      const normalized = this.normalizeDeadlineInput(value)
      const date = new Date(normalized)
      if (Number.isNaN(date.getTime())) return value
      return date.toLocaleString('en-UG', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    },
    async fetchPackages() {
      this.loading    = true
      this.fetchError = ''
      try {
        const { data } = await adminApi.get('/api/groups/admin')
        const mapped = data.map(g => {
          const norm = {
            ...g,
            isSpecial:            g.isSpecial            ?? g.is_special    ?? false,
            isActive:             g.isActive             ?? g.is_active     ?? true,
            specialPrice:         g.specialPrice != null ? g.specialPrice
                                : g.special_price != null ? g.special_price : null,
            specialOdds:          g.specialOdds ?? g.special_odds ?? '',
            betslipLink:          g.betslipLink  ?? g.betslip_link  ?? '',
            betslipCode:          g.betslipCode  ?? g.betslip_code  ?? '',
            subscriptionDeadline: g.subscriptionDeadline ?? g.subscription_deadline ?? null,
          }
          return {
            ...norm,
            _name:         norm.name,
            _price:        norm.price,
            _specialPrice: norm.specialPrice != null ? norm.specialPrice : '',
            _specialOdds:  norm.specialOdds || '',
            _betslipLink:  norm.betslipLink  || '',
            _betslipCode:  norm.betslipCode  || '',
            _isSpecial:    norm.isSpecial    || false,
            _isActive:     norm.isActive     !== false,
            _deadline:     this.normalizeDeadlineInput(norm.subscriptionDeadline),
            _photoUrl:     norm.photoUrl     || '',
            _clearPhoto:   false,
            _dirty:        false,
            _saving:       false,
            _deleting:     false
          }
        })
        this.specialPackage = mapped.find(g => g._isSpecial) || null
        this.packages = mapped.filter(g => !g._isSpecial)
      } catch (err) {
        this.fetchError = err.response?.data?.error || 'Failed to load packages'
      } finally {
        this.loading = false
      }
    },

    pkgPhotoSrc(pkg) {
      // Check if a new file was chosen (blob preview)
      if (this.pkgPhotoFiles[pkg.id]) {
        return URL.createObjectURL(this.pkgPhotoFiles[pkg.id])
      }
      const url = pkg._photoUrl || ''
      if (!url) return ''
      if (/^(https?:|data:|blob:)/.test(url)) return url
      return API + url
    },
    onPkgPhotoChange(pkg, event) {
      const file = event.target.files && event.target.files[0]
      if (!file) return
      this.$set ? this.$set(this.pkgPhotoFiles, pkg.id, file) : (this.pkgPhotoFiles = { ...this.pkgPhotoFiles, [pkg.id]: file })
      pkg._clearPhoto = false
      pkg._dirty = true
    },
    deletePkgPhoto(pkg) {
      // Remove any staged file
      const files = { ...this.pkgPhotoFiles }
      delete files[pkg.id]
      this.pkgPhotoFiles = files
      // Clear stored URL and schedule deletion on next save
      pkg._photoUrl   = ''
      pkg._clearPhoto = true
      pkg._dirty      = true
    },
    onActiveChange(pkg) {
      if (pkg._isActive && this.isPastDeadline(pkg._deadline)) {
        this.saveError = 'Packages with past deadlines cannot be activated. Set a future deadline first.'
        pkg._isActive = false
        return
      }
      this.saveError = ''
      pkg._dirty = true
    },
    async savePackage(pkg) {
      this.saveError = ''
      if (pkg._isActive && this.isPastDeadline(pkg._deadline)) {
        this.saveError = 'Packages with past deadlines cannot be activated. Set a future deadline first.'
        return
      }
      pkg._saving   = true
      try {
        const hasPhoto = !!this.pkgPhotoFiles[pkg.id]
        let data
        if (hasPhoto) {
          // Must use FormData when uploading a file
          const fd = new FormData()
          fd.append('name',                  pkg._name || pkg.name)
          fd.append('price',                 Number(pkg._price))
          fd.append('betslip_link',          pkg._betslipLink  || '')
          fd.append('betslip_code',          pkg._betslipCode  || '')
          fd.append('is_active',             pkg._isActive ? '1' : '0')
          fd.append('is_special',            pkg._isSpecial ? '1' : '0')
          if (pkg._isSpecial && pkg._specialPrice !== '') fd.append('special_price', Number(pkg._specialPrice))
          if (pkg._isSpecial && pkg._specialOdds !== '')  fd.append('special_odds',  pkg._specialOdds)
          if (pkg._deadline) fd.append('subscription_deadline', pkg._deadline)
          fd.append('photo', this.pkgPhotoFiles[pkg.id])
          // Laravel needs POST with _method=PATCH for form-data
          fd.append('_method', 'PATCH')
          // Do NOT set Content-Type manually — axios sets it automatically
          // with the correct multipart boundary when given a FormData object
          const res = await adminApi.post('/api/groups/' + pkg.id, fd)
          data = res.data
          // Clear staged file
          const files = { ...this.pkgPhotoFiles }
          delete files[pkg.id]
          this.pkgPhotoFiles = files
        } else {
          // No photo — send plain JSON as before
          const payload = {
            name:                  pkg._name || pkg.name,
            price:                 Number(pkg._price),
            betslip_link:          pkg._betslipLink  || '',
            betslip_code:          pkg._betslipCode  || '',
            is_active:             pkg._isActive,
            is_special:            pkg._isSpecial,
            special_price:         pkg._isSpecial && pkg._specialPrice !== ''
              ? Number(pkg._specialPrice)
              : null,
            special_odds:          pkg._isSpecial && pkg._specialOdds !== ''
              ? pkg._specialOdds
              : null,
            subscription_deadline: pkg._deadline || null,
            ...(pkg._clearPhoto ? { clear_photo: true } : {})
          }
          const res = await adminApi.patch('/api/groups/' + pkg.id, payload)
          data = res.data
        }
        // Sync back from camelCase response
        pkg.price        = data.price
        pkg.name         = data.name
        pkg.specialPrice = data.specialPrice
        pkg.specialOdds  = data.specialOdds
        pkg.betslipLink  = data.betslipLink
        pkg.betslipCode  = data.betslipCode
        pkg.isSpecial    = data.isSpecial
        pkg.isActive     = data.isActive
        pkg._name         = data.name
        pkg._price        = data.price
        pkg._specialPrice = data.specialPrice != null ? data.specialPrice : ''
        pkg._specialOdds  = data.specialOdds || ''
        pkg._betslipLink  = data.betslipLink  || ''
        pkg._betslipCode  = data.betslipCode  || ''
        pkg._isSpecial    = data.isSpecial    || false
        pkg._isActive     = data.isActive     !== false
        pkg._deadline     = this.normalizeDeadlineInput(data.subscriptionDeadline)
        pkg._photoUrl     = data.photoUrl     || ''
        pkg._clearPhoto   = false
        pkg._dirty        = false
      } catch (err) {
        this.saveError = err.response?.data?.error || err.response?.data?.message || 'Save failed'
      } finally {
        pkg._saving = false
      }
    },

    async deletePackage(pkg) {
      if (!confirm(`Delete "${pkg.name}"?\n\nThis will permanently remove this package and ALL associated subscriptions including any pending payments.\n\nThis cannot be undone.`)) return
      try {
        await adminApi.delete('/api/groups/' + pkg.id)
        if (pkg._isSpecial) {
          this.specialPackage = null
        } else {
          this.packages = this.packages.filter(p => p.id !== pkg.id)
        }
      } catch (err) {
        this.saveError = err.response?.data?.message || err.response?.data?.error || 'Delete failed'
        this.showNotice('error', this.saveError)
      } finally {
        pkg._deleting = false
      }
    },

    async addPackage() {
      this.addLoading = true
      this.addError   = ''
      try {
        const body = {
          name:       this.newPkg.name,
          odds_type:  this.newPkg.oddsType,
          plan_type:  this.newPkg.planType,
          price:      Number(this.newPkg.price),
          is_special: false
        }
        const { data } = await adminApi.post('/api/groups', body)
        this.packages.push({
          ...data,
          _name:         data.name,
          _price:        data.price,
          _specialPrice: data.specialPrice != null ? data.specialPrice : '',
          _specialOdds:  data.specialOdds || '',
          _betslipLink:  data.betslipLink  || '',
          _betslipCode:  data.betslipCode  || '',
          _isSpecial:    data.isSpecial    || false,
          _isActive:     data.isActive     !== false,
          _photoUrl:     data.photoUrl     || '',
          _dirty:        false,
          _saving:       false,
          _deleting:     false
        })
        this.newPkg = { name: '', oddsType: '2', planType: 'weekly', price: 5000, photoFile: null }
      } catch (err) {
        this.addError = err.response?.data?.message || err.response?.data?.error || 'Failed to add package'
        this.showNotice('error', this.addError)
      } finally {
        this.addLoading = false
      }
    }
  }
}
</script>

<style scoped>
.vpe { padding: 0 0 40px; }

.section-lead {
  max-width: 860px;
  color: rgba(255,255,255,0.58);
  font-size: 14px;
  line-height: 1.7;
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.08);
  border-left: 3px solid #FFD700;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 24px;
}

/* ── Table ── */
.vpe-table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); background: rgba(12,12,12,0.72); }
.vpe-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 940px;
}
.vpe-table thead tr { background: rgba(255,255,255,0.04); }
.vpe-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.45);
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  white-space: nowrap;
}
.vpe-table td {
  padding: 13px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  vertical-align: middle;
  color: rgba(255,255,255,0.85);
}
.vpe-table tbody tr:last-child td { border-bottom: none; }
.vpe-table tbody tr:hover { background: rgba(255,255,255,0.03); }
.row-inactive { opacity: 0.5; }

.td-name { font-weight: 600; }
.td-sub  { display: block; font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 400; margin-top: 2px; }
.td-num  { white-space: nowrap; }
.td-center { text-align: center; }
.td-actions { white-space: nowrap; }

/* Badges */
.badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.badge-daily   { background: rgba(255,215,0,0.15); color: #FFD700; }
.badge-weekly  { background: rgba(100,210,255,0.15); color: #64d2ff; }
.badge-monthly { background: rgba(120,255,150,0.15); color: #78ff96; }
.badge-special { background: rgba(255,100,100,0.15); color: #ff6464; }

/* Inputs */
.field-sm {
  width: 90px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 7px;
  padding: 6px 10px;
  color: #fff;
  font-size: 13px;
  outline: none;
}
.field-deadline {
  width: 170px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 7px;
  padding: 6px 10px;
  color: #fff;
  font-size: 13px;
  outline: none;
}
.field-url, .field-code {
  width: 100%;
  min-width: 120px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 7px;
  padding: 6px 10px;
  color: #fff;
  font-size: 12px;
  outline: none;
}
.field-url:focus, .field-code:focus, .field-sm:focus, .field-deadline:focus { border-color: rgba(255,215,0,0.4); }
.field-hint { display: block; font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 3px; }

/* Toggle */
.toggle { position: relative; display: inline-flex; cursor: pointer; }
.toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.toggle-track {
  width: 36px; height: 20px;
  background: rgba(255,255,255,0.12);
  border-radius: 20px;
  transition: background 0.2s;
  position: relative;
}
.toggle-track::after {
  content: '';
  position: absolute;
  top: 3px; left: 3px;
  width: 14px; height: 14px;
  background: rgba(255,255,255,0.5);
  border-radius: 50%;
  transition: transform 0.2s, background 0.2s;
}
.toggle input:checked + .toggle-track { background: #FFD700; }
.toggle input:checked + .toggle-track::after { transform: translateX(16px); background: #000; }

/* Buttons */
.btn-save {
  background: rgba(255,215,0,0.12);
  border: 1px solid rgba(255,215,0,0.3);
  border-radius: 7px;
  padding: 7px 12px;
  color: #FFD700;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  transition: background 0.2s;
  margin-right: 6px;
}
.btn-save:hover:not(:disabled) { background: rgba(255,215,0,0.22); }
.btn-save:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-del {
  background: rgba(255,82,82,0.1);
  border: 1px solid rgba(255,82,82,0.25);
  border-radius: 7px;
  padding: 7px 12px;
  color: #ff5252;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  transition: background 0.2s;
}
.btn-del:hover { background: rgba(255,82,82,0.22); }

/* ── Special odds panel ── */
.special-panel {
  margin-top: 28px;
  background: linear-gradient(135deg, rgba(255,215,0,0.07), rgba(255,255,255,0.025));
  border: 1px solid rgba(255,215,0,0.18);
  border-radius: 16px;
  padding: 22px 24px 24px;
}
.special-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.panel-kicker {
  display: block;
  color: #FFD700;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.special-panel h3 { color: #fff; font-size: 18px; margin: 0; }
.special-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.special-status.is-live { background: rgba(0,200,83,0.14); color: #00c853; }
.special-status.is-hidden { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.52); }
.special-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 110px 150px;
  gap: 14px;
  align-items: end;
}
.special-field { display: flex; flex-direction: column; gap: 7px; }
.special-field-wide { grid-column: span 2; }
.special-field label {
  color: rgba(255,255,255,0.48);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}
.special-field input {
  width: 100%;
  background: rgba(0,0,0,0.24);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 9px;
  color: #fff;
  font-size: 13px;
  outline: none;
  padding: 10px 12px;
}
.special-field input:focus { border-color: rgba(255,215,0,0.42); }
.special-toggle-field { align-items: flex-start; }
.special-actions { display: flex; align-items: center; gap: 12px; grid-column: 1 / -1; margin-top: 4px; }
.btn-save-large { padding: 10px 18px; font-size: 13px; }
.special-empty { color: rgba(255,255,255,0.45); font-size: 13px; }

/* ── Add section ── */
.add-section {
  margin-top: 28px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 22px 24px;
}
.add-title { font-size: 16px; font-weight: 800; color: #fff; margin: 0 0 18px; }
.add-row   { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 14px; }
.add-field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 140px; }
.add-field-sm { flex: 0 0 130px; min-width: 0; }
.add-field label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.6px; }
.add-field input,
.add-field select {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 9px;
  padding: 10px 12px;
  color: #fff;
  font-size: 13px;
  outline: none;
  width: 100%;
}
.add-field select option { background: #1a1a2e; }
.add-field input:focus, .add-field select:focus { border-color: rgba(255,215,0,0.4); }
.btn-add {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  border: none;
  border-radius: 10px;
  padding: 11px 24px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-add:hover:not(:disabled) { opacity: 0.88; }
.btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

.vpe-loading { color: rgba(255,255,255,0.5); padding: 32px 0; text-align: center; }
.vpe-error { color: #ff5252; font-size: 13px; background: rgba(255,82,82,0.08); border-radius: 8px; padding: 10px 14px; }

/* Package photo upload */
.td-photo { width: 90px; }
.photo-upload-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pkg-photo-thumb { width: 56px; height: 42px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,215,0,0.2); display: block; }
.photo-file-input { display: none; }
.photo-upload-btn { display: inline-block; background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.25); border-radius: 6px; color: #FFD700; font-size: 11px; font-weight: 700; padding: 4px 8px; cursor: pointer; white-space: nowrap; transition: background 0.2s; }
.photo-upload-btn:hover { background: rgba(255,215,0,0.2); }
.photo-delete-btn { display: inline-block; background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.25); border-radius: 6px; color: #ff5252; font-size: 11px; font-weight: 700; padding: 4px 8px; cursor: pointer; white-space: nowrap; transition: background 0.2s; }
.photo-delete-btn:hover { background: rgba(255,82,82,0.2); }
/* Special odds photo block */
.special-photo-block { display: flex; align-items: center; gap: 14px; padding: 10px 14px; background: rgba(0,0,0,0.2); border: 1px dashed rgba(255,215,0,0.18); border-radius: 10px; width: fit-content; }
.special-photo-thumb { width: 80px; height: 58px; object-fit: cover; border-radius: 7px; border: 1px solid rgba(255,215,0,0.2); flex-shrink: 0; display: block; }
.special-photo-btns { display: flex; flex-direction: column; gap: 7px; }

@media (max-width: 1100px) {
  .special-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .special-field-wide { grid-column: span 2; }
}

@media (max-width: 640px) {
  .special-panel-head { flex-direction: column; }
  .special-grid { grid-template-columns: 1fr; }
  .special-field-wide, .special-actions { grid-column: auto; }
  .special-actions { flex-direction: column; align-items: flex-start; }
}
</style>
