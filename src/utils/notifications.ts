import { Notify } from 'quasar'

// Error notifications

function negativeNotify(text: string) {
  Notify.create({
    message: '<div class="text-center"> ' + text + ' </div>',
    html: true,
    color: 'negative',
  })
}

export function errorNotify(err: { response?: unknown; message: string }) {
  console.error(err)
  if (err.response) {
    console.error(err.response)
  }
  negativeNotify(err.message)
}

// Info notifications

export function infoNotify(text: string) {
  Notify.create({
    message: '<div class="text-center"> ' + text + ' </div>',
    html: true,
    color: 'accent',
  })
}

export function addressCopiedNotify() {
  infoNotify('Address copied to clipboard.')
}

export function insufficientStampNotify() {
  infoNotify('Stamp is too small, receiver will not be notified.')
}

export function seedCopiedNotify() {
  infoNotify('Your secret name has been saved to your clipboard.')
}

export function sentTransactionNotify() {
  Notify.create({
    message: '<div class="text-center"> Sent transaction </div>',
    html: true,
    color: 'accent',
    actions: [
      {
        label: 'View',
        color: 'secondary',
        handler: () => {
          /* ... */
        },
      },
    ],
  })
}
export function desktopNotify(
  title: string,
  body: string,
  icon: string,
  callback: () => void,
) {
  const notify = new window.Notification(title, {
    body,
    icon,
  })

  notify.onclick = () => {
    callback()
  }
}
