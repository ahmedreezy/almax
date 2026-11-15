<template>
  <div class="editor">
    <p class="editor-desc">
      Manage Almax Football Predictions shown on the site. Add upcoming matches with tips and update results once played.
    </p>

    <!-- List -->
    <div v-if="loading" class="state-msg">Loading predictions…</div>
    <div v-else>
      <div v-if="predictions.length === 0" class="empty-state">No predictions yet. Add your first one below.</div>
      <div v-else class="list">
        <div v-for="p in predictions" :key="p.id" class="pred-row" :class="{ editing: editingId === p.id }">

          <!-- Inline edit form -->
          <div v-if="editingId === p.id" class="edit-overlay">
            <div class="edit-grid">
              <div class="edit-field">
                <label>Home Team</label>
                <input v-model="editForm.home" type="text" placeholder="Arsenal" />
              </div>
              <div class="edit-field">
                <label>Away Team</label>
                <input v-model="editForm.away" type="text" placeholder="Chelsea" />
              </div>
              <div class="edit-field">
                <label>Competition</label>
                <input v-model="editForm.competition" type="text" placeholder="Premier League" />
              </div>
              <div class="edit-field">
                <label>Kick-off</label>
                <input v-model="editForm.kickoff" type="text" placeholder="20:00" />
              </div>
              <div class="edit-field span2">
                <label>Tip / Prediction</label>
                <input v-model="editForm.tip" type="text" placeholder="Both Teams to Score" />
              </div>
              <div class="edit-field">
                <label>Odds</label>
                <input v-model="editForm.odds" type="text" placeholder="1.85" />
              </div>
              <div class="edit-field">
                <label>Result</label>
                <select v-model="editForm.result" class="result-select-form">
                  <option value="pending">Pending</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>
            <div class="edit-actions">
              <button class="save-inline-btn" @click="saveEdit(p.id)" :disabled="editSaving">{{ editSaving ? 'Saving…' : '✓ Save Changes' }}</button>
              <button class="cancel-edit-btn" @click="cancelEdit">Cancel</button>
              <span v-if="editError" class="error-msg">⚠ {{ editError }}</span>
            </div>
          </div>

          <!-- Normal view -->
          <template v-else>
            <div class="pred-info">
              <span class="pred-match">{{ p.home }} vs {{ p.away }}</span>
              <span class="pred-comp">{{ p.competition }} · {{ p.kickoff }}</span>
              <span class="pred-tip">💡 {{ p.tip }}<template v-if="p.odds"> · Odds: {{ p.odds }}</template></span>
            </div>
            <div class="pred-actions">
              <span :class="['result-badge', 'result-' + p.result]">{{ resultLabel(p.result) }}</span>
              <select class="result-select" :value="p.result" @change="updateResult(p.id, $event.target.value)">
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
              <button class="edit-btn" @click="startEdit(p)">✏ Edit</button>
              <button class="delete-btn" @click="deletePrediction(p.id)" title="Delete">🗑 Delete</button>
            </div>
          </template>

        </div>
      </div>

      <!-- Add form -->
      <div class="add-section">
        <h3 class="add-title">Add New Prediction</h3>
        <form @submit.prevent="addPrediction" class="editor-form">
          <div class="fields-row">
            <div class="field">
              <label>Home Team</label>
              <input v-model="newPred.home" type="text" placeholder="e.g. Arsenal" required />
            </div>
            <div class="field">
              <label>Away Team</label>
              <input v-model="newPred.away" type="text" placeholder="e.g. Chelsea" required />
            </div>
          </div>
          <div class="fields-row">
            <div class="field">
              <label>Competition</label>
              <input v-model="newPred.competition" type="text" placeholder="e.g. Premier League" required />
            </div>
            <div class="field">
              <label>Kick-off Time</label>
              <input v-model="newPred.kickoff" type="text" placeholder="e.g. 20:00" required />
            </div>
          </div>
          <div class="fields-row">
            <div class="field" style="grid-column: 1 / -1">
              <label>Tip / Prediction</label>
              <input v-model="newPred.tip" type="text" placeholder="e.g. Both Teams to Score" required />
            </div>
          </div>
          <div class="fields-row">
            <div class="field">
              <label>Odds (optional)</label>
              <input v-model="newPred.odds" type="text" placeholder="e.g. 1.85" />
            </div>
            <div class="field">
              <label>Initial Result</label>
              <select v-model="newPred.result" class="result-select-form">
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="save-btn" :disabled="saving">
              {{ saving ? 'Adding…' : '+ Add Prediction' }}
            </button>
            <span v-if="saved" class="saved-msg">✓ Prediction added!</span>
            <span v-if="saveError" class="error-msg">⚠ {{ saveError }}</span>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import adminApi from '../../utils/adminApi'

export default {
  name: 'AlmaxPredictionsEditor',
  data() {
    return {
      predictions: [],
      loading: true,
      saving: false,
      saved: false,
      saveError: '',
      newPred: { home: '', away: '', competition: '', kickoff: '', tip: '', odds: '', result: 'pending' },
      editingId: null,
      editForm: { home: '', away: '', competition: '', kickoff: '', tip: '', odds: '', result: 'pending' },
      editSaving: false,
      editError: ''
    }
  },
  async mounted() {
    await this.loadPredictions()
  },
  methods: {
    resultLabel(r) {
      return r === 'won' ? '✓ Won' : r === 'lost' ? '✗ Lost' : '⏳ Pending'
    },
    async loadPredictions() {
      this.loading = true
      try {
        const { data } = await adminApi.get('/api/almax-predictions')
        this.predictions = data
      } catch {
        // server unavailable
      } finally {
        this.loading = false
      }
    },
    async addPrediction() {
      this.saving = true
      this.saved = false
      this.saveError = ''
      try {
        const { data } = await adminApi.post('/api/almax-predictions', { ...this.newPred })
        this.predictions.push(data)
        this.saved = true
        this.newPred = { home: '', away: '', competition: '', kickoff: '', tip: '', odds: '', result: 'pending' }
        setTimeout(() => { this.saved = false }, 3000)
      } catch {
        this.saveError = 'Failed to save. Make sure the server is running.'
      } finally {
        this.saving = false
      }
    },
    async updateResult(id, result) {
      try {
        const { data } = await adminApi.patch('/api/almax-predictions/' + id, { result })
        const idx = this.predictions.findIndex(p => p.id === id)
        if (idx !== -1) this.predictions.splice(idx, 1, data)
      } catch {
        this.saveError = 'The prediction result could not be updated.'
      }
    },
    async deletePrediction(id) {
      if (!confirm('Delete this prediction?')) return
      try {
        await adminApi.delete('/api/almax-predictions/' + id)
        this.predictions = this.predictions.filter(p => p.id !== id)
      } catch {
        this.saveError = 'The prediction could not be deleted.'
      }
    },
    startEdit(pred) {
      this.editingId = pred.id
      this.editForm = { home: pred.home, away: pred.away, competition: pred.competition, kickoff: pred.kickoff, tip: pred.tip, odds: pred.odds || '', result: pred.result }
      this.editError = ''
    },
    cancelEdit() {
      this.editingId = null
      this.editError = ''
    },
    async saveEdit(id) {
      this.editSaving = true
      this.editError = ''
      try {
        const { data } = await adminApi.patch('/api/almax-predictions/' + id, { ...this.editForm })
        const idx = this.predictions.findIndex(pred => pred.id === id)
        if (idx !== -1) this.predictions.splice(idx, 1, data)
        this.cancelEdit()
      } catch (err) {
        const status = err?.response?.status
        const msg = err?.response?.data?.error || err?.message || 'Unknown error'
        if (status === 401) {
          this.editError = 'Session expired — please log out and log back in.'
        } else if (status === 404) {
          this.editError = 'Prediction not found — refresh the page.'
        } else if (!status) {
          this.editError = 'Cannot reach server — make sure the Laravel API is running.'
        } else {
          this.editError = `Error ${status}: ${msg}`
        }
      } finally {
        this.editSaving = false
      }
    }
  }
}
</script>

<style scoped>
.editor { max-width: 760px; }
.editor-desc { font-size: 14px; color: #888; margin-bottom: 24px; line-height: 1.6; }
.state-msg { padding: 14px 18px; border-radius: 10px; background: #1a1a1a; font-size: 14px; color: #888; margin-bottom: 24px; }
.empty-state { padding: 20px; text-align: center; color: #555; font-size: 14px; background: #111; border-radius: 10px; margin-bottom: 24px; }

.list { background: #111; border: 1px solid rgba(143,179,217,0.1); border-radius: 14px; overflow: hidden; margin-bottom: 32px; }
.pred-row { border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; gap: 12px; flex-wrap: wrap; }
.pred-row:last-child { border-bottom: none; }
.pred-row.editing { display: block; padding: 0; }
.pred-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.pred-match { font-size: 14px; font-weight: 700; color: #fff; }
.pred-comp { font-size: 12px; color: #666; }
.pred-tip { font-size: 12px; color: #8FB3D9; opacity: 0.85; margin-top: 2px; }
.pred-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.result-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
.result-pending { background: rgba(255,193,7,0.15); color: #FFC107; }
.result-won { background: rgba(76,175,80,0.15); color: #4CAF50; }
.result-lost { background: rgba(244,67,54,0.15); color: #F44336; }

.result-select { background: #1a1a1a; border: 1px solid rgba(143,179,217,0.2); border-radius: 7px; color: #fff; font-size: 12px; padding: 5px 8px; cursor: pointer; outline: none; }

.edit-btn { background: rgba(143,179,217,0.08); border: 1px solid rgba(143,179,217,0.2); color: #8FB3D9; border-radius: 7px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.edit-btn:hover { background: rgba(143,179,217,0.16); }
.delete-btn { background: rgba(255,82,82,0.08); border: 1px solid rgba(255,82,82,0.2); color: #ff5252; border-radius: 7px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.delete-btn:hover { background: rgba(255,82,82,0.18); }

/* Inline edit overlay */
.edit-overlay { padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #1a1a1a; }
.edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.edit-field { display: flex; flex-direction: column; gap: 4px; }
.edit-field.span2 { grid-column: 1 / -1; }
.edit-field label { font-size: 10px; font-weight: 700; color: #888; letter-spacing: 1px; text-transform: uppercase; }
.edit-field input { background: #111; border: 1px solid rgba(143,179,217,0.15); border-radius: 7px; padding: 8px 10px; color: #fff; font-size: 13px; outline: none; transition: border-color 0.2s; }
.edit-field input:focus { border-color: rgba(143,179,217,0.45); }
.edit-field input::placeholder { color: #444; }
.edit-field select { background: #111; border: 1px solid rgba(143,179,217,0.15); border-radius: 7px; padding: 8px 10px; color: #fff; font-size: 13px; outline: none; cursor: pointer; }
.edit-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.save-inline-btn { background: linear-gradient(135deg,#8FB3D9,#FFA500); color: #000; border: none; border-radius: 7px; padding: 8px 16px; font-size: 12px; font-weight: 800; cursor: pointer; transition: opacity 0.2s; }
.save-inline-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cancel-edit-btn { background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 7px; padding: 8px 14px; color: #aaa; font-size: 12px; cursor: pointer; transition: border-color 0.2s; }
.cancel-edit-btn:hover { border-color: rgba(255,255,255,0.35); color: #fff; }

.add-title { font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 16px; }

.editor-form { background: #111; border: 1px solid rgba(143,179,217,0.1); border-radius: 14px; padding: 24px; }
.fields-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.field { display: flex; flex-direction: column; gap: 7px; }
.field label { font-size: 11px; font-weight: 700; color: #888; letter-spacing: 1px; text-transform: uppercase; }
.field input[type="text"] { background: #1a1a1a; border: 1px solid rgba(143,179,217,0.15); border-radius: 8px; padding: 11px 14px; color: #fff; font-size: 14px; outline: none; transition: border-color 0.2s; }
.field input:focus { border-color: rgba(143,179,217,0.45); }
.field input::placeholder { color: #444; }
.result-select-form { background: #1a1a1a; border: 1px solid rgba(143,179,217,0.15); border-radius: 8px; padding: 11px 14px; color: #fff; font-size: 14px; outline: none; cursor: pointer; }

.form-actions { display: flex; align-items: center; gap: 16px; margin-top: 8px; }
.save-btn { background: linear-gradient(135deg,#8FB3D9,#FFA500); color: #000; border: none; border-radius: 9px; padding: 12px 28px; font-size: 14px; font-weight: 800; cursor: pointer; transition: opacity 0.2s; }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.saved-msg { color: #4caf50; font-size: 13px; font-weight: 600; }
.error-msg { color: #ff5252; font-size: 13px; }

@media (max-width: 600px) { .fields-row { grid-template-columns: 1fr; } }
</style>

