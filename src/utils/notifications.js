import { Notify } from 'quasar'

export const chainTooLongNotify = function () {
  Notify.create({
    message: 'Transaction chain too long.',
    color: 'negative'
  })
}

export const insuffientFundsNotify = function () {
  Notify.create({
    message: 'Insufficent funds.',
    color: 'negative'
  })
}

export const walletDisconnectedNotify = function () {
  Notify.create({
    message: 'Unable to contact wallet server.',
    color: 'negative'
  })
}

export const keyserverDisconnectedNotify = function () {
  Notify.create({
    message: 'Unable to contact keyserver.',
    color: 'negative'
  })
}

export const relayDisconnectedNotify = function () {
  Notify.create({
    message: 'Unable to contact relay server.',
    color: 'negative'
  })
}

export const paymentFailureNotify = function () {
  Notify.create({
    message: 'Payment was rejected.',
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
