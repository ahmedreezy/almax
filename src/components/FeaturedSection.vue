<template>
  <section class="featured" id="featured">

    <!-- ── FOOTBALL CARTOON DECORATIONS ── -->
    <div class="fb-decos" aria-hidden="true">
      <span v-for="d in decos" :key="d.id" class="fb-deco" :style="d.style">{{ d.char }}</span>
    </div>

    <!-- ── PITCH RIBBON ── -->
    <div class="pitch-ribbon" aria-hidden="true">
      <svg class="pitch-svg" viewBox="0 0 1200 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <!-- pitch fill -->
        <rect width="1200" height="90" fill="#1a4a1a"/>
        <!-- center line -->
        <line x1="600" y1="0" x2="600" y2="90" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
        <!-- center circle -->
        <circle cx="600" cy="45" r="30" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
        <circle cx="600" cy="45" r="3" fill="rgba(255,255,255,0.5)"/>
        <!-- left penalty arc -->
        <rect x="0" y="15" width="80" height="60" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        <rect x="0" y="28" width="30" height="34" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
        <!-- right penalty arc -->
        <rect x="1120" y="15" width="80" height="60" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        <rect x="1170" y="28" width="30" height="34" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
        <!-- corner arcs -->
        <path d="M0,0 Q12,0 12,12" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
        <path d="M1200,0 Q1188,0 1188,12" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
        <path d="M0,90 Q12,90 12,78" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
        <path d="M1200,90 Q1188,90 1188,78" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
        <!-- stripe overlay for grass effect -->
        <rect x="0"   y="0" width="200" height="90" fill="rgba(0,0,0,0.08)"/>
        <rect x="400" y="0" width="200" height="90" fill="rgba(0,0,0,0.08)"/>
        <rect x="800" y="0" width="200" height="90" fill="rgba(0,0,0,0.08)"/>
      </svg>
      <div class="pitch-ribbon-label">
        <svg class="ball-cartoon" viewBox="0 0 40 40" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="19" fill="#fff" stroke="#ccc" stroke-width="1"/>
          <polygon points="20,3 24,11 16,11" fill="#222"/>
          <polygon points="33,13 29,21 37,21" fill="#222"/>
          <polygon points="28,30 20,26 24,34" fill="#222"/>
          <polygon points="12,30 16,34 8,26" fill="#222"/>
          <polygon points="7,13 3,21 11,21" fill="#222"/>
          <polygon points="20,3 33,13 28,30 12,30 7,13" fill="none" stroke="#555" stroke-width="0.7"/>
        </svg>
        <span>TODAY'S MATCHDAY</span>
      </div>
    </div>

    <!-- ── TODAY'S FOOTBALL PICKS ── -->
    <div class="container picks-container">
      <div class="section-header sh-row">
        <div class="sh-left">
          <h2>TODAY'S <span class="gold-text">ALMAX PICKS</span></h2>
          <p class="section-sub">Hand-picked by our analysts — free daily tips</p>
        </div>
        <div class="today-date-badge">{{ todayFormatted }}</div>
      </div>

      <div class="picks-grid">
        <div v-for="pick in todayPicks" :key="pick.id" class="pick-card" :style="{ '--accent': pick.accent }">
          <!-- Full-width image -->
          <div class="pick-img-bar">
            <img v-if="pick.imageUrl || pick.image_url" :src="pick.imageUrl || pick.image_url" :alt="pick.caption || 'prediction'" class="pick-card-img" style="cursor:zoom-in" @click="$lightbox.open(pick.imageUrl || pick.image_url)" />
            <div v-else class="pick-img-placeholder">
              <svg viewBox="0 0 80 54" width="56" height="38" xmlns="http://www.w3.org/2000/svg" opacity="0.3">
                <path d="M14,4 L2,18 L14,18 L14,50 L66,50 L66,18 L78,18 L66,4 L54,10 L48,7 L40,9 L32,7 L26,10 Z"
                      fill="#FFD700" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
              </svg>
            </div>
          </div>
          <!-- content -->
          <div class="pick-body">
            <!-- Caption -->
            <p v-if="pick.caption" class="pick-caption">{{ pick.caption }}</p>
            <!-- Win probability -->
            <div class="pick-prob-bar">
              <div class="pick-prob-header">
                <span class="pick-prob-label">⚡ WIN PROB</span>
                <span class="pick-prob-val">{{ pick.winProb || pick.win_prob || 75 }}%</span>
              </div>
              <div class="pick-prob-track">
                <div class="pick-prob-fill" :style="{ width: (pick.winProb || pick.win_prob || 75) + '%' }"></div>
              </div>
            </div>
            <div class="pick-footer">
              <button v-if="!pick.groupId || !subscribedGroupIds.has(Number(pick.groupId))" class="pick-vip-btn" @click="openVipMenu(pick.groupId || null)">
                👑 Join VIP
              </button>
              <template v-else>
                <span class="pick-vip-active-tag">👑 VIP</span>
                <button class="pick-vip-plans-btn" @click="openMySubscriptions">View Plans</button>
                <button class="pick-vip-add-btn" @click="openVipMenu(pick.groupId || null)" title="Get another package">＋</button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Goalpost cartoon accent -->
      <div class="goalpost-accent" aria-hidden="true">
        <svg viewBox="0 0 120 60" width="120" height="60" xmlns="http://www.w3.org/2000/svg">
          <rect x="5"  y="2"  width="5" height="55" fill="rgba(255,255,255,0.12)" rx="2"/>
          <rect x="110" y="2" width="5" height="55" fill="rgba(255,255,255,0.12)" rx="2"/>
          <rect x="2"  y="2"  width="116" height="5" fill="rgba(255,255,255,0.12)" rx="2"/>
          <!-- net lines horizontal -->
          <line x1="10" y1="15" x2="110" y2="15" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
          <line x1="10" y1="28" x2="110" y2="28" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
          <line x1="10" y1="41" x2="110" y2="41" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
          <!-- net lines vertical -->
          <line x1="30"  y1="7" x2="30"  y2="57" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
          <line x1="50"  y1="7" x2="50"  y2="57" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
          <line x1="70"  y1="7" x2="70"  y2="57" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
          <line x1="90"  y1="7" x2="90"  y2="57" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
        </svg>
      </div>
    </div>

    <!-- ── VIP PAYMENT MODAL (multi-step) ── -->
    <transition name="modal-fade">
      <div
        v-if="showVipMenu"
        class="mm-overlay"
        @click.self="closeVip"
        role="dialog"
        aria-modal="true"
        aria-label="Join VIP"
      >
        <div class="mm-sheet">
          <button class="mm-close" @click="closeVip" aria-label="Close">✕</button>

          <!-- ── STEP 1: Package Selection ── -->
          <template v-if="vipStep === 1">
            <div class="mm-icon">👑</div>
            <h3 class="mm-title">JOIN <span class="gold-text">VIP TIPS</span></h3>
            <p v-if="linkedGroupId" class="mm-sub">You selected a pick — here is the matching VIP package:</p>
            <p v-else class="mm-sub">Select a package to unlock expert predictions</p>
            <div v-if="groupsLoading" class="pkg-loading">Loading packages…</div>
            <div v-else-if="groupsError" class="pkg-error">{{ groupsError }}</div>
            <div v-else-if="visibleGroups.length === 0" class="pkg-empty">
              <div class="pkg-empty-icon">
                <svg viewBox="0 0 48 48" width="52" height="52" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="24" cy="24" r="22" stroke="rgba(255,215,0,0.25)" stroke-width="2"/>
                  <path d="M24 12v14" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round"/>
                  <circle cx="24" cy="33" r="2" fill="#FFD700"/>
                </svg>
              </div>
              <p class="pkg-empty-title">No Active Packages Today</p>
              <p class="pkg-empty-body">Our team is preparing today's VIP packages. Check back shortly — new packages are typically published before noon.</p>
              <a v-if="vipCfg.whatsapp_link" :href="vipCfg.whatsapp_link" target="_blank" rel="noopener" class="pkg-empty-wa">💬 Get notified on WhatsApp</a>
            </div>
            <div v-else class="pkg-grid" role="radiogroup" aria-label="Select a VIP package">
              <div
                v-for="group in visibleGroups"
                :key="group.id"
                class="pkg-row"
                :class="{
                  'pkg-row--selected': selectedGroup && selectedGroup.id === group.id,
                  'pkg-row--special':  group.isSpecial,
                  'pkg-row--closed':   group.isClosed,
                }"
                @click="!group.isClosed && (selectedGroup = group)"
                role="radio"
                :aria-checked="!!(selectedGroup && selectedGroup.id === group.id)"
                :aria-disabled="group.isClosed"
              >
                <div class="pkg-icon-wrap" :class="'pkg-icon-' + group.planType">
                  <span class="pkg-icon-val">{{ group.isSpecial ? '⚡' : group.oddsType }}</span>
                </div>
                <div class="pkg-meta">
                  <div class="pkg-name">
                    {{ group.name }}
                    <span v-if="group.isClosed" class="pkg-closed-badge">Closed</span>
                  </div>
                  <div class="pkg-tags">
                    <span class="pkg-tag">{{ planDuration(group.planType) }}</span>
                    <span v-if="group.subscriptionDeadline && !group.isClosed" class="pkg-tag pkg-tag--time">🕐 Closes {{ formatDeadline(group.subscriptionDeadline) }}</span>
                    <span v-if="group.isClosed && group.subscriptionDeadline" class="pkg-tag pkg-tag--closed">🕐 Closed at {{ formatDeadline(group.subscriptionDeadline) }}</span>
                    <span v-if="group.name.includes('Big Staker')" class="pkg-tag pkg-tag--orange">Big Staker</span>
                    <span v-if="group.isSpecial" class="pkg-tag pkg-tag--purple">Today Only</span>
                  </div>
                </div>
                <div class="pkg-price-col">
                  <div class="pkg-price">{{ effectiveGroupPrice(group).toLocaleString() }}</div>
                  <div class="pkg-currency">UGX</div>
                </div>
                <div class="pkg-check-col">
                  <div class="pkg-check" :class="{ 'pkg-check--on': selectedGroup && selectedGroup.id === group.id }">✓</div>
                </div>
              </div>
            </div>
            <button class="mm-next-btn"
              :disabled="visibleGroups.length === 0 || !selectedGroup || selectedGroup.isClosed"
              @click="goToAuthStep">
              {{ visibleGroups.length === 0 ? 'No packages available' : selectedGroup && selectedGroup.isClosed ? 'Package closed' : 'Continue →' }}
            </button>
            <p class="mm-check-link" @click="openMySubscriptions">View My Subscriptions</p>
          </template>
          <!-- ── STEP 3: Registration / Login ── -->
          <template v-else-if="vipStep === 3">
            <div class="mm-icon">👤</div>
            <h3 class="mm-title">YOUR <span class="gold-text">ACCOUNT</span></h3>

            <div v-if="regUser" class="logged-in-box">
              <div class="li-avatar">{{ regUser.username.charAt(0).toUpperCase() }}</div>
              <div class="li-info">
                <div class="li-name">{{ regUser.username }}</div>
                <div class="li-phone">{{ regUser.phone }}</div>
              </div>
              <button type="button" class="li-change" @click="regUser = null; regError = ''">Change</button>
            </div>

            <template v-else>
              <div class="reg-tabs">
                <button type="button" :class="['reg-tab', { active: !isReturning }]" @click="isReturning = false; regError = ''">New User</button>
                <button type="button" :class="['reg-tab', { active: isReturning }]" @click="isReturning = true; regError = ''">Login</button>
              </div>

              <form v-if="!isReturning" @submit.prevent="registerUser" class="reg-form">
                <div class="field">
                  <label>Full Name</label>
                  <input v-model="regForm.username" type="text" placeholder="Your full name" required />
                </div>
                <div class="field">
                  <label>Phone Number</label>
                  <input v-model="regForm.phone" type="tel" placeholder="07XXXXXXXX" required maxlength="10" pattern="[0-9]{10}" />
                </div>
                <div class="field">
                  <label>Password</label>
                  <div class="pw-wrap">
                    <input v-model="regForm.password" :type="showRegPw ? 'text' : 'password'" placeholder="Min. 6 characters" required minlength="6" />
                    <button type="button" class="pw-eye" @click="showRegPw = !showRegPw">{{ showRegPw ? '🙈' : '👁' }}</button>
                  </div>
                </div>
                <div class="field">
                  <label>Confirm Password</label>
                  <div class="pw-wrap">
                    <input v-model="regForm.confirmPassword" :type="showConfirmPw ? 'text' : 'password'" placeholder="Repeat password" required />
                    <button type="button" class="pw-eye" @click="showConfirmPw = !showConfirmPw">{{ showConfirmPw ? '🙈' : '👁' }}</button>
                  </div>
                </div>
                <div class="field">
                  <label class="security-q-label">🔐 Security Question</label>
                  <p class="security-q-text">{{ magicQuestion || 'Loading…' }}</p>
                  <input v-model="regForm.securityAnswer" type="text" placeholder="Your answer (for account recovery)" required minlength="2" autocomplete="off" />
                  <p class="security-q-hint">Remember this answer — you'll need it to recover your password.</p>
                </div>
                <p v-if="regError" class="reg-error">{{ regError }}</p>
                <button type="submit" class="mm-next-btn" :disabled="regLoading">
                  {{ regLoading ? 'Creating account…' : 'Create Account →' }}
                </button>
              </form>

              <form v-else @submit.prevent="loginUser" class="reg-form">
                <div class="field">
                  <label>Phone Number</label>
                  <input v-model="loginForm.phone" type="tel" placeholder="07XXXXXXXX" required maxlength="10" pattern="[0-9]{10}" />
                </div>
                <div class="field">
                  <label>Password</label>
                  <div class="pw-wrap">
                    <input v-model="loginForm.password" :type="showLoginPw ? 'text' : 'password'" placeholder="Your password" required />
                    <button type="button" class="pw-eye" @click="showLoginPw = !showLoginPw">{{ showLoginPw ? '🙈' : '👁' }}</button>
                  </div>
                </div>
                <p v-if="regError" class="reg-error">{{ regError }}</p>
                <button type="submit" class="mm-next-btn" :disabled="regLoading">
                  {{ regLoading ? 'Logging in…' : 'Login →' }}
                </button>
                <p class="mm-forgot-link" @click="openForgot">Forgot password?</p>
              </form>
            </template>

            <button v-if="regUser" class="mm-next-btn" style="margin-top:12px" @click="toPaymentPromptStep">Continue →</button>
            <p class="mm-back" @click="vipStep = 1">← Back</p>
          </template>

          <!-- ── FORGOT PASSWORD ── -->
          <template v-else-if="vipStep === 'forgot'">
            <div class="mm-icon">🔐</div>
            <h3 class="mm-title">RESET YOUR <span class="gold-text">PASSWORD</span></h3>

            <!-- Sub-step: phone entry -->
            <template v-if="forgotSubStep === 'phone'">
              <p class="mm-sub">Enter your registered phone number to continue.</p>
              <form @submit.prevent="fetchForgotQuestion" class="reg-form">
                <div class="field">
                  <label>Phone Number</label>
                  <input v-model="forgotPhone" type="tel" placeholder="07XXXXXXXX" required maxlength="10" pattern="[0-9]{10}" />
                </div>
                <p v-if="forgotError" class="reg-error">{{ forgotError }}</p>
                <button type="submit" class="mm-next-btn" :disabled="forgotLoading">
                  {{ forgotLoading ? 'Checking…' : 'Continue →' }}
                </button>
              </form>
            </template>

            <!-- Sub-step: answer + new password -->
            <template v-else-if="forgotSubStep === 'answer'">
              <p class="mm-sub">Answer your security question to reset your password.</p>
              <form @submit.prevent="submitPasswordReset" class="reg-form">
                <div class="field">
                  <label class="security-q-label">Security Question</label>
                  <p class="security-q-text">{{ forgotQuestion }}</p>
                  <input v-model="forgotAnswer" type="text" placeholder="Your answer" required minlength="2" autocomplete="off" />
                </div>
                <div class="field">
                  <label>New Password</label>
                  <div class="pw-wrap">
                    <input v-model="forgotNewPassword" :type="showForgotPw ? 'text' : 'password'" placeholder="Min. 6 characters" required minlength="6" />
                    <button type="button" class="pw-eye" @click="showForgotPw = !showForgotPw">{{ showForgotPw ? '🙈' : '👁' }}</button>
                  </div>
                </div>
                <p v-if="forgotError" class="reg-error">{{ forgotError }}</p>
                <button type="submit" class="mm-next-btn" :disabled="forgotLoading">
                  {{ forgotLoading ? 'Resetting…' : 'Reset Password →' }}
                </button>
              </form>
            </template>

            <!-- Sub-step: success -->
            <template v-else-if="forgotSubStep === 'done'">
              <p class="mm-sub" style="color:#4caf50;font-weight:600">✅ Password updated successfully!</p>
              <p class="mm-sub">You can now log in with your new password.</p>
              <button class="mm-next-btn" @click="vipStep = 3; isReturning = true; forgotSubStep = 'phone'; forgotError = ''">
                Back to Login →
              </button>
            </template>

            <p v-if="forgotSubStep !== 'done'" class="mm-back" @click="vipStep = 3; isReturning = true; forgotError = ''">← Back to Login</p>
          </template>

          <!-- ── PAYMENT PROMPT: pre-filled amount, phone, network ── -->
          <template v-else-if="vipStep === 'payment-prompt'">
            <div class="mm-icon">📱</div>
            <h3 class="mm-title">PAY VIA <span class="gold-text">MOBILE MONEY</span></h3>
            <p v-if="selectedGroup" class="mm-sub">{{ selectedGroup.name }} &mdash; {{ effectiveGroupPrice(selectedGroup).toLocaleString() }} UGX</p>

            <div class="reg-form" style="text-align:left">
              <div class="field">
                <label>Amount (UGX)</label>
                <input :value="selectedGroup ? effectiveGroupPrice(selectedGroup).toLocaleString() : ''" type="text" readonly disabled style="opacity:0.7;cursor:not-allowed" />
              </div>
              <div class="field">
                <label>Mobile Money Phone</label>
                <input v-model="payPhone" type="tel" placeholder="07XXXXXXXX" required maxlength="10" pattern="[0-9]{10}" />
              </div>
              <div class="field">
                <label>Network</label>
                <div class="provider-cards" style="margin-bottom:0">
                  <div class="provider-card provider-card--disabled">
                    <div class="provider-logo mtn-logo">MTN</div>
                    <div class="provider-name">MTN MoMo</div>
                    <div class="coming-soon-badge">Coming Soon</div>
                  </div>
                  <div class="provider-card" :class="{ selected: selectedProvider === 'airtel' }" @click="selectedProvider = 'airtel'">
                    <div class="provider-logo airtel-logo">Airtel</div>
                    <div class="provider-name">Airtel Money</div>
                  </div>
                </div>
              </div>
            </div>

            <p v-if="payError" class="reg-error">{{ payError }}</p>
            <button class="mm-next-btn" :disabled="!selectedProvider || !payPhone || payLoading" @click="submitPayment">
              {{ payLoading ? 'Sending request…' : '💳 Pay Now' }}
            </button>
            <p class="mm-back" @click="vipStep = 3">← Back</p>
          </template>

          <!-- ── PROCESSING: polling for payment status ── -->
          <template v-else-if="vipStep === 'processing'">
            <div class="mm-icon">⏳</div>
            <h3 class="mm-title">WAITING FOR <span class="gold-text">PAYMENT</span></h3>
            <p class="mm-sub">We sent a payment request to <strong>{{ payPhone }}</strong>.<br/>Please approve it on your phone.</p>
            <div class="processing-spinner" aria-label="Processing"></div>
            <div class="poll-countdown">{{ pollCountdown }}</div>
            <p class="mm-note" style="margin-top:8px">Do not close this window. Checking for confirmation…</p>
          </template>

          <!-- ── PAYMENT PENDING (poll timed out) ── -->
          <template v-else-if="vipStep === 'payment-pending'">
            <div class="mm-icon">⏳</div>
            <h3 class="mm-title">PAYMENT <span class="gold-text">PENDING</span></h3>
            <p class="mm-sub">Your payment request has been saved and is being processed.</p>
            <p class="mm-sub" style="font-size:13px;color:var(--text-muted)">
              Didn't receive a prompt on your phone? Tap <strong>Resend</strong> to try again,
              or view your subscriptions below once you've approved it.
            </p>
            <button class="mm-next-btn" :disabled="payLoading" @click="submitPayment">
              {{ payLoading ? 'Sending…' : '🔄 Resend Payment Request' }}
            </button>
            <button class="mm-next-btn" style="margin-top:8px;opacity:0.75" @click="openMySubscriptions">
              View My Subscriptions →
            </button>
            <p class="mm-check-link" style="margin-top:14px;cursor:pointer;color:var(--gold);font-size:13px;text-decoration:underline"
               @click="vipStep = 'submit-txn'; txnInput = ''; txnError = ''">
              Already paid? Enter your Airtel transaction ID →
            </p>
            <p class="mm-back" @click="closeVip">Close</p>
          </template>

          <!-- ── SUBMIT TRANSACTION ID (fallback when STK push / webhook didn't auto-confirm) ── -->
          <template v-else-if="vipStep === 'submit-txn'">
            <div class="mm-icon">🧾</div>
            <h3 class="mm-title">VERIFY <span class="gold-text">PAYMENT</span></h3>
            <p class="mm-sub">
              Enter the Airtel Money transaction ID from the SMS you received after paying.
              We'll verify it with the network and activate your subscription instantly.
            </p>
            <div class="reg-form" style="text-align:left">
              <div class="field">
                <label>Transaction ID</label>
                <input
                  v-model="txnInput"
                  type="text"
                  placeholder="e.g. CI250524.1234.A12345"
                  maxlength="80"
                  autocomplete="off"
                  @keydown.enter.prevent="submitTransactionId"
                />
                <p class="security-q-hint" style="margin-top:4px;font-size:12px">
                  Check your SMS for a message like "Airtel Money Transaction ID: CI2505…"
                </p>
              </div>
            </div>
            <p v-if="txnError" class="reg-error">{{ txnError }}</p>
            <button
              class="mm-next-btn"
              :disabled="!txnInput.trim() || txnLoading"
              @click="submitTransactionId"
            >
              {{ txnLoading ? 'Verifying…' : '✅ Verify &amp; Activate' }}
            </button>
            <p class="mm-back" @click="vipStep = 'payment-pending'">← Back</p>
          </template>

          <!-- ── DEADLINE CLOSED ── -->
          <template v-else-if="vipStep === 'deadline-closed'">
            <div class="mm-icon">🕐</div>
            <h3 class="mm-title">PACKAGE <span class="gold-text">CLOSED</span></h3>
            <p class="mm-sub">{{ deadlineMessage }}</p>
            <template v-if="deadlineAlternatives.length">
              <p class="mm-sub" style="margin-top:12px;font-weight:600">Still available today:</p>
              <div class="pkg-grid" style="margin-top:8px">
                <div v-for="alt in deadlineAlternatives" :key="alt.id"
                  class="pkg-row"
                  :class="{ 'pkg-row--selected': selectedGroup && selectedGroup.id === alt.id }"
                  @click="selectedGroup = groups.find(g => g.id === alt.id) || alt; vipStep = 'payment-prompt'"
                  style="cursor:pointer">
                  <div class="pkg-meta">
                    <div class="pkg-name">{{ alt.name }}</div>
                    <div class="pkg-tags"><span class="pkg-tag">{{ alt.planType }}</span></div>
                  </div>
                  <div class="pkg-price-col">
                    <div class="pkg-price">{{ Number(alt.effectivePrice).toLocaleString() }}</div>
                    <div class="pkg-currency">UGX</div>
                  </div>
                </div>
              </div>
            </template>
            <p v-else class="mm-sub" style="color:var(--text-muted)">No other packages are available right now.</p>
            <p class="mm-back" @click="vipStep = 1">← Back to All Plans</p>
          </template>

          <!-- ── SUCCESS ── -->
          <template v-else-if="vipStep === 'success'">
            <div class="mm-icon">✅</div>
            <h3 class="mm-title">PAYMENT <span class="gold-text">CONFIRMED</span></h3>
            <p class="mm-sub">Your VIP subscription is now active!</p>
            <div v-if="activeSub" class="betslip-box" :class="{ 'betslip-box--reveal': activeSub.packagePhoto }">
              <!-- ── Full-bleed hero photo with gradient overlay ── -->
              <div v-if="activeSub.packagePhoto" class="success-photo-hero">
                <img :src="resolvePhotoUrl(activeSub.packagePhoto)" alt="VIP Package" class="success-photo-img" style="cursor:zoom-in" @click="$lightbox.open(resolvePhotoUrl(activeSub.packagePhoto))" />
                <div class="success-photo-overlay">
                  <div class="success-photo-name">{{ activeSub.planName || planDuration(activeSub.planType) }} Package</div>
                  <div class="success-photo-meta">
                    <span class="betslip-badge" style="margin:0">✅ ACTIVE VIP</span>
                    <span v-if="isBetslipUpdated(activeSub)" class="betslip-updated-badge" style="margin:0">⚡</span>
                  </div>
                </div>
              </div>
              <!-- ── Betslip content ── -->
              <div class="betslip-content">
                <!-- Plan header (no-photo fallback) -->
                <template v-if="!activeSub.packagePhoto">
                  <div class="betslip-plan-title">{{ activeSub.planName || planDuration(activeSub.planType) }} Package</div>
                  <div v-if="isBetslipUpdated(activeSub)" class="betslip-updated-badge">⚡ Betslip Updated!</div>
                  <div class="betslip-badge">✅ ACTIVE VIP</div>
                </template>
                <p class="betslip-exp">Expires: {{ formatExpiry(activeSub.expiresAt) }}</p>
                <div v-if="activeSub.betslipLink" class="betslip-section">
                  <div class="betslip-label">🔗 Betslip Link</div>
                  <a :href="activeSub.betslipLink" target="_blank" rel="noopener" class="betslip-link">{{ activeSub.betslipLink }}</a>
                </div>
                <div v-if="activeSub.betslipCode" class="betslip-section">
                  <div class="betslip-label">🎫 Betslip Code</div>
                  <div class="betslip-code-row">
                    <code class="betslip-code">{{ activeSub.betslipCode }}</code>
                    <button class="copy-btn" @click="copyCode(activeSub.betslipCode)">{{ copied ? '✓' : 'Copy' }}</button>
                  </div>
                </div>
              </div>
            </div>
            <button class="mm-next-btn" @click="closeVip">Done</button>
            <button
              class="mm-next-btn"
              style="margin-top:8px;background:rgba(255,215,0,0.10);color:var(--gold);border:1px solid rgba(255,215,0,0.3)"
              @click="goToAnotherPackage"
            >
              👑 Get Another Package →
            </button>
          </template>

          <!-- ── VIEW MY SUBSCRIPTIONS ── -->
          <template v-else-if="vipStep === 'status'">
            <div class="mm-icon">📋</div>
            <h3 class="mm-title">MY <span class="gold-text">SUBSCRIPTIONS</span></h3>
            <p class="mm-sub">View your active plans and current bet slips.</p>
            <p v-if="statusError" class="reg-error">{{ statusError }}</p>
            <div v-if="statusLoading" class="pkg-loading">Loading your subscriptions…</div>

            <div v-else-if="activeSubs.length" class="betslip-box">
              <div v-for="sub in activeSubs" :key="sub.id" class="status-sub-card">
                <div v-if="sub.packagePhoto" class="sub-card-photo-wrap">
                  <img :src="resolvePhotoUrl(sub.packagePhoto)" alt="VIP Package" class="sub-card-photo" style="cursor:zoom-in" @click="$lightbox.open(resolvePhotoUrl(sub.packagePhoto))" />
                  <div class="sub-card-photo-overlay">
                    <div class="sub-card-photo-name">{{ sub.planName || planDuration(sub.planType) }} Package</div>
                  </div>
                </div>
                <div v-if="!sub.packagePhoto" class="betslip-plan-title">{{ sub.planName || planDuration(sub.planType) }} Package</div>
                <div v-if="isBetslipUpdated(sub)" class="betslip-updated-badge">⚡ Betslip Updated!</div>
                <div class="betslip-badge">✅ ACTIVE VIP</div>
                <p class="betslip-exp">Expires: {{ formatExpiry(sub.expiresAt) }}</p>

                <div v-if="sub.betslipLink" class="betslip-section">
                  <div class="betslip-label">🔗 Betslip Link</div>
                  <a :href="sub.betslipLink" target="_blank" rel="noopener" class="betslip-link">
                    {{ sub.betslipLink }}
                  </a>
                </div>
                <div v-if="sub.betslipCode" class="betslip-section">
                  <div class="betslip-label">🎫 Betslip Code</div>
                  <div class="betslip-code-row">
                    <code class="betslip-code">{{ sub.betslipCode }}</code>
                    <button class="copy-btn" @click="copyCode(sub.betslipCode)">{{ copied ? '✓' : 'Copy' }}</button>
                  </div>
                </div>

                <a
                  v-if="vipCfg.whatsapp_link"
                  :href="vipCfg.whatsapp_link"
                  target="_blank"
                  rel="noopener"
                  class="whatsapp-btn"
                >
                  💬 Join WhatsApp Community
                </a>
              </div>
            </div>
            <div v-else-if="statusChecked && !activeSubs.length" class="pending-box">
              <p style="text-align:center; color: var(--text-muted); font-size:14px;">
                {{ pendingStatusMsg || 'No active subscription found.' }}
              </p>
            </div>

            <p class="mm-back" @click="vipStep = 1">← Back to Plans</p>
          </template>

        </div>
      </div>
    </transition>

  </section>
</template>

<script>
import axios from 'axios'
import { getUser, isLoggedIn, saveUser } from '../utils/userAuth'
import { getApiBaseUrl } from '../utils/apiBase'

const API = getApiBaseUrl()

const STATIC_PICKS = [
  {
    id: 1, home: 'Man City', away: 'Arsenal',
    competition: 'Premier League', kickoff: '20:00',
    kitColor: '#6CABDD', kitNumber: '10', accent: '#6CABDD',
    winProb: 78, imageUrl: ''
  },
  {
    id: 2, home: 'Real Madrid', away: 'Barcelona',
    competition: 'La Liga', kickoff: '21:00',
    kitColor: '#FEBE10', kitNumber: '9', accent: '#FEBE10',
    winProb: 82, imageUrl: ''
  },
  {
    id: 3, home: 'Bayern Munich', away: 'Dortmund',
    competition: 'Bundesliga', kickoff: '18:30',
    kitColor: '#DC052D', kitNumber: '8', accent: '#DC052D',
    winProb: 71, imageUrl: ''
  },
  {
    id: 4, home: 'PSG', away: 'Lyon',
    competition: 'Ligue 1', kickoff: '21:05',
    kitColor: '#004170', kitNumber: '7', accent: '#004170',
    winProb: 85, imageUrl: ''
  }
]

export default {
  name: 'FeaturedSection',
  emits: ['vipOpened'],
  props: {
    openVip: { type: Boolean, default: false }
  },
  data() {
    const d = new Date()
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    return {
      todayFormatted: `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`,
      todayPicks: [...STATIC_PICKS],
      // VIP modal
      showVipMenu: false,
      vipStep: 1,
      vipCfg: { currency: 'UGX', whatsapp_link: '' },
      // Groups
      groups: [],
      groupsLoading: false,
      groupsError: '',
      selectedGroup: null,
      linkedGroupId: null,
      // Registration / Login
      isReturning: false,
      regForm: { username: '', phone: '', password: '', confirmPassword: '', securityAnswer: '' },
      loginForm: { phone: '', password: '' },
      regUser: null,
      regError: '',
      regLoading: false,
      showRegPw: false,
      showConfirmPw: false,
      showLoginPw: false,
      // Forgot password
      forgotSubStep: 'phone',
      forgotPhone: '',
      forgotQuestion: '',
      forgotAnswer: '',
      forgotNewPassword: '',
      showForgotPw: false,
      forgotError: '',
      forgotLoading: false,
      magicQuestion: '',
      // Active VIP subscriptions for logged-in user (can be multiple)
      userActiveSubs: [],
      // Payment
      selectedProvider: '',
      payPhone: '',
      payError: '',
      payLoading: false,
      // Processing / polling
      processingSubId: null,
      pollCount: 0,
      pollError: '',
      pollSecondsLeft: 180,
      // Transaction ID fallback flow
      txnInput:   '',
      txnLoading: false,
      txnError:   '',
      // Deadline-closed state
      deadlineMessage:      '',
      deadlineAlternatives: [],
      // My subscriptions
      statusError: '',
      statusLoading: false,
      statusChecked: false,
      activeSub: null,
      activeSubs: [],
      pendingStatusMsg: '',
      copied: false,
      // Decorations
      decos: [
        { id:1,  char:'⚽', style:{ top:'8%',  left:'3%',  fontSize:'78px', animationDelay:'0s',   opacity:0.44 } },
        { id:2,  char:'🥅', style:{ top:'15%', right:'4%', fontSize:'88px', animationDelay:'1.2s', opacity:0.40 } },
        { id:3,  char:'👟', style:{ top:'55%', left:'2%',  fontSize:'68px', animationDelay:'2.1s', opacity:0.38 } },
        { id:4,  char:'🏆', style:{ top:'70%', right:'3%', fontSize:'74px', animationDelay:'0.7s', opacity:0.42 } },
        { id:5,  char:'📋', style:{ top:'35%', left:'94%', fontSize:'64px', animationDelay:'1.8s', opacity:0.36 } },
        { id:6,  char:'🎽', style:{ top:'82%', left:'8%',  fontSize:'72px', animationDelay:'3s',   opacity:0.38 } },
        { id:7,  char:'🎯', style:{ top:'42%', right:'2%', fontSize:'62px', animationDelay:'2.5s', opacity:0.36 } },
        { id:8,  char:'⚽', style:{ top:'90%', left:'50%', fontSize:'82px', animationDelay:'1s',   opacity:0.40 } },
      ]
    }
  },
  computed: {
    // First active sub — used for pick-card unlock and VIP button visibility
    userActiveSub() {
      return this.userActiveSubs[0] || null
    },
    // Set of group IDs the user has an active subscription for
    subscribedGroupIds() {
      const ids = new Set()
      this.userActiveSubs.forEach(s => {
        if (s.groupId != null) ids.add(Number(s.groupId))
      })
      return ids
    },
    pollCountdown() {
      const m = Math.floor(this.pollSecondsLeft / 60)
      const s = this.pollSecondsLeft % 60
      return m + ':' + String(s).padStart(2, '0')
    },
    visibleGroups() {
      const active = this.groups.filter(g => {
        if (!g.isActive) return false
        if (g.isSpecial) return g.specialPrice != null
        return true
      })
      // If user clicked from a specific pick, show only the linked package
      if (this.linkedGroupId) {
        const lid = Number(this.linkedGroupId)
        const linked = active.find(g => Number(g.id) === lid)
        return linked ? [linked] : active
      }
      return active
    }
  },
  watch: {
    // Auto-select when there is exactly one package (linked pick flow)
    visibleGroups(groups) {
      if (this.linkedGroupId && groups.length === 1 && !this.selectedGroup) {
        this.selectedGroup = groups[0]
      }
    },
    // Respond to external trigger (e.g. navbar "Join VIP" button)
    openVip(val) {
      if (val) {
        this.openVipMenu()
        this.$emit('vipOpened')
      }
    }
  },
  async mounted() {
    await Promise.all([this.fetchTips(), this.fetchVipConfig(), this.fetchGroups(), this.fetchMagicQuestion()])
    if (isLoggedIn()) this.fetchUserActiveSub()
    this._pollInterval = setInterval(this.fetchTips, 30000)
    this._onVisible = () => { if (!document.hidden) this.fetchTips() }
    document.addEventListener('visibilitychange', this._onVisible)
    this._onLogout  = () => this.handleForcedLogout()
    this._onLogin = (event) => this.handleUserLogin(event)
    this._onSubscriptionUpdated = () => this.handleSubscriptionUpdated()
    this._onKeyDown = (e) => { if (e.key === 'Escape' && this.showVipMenu) this.closeVip() }
    // "View My Subscriptions" buttons dispatch this to open the account-scoped view.
    this._openStatus = () => this.openMySubscriptions()
    window.addEventListener('user-logged-out', this._onLogout)
    window.addEventListener('user-logged-in', this._onLogin)
    window.addEventListener('user-subscription-updated', this._onSubscriptionUpdated)
    document.addEventListener('keydown', this._onKeyDown)
    document.addEventListener('open-vip-status', this._openStatus)
  },
  beforeUnmount() {
    clearInterval(this._pollInterval)
    clearInterval(this._payPollInterval)
    clearInterval(this._pollCountdownInterval)
    document.removeEventListener('visibilitychange', this._onVisible)
    window.removeEventListener('user-logged-out', this._onLogout)
    window.removeEventListener('user-logged-in', this._onLogin)
    window.removeEventListener('user-subscription-updated', this._onSubscriptionUpdated)
    document.removeEventListener('keydown', this._onKeyDown)
    document.removeEventListener('open-vip-status', this._openStatus)
  },
  methods: {
    resolvePhotoUrl(url) {
      if (!url) return ''
      if (/^(https?:|data:|blob:)/.test(url)) return url
      return API + url
    },
    normalizeSub(s) {
      return {
        ...s,
        groupId:      s.groupId      ?? s.group_id      ?? s.group?.id    ?? null,
        betslipLink:  s.betslipLink  ?? s.betslip_link  ?? '',
        betslipCode:  s.betslipCode  ?? s.betslip_code  ?? '',
        packagePhoto: s.packagePhoto ?? s.package_photo ?? '',
        expiresAt:    s.expiresAt    ?? s.expires_at    ?? null,
        startedAt:    s.startedAt    ?? s.started_at    ?? null,
        updatedAt:    s.updatedAt    ?? s.updated_at    ?? null,
        planName:     s.planName     ?? null,
        planType:     s.planType     ?? s.plan_type     ?? '',
        oddsType:     s.oddsType     ?? s.odds_type     ?? '',
      }
    },
    /**
     * Returns true when the subscription's betslip was refreshed by admin AFTER
     * the subscription was originally activated (>2 min gap = deliberate update,
     * not the initial activation write). Used to show "⚡ Betslip Updated!" badge
     * on weekly/monthly packages where admin pushes a new betslip each day.
     */
    isBetslipUpdated(sub) {
      if (!sub.updatedAt || !sub.startedAt) return false
      const updated = new Date(sub.updatedAt)
      const started = new Date(sub.startedAt)
      return (updated - started) > 120_000 // >2 min after activation = admin refresh
    },
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
    async fetchMagicQuestion() {
      try {
        const { data } = await axios.get('/api/users/magic-question')
        this.magicQuestion = data.question || ''
      } catch { /* non-critical — form will still show */ }
    },
    planDuration(planType) {
      return { daily: '24h access', weekly: '7-day access', monthly: '30-day access', special: '24h access' }[planType] || planType
    },
    planTypeLabel(planType) {
      return { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', special: 'Special' }[planType] || (planType ? planType.charAt(0).toUpperCase() + planType.slice(1) : 'VIP')
    },
    effectiveGroupPrice(group) {
      return (group.isSpecial && group.specialPrice != null) ? group.specialPrice : group.price
    },
    async fetchUserActiveSub() {
      try {
        const user = getUser()
        if (!user || !user.id) return
        const { data: subs } = await axios.get('/api/subscriptions/user/' + user.id)
        this.userActiveSubs = subs.filter(s => s.status === 'active').map(this.normalizeSub)
      } catch { /* ignore */ }
    },
    async fetchTips() {
      try {
        const { data } = await axios.get('/api/football-tips')
        if (data && data.length > 0) {
          this.todayPicks = data.map(t => ({
            ...t,
            groupId: t.groupId ?? t.group_id ?? null,
          }))
        } else {
          this.todayPicks = [...STATIC_PICKS]
        }
      } catch { /* Server unavailable — static picks remain */ }
    },
    async fetchVipConfig() {
      try {
        const { data } = await axios.get('/api/config/vip-config')
        if (data) this.vipCfg = { ...this.vipCfg, ...data }
      } catch { /* use defaults */ }
    },
    async fetchGroups() {
      this.groupsLoading = true
      this.groupsError = ''
      try {
        const { data } = await axios.get('/api/groups')
        // Normalize: handle both snake_case (Laravel) and camelCase (Node.js)
        this.groups = data.map(g => {
          const subscriptionDeadline = g.subscriptionDeadline ?? g.subscription_deadline ?? null
          return {
            id:                   g.id,
            name:                 g.name,
            oddsType:             g.oddsType     ?? g.odds_type     ?? '',
            planType:             g.planType     ?? g.plan_type     ?? '',
            price:                parseFloat(g.price) || 0,
            betslipLink:          g.betslipLink  ?? g.betslip_link  ?? '',
            betslipCode:          g.betslipCode  ?? g.betslip_code  ?? '',
            isSpecial:            g.isSpecial    ?? g.is_special    ?? false,
            isActive:             g.isActive     ?? g.is_active     ?? true,
            specialPrice:         g.specialPrice != null ? parseFloat(g.specialPrice)
                                : g.special_price != null ? parseFloat(g.special_price) : null,
            subscriptionDeadline,
            isClosed:             (g.isClosed ?? false) || this.isDeadlineClosed(subscriptionDeadline),
            photoUrl:             g.photoUrl     ?? g.photo_url     ?? '',
          }
        })
      } catch {
        this.groupsError = 'Could not load packages. Please refresh and try again.'
      } finally {
        this.groupsLoading = false
      }
    },
    handleForcedLogout() {
      this.regUser = null
      this.userActiveSubs = []
      this.activeSub = null
      this.activeSubs = []
      if (['payment-prompt', 'processing', 'deadline-closed'].includes(this.vipStep)) {
        this.stopPolling()
        this.vipStep = 3
      }
    },
    handleUserLogin(event) {
      const user = event.detail?.user || getUser()
      if (!user) return
      this.regUser = user
      this.fetchUserActiveSub()
    },
    handleSubscriptionUpdated() {
      this.fetchUserActiveSub()
      if (this.showVipMenu && this.vipStep === 'status') this.checkStatus()
    },
    notifySubscriptionUpdated(subscription = null) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user-subscription-updated', { detail: { subscription } }))
      }
    },
    openVipMenu(groupId = null) {
      if (isLoggedIn()) {
        const stored = getUser()
        if (stored) {
          this.regUser = stored
        }
      }
      this.linkedGroupId    = groupId || null
      this.selectedGroup    = null
      this.selectedProvider = ''
      this.payPhone         = ''
      this.vipStep          = 1
      this.showVipMenu      = true
      // Re-fetch packages each open so admin changes are immediately reflected
      this.fetchGroups()
    },
    closeVip() {
      if (['payment-prompt', 'processing', 'payment-pending', 'submit-txn'].includes(this.vipStep)) {
        if (!confirm('Payment is in progress. Are you sure you want to close?')) return
      }
      this.stopPolling()
      this.showVipMenu = false
    },
    /** Allow the user to subscribe to an additional package without closing the modal */
    goToAnotherPackage() {
      this.activeSub        = null
      this.payError         = ''
      this.selectedGroup    = null
      this.selectedProvider = ''
      this.payPhone         = ''
      this.txnInput         = ''
      this.txnError         = ''
      this.linkedGroupId    = null
      this.vipStep          = 1
      this.fetchGroups()
    },
    async openMySubscriptions() {
      this.showVipMenu = true
      this.vipStep = 'status'
      this.statusError = ''
      this.statusChecked = false
      this.activeSub = null
      this.activeSubs = []
      this.pendingStatusMsg = ''

      const stored = isLoggedIn() ? getUser() : null
      if (!stored || !stored.id) {
        this.regUser = null
        this.statusError = 'Please log in to view your subscriptions.'
        this.statusChecked = true
        return
      }

      this.regUser = stored
      await this.checkStatus()
    },
    /** User manually submits Airtel Money transaction ID to verify a pending/failed payment */
    async submitTransactionId() {
      const txnId = (this.txnInput || '').trim()
      if (!txnId) {
        this.txnError = 'Please enter your transaction ID.'
        return
      }
      if (!this.processingSubId) {
        this.txnError = 'Session expired. Please restart the payment flow.'
        return
      }
      this.txnLoading = true
      this.txnError   = ''
      try {
        const { data } = await axios.post(
          '/api/subscriptions/' + this.processingSubId + '/submit-transaction',
          { transactionId: txnId }
        )
        if (data.verified) {
          this.activeSub = { ...this.normalizeSub(data.subscription), packagePhoto: this.selectedGroup?.photoUrl || data.subscription.packagePhoto || '' }
          await this.fetchUserActiveSub()
          this.notifySubscriptionUpdated(data.subscription)
          this.vipStep = 'success'
        } else {
          this.txnError = data.message || 'Transaction could not be verified.'
        }
      } catch (err) {
        this.txnError =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Verification failed. Please check your transaction ID and try again.'
      } finally {
        this.txnLoading = false
      }
    },
    goToAuthStep() {
      if (!this.selectedGroup) return
      if (this.regUser) {
        this.toPaymentPromptStep()
      } else {
        this.vipStep = 3
      }
    },
    toPaymentPromptStep() {
      this.payError = ''
      this.vipStep = 'payment-prompt'
    },
    openForgot() {
      this.forgotSubStep   = 'phone'
      this.forgotPhone     = this.loginForm.phone || ''
      this.forgotQuestion  = this.magicQuestion
      this.forgotAnswer    = ''
      this.forgotNewPassword = ''
      this.forgotError     = ''
      this.showForgotPw    = false
      this.vipStep         = 'forgot'
    },
    async fetchForgotQuestion() {
      this.forgotLoading = true
      this.forgotError   = ''
      try {
        // Just validate that the phone exists by fetching the magic question (already loaded)
        if (!this.magicQuestion) {
          const { data } = await axios.get('/api/users/magic-question')
          this.magicQuestion = data.question
        }
        this.forgotQuestion = this.magicQuestion
        this.forgotSubStep  = 'answer'
      } catch (err) {
        this.forgotError = err.response?.data?.error || 'Could not load security question. Please try again.'
      } finally {
        this.forgotLoading = false
      }
    },
    async submitPasswordReset() {
      this.forgotLoading = true
      this.forgotError   = ''
      try {
        await axios.post('/api/users/reset-password', {
          phone:       this.forgotPhone,
          answer:      this.forgotAnswer,
          newPassword: this.forgotNewPassword
        })
        this.forgotSubStep = 'done'
      } catch (err) {
        this.forgotError = err.response?.data?.error || 'Reset failed. Please check your answer and try again.'
      } finally {
        this.forgotLoading = false
      }
    },
    async registerUser() {
      if (this.regForm.password !== this.regForm.confirmPassword) {
        this.regError = 'Passwords do not match'
        return
      }
      this.regLoading = true
      this.regError = ''
      try {
        const { data } = await axios.post('/api/users', this.regForm)
        const { token, ...userInfo } = data
        this.regUser = userInfo
        if (token) saveUser(userInfo, token)
        this.toPaymentPromptStep()
      } catch (err) {
        if (err.response && err.response.status === 409) {
          this.regUser = err.response.data.user
          this.toPaymentPromptStep()
        } else {
          this.regError = this.getApiErrorMessage(err, 'Registration failed. Please try again.')
        }
      } finally {
        this.regLoading = false
      }
    },
    async loginUser() {
      this.regLoading = true
      this.regError = ''
      try {
        const { data } = await axios.post('/api/users/login', {
          phone: this.loginForm.phone,
          password: this.loginForm.password
        })
        const userPayload = data.user || data
        const { token, ...userInfo } = userPayload
        this.regUser = userInfo
        if (token) saveUser(userInfo, token)
        this.toPaymentPromptStep()
      } catch (err) {
        this.regError = this.getApiErrorMessage(err, 'Login failed. Please check your phone and password.')
      } finally {
        this.regLoading = false
      }
    },
    async submitPayment() {
      if (!this.selectedProvider || !this.payPhone || !this.selectedGroup || !this.regUser) return
      this.payLoading = true
      this.payError = ''
      try {
        const { data } = await axios.post('/api/subscriptions', {
          userId:        this.regUser.id,
          groupId:       this.selectedGroup.id,
          paymentMethod: this.selectedProvider,
          phone:         this.payPhone
        })
        this.processingSubId = data.subscription?.id || null
        this.pollCount = 0
        this.pollError = ''
        this.vipStep = 'processing'
        this.startPolling()
      } catch (err) {
        if (err.response?.status === 409 && err.response?.data?.existingSubscriptionId) {
          // Duplicate-submit guard on backend: continue watching the already pending request.
          this.processingSubId = err.response.data.existingSubscriptionId
          this.pollCount = 0
          this.pollError = ''
          this.vipStep = 'processing'
          this.startPolling()
        } else if (err.response?.status === 422 && err.response?.data?.alternatives) {
          // Package closed by deadline — show alternatives
          this.deadlineMessage      = err.response.data.message
          this.deadlineAlternatives = err.response.data.alternatives
          this.vipStep = 'deadline-closed'
        } else {
          this.payError = err.response?.data?.error || err.response?.data?.message
            || 'Payment initiation failed. Please try again.'
        }
      } finally {
        this.payLoading = false
      }
    },
    startPolling() {
      this.pollSecondsLeft = 180
      this._pollCountdownInterval = setInterval(() => {
        if (this.pollSecondsLeft > 0) this.pollSecondsLeft--
      }, 1000)
      this._payPollInterval = setInterval(async () => {
        this.pollCount++
        if (this.pollCount > 36) {  // 36 × 5s = 3 min
          this.stopPolling()
          this.vipStep = 'payment-pending'
          return
        }
        try {
          const { data } = await axios.get('/api/subscriptions/' + this.processingSubId + '/payment-status')
          if (data.status === 'active') {
            this.stopPolling()
            this.activeSub = { ...this.normalizeSub(data.subscription), packagePhoto: this.selectedGroup?.photoUrl || data.subscription.packagePhoto || '' }
            await this.fetchUserActiveSub()
            this.notifySubscriptionUpdated(data.subscription)
            this.vipStep = 'success'
          } else if (data.status === 'failed') {
            this.stopPolling()
            this.pollError = 'Payment was not successful. Please try again.'
          }
          // still pending — keep polling
        } catch { /* network hiccup — keep polling */ }
      }, 5000)
    },
    stopPolling() {
      if (this._payPollInterval) {
        clearInterval(this._payPollInterval)
        this._payPollInterval = null
      }
      if (this._pollCountdownInterval) {
        clearInterval(this._pollCountdownInterval)
        this._pollCountdownInterval = null
      }
    },
    async checkStatus() {
      this.statusLoading = true
      this.statusError = ''
      this.statusChecked = false
      this.activeSub = null
      this.activeSubs = []
      this.pendingStatusMsg = ''
      try {
        const loggedInUser = isLoggedIn() ? (this.regUser || getUser()) : null
        if (!loggedInUser || !loggedInUser.id) {
          this.statusError = 'Please log in to view your subscriptions.'
          this.statusChecked = true
          return
        }
        const { data: subs } = await axios.get('/api/subscriptions/user/' + loggedInUser.id)
        const allActive = subs.filter(s => s.status === 'active').map(this.normalizeSub)
        if (allActive.length) {
          this.activeSub  = allActive[0]
          this.activeSubs = allActive
        } else {
          const pending = subs.find(s => s.status === 'pending')
          this.pendingStatusMsg = pending
            ? '⏳ Payment pending — awaiting confirmation. Check back soon.'
            : 'No active subscription found for this account.'
        }
        this.statusChecked = true
      } catch (err) {
        this.statusError = err.response?.status === 401
          ? 'Please log in again to view your subscriptions.'
          : 'Could not load your subscriptions. Please try again.'
        this.statusChecked = true
      } finally {
        this.statusLoading = false
      }
    },
    formatExpiry(ts) {
      if (!ts) return 'N/A'
      return new Date(ts).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
    },
    kampalaNowInput() {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Kampala',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(new Date()).reduce((acc, part) => {
        acc[part.type] = part.value
        return acc
      }, {})
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
    },
    normalizeDeadlineForCompare(value) {
      if (!value) return ''
      if (/^\d{2}:\d{2}$/.test(value)) return `${this.kampalaNowInput().slice(0, 10)}T${value}`
      return String(value).slice(0, 16)
    },
    isDeadlineClosed(value) {
      const deadline = this.normalizeDeadlineForCompare(value)
      return !!deadline && this.kampalaNowInput() > deadline
    },
    formatDeadline(value) {
      if (!value) return ''
      const normalized = this.normalizeDeadlineForCompare(value)
      const date = new Date(normalized)
      if (Number.isNaN(date.getTime())) return value
      return date.toLocaleString('en-UG', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    },
    async copyCode(code) {
      try {
        await navigator.clipboard.writeText(code)
        this.copied = true
        setTimeout(() => { this.copied = false }, 2000)
      } catch { /* clipboard denied */ }
    }
  }
}
</script>

<style scoped>
.featured {
  background: var(--dark);
  padding: 80px 0;
  position: relative;
  overflow: hidden;
}

/* ── Floating football decorations ── */
.fb-decos {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.fb-deco {
  position: absolute;
  animation: fbFloat 7s ease-in-out infinite;
  user-select: none;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
}
@keyframes fbFloat {
  0%, 100% { transform: translateY(0) rotate(-4deg) scale(1); }
  50%       { transform: translateY(-18px) rotate(6deg) scale(1.04); }
}

/* ── Pitch ribbon ── */
.pitch-ribbon {
  position: relative;
  height: 90px;
  overflow: hidden;
  margin-bottom: 60px;
}
.pitch-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.pitch-ribbon-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.75);
  text-transform: uppercase;
}
.ball-cartoon { flex-shrink: 0; }

/* ── Container ── */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}
.picks-container { padding-bottom: 60px; }

.section-header { margin-bottom: 36px; }
.sh-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.sh-left h2 {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 1px;
  color: var(--white);
}
.gold-text { color: var(--gold); }
.section-sub {
  color: var(--text-muted);
  font-size: 14px;
  margin-top: 6px;
}
.today-date-badge {
  background: rgba(255, 215, 0, 0.08);
  border: 1px solid rgba(255, 215, 0, 0.25);
  color: var(--gold);
  font-size: 12px;
  font-weight: 700;
  padding: 6px 16px;
  border-radius: 20px;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

/* ── Picks grid ── */
.picks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

@keyframes hotDeal {
  0%, 100% { border-color: rgba(255,255,255,0.07); box-shadow: none; }
  50%       { border-color: rgba(255,215,0,0.7);   box-shadow: 0 0 22px rgba(255,215,0,0.22); }
}

.pick-card {
  background: var(--dark-card);
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.07);
  overflow: hidden;
  transition: transform 0.25s, box-shadow 0.25s;
  display: flex;
  flex-direction: column;
  animation: hotDeal 2.8s ease-in-out infinite;
}
.pick-card:nth-child(2) { animation-delay: 0.7s; }
.pick-card:nth-child(3) { animation-delay: 1.4s; }
.pick-card:nth-child(4) { animation-delay: 2.1s; }
.pick-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 36px rgba(0,0,0,0.35);
}

/* Kit top strip */
/* Image bar */
.pick-img-bar {
  width: 100%;
  position: relative;
  background: rgba(255,255,255,0.03);
  overflow: hidden;
}
.pick-card-img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}
.pick-img-placeholder {
  width: 100%;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,215,0,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

/* Body */
.pick-body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
/* Caption */
.pick-caption {
  font-size: 13px;
  font-weight: 600;
  color: var(--white);
  line-height: 1.5;
  margin: 0;
  opacity: 0.92;
}

/* ── Win probability bar ── */
.pick-prob-bar { display: flex; flex-direction: column; gap: 5px; }
.pick-prob-header { display: flex; align-items: center; justify-content: space-between; }
.pick-prob-label { font-size: 9px; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; }
.pick-prob-val { font-size: 13px; font-weight: 900; color: var(--gold); }
.pick-prob-track { height: 4px; background: rgba(255,255,255,0.07); border-radius: 4px; overflow: hidden; }
.pick-prob-fill { height: 100%; background: linear-gradient(90deg, var(--gold-dark), var(--gold)); border-radius: 4px; transition: width 0.8s ease; }

/* ── Locked tip row ── */
.pick-locked-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 10px 12px;
}
.lock-icon { font-size: 18px; flex-shrink: 0; }
.lock-text-wrap { display: flex; flex-direction: column; gap: 2px; }
.lock-text { font-size: 13px; color: var(--text-muted); font-weight: 600; }
.lock-sub  { font-size: 10px; color: rgba(170,170,170,0.45); }

@keyframes vipBeep {
  0%   { box-shadow: 0 0 0 0    rgba(255,215,0,0.7); }
  60%  { box-shadow: 0 0 0 10px rgba(255,215,0,0); }
  100% { box-shadow: 0 0 0 0    rgba(255,215,0,0); }
}

/* VIP button inside pick card */
.pick-vip-btn {
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  color: var(--dark);
  border: none;
  border-radius: 20px;
  padding: 7px 14px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s, transform 0.1s;
  animation: vipBeep 1.6s ease-out infinite;
}
.pick-vip-btn:hover { opacity: 0.88; transform: scale(1.04); }

/* VIP active tag (replaces Join VIP button when user has active sub) */
.pick-vip-active-tag {
  background: linear-gradient(135deg, #1a7a1a, #2eb82e);
  color: #fff;
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.pick-vip-plans-btn {
  background: rgba(46,184,46,0.12);
  border: 1px solid rgba(46,184,46,0.35);
  border-radius: 20px;
  color: #66bb6a;
  font-size: 11px;
  font-weight: 800;
  padding: 6px 10px;
  cursor: pointer;
  white-space: nowrap;
  margin-left: 4px;
  transition: background 0.18s, color 0.18s;
}
.pick-vip-plans-btn:hover {
  background: rgba(46,184,46,0.2);
  color: #8ee08e;
}
/* Add-another-package ＋ button beside VIP tag */
.pick-vip-add-btn {
  background: rgba(255,215,0,0.12);
  border: 1px solid rgba(255,215,0,0.3);
  border-radius: 50%;
  width: 26px;
  height: 26px;
  color: var(--gold);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  flex-shrink: 0;
  padding: 0;
  line-height: 1;
  transition: background 0.18s;
}
.pick-vip-add-btn:hover { background: rgba(255,215,0,0.25); }

/* Revealed tip row (replaces lock row for active VIP) */
.pick-revealed-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: rgba(46, 184, 46, 0.08);
  border: 1px solid rgba(46, 184, 46, 0.25);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
}
.unlock-icon { font-size: 16px; flex-shrink: 0; }
.pick-tip-text { font-size: 13px; color: var(--text); font-weight: 600; line-height: 1.4; }

/* VIP betslip banner above picks */
.vip-betslip-banner {
  background: linear-gradient(135deg, rgba(26,122,26,0.15), rgba(46,184,46,0.08));
  border: 1px solid rgba(46,184,46,0.35);
  border-radius: 14px;
  padding: 18px 22px;
  margin-bottom: 28px;
}
.vip-sub-plan-title {
  font-size: 16px;
  font-weight: 900;
  color: var(--gold, #FFD700);
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  text-transform: uppercase;
}
.vip-betslip-header {
  font-size: 13px;
  font-weight: 800;
  color: #2eb82e;
  letter-spacing: 1px;
  margin-bottom: 14px;
}
.betslip-pending-note {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 8px 0;
}

.pick-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pick-time {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-muted);
}

/* ── VIP Modal new styles ── */
.mm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  backdrop-filter: blur(4px);
}
.mm-sheet {
  background: var(--dark-card);
  border: 1px solid var(--gold-dark);
  border-bottom: none;
  border-radius: 24px 24px 0 0;
  padding: 32px 24px 48px;
  width: 100%;
  max-width: 500px;
  position: relative;
  text-align: center;
  animation: sheetUp 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  max-height: 92vh;
  overflow-y: auto;
}
@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.mm-close {
  position: absolute; top: 16px; right: 20px;
  background: none; border: none; color: var(--text-muted);
  font-size: 20px; cursor: pointer; line-height: 1; transition: color 0.2s;
}
.mm-close:hover { color: var(--gold); }
.mm-icon  { font-size: 46px; margin-bottom: 10px; }
.mm-title { font-size: 22px; font-weight: 900; color: var(--white); margin-bottom: 6px; }
.mm-sub   { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }
.mm-plans { display: flex; gap: 12px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }
.mm-plan {
  background: var(--dark-3);
  border: 2px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 16px 20px;
  display: flex; flex-direction: column; gap: 4px;
  position: relative; min-width: 120px;
  cursor: pointer; transition: border-color 0.2s, background 0.2s;
}
.mm-plan.selectable:hover { border-color: rgba(255,215,0,0.4); }
.mm-plan.selected { border-color: var(--gold); background: rgba(255,215,0,0.06); }
.mm-plan.plan-popular { border-color: var(--gold-dark); }
.plan-badge {
  position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
  background: var(--gold); color: var(--dark);
  font-size: 8px; font-weight: 800; padding: 3px 10px; border-radius: 10px;
  white-space: nowrap; letter-spacing: 0.5px;
}
.plan-name  { font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
.plan-price { font-size: 18px; font-weight: 900; color: var(--gold); margin-top: 4px; }
.plan-period{ font-size: 11px; color: var(--text-muted); }

.mm-next-btn {
  display: flex; align-items: center; justify-content: center;
  width: 100%; padding: 14px;
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  color: var(--dark); border: none; border-radius: 14px;
  font-size: 15px; font-weight: 800; cursor: pointer;
  margin-bottom: 12px; transition: opacity 0.2s;
}
.mm-next-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mm-next-btn:not(:disabled):hover { opacity: 0.88; }
.mm-check-link { font-size: 12px; color: var(--gold); cursor: pointer; text-decoration: underline; margin-top: 4px; }
.mm-forgot-link { font-size: 12px; color: var(--gold); cursor: pointer; text-decoration: underline; text-align: center; margin-top: 10px; }
.mm-forgot-link:hover { opacity: 0.8; }
.security-q-label { font-size: 12px; font-weight: 700; color: var(--gold); margin-bottom: 2px; }
.security-q-text { font-size: 13px; color: var(--text-light, #ddd); font-style: italic; background: rgba(255,215,0,0.07); border-left: 3px solid var(--gold); padding: 8px 12px; border-radius: 6px; margin: 0 0 8px; line-height: 1.5; }
.security-q-hint { font-size: 11px; color: rgba(170,170,170,0.7); margin-top: 4px; line-height: 1.5; }
.mm-back { font-size: 12px; color: var(--text-muted); cursor: pointer; margin-top: 8px; }
.mm-back:hover { color: var(--gold); }
.mm-note { font-size: 11px; color: rgba(170,170,170,0.5); line-height: 1.6; margin-top: 10px; }

/* Registration form */
.reg-tabs { display: flex; gap: 0; margin-bottom: 18px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,215,0,0.2); }
.reg-tab { flex: 1; padding: 10px; background: transparent; border: none; color: var(--text-muted); font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s, color 0.2s; }
.reg-tab.active { background: rgba(255,215,0,0.12); color: var(--gold); }
.reg-form { text-align: left; margin-bottom: 8px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field label { font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; }
.field input {
  background: var(--input-bg, #1a1a1a); border: 1px solid rgba(255,215,0,0.2);
  border-radius: 9px; padding: 11px 14px; color: var(--white);
  font-size: 14px; outline: none; transition: border-color 0.2s; width: 100%;
}
.field input:focus { border-color: rgba(255,215,0,0.5); }
.field input::placeholder { color: var(--text-muted); opacity: 0.6; }
.pw-wrap { position: relative; display: flex; }
.pw-wrap input { flex: 1; padding-right: 44px !important; }
.pw-eye { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; color: rgba(255,255,255,0.45); padding: 4px; line-height: 1; }
.pw-eye:hover { color: var(--gold, #ffd700); }
/* Logged-in box (step 2 when account already set) */
.logged-in-box { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,215,0,0.2); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; }
.li-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--gold-dark,#b8860b), var(--gold,#ffd700)); color: #0a0a0a; font-weight: 900; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.li-info { flex: 1; min-width: 0; }
.li-name { font-weight: 700; font-size: 14px; color: var(--white); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.li-phone { font-size: 12px; color: var(--text-muted,#aaa); }
.li-change { background: none; border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; color: var(--text-muted,#aaa); font-size: 12px; padding: 5px 10px; cursor: pointer; white-space: nowrap; }
.li-change:hover { border-color: var(--gold,#ffd700); color: var(--gold,#ffd700); }

/* Provider cards */
.provider-cards { display: flex; gap: 12px; justify-content: center; margin-bottom: 16px; }
.provider-card {
  flex: 1; max-width: 150px; padding: 16px 12px;
  background: var(--dark-3); border: 2px solid rgba(255,255,255,0.07);
  border-radius: 14px; cursor: pointer; text-align: center;
  transition: border-color 0.2s; min-width: 100px; position: relative;
}
.provider-card.selected { border-color: var(--gold); background: rgba(255,215,0,0.05); }
.provider-card--disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
.coming-soon-badge { position: absolute; top: -9px; right: -6px; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; background: #444; color: #bbb; border-radius: 6px; padding: 2px 6px; white-space: nowrap; }
.provider-logo { font-size: 15px; font-weight: 900; padding: 8px 14px; border-radius: 8px; display: inline-block; margin-bottom: 8px; }
.mtn-logo   { background: #FFCC00; color: #000; }
.airtel-logo{ background: #ED1C24; color: #fff; }
.provider-name { font-size: 12px; font-weight: 700; color: var(--white); margin-bottom: 4px; }
.provider-num  { font-size: 11px; color: var(--gold); font-weight: 600; }

/* Payment instructions */
.payment-instructions {
  background: rgba(255,215,0,0.04); border: 1px solid rgba(255,215,0,0.15);
  border-radius: 12px; padding: 16px; text-align: left; margin-bottom: 16px;
}
.instr-title { font-size: 12px; font-weight: 700; color: var(--gold); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; }
.instr-list { padding-left: 18px; color: var(--text-muted); font-size: 13px; line-height: 1.8; }
.instr-list strong { color: var(--white); }
.pay-amount-badge {
  margin-top: 12px; background: rgba(255,215,0,0.1);
  border-radius: 8px; padding: 8px 12px; font-size: 14px;
  font-weight: 800; color: var(--gold); display: flex;
  align-items: center; justify-content: space-between;
}
.pay-plan-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; background: var(--gold); color: var(--dark); padding: 2px 8px; border-radius: 8px; }

/* Pending box */
/* Proof upload */
.proof-upload-block { margin: 14px 0; text-align: left; }
.proof-upload-label { font-size: 12px; color: #aaa; margin-bottom: 8px; }
.proof-optional { color: #666; }
.proof-file-btn {
  display: block; cursor: pointer; background: rgba(255,255,255,0.04);
  border: 1px dashed rgba(255,215,0,0.3); border-radius: 8px; padding: 10px 14px;
  font-size: 12px; color: #888; text-align: center; transition: border-color 0.2s;
}
.proof-file-btn:hover { border-color: rgba(255,215,0,0.6); color: #FFD700; }
.proof-file-input { display: none; }
.proof-preview-thumb { display: block; width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-top: 10px; border: 1px solid rgba(255,215,0,0.25); }
.late-proof { background: rgba(255,215,0,0.03); border: 1px solid rgba(255,215,0,0.1); border-radius: 10px; padding: 14px; }
.proof-upload-send-btn { margin-top: 10px; width: 100%; padding: 10px; background: rgba(255,215,0,0.15); border: 1px solid rgba(255,215,0,0.3); color: #FFD700; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; }
.proof-upload-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.proof-sent-msg { color: #4caf50; font-size: 13px; margin-top: 8px; }

.pending-box {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 16px; margin-bottom: 16px; text-align: left;
}
.pending-row { display: flex; justify-content: space-between; font-size: 13px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.pending-row:last-child { border-bottom: none; }
.pending-row span { color: var(--text-muted); }
.pending-row strong { color: var(--white); }
.status-pending { background: rgba(255,165,0,0.15); color: #FFA500; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 10px; }

/* Betslip access card */
.betslip-box {
  background: rgba(0,200,83,0.05);
  border: 1px solid rgba(0,200,83,0.2);
  border-radius: 14px;
  padding: 18px;
  overflow: hidden;
  margin-bottom: 16px;
  text-align: left;
}
.betslip-box.betslip-box--reveal {
  padding: 0;
  border-color: rgba(255,215,0,0.35);
  animation: revealGlow 2.8s ease-in-out infinite;
}
@keyframes revealGlow {
  0%, 100% { box-shadow: 0 0 16px rgba(255,215,0,0.07); border-color: rgba(255,215,0,0.30); }
  50%       { box-shadow: 0 0 30px rgba(255,215,0,0.18); border-color: rgba(255,215,0,0.60); }
}
.betslip-content { padding: 14px 16px; }

/* ── Success photo hero (full-bleed inside card) ── */
.success-photo-hero {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.success-photo-img {
  width: 100%;
  height: 215px;
  object-fit: cover;
  display: block;
  transition: transform 0.45s ease;
}
.success-photo-hero:hover .success-photo-img { transform: scale(1.04); }
.success-photo-overlay {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 54px 14px 14px;
  background: linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.12) 55%, transparent 100%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.success-photo-name {
  font-size: 15px;
  font-weight: 900;
  color: #fff;
  letter-spacing: 0.4px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.9);
  flex: 1;
  min-width: 0;
}
.success-photo-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* ── Subscription-list photo (My Subscriptions view) ── */
.sub-card-photo-wrap {
  position: relative;
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid rgba(255,215,0,0.12);
}
.sub-card-photo {
  width: 100%;
  height: 130px;
  object-fit: cover;
  display: block;
}
.sub-card-photo-overlay {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 30px 10px 8px;
  background: linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%);
}
.sub-card-photo-name {
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
}
/* Package name title inside betslip box */
.betslip-plan-title { font-size: 15px; font-weight: 800; color: var(--gold); letter-spacing: 0.5px; margin-bottom: 6px; }
/* "⚡ Betslip Updated!" badge for weekly/monthly refreshes */
.betslip-updated-badge { display: inline-block; background: rgba(79,195,247,0.15); color: #4fc3f7; border: 1px solid rgba(79,195,247,0.3); border-radius: 20px; font-size: 11px; font-weight: 700; padding: 3px 12px; margin-bottom: 8px; }
.betslip-badge { background: rgba(0,200,83,0.15); color: #00c853; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 8px; }
.betslip-exp { font-size: 11px; color: var(--text-muted); margin-bottom: 14px; }
.betslip-section { margin-bottom: 14px; }
.betslip-label { font-size: 11px; font-weight: 700; color: #888; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
.betslip-link { color: var(--gold); font-size: 12px; word-break: break-all; display: block; text-decoration: underline; }
.betslip-link:hover { opacity: 0.8; }
.betslip-code-row { display: flex; align-items: center; gap: 10px; }
.betslip-code { background: var(--dark-3); padding: 8px 14px; border-radius: 8px; font-size: 16px; color: var(--gold); font-family: monospace; letter-spacing: 2px; flex: 1; }
.copy-btn { background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); color: var(--gold); font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 8px; cursor: pointer; white-space: nowrap; }
.copy-btn:hover { background: rgba(255,215,0,0.2); }
.whatsapp-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 13px; background: #25D366; color: #fff;
  border: none; border-radius: 12px; font-size: 14px; font-weight: 800;
  cursor: pointer; text-decoration: none; margin-top: 12px;
  transition: opacity 0.2s;
}
.whatsapp-btn:hover { opacity: 0.88; color: #fff; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.25s; }
.modal-fade-enter-from, .modal-fade-leave-to       { opacity: 0; }

/* Processing spinner */
.processing-spinner {
  width: 52px; height: 52px; margin: 24px auto;
  border: 4px solid rgba(255, 215, 0, 0.2);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.poll-countdown {
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  color: var(--gold);
  letter-spacing: 2px;
  margin: 4px 0 12px;
  font-variant-numeric: tabular-nums;
}

/* Goalpost accent */
.goalpost-accent { display: flex; justify-content: center; opacity: 0.5; margin-top: 8px; }

/* Responsive */
@media (max-width: 640px) {
  .picks-grid { grid-template-columns: 1fr; }
  .sh-row     { flex-direction: column; align-items: flex-start; }
}

/* ── Secret Code Step ── */
.secret-code-box {
  background: rgba(255, 215, 0, 0.06);
  border: 2px solid rgba(255, 215, 0, 0.4);
  border-radius: 16px;
  padding: 24px 20px;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.secret-code-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 2px;
  text-transform: uppercase;
}
.secret-code-display {
  font-size: 28px;
  font-weight: 900;
  font-family: monospace;
  color: var(--gold);
  letter-spacing: 4px;
  background: var(--dark-3);
  padding: 14px 24px;
  border-radius: 10px;
  border: 1px solid rgba(255, 215, 0, 0.2);
  word-break: break-all;
  text-align: center;
}
.secret-copy-btn {
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.4);
  color: var(--gold);
  font-size: 13px;
  font-weight: 700;
  padding: 8px 24px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}
.secret-copy-btn:hover { background: rgba(255, 215, 0, 0.25); }
.secret-warning {
  background: rgba(255, 100, 0, 0.08);
  border: 1px solid rgba(255, 100, 0, 0.25);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 12px;
  color: #ffb347;
  line-height: 1.6;
  text-align: left;
  margin-bottom: 8px;
}

/* ── Package Selection List (Step 1) ── */
.pkg-loading { color: var(--text-muted); padding: 32px; text-align: center; font-size: 14px; }
.pkg-error   { color: #ff6b6b; padding: 12px; text-align: center; font-size: 13px; }
.pkg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 28px 16px 20px;
  margin-bottom: 20px;
  background: rgba(255,215,0,0.04);
  border: 1px solid rgba(255,215,0,0.12);
  border-radius: 12px;
}
.pkg-empty-icon { margin-bottom: 12px; opacity: 0.85; }
.pkg-empty-title {
  font-size: 15px;
  font-weight: 700;
  color: #FFD700;
  letter-spacing: 0.3px;
  margin: 0 0 8px;
}
.pkg-empty-body {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 280px;
  margin: 0 0 14px;
}
.pkg-empty-wa {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #25D366;
  background: rgba(37,211,102,0.1);
  border: 1px solid rgba(37,211,102,0.22);
  border-radius: 20px;
  padding: 6px 14px;
  text-decoration: none;
  transition: background 0.2s;
}
.pkg-empty-wa:hover { background: rgba(37,211,102,0.18); }

.pkg-grid {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-bottom: 20px;
}

.pkg-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255,255,255,0.03);
  border: 1.5px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 13px 14px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.15s;
  position: relative;
  overflow: hidden;
}
.pkg-row::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: transparent;
  border-radius: 14px 0 0 14px;
  transition: background 0.2s;
}
.pkg-row:hover {
  border-color: rgba(255,215,0,0.3);
  background: rgba(255,215,0,0.03);
  transform: translateX(2px);
}
.pkg-row:hover::before { background: rgba(255,215,0,0.5); }

.pkg-row--selected {
  border-color: var(--gold, #FFD700);
  background: rgba(255,215,0,0.07);
}
.pkg-row--selected::before { background: var(--gold, #FFD700); }

.pkg-row--special { border-color: rgba(171,71,188,0.3); }
.pkg-row--special:hover { border-color: rgba(171,71,188,0.55); background: rgba(171,71,188,0.04); }
.pkg-row--special:hover::before { background: rgba(171,71,188,0.6); }
.pkg-row--special.pkg-row--selected { border-color: #ab47bc; background: rgba(171,71,188,0.09); }
.pkg-row--special.pkg-row--selected::before { background: #ab47bc; }

.pkg-row--closed { opacity: 0.5; cursor: not-allowed !important; pointer-events: none; }
.pkg-closed-badge {
  display: inline-block;
  font-size: 10px; font-weight: 800;
  background: #e53935; color: #fff;
  border-radius: 5px; padding: 2px 6px;
  margin-left: 6px; vertical-align: middle;
  letter-spacing: 0.5px;
}
.pkg-tag--time    { background: rgba(100,181,246,0.18); color: #64b5f6; }
.pkg-tag--closed  { background: rgba(229,57,53,0.18);   color: #ef9a9a; }
.mm-back {
  margin-top: 12px; font-size: 13px;
  color: var(--text-muted); cursor: pointer;
  text-decoration: underline;
}
.mm-back:hover { color: var(--gold, #FFD700); }

/* Icon circle */
.pkg-icon-wrap {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  font-weight: 900;
}
.pkg-icon-daily   { background: rgba(255,215,0,0.13); color: var(--gold, #FFD700); font-size: 17px; }
.pkg-icon-weekly  { background: rgba(79,195,247,0.13); color: #4fc3f7; font-size: 17px; }
.pkg-icon-monthly { background: rgba(102,187,106,0.13); color: #66bb6a; font-size: 17px; }
.pkg-icon-special { background: rgba(171,71,188,0.15); color: #ce93d8; font-size: 22px; }
.pkg-icon-val { line-height: 1; }

/* Middle: name + tags */
.pkg-meta { flex: 1; min-width: 0; text-align: left; }
.pkg-name  { font-size: 14px; font-weight: 700; color: var(--white, #fff); margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pkg-tags  { display: flex; gap: 5px; flex-wrap: wrap; }
.pkg-tag {
  font-size: 9px; font-weight: 700; letter-spacing: 0.4px;
  text-transform: uppercase; padding: 2px 7px; border-radius: 7px;
  background: rgba(255,255,255,0.07); color: var(--text-muted, #888);
}
.pkg-tag--orange { background: rgba(251,140,0,0.14); color: #fb8c00; }
.pkg-tag--purple { background: rgba(171,71,188,0.14); color: #ce93d8; }

/* Price */
.pkg-price-col { text-align: right; flex-shrink: 0; }
.pkg-price    { font-size: 18px; font-weight: 900; color: var(--gold, #FFD700); line-height: 1.1; letter-spacing: -0.3px; }
.pkg-currency { font-size: 9px; font-weight: 700; color: var(--text-muted, #888); letter-spacing: 1px; text-transform: uppercase; }

/* Checkmark */
.pkg-check-col { flex-shrink: 0; }
.pkg-check {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.18);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800;
  color: transparent;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}
.pkg-check--on {
  background: var(--gold, #FFD700);
  border-color: var(--gold, #FFD700);
  color: var(--dark, #0a0a0a);
}
</style>
