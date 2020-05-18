<template>
  <div>
    <div
      class="q-py-none"
      style="word-wrap: break-word; overflow-wrap: break-word; word-break: break-word;"
      v-if="item.type=='text'"
    >
      {{ item.text }}
    </div>
    <div
      class='q-py-sm'
      v-else-if="item.type=='image'"
    >
      <q-img
        :src="item.image"
        contain
        style="width: 10vw;"
        @click="imageDialog = true"
      />
    </div>
    <div
      class='q-py-sm'
      v-else-if="item.type=='stealth'"
    >
      <div class='col q-pb-xs'>
        <div class='row'>
          <div class='col-auto'>
            <q-icon
              name='attach_money'
              size='md'
              dense
              color='green'
            />
          </div>
          <div class='col q-px-sm q-py-sm'>
            Sent {{ item.amount }} satoshis
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['item']
}
</script>
