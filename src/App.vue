<script setup>
import { ref } from 'vue';
import { GridLayout, GridItem } from 'vue-grid-layout-v3';

const layout = ref([
  { "x": 0, "y": 0, "w": 1, "h": 1, "i": "0" },
  { "x": 1, "y": 1, "w": 1, "h": 1, "i": "1" },
  { "x": 2, "y": 2, "w": 1, "h": 1, "i": "2" },

]);
</script>

<template>
  <GridLayout v-model:layout="layout" :col-num="200" :row-height="50" :is-draggable="true" :is-resizable="false"
    :is-mirrored="false" :vertical-compact="false" :prevent-collision="true" :margin="[0, 0]" :use-css-transforms="true"
    class="grid-container">
    <GridItem v-for="item in layout" :key="item.i" :x="item.x" :y="item.y" :w="item.w" :h="item.h" :i="item.i">
      <span class="text">{{ item.i }}</span>
    </GridItem>
  </GridLayout>
</template>

<style>
body,
html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.grid-container {
  width: 10000px;
  min-height: 100vh;
}

.vue-grid-layout {
  background: #eee;
  min-height: 100vh;
}

.vue-grid-item:not(.vue-grid-placeholder) {
  background: #ccc;
  border: 1px solid black;
}

.vue-grid-item .text {
  font-size: 14px;
  text-align: center;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  margin: auto;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
