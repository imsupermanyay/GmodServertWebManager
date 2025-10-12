import { defineStore } from 'pinia'

let seed = 0

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    items: []
  }),

  actions: {
    push({ title, message, type = 'info', duration = 4000 }) {
      const id = ++seed
      const notification = {
        id,
        title,
        message,
        type,
        createdAt: Date.now()
      }

      this.items.push(notification)

      if (duration) {
        setTimeout(() => {
          this.remove(id)
        }, duration)
      }

      return id
    },

    success(message, options = {}) {
      return this.push({ type: 'success', message, ...options })
    },

    error(message, options = {}) {
      return this.push({ type: 'error', message, ...options })
    },

    warning(message, options = {}) {
      return this.push({ type: 'warning', message, ...options })
    },

    info(message, options = {}) {
      return this.push({ type: 'info', message, ...options })
    },

    remove(id) {
      this.items = this.items.filter((item) => item.id !== id)
    },

    clear() {
      this.items = []
    }
  }
})

