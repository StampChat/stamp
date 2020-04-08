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

export const chainTooLongNotify = function () {
  negativeNotify('Transaction chain too long or relay fee too low.')
}

export const insuffientFundsNotify = function () {
  negativeNotify('Insufficent funds.')
}

export const walletDisconnectedNotify = function () {
  negativeNotify('Unable to contact wallet server.')
}

export const keyserverDisconnectedNotify = function () {
  negativeNotify('Unable to contact keyserver.')
}

export const relayDisconnectedNotify = function () {
  negativeNotify('Unable to contact relay server.')
}

export const paymentFailureNotify = function () {
  negativeNotify('Payment was rejected.')
}

// Info notifications

const infoNotify = function (text) {
  Notify.create({
    message: '<div class="text-center"> ' + text + ' </div>',
    html: true,
    color: 'accent'
  })
}

export const addressCopiedNotify = function () {
  infoNotify('Address copied to clipboard.')
}

export const seedCopiedNotify = function () {
  infoNotify('Seed phrase copied to clipboard.')
}

export const sentTransactionNotify = function (tx) {
  Notify.create({
    message: '<div class="text-center"> Sent transaction </div>',
    html: true,
    color: 'accent',
    actions: [
      { label: 'View', color: 'secondary', handler: () => { /* ... */ } }
    ]
  })
}

export const sentTransactionFailureNotify = function (tx) {
  Notify.create({
    message: '<div class="text-center"> Failed to send transaction </div>',
    html: true,
    color: 'negative',
    actions: [
      { label: 'View', color: 'secondary', handler: () => { /* ... */ } }
    ]
  })
}

export const desktopNotify = function (title, body, icon, callback) {
  let notify = new window.Notification(title, {
    title,
    body,
    icon
  })
  notify.onclick = () => {
    var window = remote.getCurrentWindow()
    window.show()
    callback()
    notify.close()
  }
  setTimeout(notify.close.bind(notify), notificationTimeout)
}
