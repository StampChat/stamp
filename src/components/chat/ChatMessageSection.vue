<template>
  <q-item dense>
    <q-item-section v-if="item.type=='text'">
      {{item.text}}
    </q-item-section>
    <q-item-section v-else-if="item.type=='image'">
      <q-img :src="item.image" />
    </q-item-section>
    <q-item-section v-else-if="item.type=='stealth'">
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
    </q-item-section>
  </q-item>
</template>

<script>
export default {
  props: ['item']
}
</script>
