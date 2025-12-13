<template>
  <div v-if="!clickedScroll" @click="scrollToBottom"
    class="h-20 w-20 bg-blue-200 border-[4px] border-blue-800 rounded-full top-[calc(100vh/2)] left-[calc(100vw/2)] translate-x-[-50%] translate-y-[-50%] fixed z-[9999] flex items-center justify-center cursor-pointer hover:bg-blue-300">
    <ArrowDownIcon class="h-10 w-10 text-blue-800 m-auto" />
  </div>
  <div class="overflow-x-auto">
    <GridLayout :ref="setLayoutRef" v-model:layout="layout" :col-num="200" :row-height="50" :is-draggable="true"
      :is-resizable="false" :is-mirrored="false" :vertical-compact="false" :prevent-collision="true" :margin="[0, 0]"
      :use-css-transforms="true" class="grid-container">
      <GridItem v-for="item in layout" :key="item.i" :ref="e => setItemRef(item, e)" :x="item.x" :y="item.y" :w="item.w"
        :h="item.h" :i="item.i" class="select-none group" @move="onItemMove(item.i)" @moved="onItemMoved">
        <img v-if="item.sprite && sprites[item.sprite]" :src="sprites[item.sprite]" class="sprite-img"
          :alt="item.sprite" />
        <span v-else class="text">{{ item.i }}</span>
        <div v-show="draggingItemId !== item.i" @mousedown.prevent.stop="onDeleteMouseDown(item.i, $event)"
          @mouseup.stop="onDeleteMouseUp(item.i, $event)" @touchstart.prevent.stop
          class="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded cursor-pointer flex items-center justify-center text-white opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-red-600">
          <XMarkIcon class="w-4 h-4" />
        </div>
      </GridItem>
    </GridLayout>
  </div>
  <div id="spLib" class="w-full h-[200px] mx-auto bg-white">
    <h2 class="text-center font-bold">Sprite Library</h2>
    <div class="flex flex-wrap gap-4 justify-center p-4">
      <div v-for="(sprite, spriteName) in sprites" :key="spriteName" class="inline-block max-w-[50px] cursor-move"
        draggable="true" @drag="drag(spriteName)" @dragend="dragend" unselectable="on">
        <img :src="sprite" :alt="spriteName" class="w-16 h-16 object-contain pointer-events-none"
          style="image-rendering: pixelated;" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { GridLayout, GridItem } from 'vue-grid-layout-v3';
import { ArrowDownIcon, XMarkIcon } from '@heroicons/vue/24/solid'

import bobOmb from './assets/sprites/bob_omb.png';
import flurry from './assets/sprites/flurry.png';
import grassBlock1 from './assets/sprites/grass_block_1.png';
import grassObj1 from './assets/sprites/grass_obj_1.png';
import hillLeft from './assets/sprites/hill_left.png';
import hillRight from './assets/sprites/hill_right.png';
import hillTop from './assets/sprites/hill_top.png';
import hillTopLeft from './assets/sprites/hill_top_left.png';
import hillTopRight from './assets/sprites/hill_top_right.png';
import hillLeft2 from './assets/sprites/hill_left_2.png';
import hillRight2 from './assets/sprites/hill_right_2.png';
import hillCenter from './assets/sprites/hill_center.png';
import hillTopLeft2 from './assets/sprites/hill_top_left_2.png';
import hillTopRight2 from './assets/sprites/hill_top_right_2.png';
import hoopster from './assets/sprites/hoopster.png';
import mushroomBlock1 from './assets/sprites/mushroom_block_1.png';
import ninji from './assets/sprites/ninji.png';
import pinkFireplant from './assets/sprites/pink_fireplant.png';
import pinkMaskass from './assets/sprites/pink_maskass.png';
import pokey from './assets/sprites/pokey.png';
import pokeyBody from './assets/sprites/pokey_body.png';
import potion from './assets/sprites/potion.png';
import potBlock1 from './assets/sprites/pot_block_1.png';
import radishObj1 from './assets/sprites/radish_obj_1.png';
import radishObj2 from './assets/sprites/radish_obj_2.png';
import redFireplant from './assets/sprites/red_fireplant.png';
import redMaskass from './assets/sprites/red_maskass.png';
import tweeter from './assets/sprites/tweeter.png';

const sprites = {
  bob_omb: bobOmb,
  flurry: flurry,
  grass_block_1: grassBlock1,
  grass_obj_1: grassObj1,
  hill_left: hillLeft,
  hill_right: hillRight,
  hill_top: hillTop,
  hill_top_left: hillTopLeft,
  hill_top_right: hillTopRight,
  hill_left_2: hillLeft2,
  hill_right_2: hillRight2,
  hill_center: hillCenter,
  hill_top_left_2: hillTopLeft2,
  hill_top_right_2: hillTopRight2,
  hoopster: hoopster,
  mushroom_block_1: mushroomBlock1,
  ninji: ninji,
  pink_fireplant: pinkFireplant,
  pink_maskass: pinkMaskass,
  pokey: pokey,
  pokey_body: pokeyBody,
  potion: potion,
  pot_block_1: potBlock1,
  radish_obj_1: radishObj1,
  radish_obj_2: radishObj2,
  red_fireplant: redFireplant,
  red_maskass: redMaskass,
  tweeter: tweeter,
};

const layout = ref([
  { "x": -1, "y": 100, "w": 1, "h": 1, "i": "1", "sprite": "mushroom_block_1" }, //USED FOR FIXING GRID, SHOULD BE REMOVED AT THE END
]);

const clickedScroll = ref(false);
const mouseXY = { x: null, y: null };
const DragPos = { x: null, y: null, w: 1, h: 1, i: null, sprite: null };
const layoutRef = ref(null);
const itemRefs = ref({});
const deleteButtonDown = ref({ itemId: null, startX: null, startY: null });
const draggingItemId = ref(null);

const scrollToBottom = () => {
  clickedScroll.value = true;
  const spLib = document.getElementById('spLib');
  if (spLib) {
    spLib.scrollIntoView({ block: 'end' });
  }
};

// Setup dragover listener
if (typeof window !== 'undefined') {
  document.addEventListener('dragover', (e) => {
    mouseXY.x = e.clientX;
    mouseXY.y = e.clientY;
  }, false);
}

const drag = async (spriteName) => {
  const parentRect = document.querySelector('.grid-container').getBoundingClientRect();
  let mouseInGrid = false;
  if (((mouseXY.x > parentRect.left) && (mouseXY.x < parentRect.right)) &&
    ((mouseXY.y > parentRect.top) && (mouseXY.y < parentRect.bottom))) {
    mouseInGrid = true;
  }

  if (mouseInGrid === true && (layout.value.findIndex(item => item.i === 'drop')) === -1) {
    layout.value.push({
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      i: 'drop',
      sprite: spriteName
    });
    await nextTick();
  }

  if (!itemRefs.value?.drop) {
    return;
  }

  const index = layout.value.findIndex(item => item.i === 'drop');
  if (index !== -1) {
    if (itemRefs.value?.drop?.el?.style) {
      itemRefs.value.drop.el.style.display = 'none';
    }
    // Calcualte new position based on cell size
    const mouseRelativeX = mouseXY.x - parentRect.left;
    const mouseRelativeY = mouseXY.y - parentRect.top;
    const cellWidth = 50; // row-height = 50
    const cellHeight = 50;

    const new_pos = {
      x: Math.floor(mouseRelativeX / cellWidth),
      y: Math.floor(mouseRelativeY / cellHeight)
    };

    if (mouseInGrid === true) {
      layout.value[index].x = new_pos.x;
      layout.value[index].y = new_pos.y;

      layoutRef.value.emitter.emit('dragEvent', ['dragstart', 'drop', new_pos.x, new_pos.y, 1, 1]);
      DragPos.i = String(layout.value.length);
      DragPos.x = new_pos.x;
      DragPos.y = new_pos.y;
      DragPos.sprite = spriteName;
    }
    if (mouseInGrid === false) {
      layoutRef.value.emitter.emit('dragEvent', ['dragend', 'drop', new_pos.x, new_pos.y, 1, 1]);
      layout.value = layout.value.filter(obj => obj.i !== 'drop');
      await nextTick();
    }
  }
};

const dragend = async () => {
  const parentRect = document.querySelector('.grid-container').getBoundingClientRect();
  let mouseInGrid = false;
  if (((mouseXY.x > parentRect.left) && (mouseXY.x < parentRect.right)) &&
    ((mouseXY.y > parentRect.top) && (mouseXY.y < parentRect.bottom))) {
    mouseInGrid = true;
  }

  if (mouseInGrid === true) {
    layoutRef.value.emitter.emit('dragEvent', ['dragend', 'drop', DragPos.x, DragPos.y, 1, 1]);
    layout.value = layout.value.filter(obj => obj.i !== 'drop');

    layout.value.push({
      x: DragPos.x,
      y: DragPos.y,
      w: 1,
      h: 1,
      i: DragPos.i,
      sprite: DragPos.sprite
    });
    await nextTick();
    layoutRef.value.emitter.emit('dragEvent', ['dragend', DragPos.i, DragPos.x, DragPos.y, 1, 1]);
  }
};

const setItemRef = (item, e) => {
  itemRefs.value[item.i] = e;
};

const setLayoutRef = (e) => {
  layoutRef.value = e;
};

const removeItem = (itemId) => {
  layout.value = layout.value.filter(item => item.i !== itemId);
};

const onDeleteMouseDown = (itemId, event) => {
  deleteButtonDown.value = {
    itemId: itemId,
    startX: event.clientX,
    startY: event.clientY
  };
};

const onDeleteMouseUp = (itemId, event) => {
  if (deleteButtonDown.value.itemId === itemId) {
    const deltaX = Math.abs(event.clientX - deleteButtonDown.value.startX);
    const deltaY = Math.abs(event.clientY - deleteButtonDown.value.startY);

    // If the mouse hasn't moved more than 5px, it's a click, delete the item
    if (deltaX < 5 && deltaY < 5) {
      removeItem(itemId);
    }
  }
  deleteButtonDown.value = { itemId: null, startX: null, startY: null };
};

const onItemMove = (itemId) => {
  draggingItemId.value = itemId;
};

const onItemMoved = () => {
  draggingItemId.value = null;
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
