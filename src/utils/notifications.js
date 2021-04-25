import { Notify } from 'quasar'
import { notificationTimeout } from './constants'
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
