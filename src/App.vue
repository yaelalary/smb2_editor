<template>
  <!-- <div v-if="!clickedScroll" @click="scrollToBottom"
    class="h-20 w-20 bg-blue-200 border-[4px] border-blue-800 rounded-full top-[calc(100vh/2)] left-[calc(100vw/2)] translate-x-[-50%] translate-y-[-50%] fixed z-[9999] flex items-center justify-center cursor-pointer hover:bg-blue-300">
    <ArrowDownIcon class="h-10 w-10 text-blue-800 m-auto" />
  </div> -->
  <div class="overflow-auto h-[calc(100vh-240px)]">
    <div class="grid-container relative" @drop="onDrop" @dragover.prevent>
      <!-- Drop indicator -->
      <div v-if="dropIndicator.visible"
        :style="{ left: dropIndicator.x * 50 + 'px', top: dropIndicator.y * 50 + 'px', width: dropIndicator.w * 50 + 'px', height: dropIndicator.h * 50 + 'px' }"
        class="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none z-[9998]">
      </div>
      <div v-for="item in layout" :key="item.i"
        :style="{ left: item.x * 50 + 'px', top: item.y * 50 + 'px', width: item.w * 50 + 'px', height: item.h * 50 + 'px', zIndex: item.z || 1 }"
        class="absolute select-none group cursor-grab active:cursor-grabbing" @mousedown="startDrag(item, $event)"
        @touchstart="startDrag(item, $event)">
        <img v-if="item.sprite && sprites[item.sprite]" :src="sprites[item.sprite].src" class="sprite-img"
          :alt="item.sprite" />
        <span v-else class="text">{{ item.i }}</span>
        <div v-show="draggingItemId !== item.i" @mousedown.prevent.stop="onDeleteMouseDown(item.i, $event)"
          @mouseup.stop="onDeleteMouseUp(item.i, $event)" @touchstart.prevent.stop
          class="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded cursor-pointer flex items-center justify-center text-white opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-red-600">
          <XMarkIcon class="w-4 h-4" />
        </div>
      </div>
    </div>
  </div>
  <div id="spLib"
    class="w-full h-[240px] overflow-auto mx-auto bg-white fixed bottom-0 left-0 z-[9999] border-t-2 border-gray-300">
    <div class="flex items-center gap-2 px-2 py-2 bg-gray-100 border-b border-gray-300 min-h-[40px]">
      <div class="w-7 h-7 flex-shrink-0">
        <button v-if="currentFolder" @click="navigateBack"
          class="p-1 hover:bg-gray-200 rounded w-full h-full flex items-center justify-center">
          <ArrowLeftIcon class="w-5 h-5" />
        </button>
      </div>
      <h2 class="font-bold text-sm truncate">{{ currentFolder || 'Sprite Library' }}</h2>
    </div>
    <div class="flex flex-wrap gap-4 justify-start p-4">
      <!-- Folders -->
      <div v-for="folder in subFolders" :key="folder.path" @click="navigateToFolder(folder.path)"
        class="inline-flex flex-col items-center w-16 cursor-pointer hover:bg-gray-100 p-2 rounded">
        <FolderIcon class="w-12 h-12 text-yellow-500" />
        <span class="text-xs text-center mt-1 break-words w-full">{{ folder.name }}</span>
      </div>
      <!-- Sprites -->
      <div v-for="(sprite, spriteName) in filteredSprites" :key="spriteName"
        class="inline-block max-w-[50px] cursor-move" draggable="true" @dragstart="onDragStart(spriteName, $event)"
        @drag="drag(spriteName)" @dragend="dragend" unselectable="on">
        <img :src="sprite.src" :alt="spriteName" class="w-16 h-16 object-contain pointer-events-none"
          style="image-rendering: pixelated;" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ArrowDownIcon, XMarkIcon, FolderIcon, ArrowLeftIcon } from '@heroicons/vue/24/solid'
import { sprites, spriteFolders } from './sprites.js';

const layout = ref([]);
const currentFolder = ref('');

// const clickedScroll = ref(false);
const mouseXY = { x: null, y: null };
const deleteButtonDown = ref({ itemId: null, startX: null, startY: null });
const draggingItemId = ref(null);
const draggedItem = ref(null);
const dragOffset = ref({ x: 0, y: 0 });
const dropIndicator = ref({ visible: false, x: 0, y: 0, w: 1, h: 1 });
let nextId = 0;
const MAX_GRID_HEIGHT = 100; // Maximum number of rows

// Filter sprites by current folder
const filteredSprites = computed(() => {
  const result = {};
  for (const [name, sprite] of Object.entries(sprites)) {
    if (sprite.folder === currentFolder.value) {
      result[name] = sprite;
    }
  }
  return result;
});

// Get subfolders of current folder
const subFolders = computed(() => {
  const result = [];
  for (const [path, folder] of Object.entries(spriteFolders)) {
    if (folder.parent === currentFolder.value) {
      result.push(folder);
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
});

const navigateToFolder = (folderPath) => {
  currentFolder.value = folderPath;
};

const navigateBack = () => {
  const currentPath = currentFolder.value;
  if (currentPath) {
    const parts = currentPath.split('/');
    currentFolder.value = parts.slice(0, -1).join('/');
  }
};

// const scrollToBottom = () => {
//   clickedScroll.value = true;
//   const spLib = document.getElementById('spLib');
//   if (spLib) {
//     spLib.scrollIntoView({ block: 'end' });
//   }
// };

// Setup dragover listener for dragging from sprite library
if (typeof window !== 'undefined') {
  document.addEventListener('dragover', (e) => {
    mouseXY.x = e.clientX;
    mouseXY.y = e.clientY;

    // Update drop indicator if dragging a sprite from library
    if (mouseXY.sprite) {
      const gridContainer = document.querySelector('.grid-container');
      if (gridContainer) {
        const rect = gridContainer.getBoundingClientRect();
        const spriteData = sprites[mouseXY.sprite];
        const x = Math.max(0, Math.floor((e.clientX - rect.left + window.scrollX) / 50));
        const y = Math.max(0, Math.min(Math.floor((e.clientY - rect.top + window.scrollY) / 50), MAX_GRID_HEIGHT - 1));

        dropIndicator.value = {
          visible: true,
          x,
          y,
          w: spriteData.w,
          h: spriteData.h
        };
      }
    }
  }, false);

  document.addEventListener('mousemove', (e) => {
    if (draggedItem.value) {
      const gridContainer = document.querySelector('.grid-container');
      if (gridContainer) {
        const rect = gridContainer.getBoundingClientRect();
        const x = e.clientX - rect.left - dragOffset.value.x + window.scrollX;
        const y = e.clientY - rect.top - dragOffset.value.y + window.scrollY;

        const item = layout.value.find(i => i.i === draggedItem.value.i);
        if (item) {
          item.x = Math.max(0, Math.round(x / 50));
          item.y = Math.max(0, Math.min(Math.round(y / 50), MAX_GRID_HEIGHT - 1));
        }
      }
    }
  });

  document.addEventListener('mouseup', () => {
    draggedItem.value = null;
    draggingItemId.value = null;
  });
}

const onDragStart = (spriteName, event) => {
  // Hide the default drag image
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  event.dataTransfer.setDragImage(img, 0, 0);

  // Store the sprite name for the drop event
  mouseXY.sprite = spriteName;
};

const drag = (spriteName) => {
  // Store the sprite name for the drop event
  mouseXY.sprite = spriteName;
};

const dragend = () => {
  mouseXY.sprite = null;
  dropIndicator.value.visible = false;
};

const onDrop = (e) => {
  if (mouseXY.sprite) {
    const gridContainer = document.querySelector('.grid-container');
    const rect = gridContainer.getBoundingClientRect();
    const x = Math.max(0, Math.floor((e.clientX - rect.left + window.scrollX) / 50));
    const y = Math.max(0, Math.min(Math.floor((e.clientY - rect.top + window.scrollY) / 50), MAX_GRID_HEIGHT - 1));

    const spriteData = sprites[mouseXY.sprite];
    layout.value.push({
      x,
      y,
      w: spriteData.w,
      h: spriteData.h,
      i: String(nextId++),
      sprite: mouseXY.sprite,
      z: layout.value.length
    });

    mouseXY.sprite = null;
    dropIndicator.value.visible = false;
  }
};

const startDrag = (item, event) => {
  // Don't start drag if clicking on delete button
  if (event.target.closest('.bg-red-500')) {
    return;
  }

  draggedItem.value = item;
  draggingItemId.value = item.i;

  const element = event.currentTarget;
  const rect = element.getBoundingClientRect();
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };

  event.preventDefault();
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
  height: 5000px;
  background: #f0f0f0;
  background-image:
    linear-gradient(to right, #ccc 1px, transparent 1px),
    linear-gradient(to bottom, #ccc 1px, transparent 1px);
  background-size: 50px 50px;
  background-position: 0 0;
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
