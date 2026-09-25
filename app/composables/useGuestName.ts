const STORAGE_KEY = 'present-picker:guest-name'

/** Remembers the guest's name on their device so they don't have to retype it for every gift. */
export function useGuestName() {
  const name = useState('guest-name', () => '')

  onMounted(() => {
    if (name.value) return
    try {
      name.value = localStorage.getItem(STORAGE_KEY) ?? ''
    } catch {
      // Storage can be unavailable (private mode); the name just won't be prefilled.
    }
  })

  function remember(value: string) {
    name.value = value
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Ignore, see above.
    }
  }

  return { name, remember }
}
