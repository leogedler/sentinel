import { ref } from 'vue'

export interface Notification {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

const notifications = ref<Notification[]>([])
let seq = 0

function add(message: string, type: Notification['type'] = 'info', duration = 4000) {
  const id = ++seq
  notifications.value.push({ id, type, message })
  setTimeout(() => remove(id), duration)
}

function remove(id: number) {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

export function useNotification() {
  return {
    notifications,
    add,
    remove,
    success: (msg: string) => add(msg, 'success'),
    error: (msg: string) => add(msg, 'error'),
    info: (msg: string) => add(msg, 'info'),
  }
}
