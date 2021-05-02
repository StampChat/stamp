import { Plugins } from '@capacitor/core'
import { Notify, Platform } from 'quasar'
import { notificationTimeout } from './constants'
const { LocalNotifications } = Plugins
// import { remote } from 'electron'

// Error notifications

function negativeNotify (text) {
  Notify.create({
    message: '<div class="text-center"> ' + text + ' </div>',
    html: true,
    color: 'negative'
  })
}

export function errorNotify (err) {
  console.error(err)
  if (err.response) {
    console.error(err.response)
  }
  negativeNotify(err.message)
}

// Info notifications

export function infoNotify (text) {
  Notify.create({
    message: '<div class="text-center"> ' + text + ' </div>',
    html: true,
    color: 'accent'
  })
}

export function addressCopiedNotify () {
  infoNotify('Address copied to clipboard.')
}

export function insufficientStampNotify () {
  infoNotify('Stamp is too small, receiver will not be notified.')
}

export function seedCopiedNotify () {
  infoNotify('Your secret name has been saved to your clipboard.')
}

export function newMessagesNotify () {
  infoNotify('You have new messages. Please check your stamp for new messages')
}

export function sentTransactionNotify () {
  Notify.create({
    message: '<div class="text-center"> Sent transaction </div>',
    html: true,
    color: 'accent',
    actions: [
      { label: 'View', color: 'secondary', handler: () => { /* ... */ } }
    ]
  })
}
export function desktopNotify (title, body, icon, callback) {
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

export async function mobileNotify (title, body) {
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
  console.log('Scheduled notifications', notifs)
}
