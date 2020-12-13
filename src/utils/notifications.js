import { Notify } from 'quasar'
import { notificationTimeout } from './constants'
// import { remote } from 'electron'

// Error notifications

const negativeNotify = function (text) {
  Notify.create({
    message: '<div class="text-center"> ' + text + ' </div>',
    html: true,
    color: 'negative'
  })
}

export const errorNotify = function (err) {
  console.error(err)
  if (err.response) {
    console.error(err.response)
  }
  negativeNotify(err.message)
}

// Info notifications

export const infoNotify = function (text) {
  Notify.create({
    message: '<div class="text-center"> ' + text + ' </div>',
    html: true,
    color: 'accent'
  })
}

export const addressCopiedNotify = function () {
  infoNotify('Address copied to clipboard.')
}

export const insufficientStampNotify = function () {
  infoNotify('Stamp is too small, receiver will not be notified.')
}

export const seedCopiedNotify = function () {
  infoNotify('Seed phrase copied to clipboard.')
}

export const sentTransactionNotify = function () {
  Notify.create({
    message: '<div class="text-center"> Sent transaction </div>',
    html: true,
    color: 'accent',
    actions: [
      { label: 'View', color: 'secondary', handler: () => { /* ... */ } }
    ]
  })
}
export const desktopNotify = function (title, body, icon, callback) {
  const notify = new window.Notification(title, {
    title,
    body,
    icon
  })
  notify.onclick = () => {
    // const window = remote.getCurrentWindow()
    window.show()
    callback()
    notify.close()
  }
  setTimeout(notify.close.bind(notify), notificationTimeout)
}
