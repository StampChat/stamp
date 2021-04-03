import { Plugins } from '@capacitor/core'
import { Notify, Platform } from 'quasar'
import { notificationTimeout } from './constants'
const { LocalNotifications } = Plugins
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
  infoNotify('Your secret name has been saved to your clipboard.')
}

export const newMessagesNotify = function () {
  infoNotify('You have new messages. Please check your stamp for new messages')
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

export const mobileNotify = async function (title, body) {
  // Only run local notification in mobile platform
  if (!Platform.is.mobile) {
    return
  }
  const notifs = await LocalNotifications.schedule({
    notifications: [
      {
        title: title,
        body: body,
        id: Math.floor(Math.random() * 10),
        schedule: { at: new Date(Date.now() + 500) },
        sound: 'beep.aiff',
        attachments: null,
        actionTypeId: 'OPEN_STAMP',
        extra: null
      }
    ]
  })
  console.log('scheduled notifications', notifs)
}
