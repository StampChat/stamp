import { Notify } from 'quasar'
import { notificationTimeout } from './constants'
const remote = require('electron').remote

export const chainTooLongNotify = function () {
  Notify.create({
    message: '<div class="text-center"> Transaction chain too long or relay fee too low. </div>',
    color: 'negative'
  })
}

export const insuffientFundsNotify = function () {
  Notify.create({
    message: '<div class="text-center"> Insufficent funds. </div>',
    color: 'negative'
  })
}

export const walletDisconnectedNotify = function () {
  Notify.create({
    message: '<div class="text-center"> Unable to contact wallet server. </div>',
    color: 'negative'
  })
}

export const keyserverDisconnectedNotify = function () {
  Notify.create({
    message: '<div class="text-center"> Unable to contact keyserver. </div>',
    color: 'negative'
  })
}

export const relayDisconnectedNotify = function () {
  Notify.create({
    message: '<div class="text-center"> Unable to contact relay server. </div>',
    color: 'negative'
  })
}

export const paymentFailureNotify = function () {
  Notify.create({
    message: '<div class="text-center"> Payment was rejected. </div>',
    color: 'negative'
  })
}

export const addressCopiedNotify = function () {
  Notify.create({
    message: '<div class="text-center"> Address copied to clipboard </div>',
    html: true,
    color: 'accent'
  })
}

export const seedCopiedNotify = function () {
  Notify.create({
    message: '<div class="text-center"> Seed phrase copied to clipboard </div>',
    html: true,
    color: 'accent'
  })
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
