// src/composables/useAuth.js
import { ref, computed } from 'vue'
import userManager from '../auth/oidc'

const user = ref(null)
const authError = ref(null)
const initialized = ref(false)

userManager.events.addUserLoaded((u) => { user.value = u })
userManager.events.addUserUnloaded(() => { user.value = null })
userManager.events.addSilentRenewError(() => {
  user.value = null
  userManager.signoutRedirect()
})

async function initAuth() {
  try {
    const u = await userManager.getUser()
    user.value = u && !u.expired ? u : null
  } catch (e) {
    authError.value = 'Cannot reach identity provider'
  } finally {
    initialized.value = true
  }
}

function login() {
  return userManager.signinRedirect()
}

function logout() {
  return userManager.signoutRedirect()
}

export function useAuth() {
  return {
    user,
    isAuthenticated: computed(() => !!user.value),
    authError,
    initialized,
    initAuth,
    login,
    logout,
  }
}
