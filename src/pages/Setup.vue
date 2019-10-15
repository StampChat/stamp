<template>
  <q-page>
    <div class="q-pa-md">
      <q-stepper
        v-model="step"
        ref="stepper"
        color="primary"
        animated
        alternative-labels
      >
        <q-step
          :name="1"
          title="Welcome"
          icon="settings"
          :done="step > 1"
          style="min-height: 300px;"
        >
          <p>It seems you don't have any accounts setup right now. We'll guide you through the account creation process.</p>
        </q-step>

        <q-step
          :name="2"
          title="Create/Import a Key"
          icon="vpn_key"
          :done="step > 2"
          style="min-height: 300px;"
        >
          <q-list>
            <div class="q-pb-sm">
              <q-expansion-item
                class="shadow-1 overflow-hidden"
                style="border-radius: 30px"
                icon="new_releases"
                label="Create a Key"
                header-class="bg-primary text-white"
                expand-icon-class="text-white"
              >
                <q-card>
                  <q-card-section>
                    TODO: Form for creating key
                  </q-card-section>
                </q-card>
              </q-expansion-item>
            </div>
            <div class="q-py-sm">

              <q-expansion-item
                class="shadow-1 overflow-hidden"
                style="border-radius: 30px"
                icon="import_export"
                label="Import a Key"
                header-class="bg-primary text-white"
                expand-icon-class="text-white"
              >
                <q-card>
                  <q-card-section>
                    TODO: Form for importing key
                  </q-card-section>
                </q-card>
              </q-expansion-item>
            </div>

          </q-list>

        </q-step>

        <q-step
          :name="3"
          title="Deposit Bitcoin Cash"
          icon="attach_money"
          style="min-height: 300px;"
          :done="step > 3"
        >
          TODO: QRCode and address
        </q-step>

        <q-step
          :name="4"
          title="Create a Profile"
          icon="person"
          style="min-height: 300px;"
        >
          <q-list>
            <q-item>
              <q-input
                filled
                v-model="name"
                label="Your name *"
                hint="Name and surname"
                lazy-rules
                style="width:90vw"
                :rules="[ val => val && val.length > 0 || 'Please type something']"
              />
            </q-item>

            <q-item>
              <q-uploader
                url="http://localhost:4444/upload"
                label="Upload profile picture"
                style="width:90vw"
                :max-total-size="4096"
              />
            </q-item>

          </q-list>

        </q-step>

        <template v-slot:navigation>
          <q-stepper-navigation>
            <q-btn
              @click="next()"
              color="primary"
              :label="step === 4 ? 'Finish' : 'Continue'"
            />
            <q-btn
              v-if="step > 1"
              flat
              color="primary"
              @click="$refs.stepper.previous()"
              label="Back"
              class="q-ml-sm"
            />
          </q-stepper-navigation>
        </template>
        <template v-slot:message>
          <q-banner
            v-if="step === 1"
            class="bg-blue-8 text-white q-px-lg"
          >
            Welcome to IRCash!
          </q-banner>
          <q-banner
            v-else-if="step === 2"
            class="bg-blue-8 text-white q-px-lg"
          >
            How would you like to add a key to IRCash? </q-banner>
          <q-banner
            v-else-if="step === 3"
            class="bg-blue-8 text-white q-px-lg"
          >
            Deposit Bitcoin Cash to your messaging wallet...
          </q-banner>
          <q-banner
            v-else
            class="bg-blue-8 text-white q-px-lg"
          >
            Create your profile...
          </q-banner>
        </template>
      </q-stepper>
    </div>
  </q-page>
</template>

<script>
import Vue from 'vue'
import VueRouter from 'vue-router'

import { mapActions } from 'vuex'

Vue.use(VueRouter)

export default {
  data () {
    return {
      step: 1,
      name: ''
    }
  },
  methods: {
    ...mapActions({ setProfile: 'myProfile/setMyProfile' }),
    next () {
      if (this.step !== 4) {
        this.$refs.stepper.next()
      } else {
        console.log('got here')
        let profile = {
          'name': 'Harry Barber',
          'address': 'pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g'
        }
        this.setProfile(profile)
        this.$router.push('/')
      }
    }
  }
}
</script>
