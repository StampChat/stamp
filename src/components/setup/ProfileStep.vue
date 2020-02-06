<template>
  <div class="row">
    <div class="col">
      <div class="row q-pa-md">
        <q-input
          outlined
          v-model="name"
          label="Name *"
          hint="Name displayed to others"
          lazy-rules
          style="width:100%"
          :rules="[ val => val && val.length > 0 || 'Please type something']"
        />
      </div>
      <div class="row q-pa-md">
        <q-input
          v-model="bio"
          label="Bio"
          hint="Short biolography displayed to others"
          outlined
          style="width:100%"
          autogrow
        />
      </div>
    </div>
    <div class="col-4 q-pa-md">
      <q-toolbar
        class="bg-primary text-white shadow-2"
        style="border-radius: 10px 10px 0px 0px"
      >
        <q-toolbar-title>Upload Avatar</q-toolbar-title>

        <q-input
          @input="val => { avatarPath = val[0] }"
          ref="displayPicker"
          style="display:none"
          type="file"
          label="Standard"
          @change="parseImage"
        />
        <q-btn
          type="file"
          flat
          round
          dense
          icon="add_a_photo"
          @click="$refs.displayPicker.$el.click()"
        />
      </q-toolbar>
      <div>
        <q-img
          :src="avatar"
          spinner-color="white"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['initProfile'],
  data () {
    return {
      name: (this.initProfile !== null) ? this.initProfile.name : '',
      bio: '',
      avatar: (this.initProfile !== null) ? this.initProfile.avatar : null,
      avatarPath: null,
      foundProfileOpen: this.initProfile !== null
    }
  },
  methods: {
    parseImage () {
      if (this.avatarPath == null) {
        return
      }
      var reader = new FileReader()
      reader.readAsDataURL(this.avatarPath)
      reader.onload = () => {
        this.avatar = reader.result
      }
    }
  },
  computed: {
    constructProfile () {
      if (this.name === '' || this.avatar === null) {
        return null
      } else {
        return {
          name: this.name,
          bio: this.bio,
          avatar: this.avatar
        }
      }
    }
  },
  watch: {
    name (newName, oldName) {
      this.$emit('profile', this.constructProfile)
    },
    avatar (newAvatar, oldAvatar) {
      this.$emit('profile', this.constructProfile)
    }
  }
}
</script>
