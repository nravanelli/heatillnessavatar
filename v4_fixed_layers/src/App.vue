<script setup>
import { ref, onMounted, watch, computed, onUnmounted} from 'vue';
import './assets/style.css';
import TreemapPlotly from './components/TreemapPlotly.vue';
//import TreemapPlotly from './components/TreemapAnyChart.vue';
import NetworkPlotly from './components/networkchart.vue';
import BarChartPlotly from './components/barchart.vue';
import Abstract from './components/abstract.vue';
import {useCsvData, second_table} from '@/utils/fetchdata';
//import {useCsvData, second_table} from '@/utils/test';
import { debounce } from 'lodash-es';

const drawer = ref(false)
const showTable1 = ref(false)

const filters = ref({
  Sex: {
    enabled: false,
    model: ['F', 'M', 'NR'],
    type: 'checkbox',
    options: ['F', 'M', 'NR']
  },
  Outcome: {
    enabled: false,
    model: ['Recovered', 'Passed away', 'NR'],
    type: 'checkbox',
    options: ['Recovered', 'Passed away', 'NR']
  },
  Age: {
    enabled: false,
    model: [18, 64],
    type: 'range',
    min: 18,
    max: 64
  },
    Temperature: {
    enabled: false,
    model: [34, 45],
    type: 'range',
    min: 34,
    max: 45
  },
  BMI: {
    enabled: false,
    model: [17, 44],
    type: 'range',
    min: 17,
    max: 44
  },

    RH: {
    enabled: false,
    model: [13, 100],
    type: 'range',
    min: 13,
    max: 100
  },
    WBGT: {
    enabled: false,
    model: [2, 36],
    type: 'range',
    min: 2,
    max: 36
  }
});

const labelMap = {

  Temperature: 'Temperature (°C)',
  RH: 'Relative Humidity (%)',
  WBGT: 'Wet Bulb Globe Temperature (°C)'
};


const {
  columns,
  rows, 
  fetchAndParseCSV,
  applyFilters,
  caseData: CaseOR,
  symptomData: SympOR,
  treemapData, 
  tableData, 
  nxgraphData,
  updateTreemapSelection,
  treemapSelection,
  studies,
  cases,
  unique_symptoms,
  affected_systems,
  muscleDamageData: musOR,
} = useCsvData();

const filteredcol = ref([]);
const table2 = ref([]);
const table2Original = ref([]);
const filteredcol2 = ref([]);
const states = ref([]);
const cleanedColumn = ref({});
const Symptoms = ref([]);
const selectedRow = ref(null);
const activeChart = ref('network')


const drawerWidth = ref(window.innerWidth < 600 ? 240 : window.innerWidth * 0.18);
function updateDrawerWidth() {
  if (window.innerWidth < 600) {
    drawerWidth.value = 240;
  } else {
    drawerWidth.value = window.innerWidth * 0.18;
  }
};

onMounted(async () => {
  try {
    const { 
      treemapData: tData, 
      tableData: filteredTable, 
      nxgraphData: nxgraph, 
      originalSymptomData, 
      mDamage: muscleDamageRef 
    } = await fetchAndParseCSV();
    
    treemapData.value = tData;
    tableData.value = filteredTable;
    nxgraphData.value = {
      ...nxgraph,
      originalSymptomData,
    };
    musOR.value = muscleDamageRef;
    filteredcol.value = columns.value.filter(col => col.value !== 'Abstract');
    window.addEventListener('resize', updateDrawerWidth);
  } catch (error) {
    console.error("Error during initialization:", error);
  };
  
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDrawerWidth);
});


async function handleTreemapSelection(selection) {
  //console.log(selection);
  try {
    // if (!Array.isArray(selection) || selection.length === 0) {
    //   console.warn("Treemap selection is empty or invalid, skipping update.");
    //   return; 
    // }

    const cleanedSelection = selection.map(s => s.replace(/^Category - /, ''));
    updateTreemapSelection(cleanedSelection);
    const { 
      datat2: filteredTable2, 
      select_filter: cleanedColumnToSN, 
      symptomNames 
    } = second_table(CaseOR.value, SympOR.value, cleanedSelection);
   
    table2.value = filteredTable2;
    table2Original.value = filteredTable2;
    filteredcol2.value = columns.value.filter(col => 
      col.value !== 'Abstract' && col.value !== 'S/N'
    );
    states.value = [...symptomNames].sort();
    cleanedColumn.value = cleanedColumnToSN;
    Symptoms.value = [];
  } catch (error) {
    console.error("Error handling treemap selection:", error);
  }}


async function handleTableSelection() {
  
  const selectedSymptoms = Object.values(Symptoms.value);
  //console.log(selectedSymptoms);
  const all_index = selectedSymptoms.flatMap(sym => cleanedColumn.value[sym] || []);
  //console.log(all_index);
  if (all_index.length === 0){
      table2.value = table2Original.value
    } else {
    table2.value = table2Original.value.filter(row => all_index.includes(String(row['S/N'])));
  };
  };

const showtables = computed(() => {
  return tableData.value.map(({ Abstract, ...rest }) => rest);
});

const showtable2 = computed(() => {
  return table2.value.map(row => {
    return Object.fromEntries(
      Object.entries(row).filter(([key]) => key !== 'Abstract' && key !== 'S/N')
    );
  });
});
  
const treemapProps = computed(() => ({
  data1: treemapData.value,
  data2: musOR.value
}));


watch(tableData, () => {
  selectedRow.value = null;
});

function handleRowClick(row_select) {
  const fullRow = tableData.value.find(row =>
    Object.keys(row_select).every(key => row[key] === row_select[key])
  );
  selectedRow.value = fullRow || null;
  //console.log('selectedRow:', selectedRow.value);
}

function isSelected(item) {
  if (!selectedRow.value) return false;
  return filteredcol.value.every(col => item[col.value] === selectedRow.value[col.value]);
}

function removeTreemapLevel(indexToRemove) {
  const newSelection = treemapSelection.value.slice(0, indexToRemove);
  handleTreemapSelection(newSelection);
}

// Watch for changes in `selected_sex` and `age_range` and apply filters
const debouncedApplyFilters = debounce((filters) => {
  applyFilters(filters);
}, 100);


watch(
  filters,
  () => {
    debouncedApplyFilters({
      sex_switch: filters.value.Sex.enabled,
      select_sex: filters.value.Sex.model,
      age_switch: filters.value.Age.enabled,
      age_min: filters.value.Age.model[0],
      age_max: filters.value.Age.model[1],
      outcome_switch: filters.value.Outcome.enabled,
      outcome: filters.value.Outcome.model,
      temp_switch: filters.value.Temperature.enabled,
      temp_min: filters.value.Temperature.model[0],
      temp_max: filters.value.Temperature.model[1],
      bmi_switch: filters.value.BMI.enabled,
      bmi_min: filters.value.BMI.model[0],
      bmi_max: filters.value.BMI.model[1],
      rh_switch: filters.value.RH.enabled,
      rh_min: filters.value.RH.model[0],
      rh_max: filters.value.RH.model[1],
      wbgt_switch: filters.value.WBGT.enabled,
      wbgt_min: filters.value.WBGT.model[0],
      wbgt_max: filters.value.WBGT.model[1]
    });
  },
  { deep: true }
);

</script>

<template>
  <v-app>
    <v-container class="px-5">
    <v-row class="mb-4" dense>
      <!-- <v-col cols="auto" class="d-flex align-center mr-10">
        <v-btn>
        <v-app-bar-nav-icon variant="text" @click.stop="drawer = !drawer" />
        <v-toolbar-title class="text-h6">Filter</v-toolbar-title>
        </v-btn>
      </v-col> -->
      <v-col cols="auto" class="d-flex align-center mr-4">
        <v-btn
          variant="text"
          class="d-flex align-center px-4"
          @click.stop="drawer = !drawer"
          style="background-color: rgba(0, 0, 0, 0.06); border-radius: 4px;"
        >
          <v-icon start size="26" class="mr-2">mdi-menu</v-icon>
          <span class="text-h6">FILTER</span>
        </v-btn>
      </v-col>
        <v-row dense justify="end" class="gap-4">
          <v-col cols="12" sm="6" md="3" v-for="(value, label) in { 'Studies': studies, 'Cases': cases, 'Affected Systems': affected_systems, 'Unique Symptoms': unique_symptoms }" :key="label">
          <v-card variant="outlined" class="pa-4 text-left">
            <div class="pl-4">
              <div class="text-h6">{{ label }}</div>
              <div class="text-h4">{{ value }}</div>
            </div>
            <v-btn
              v-if="label === 'Studies'"
               size="small"
              class="position-absolute"
              style="top: 8px; right: 8px;"
              @click="showTable1 = !showTable1"
            >
              {{ showTable1 ? 'Hide Table' : 'Show Table' }}
            </v-btn>
          </v-card>
        </v-col>
        </v-row>
      </v-row> 

      <v-navigation-drawer
        v-model="drawer"
        location="left"
        temporary
        :width="drawerWidth"
        >

    <div style="margin: 1.0em; font-size: 20px;"> Filter Options</div>
    <!-- <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; margin-left: 1.5em;"> -->
    <div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 10px">
      <!-- <div  v-for="(filter, key) in filters"  :key="key"
        style="display: flex; flex-direction: column; flex: 1 1 400px; padding-right: 20px;" >
          -->
        <v-card
          v-for="(filter, key) in filters"
          :key="key"
          class="pa-1"
          style="flex: 1 1 100%; 
         border-radius: 12px;
         box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
         background: linear-gradient(145deg, #f7f8fa, #e9ebee);"
          elevation="0"
        >
        
        <v-switch
          v-model="filter.enabled"
          :label="labelMap[key] || key"
          color="blue-darken-2"
          class="black-label"
          hide-details="auto">
        </v-switch>

      <div v-if="filter.enabled && filter.type === 'checkbox'" style="display: flex; flex-direction: column; font-size: 18px;">
        <label v-for="option in filter.options" :key="option">
          <input
            type="checkbox"
            :value="option"
            v-model="filter.model"
            style="transform: scale(1.2)"
          />
          &nbsp; {{ option }}
        </label>
      </div>

      <div v-else-if="filter.enabled && filter.type === 'range'" style="display: flex;">
        <v-range-slider
          v-model="filter.model"
          :min="filter.min"
          :max="filter.max"
          step="1"
          style="max-width: 500px;"
          thumb-label="always"
          color="blue-darken-2"
        ></v-range-slider>
      </div>
      </v-card>
    </div>
   
    </v-navigation-drawer>
      <v-row v-if="showTable1" class="my-4" style="height: 900px;">
        <v-col cols="8" style="height: 100%;">
        <v-card style="height: 100%; display: flex; flex-direction: column;">
            <v-card-title>List of Studies</v-card-title>
            <v-card-text style="flex: 1; padding: 0;">
               <div v-if="rows.length">
                <v-data-table 
                :items="showtables" 
                :headers="filteredcol.value" 
                fixed-header 
                height="770px"
                class="custom-table"
                style="font-size: 14.4px">
                 <template #item="{ item }">
                  <tr @click="handleRowClick(item)"  
                  :class="{ 'selected-row':  isSelected(item) }">
                    <td v-for="col in filteredcol" :key="col.value">
                      {{ item[col.value] }}
                    </td>
                  </tr>
                </template>
              </v-data-table>
              </div>
              <div v-else>
                Loading...
              </div>
            </v-card-text>
          </v-card>
      </v-col>
        <v-col cols="4" style="height: 100%;">
          <Abstract  :row="selectedRow"/>
        </v-col>
      </v-row>
      <v-row class="my-4">
        <v-col cols="12">
          <TreemapPlotly :data="treemapProps" @node-selected="handleTreemapSelection" />
        </v-col>
      </v-row>
          <v-btn-toggle v-model="activeChart" class="mb-4" mandatory>
            <v-btn value="network">Network Graph</v-btn>
            <v-btn value="bar">Bar Chart</v-btn>
          </v-btn-toggle>
          <v-row class="my-4">
            <v-col cols="12">
              <NetworkPlotly
                v-if="activeChart === 'network'"
                :graphData="nxgraphData"
                :treemapSelection="treemapSelection"
              />
              <BarChartPlotly
                v-else-if="activeChart === 'bar'"
                :graphData="nxgraphData"
                :treemapSelection="treemapSelection"
              />
            </v-col>
          </v-row>
      <v-row class="my-4" style="min-height: 60vh;">
        <v-col cols="12" style="height: 100%;">
        <v-card style="height: 100%; display: flex; flex-direction: column;">
            <v-card-title  class="d-flex align-center flex-wrap">
            <div>List of Studies</div>
            <div class="d-flex flex-wrap px-4 py-2">
              <template v-for="(item, index) in treemapSelection" :key="index">
                <v-chip class="ma-1" closable @click:close="removeTreemapLevel(index)">
                    {{ item }}
                </v-chip>
                <span v-if="index < treemapSelection.length - 1" style="font-size: 25px;">/</span>
              </template>
            </div>
            <template #item="{ item }">
                  <tr>
                    <td v-for="col in filteredcol2" :key="col.value">
                      {{ item[col.value] }}
                    </td>
                  </tr>
            </template>
            <template v-if="treemapSelection.length === 4">
            <v-select
              v-model="Symptoms"
              :items="states"
              density="compact"
              label="Select Symptoms"
              multiple
              persistent-hint
              @update:model-value="handleTableSelection"
              :menu-props="{
                contentClass: 'fixed-select-menu'}"
              />
          </template>
          </v-card-title>
            <v-card-text style="flex: 1; overflow: auto; padding: 0;"> 
              <!-- <v-card-text style="flex: 1; padding: 0;"> -->
              <div style="height: 100%; display: flex; flex-direction: column;">
              <div style="flex: 1; overflow: auto;">
               <div v-if="showtable2.length">
                <v-data-table
                  :items="showtable2"
                  :headers="filteredcol2.value"
                  fixed-header
                  class="custom-table"
                  style="font-size: 14.4px"
                />
              </div>
              <div v-else>
                <v-data-table 
                :items="showtables" 
                :headers="filteredcol.value" 
                fixed-header 
                class="custom-table"
                style="font-size: 14.4px" />
              </div>
              </div>
              </div>
            </v-card-text>
          </v-card>
      </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<style scoped>
.selected-row {
  background-color: #e3f2fd !important; 
  transition: background-color 0.3s ease
};
</style>





