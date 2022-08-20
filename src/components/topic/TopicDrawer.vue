<template>
  <div class="column full-height">
    <q-scroll-area class="col">
      <q-list>
        <q-item>
          <q-item-section>
            <q-item-label>{{ topic }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-separator />
        <q-item>
          <q-item-section>
            <q-item-label>Filter:</q-item-label>
            <q-item-label caption>({{ transformedFilter }} XPI)</q-item-label>
          </q-item-section>
          <q-item-section>
            <q-slider
              v-model="filterModel"
              dense
              :min="-3"
              :max="10"
              markers
              marker-labels
            >
              <template #marker-label-group="scope">
                <div
                  v-for="marker in scope.markerList"
                  :key="marker.index"
                  :style="marker.style"
                >
                  {{ marker.value }}
                </div>
              </template>
            </q-slider>
          </q-item-section>
        </q-item>
        <q-separator />
        <q-item>
          <q-item-section>
            <q-item-label>Offering:</q-item-label>
            <q-item-label caption>({{ transformedOffering }} XPI)</q-item-label>
          </q-item-section>
          <q-item-section>
            <q-slider
              v-model="offeringModel"
              :min="0"
              :max="10"
              markers
              marker-labels
            >
              <template #marker-label-group="scope">
                <div
                  v-for="marker in scope.markerList"
                  :key="marker.index"
                  :style="marker.style"
                >
                  {{ marker.value }}
                </div>
              </template>
            </q-slider>
          </q-item-section>
        </q-item>
        <q-separator />
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
// import { storeToRefs } from 'pinia'
import { defineComponent, ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useTopicStore } from 'src/stores/topics'

export default defineComponent({
  props: {
    topic: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const topicStore = useTopicStore()
    const { topics } = storeToRefs(topicStore)
    const filterModel = ref(0)
    const offeringModel = ref(0)

    const transformedFilter = computed(() => {
      const sign = Math.sign(filterModel.value)
      return sign * Math.pow(10, Math.abs(filterModel.value))
    })

    const transformedOffering = computed(() => {
      const sign = Math.sign(offeringModel.value)
      return offeringModel.value === 0
        ? 1
        : sign * Math.pow(10, Math.abs(offeringModel.value))
    })

    const updateModels = () => {
      const threshold = topics.value[props.topic]?.threshold / 1_000_000
      filterModel.value =
        threshold === 0
          ? 0
          : Math.sign(threshold) * Math.log10(Math.abs(threshold))

      const offering = topics.value[props.topic]?.offering / 1_000_000
      offeringModel.value =
        offering === 0
          ? 1
          : Math.sign(offering) * Math.log10(Math.abs(offering))
    }

    watch(() => props.topic, updateModels)
    updateModels()

    watch(transformedFilter, newValue => {
      topicStore.topics[props.topic].threshold = newValue * 1_000_000
    })

    watch(transformedOffering, newValue => {
      topicStore.topics[props.topic].offering = newValue * 1_000_000
    })

    return {
      transformedFilter,
      filterModel,
      transformedOffering,
      offeringModel,
    }
  },
})
</script>
