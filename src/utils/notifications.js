import { Notify } from 'quasar'
import { notificationTimeout } from './constants'
const remote = require('electron').remote

// Error notifications

const negativeNotify = function (text) {
  Notify.create({
    message: '<div class="text-center"> ' + text + ' </div>',
    html: true,
    color: 'negative'
  })
}

export function errorNotify (error) {
  console.error(error)
  negativeNotify(error.message)
}

// Info notifications
export function infoNotify (text) {
  Notify.create({
    message: '<div class="text-center"> ' + text + ' </div>',
    html: true,
    color: 'accent'
  })
}

export const desktopNotify = function (title, body, icon, callback) {
  const notify = new window.Notification(title, {
    title,
    body,
    icon
  })
  notify.onclick = () => {
    const window = remote.getCurrentWindow()
    window.show()
    callback()
    notify.close()
  }
  setTimeout(notify.close.bind(notify), notificationTimeout)
}
