<template>
  <GridLayout v-model:layout="layout" :col-num="200" :row-height="50" :is-draggable="true" :is-resizable="false"
    :is-mirrored="false" :vertical-compact="false" :prevent-collision="true" :margin="[0, 0]" :use-css-transforms="true"
    class="grid-container">
    <GridItem v-for="item in layout" :key="item.i" :x="item.x" :y="item.y" :w="item.w" :h="item.h" :i="item.i"
      class="select-none">
      <img v-if="item.sprite && sprites[item.sprite]" :src="sprites[item.sprite]" class="sprite-img"
        :alt="item.sprite" />
      <span v-else class="text">{{ item.i }}</span>
    </GridItem>
  </GridLayout>
  <div v-if="!clickedScroll" @click="scrollToBottom"
    class="h-20 w-20 bg-blue-200 border-[4px] border-blue-800 rounded-full top-[calc(100vh/2)] left-[calc(100vw/2)] translate-x-[-50%] translate-y-[-50%] fixed z-[9999] flex items-center justify-center cursor-pointer hover:bg-blue-300">
    <ArrowDownIcon class="h-10 w-10 text-blue-800 m-auto" />
  </div>
  <div id="spLib" class="h-[200px]"></div>
  <div id="test"></div>
</template>

<script setup>
import { ref } from 'vue';
import { GridLayout, GridItem } from 'vue-grid-layout-v3';
import { ArrowDownIcon } from '@heroicons/vue/24/solid'

import grassBlock1 from './assets/sprites/grass_block_1.png';
import grassObj1 from './assets/sprites/grass_obj_1.png';
import mushroomBlock1 from './assets/sprites/mushroom_block_1.png';
import potBlock1 from './assets/sprites/pot_block_1.png';
import radishObj1 from './assets/sprites/radish_obj_1.png';
import radishObj2 from './assets/sprites/radish_obj_2.png';

const sprites = {
  grass_block_1: grassBlock1,
  grass_obj_1: grassObj1,
  mushroom_block_1: mushroomBlock1,
  pot_block_1: potBlock1,
  radish_obj_1: radishObj1,
  radish_obj_2: radishObj2,
};

const layout = ref([
  { "x": -1, "y": 100, "w": 1, "h": 1, "i": "1", "sprite": "mushroom_block_1" }, //USED FOR FIXING GRID, SHOULD BE REMOVED AT THE END
  { "x": 0, "y": 100, "w": 1, "h": 1, "i": "0", "sprite": "mushroom_block_1" },

]);

const clickedScroll = ref(false);

const scrollToBottom = () => {
  clickedScroll.value = true;
  const spLib = document.getElementById('spLib');
  if (spLib) {
    spLib.scrollIntoView({ block: 'end' });
  }
};
</script>

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
  min-height: 10000px;
}

.vue-grid-layout {
  background: #f0f0f0;
  min-height: 200px;
  height: auto;
  background-image:
    linear-gradient(to right, #ccc 1px, transparent 1px),
    linear-gradient(to bottom, #ccc 1px, transparent 1px);
  background-size: 50px 50px;
  background-position: 0 0;
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

.sprite-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  pointer-events: none;
}
</style>
