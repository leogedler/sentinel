import { onMounted, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/shared/stores/auth.store'
import { extractError } from '@/shared/composables/useApi'

declare const google: {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void
    }
  }
}

export function useGoogleAuth(buttonEl: Ref<HTMLElement | null>, errorMsg: Ref<string>) {
  const auth = useAuthStore()
  const router = useRouter()
  const googleLoading = ref(false)

  async function handleCredential(response: { credential: string }) {
    errorMsg.value = ''
    googleLoading.value = true
    try {
      await auth.loginWithGoogle(response.credential)
      await router.push('/clients')
    } catch (err) {
      errorMsg.value = extractError(err)
    } finally {
      googleLoading.value = false
    }
  }

  onMounted(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId || !buttonEl.value) return

    google.accounts.id.initialize({ client_id: clientId, callback: handleCredential })
    google.accounts.id.renderButton(buttonEl.value, {
      theme: 'outline',
      size: 'large',
      width: buttonEl.value.offsetWidth,
      text: 'continue_with',
      shape: 'rectangular',
    })
  })

  return { googleLoading }
}
