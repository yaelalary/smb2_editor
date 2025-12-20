<template>
  <div v-if="!clickedScroll" @click="scrollToBottom"
    class="bg-blue-200 border-[4px] border-blue-800 rounded-full top-[calc(100vh/2)] left-[calc(100vw/2)] translate-x-[-50%] translate-y-[-50%] fixed z-[9999] flex items-center justify-center cursor-pointer hover:bg-blue-300">
    <div class="text-blue-800 py-4 px-8 m-auto flex items-center justify-center text-xl font-bold">
      Start
    </div>
  </div>
  <div
    class="h-fit fixed left-6 right-6 top-4 bg-gray-100 z-[9999] border border-gray-300 rounded-lg shadow-md p-3 overflow-hidden">
    <div class="flex items-center gap-2">
      <span class="font-semibold text-gray-700 text-sm">BG:</span>
      <div :style="{ backgroundColor: backgroundColor }"
        class="w-8 h-8 rounded-full border-2 border-blue-500 ring-2 ring-blue-300"
        :title="availableColors.find(c => c.value === backgroundColor)?.name">
      </div>
      <button @click="toggleColorPalette"
        class="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-full transition-all"
        :class="{ 'rotate-180': colorPaletteOpen }">
        <ChevronRightIcon class="w-5 h-5 text-gray-600" />
      </button>
      <Transition enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in" enter-from-class="opacity-0 -translate-x-4"
        enter-to-class="opacity-100 translate-x-0" leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-4">
        <div v-if="colorPaletteOpen" class="flex gap-2 pl-2 border-l-2 border-gray-300">
          <div v-for="color in availableColors.filter(c => c.value !== backgroundColor)" :key="color.value"
            @click="selectColor(color.value)" :style="{ backgroundColor: color.value }"
            class="w-7 h-7 rounded-full cursor-pointer border-2 border-gray-400 transition-all hover:scale-110 hover:border-gray-600"
            :title="color.name">
          </div>
        </div>
      </Transition>
      <div class="ml-auto flex items-center gap-2 pl-4">
        <button @click="brushMode = !brushMode; if (brushMode) eraserMode = false" :class="[
          'w-10 h-10 flex items-center justify-center rounded transition-all',
          brushMode ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        ]" :title="brushMode ? 'Brush mode active' : 'Activate brush mode'">
          <PaintBrushIcon class="w-5 h-5" />
        </button>
      </div>
      <div class="flex items-center gap-2">
        <button @click="eraserMode = !eraserMode; if (eraserMode) brushMode = false" :class="[
          'w-10 h-10 flex items-center justify-center rounded transition-all',
          eraserMode ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        ]" :title="eraserMode ? 'Eraser mode active' : 'Activate eraser mode'">
          <TrashIcon class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
  <!-- Mini-Map: 1/50 scale of 10000x5000 grid = 200x100px -->
  <div class="fixed top-23 right-8 bg-white border border-gray-300 shadow-md z-[9998]"
    style="width: 202px; height: 102px; image-rendering: pixelated;">
    <div class="relative w-full h-full overflow-hidden" :style="{ backgroundColor: backgroundColor }">
      <!-- Miniaturized sprites -->
      <div v-for="item in layout" :key="item.i" :style="{
        left: (item.x * 50 / 50) + 'px',
        top: (item.y * 50 / 50) + 'px',
        width: (item.w * 50 / 50) + 'px',
        height: (item.h * 50 / 50) + 'px',
        backgroundColor: sprites[item.sprite]?.mainColor || '#3b82f6',
        border: '1px solid rgba(0,0,0,0.25)'
      }" class="absolute">
      </div>

      <!-- Viewport indicator (red frame) -->
      <div class="absolute border-2 border-red-500 pointer-events-none" :style="{
        left: (scrollPosition.x / 50) + 'px',
        top: (scrollPosition.y / 50) + 'px',
        width: (viewportWidth / 50) + 'px',
        height: (viewportHeight / 50) + 'px'
      }">
      </div>
    </div>
  </div>

  <div class="overflow-auto h-[calc(100vh-240px)]" @scroll="updateScrollPosition">
    <div class="grid-container relative" @drop="onDrop" @dragover.prevent @mousedown="onGridMouseDown">
      <div v-if="dropIndicator.visible"
        :style="{ left: dropIndicator.x * 50 + 'px', top: dropIndicator.y * 50 + 'px', width: dropIndicator.w * 50 + 'px', height: dropIndicator.h * 50 + 'px' }"
        class="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none z-[9997]">
      </div>
      <div v-if="brushIndicator.visible && brushIndicator.sprite && sprites[brushIndicator.sprite]"
        :style="{ left: brushIndicator.x * 50 + 'px', top: brushIndicator.y * 50 + 'px', width: sprites[brushIndicator.sprite].w * 50 + 'px', height: sprites[brushIndicator.sprite].h * 50 + 'px' }"
        class="absolute pointer-events-none z-[9997] opacity-30">
        <img :src="sprites[brushIndicator.sprite].src" class="sprite-img" />
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
    class="w-full h-[240px] overflow-auto mx-auto bg-gray-100 fixed bottom-0 left-0 z-[9999] border-t-1 border-gray-300">
    <div class="flex items-center gap-2 px-2 py-2 bg-gray-200 border-b border-gray-300 min-h-[40px]">
      <div class="w-7 h-7 flex-shrink-0">
        <button v-if="currentFolder" @click="navigateBack"
          class="p-1 hover:bg-gray-200 rounded w-full h-full flex items-center justify-center">
          <ArrowLeftIcon class="w-5 h-5" />
        </button>
      </div>
      <h2 class="font-bold text-sm truncate">{{ currentFolder || 'Sprite Library' }}</h2>
    </div>
    <div class="flex flex-wrap gap-4 justify-start p-4">
      <div v-for="folder in subFolders" :key="folder.path" @click="navigateToFolder(folder.path)"
        class="inline-flex flex-col items-center w-16 cursor-pointer hover:bg-gray-100 p-2 rounded">
        <FolderIcon class="w-12 h-12 text-yellow-500" />
        <span class="text-xs text-center mt-1 break-words w-full">{{ folder.name }}</span>
      </div>
      <div v-for="(sprite, spriteName) in filteredSprites" :key="spriteName" :class="[
        'inline-block max-w-[50px] cursor-move p-1 rounded transition-all',
        brushMode && selectedBrushSprite === spriteName ? 'ring-2 ring-blue-500 bg-blue-100' : ''
      ]" draggable="true" @dragstart="onDragStart(spriteName, $event)" @drag="drag(spriteName)" @dragend="dragend"
        @click="brushMode && (selectedBrushSprite = spriteName)" unselectable="on">
        <img :src="sprite.src" :alt="spriteName" class="w-16 h-16 object-contain pointer-events-none"
          style="image-rendering: pixelated;" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { XMarkIcon, FolderIcon, ArrowLeftIcon, ChevronRightIcon, PaintBrushIcon } from '@heroicons/vue/24/solid'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { sprites, spriteFolders } from './sprites.js';

const layout = ref([]);
const currentFolder = ref('');
const backgroundColor = ref('#f0f0f0');
const colorPaletteOpen = ref(false);
const brushMode = ref(false);
const selectedBrushSprite = ref(null);
const isPainting = ref(false);
const eraserMode = ref(false);
const isErasing = ref(false);
const scrollPosition = ref({ x: 0, y: 0 });
const viewportWidth = ref(0);
const viewportHeight = ref(0);

const availableColors = [
  { name: 'Black', value: '#000000' },

  { name: 'Dark Blue', value: '#0000A8' },
  { name: 'Blue', value: '#0000FE' },
  { name: 'Light Blue', value: '#0078F8' },
  { name: 'Lighter Blue', value: '#3CBCFD' },

  { name: 'Purple', value: '#44009C' },
  { name: 'Light Purple', value: '#9979F9' },
  { name: 'Lighter Purple', value: '#B8B9F8' },

  { name: 'Dark Teal', value: '#004358' },
  { name: 'Teal', value: '#008088' },
  { name: 'Light Teal', value: '#008B8B' },
  { name: 'Green', value: '#00A801' },

  { name: 'Dark Orange', value: '#7D0B00' },
  { name: 'Orange', value: '#C84C0C' },

  { name: 'Yellow', value: '#FBDB7B' },
];

const clickedScroll = ref(false);
const mouseXY = { x: null, y: null };
const deleteButtonDown = ref({ itemId: null, startX: null, startY: null });
const draggingItemId = ref(null);
const draggedItem = ref(null);
const dragOffset = ref({ x: 0, y: 0 });
const dropIndicator = ref({ visible: false, x: 0, y: 0, w: 1, h: 1 });
const brushIndicator = ref({ visible: false, x: 0, y: 0, sprite: null });
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
  for (const folder of Object.values(spriteFolders)) {
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

const toggleColorPalette = () => {
  colorPaletteOpen.value = !colorPaletteOpen.value;
};

const selectColor = (color) => {
  backgroundColor.value = color;
  colorPaletteOpen.value = false;
};

const scrollToBottom = () => {
  const wrapper = document.querySelector('.overflow-auto');
  if (!wrapper) return;
  wrapper.scrollTo({ top: wrapper.scrollHeight, left: 0, behavior: 'smooth' });
  clickedScroll.value = true;
};

const updateScrollPosition = (e) => {
  const wrapper = e.target;
  scrollPosition.value = {
    x: wrapper.scrollLeft,
    y: wrapper.scrollTop
  };
};


onMounted(() => {
  // Scroll to bottom once the component is mounted
  // scrollToBottom();

  // Initialize viewport dimensions
  const wrapper = document.querySelector('.overflow-auto');
  if (wrapper) {
    viewportWidth.value = wrapper.clientWidth;
    viewportHeight.value = wrapper.clientHeight;
  }
});

const paintSprite = (e) => {
  if (!brushMode.value || !selectedBrushSprite.value) return;

  const gridContainer = document.querySelector('.grid-container');
  if (!gridContainer) return;

  const rect = gridContainer.getBoundingClientRect();
  const x = Math.max(0, Math.floor((e.clientX - rect.left + window.scrollX) / 50));
  const y = Math.max(0, Math.min(Math.floor((e.clientY - rect.top + window.scrollY) / 50), MAX_GRID_HEIGHT - 1));

  // Check if any sprite already exists at this position
  const exists = layout.value.some(item => item.x === x && item.y === y);
  if (exists) return;

  const spriteData = sprites[selectedBrushSprite.value];
  layout.value.push({
    x,
    y,
    w: spriteData.w,
    h: spriteData.h,
    i: String(nextId++),
    sprite: selectedBrushSprite.value,
    z: layout.value.length
  });
};

const eraseSprite = (e) => {
  if (!eraserMode.value) return;

  const gridContainer = document.querySelector('.grid-container');
  if (!gridContainer) return;

  const rect = gridContainer.getBoundingClientRect();
  const x = Math.max(0, Math.floor((e.clientX - rect.left + window.scrollX) / 50));
  const y = Math.max(0, Math.min(Math.floor((e.clientY - rect.top + window.scrollY) / 50), MAX_GRID_HEIGHT - 1));

  // Remove all sprites at this position
  layout.value = layout.value.filter(item => !(item.x === x && item.y === y));
};

const onGridMouseDown = (e) => {
  if (brushMode.value && selectedBrushSprite.value) {
    e.preventDefault();
    isPainting.value = true;
    paintSprite(e);
  } else if (eraserMode.value) {
    e.preventDefault();
    isErasing.value = true;
    eraseSprite(e);
  }
};

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

    // Update brush indicator position
    if (brushMode.value && selectedBrushSprite.value) {
      const gridContainer = document.querySelector('.grid-container');
      if (gridContainer) {
        const rect = gridContainer.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Check if mouse is over the grid
        if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
          const x = Math.max(0, Math.floor((mouseX - rect.left + window.scrollX) / 50));
          const y = Math.max(0, Math.min(Math.floor((mouseY - rect.top + window.scrollY) / 50), MAX_GRID_HEIGHT - 1));

          brushIndicator.value = {
            visible: true,
            x,
            y,
            sprite: selectedBrushSprite.value
          };
        } else {
          brushIndicator.value.visible = false;
        }
      }
    } else {
      brushIndicator.value.visible = false;
    }

    // Handle painting while mouse is pressed - check if button is still down
    if (e.buttons === 1) {
      if (isPainting.value && brushMode.value && selectedBrushSprite.value) {
        paintSprite(e);
      } else if (isErasing.value && eraserMode.value) {
        eraseSprite(e);
      }
    } else {
      // Button released, stop painting/erasing
      isPainting.value = false;
      isErasing.value = false;
    }
  });

  document.addEventListener('mouseup', () => {
    draggedItem.value = null;
    draggingItemId.value = null;
    isPainting.value = false;
    isErasing.value = false;
  });
}

const onDragStart = (spriteName, event) => {
  // In brush mode, just select the sprite
  if (brushMode.value) {
    selectedBrushSprite.value = spriteName;
    event.preventDefault();
    return;
  }

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
  // Don't start drag if in brush or eraser mode
  if (brushMode.value || eraserMode.value) {
    return;
  }

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
  background-color: v-bind(backgroundColor);
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

.minimap-container {
  width: 200px;
  height: 150px;
  background-size: 1px 1px;
}
</style>
