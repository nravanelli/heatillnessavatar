<script setup>
import { ref, onMounted, watch } from 'vue';
import Papa from 'papaparse';
import TreemapAnyChart from './components/TreemapAnyChart.vue';
import TreemapPlotly from './components/TreemapPlotly.vue';
import NetworkPlotly from './components/networkchart.vue';
import BarChartPlotly from './components/barchart.vue';
import Abstract from './components/abstract.vue';
import {useCsvData, second_table} from '@/utils/loaddata';
import { computed } from 'vue';
// import re from 'dist/assets/index-C5SfW7OU';

const selected_outcome = ref(['Recovered', 'Passed away', 'NR']);
const temp_range = ref([36, 45]);
const BMI_range = ref([17, 44]);
const age_range = ref([18, 64]);
const rh_range = ref([13, 100]);
const wbgt_range = ref([2, 36]);
const selected_sex = ref(['F', 'M', 'NR']);    
const filteredcol = ref([]);
const filteredcol2 = ref([]);
const selectedRow = ref(null);
const enableSexFilter = ref(false);
const enableAgeFilter = ref(false);
const enableOutcomeFilter = ref(false);
const enableTemFilter = ref(false);
const enableBMIFilter = ref(false);
const enableRHFilter = ref(false);
const enableWBGTFilter = ref(false);
const table2 = ref([]);
const states = ref([]);
const Symptoms = ref([]);
const cleanedColumn = ref([]);
const table2Original = ref([]);




const {
  columns,
  rows, 
  fetchAndParseCSV,
  applyFilters,
  CaseOR,
  SympOR,
  treemapData, 
  tableData, 
  nxgraphData,
  updateTreemapSelection,
  treemapSelection,
  studies,
  cases,
  unique_symptoms,
  affected_systems
} = useCsvData({});



onMounted(async () => {
  console.log("Component mounted. Initiating CSV fetch.");
  const { treemapData: tData, tabelData: filteredTable, nxgraphData: nxgraph, originalSymptomData} = await fetchAndParseCSV();
  treemapData.value = tData;
  tableData.value = filteredTable;
  nxgraphData.value = {
  ...nxgraph,
  originalSymptomData
};
  filteredcol.value = columns.value.filter(col => col.value !== 'Abstract');
  //filteredcol2.value = columns.value.filter(col => col.value !== 'Abstract');
  //console.log('front_nxdata:', nxgraphData.value);
  // console.log(studies,
  // cases,
  // unique_symptoms,
  // affected_systems);
});


async function handleTreemapSelection(selection) {
  //console.log('selection:', selection);
  for (let i = 0; i < selection.length; i++){
    if (selection[i].startsWith('Category - ')) {
      selection[i] = selection[i].replace('Category - ', '');
    };
  }; 
  const nextLevelOptions = updateTreemapSelection(selection);
  console.log("Next level options:", nextLevelOptions);
  const { datat2: filteredTable2, select_filter: cleanedColumnToSN, symptomNames} = second_table(CaseOR.value, SympOR.value, selection);
  table2.value = filteredTable2;
  table2Original.value = filteredTable2;
  filteredcol2.value = columns.value.filter(col => col.value !== 'Abstract' && col.value !== 'S/N');
  states.value = symptomNames.sort();
  cleanedColumn.value = cleanedColumnToSN;
};

async function handleTableSelection() {
  const all_sym = Object.values(Symptoms.value);
  let all_index = [];

  for (let i = 0; i < all_sym.length; i++) {
    const sym = all_sym[i];
    const data = cleanedColumn.value[sym]; 
    //console.log(data);
    all_index.push(...data);
    };
    if (all_index.length === 0){
      table2.value = table2Original.value
    }else{
    table2.value = table2Original.value.filter(row => all_index.includes(String(row['S/N'])));
  }
  }


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

  // const { datat2: filteredTable2 } = second_table(CaseOR.value, SympOR.value, newSelection);
  // table2.value = filteredTable2;

  // filteredcol2.value = columns.value.filter(col => col.value !== 'Abstract');
}

// Watch for changes in `selected_sex` and `age_range` and apply filters
watch(
  
  [enableSexFilter, enableAgeFilter, enableOutcomeFilter, enableTemFilter, enableBMIFilter, enableRHFilter, enableWBGTFilter, selected_sex, age_range, selected_outcome, temp_range, BMI_range, rh_range, wbgt_range], () => {
  console.log("Filter inputs changed: selected_sex =", selected_sex.value, "age_range =", age_range.value);
  applyFilters({
    sex_switch: enableSexFilter.value,
    select_sex: selected_sex.value,
    age_switch: enableAgeFilter.value,
    age_min: age_range.value[0],
    age_max: age_range.value[1],
    outcome_switch: enableOutcomeFilter.value,
    outcome: selected_outcome.value,
    temp_switch: enableTemFilter.value,
    temp_min: temp_range.value[0],
    temp_max: temp_range.value[1],
    bmi_switch: enableBMIFilter.value,
    bmi_min: BMI_range.value[0],
    bmi_max: BMI_range.value[1],
    rh_switch: enableRHFilter.value,
    rh_min: rh_range.value[0],
    rh_max: rh_range.value[1],
    wbgt_switch: enableWBGTFilter.value,
    wbgt_min: wbgt_range.value[0],
    wbgt_max: wbgt_range.value[1]
  }
  );
}

);
</script>

<template>
  <v-app>
    <v-container class="px-5">
    <v-row class="mb-4" dense>
      <v-col cols="3">
        <v-card variant="outlined" class="pa-4 text-center">
          <div class="text-h6">Studies</div>
          <div class="text-h4">{{studies}}</div>
        </v-card>
      </v-col>
      <v-col cols="3">
        <v-card variant="outlined" class="pa-4 text-center">
          <div class="text-h6">Cases</div>
          <div class="text-h4">{{cases}}</div>
        </v-card>
      </v-col>

      <v-col cols="3">
        <v-card variant="outlined" class="pa-4 text-center">
          <div class="text-h6">Affected Systems</div>
          <div class="text-h4">{{affected_systems}}</div>
        </v-card>
      </v-col>

      <v-col cols="3">
        <v-card variant="outlined" class="pa-4 text-center">
          <div class="text-h6">Unique Symptoms</div>
          <div class="text-h4">{{unique_symptoms}}</div>
        </v-card>
      </v-col>
    </v-row>
   
    <v-switch v-model="enableSexFilter" label="Sex" color="blue-darken-2" hide-details="auto"></v-switch>
    <div v-if="enableSexFilter" style="display: flex; flex-direction: column; font-size: 18px;">
      <label for="F">
        <input type="checkbox" id="F" value="F" v-model="selected_sex" style="transform: scale(1.2)">
        &nbsp; F</label>
      <label for="M">
        <input type="checkbox" id="M" value="M" v-model="selected_sex" style="transform: scale(1.2)">
        &nbsp; M</label>
      <label for="NR">
      <input type="checkbox" id="NR" value="NR" v-model="selected_sex" style="transform: scale(1.2)"> 
        &nbsp; NR</label>
    </div>

    <v-switch v-model="enableOutcomeFilter" label="Outcome" color="blue-darken-2" hide-details="auto"></v-switch>
    <div v-if="enableOutcomeFilter" style="display: flex; flex-direction: column; font-size: 18px;">
      <label for="Recovered">
        <input type="checkbox" id="Recovered" value="Recovered" v-model="selected_outcome" style="transform: scale(1.2)">
        &nbsp; Recovered</label>
      <label for="Passed away">
        <input type="checkbox" id="Passed away" value="Passed away" v-model="selected_outcome" style="transform: scale(1.2)">
        &nbsp; Passed away</label>
      <label for="NR">
      <input type="checkbox" id="NR" value="NR" v-model="selected_outcome" style="transform: scale(1.2)"> 
        &nbsp; NR</label>
    </div>
      
  
    <v-switch v-model="enableAgeFilter" label="Age" color="blue-darken-2" hide-details="auto"></v-switch>
    <div v-if="enableAgeFilter" style="display: flex;" >
      <v-range-slider
        v-model="age_range"
        min="18"
        max="64"
        step="1"
        style="max-width: 300px;"
        thumb-label="always"
        color="blue-darken-2"
      ></v-range-slider>
    </div>

    <v-switch v-model="enableTemFilter" label="Temperature" color="blue-darken-2" hide-details="auto"></v-switch>
    <div v-if="enableTemFilter" style="display: flex;" >
      <v-range-slider
        v-model="temp_range"
        min="36"
        max="45"
        step="1"
        style="max-width: 300px;"
        thumb-label="always"
        color="blue-darken-2"
      ></v-range-slider>
    </div>

    <v-switch v-model="enableBMIFilter" label="BMI" color="blue-darken-2" hide-details="auto"></v-switch>
    <div v-if="enableBMIFilter" style="display: flex;" >
      <v-range-slider
        v-model="BMI_range"
        min="17"
        max="44"
        step="1"
        style="max-width: 300px;"
        thumb-label="always"
        color="blue-darken-2"
      ></v-range-slider>
    </div>
    
    <v-switch v-model="enableRHFilter" label="RH" color="blue-darken-2" hide-details="auto"></v-switch>
    <div v-if="enableRHFilter" style="display: flex;" >
      <v-range-slider
        v-model="rh_range"
        min="13"
        max="100"
        step="1"
        style="max-width: 300px;"
        thumb-label="always"
        color="blue-darken-2"
      ></v-range-slider>
    </div>

    <v-switch v-model="enableWBGTFilter" label="WBGT" color="blue-darken-2" hide-details="auto"></v-switch>
    <div v-if="enableWBGTFilter" style="display: flex;" >
      <v-range-slider
        v-model="wbgt_range"
        min="2"
        max="36"
        step="1"
        style="max-width: 300px;"
        thumb-label="always"
        color="blue-darken-2"
      ></v-range-slider>
    </div>


      <v-row class="my-4" style="height: 900px;">
        <v-col cols="8" style="height: 100%;">
        <v-card style="height: 100%; display: flex; flex-direction: column;">
            <v-card-title>Data Table</v-card-title>
            <v-card-text style="flex: 1; padding: 0;">
               <div v-if="rows.length">
                <v-data-table 
                :items="showtables" 
                :headers="filteredcol.value" 
                fixed-header 
                height="770px"
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
      <TreemapPlotly :data="treemapData" @node-selected="handleTreemapSelection"/>

      <v-row class="my-4" style="height: 950px;">
        <v-col cols="12" style="height: 100%;">
        <v-card style="height: 100%; display: flex; flex-direction: column;">
            <v-card-title  class="d-flex align-center flex-wrap">
            <div>Data Table 2</div>
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
              >
            </v-select>
          </template>
          </v-card-title>
            <v-card-text style="flex: 1; overflow: hidden; padding: 0;"> 
              <!-- <v-card-text style="flex: 1; padding: 0;"> -->
              <div style="height: 100%; display: flex; flex-direction: column;">
              <div style="flex: 1; overflow: auto;">
               <div v-if="showtable2.length">
                <v-data-table
                  :items="showtable2"
                  :headers="filteredcol2.value"
                  fixed-header
                  class="custom-table"
                  style="font-size: 14.4px">
              </v-data-table>
                 <!-- <template #item="{ item }">
                  <tr @click="handleRowClick(item)"  
                  :class="{ 'selected-row':  isSelected(item) }">
                    <td v-for="col in filteredcol" :key="col.value">
                      {{ item[col.value] }}
                    </td>
                  </tr>
                </template> -->
              </div>
              <div v-else>
                <v-data-table 
                :items="showtables" 
                :headers="filteredcol.value" 
                fixed-header 
                class="custom-table"
                style="font-size: 14.4px">
                </v-data-table>
              </div>
              </div>
              </div>
            </v-card-text>
          </v-card>
      </v-col>
      </v-row>

      <v-row class="my-4">
        <v-col cols="8">
          <NetworkPlotly :graphData="nxgraphData" :treemapSelection="treemapSelection" />
        </v-col>
        <v-col cols="4">
          <BarChartPlotly :graphData="nxgraphData" :treemapSelection="treemapSelection" />
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

<style>
.fixed-select-menu {
  min-width: 500px !important;
  max-width: 500px !important;
}

.custom-table td:nth-child(1),
.custom-table th:nth-child(1) {
  width: 220px;
}


.custom-table td:nth-child(2),
.custom-table th:nth-child(2) {
  width: 50px;
}

.custom-table td:nth-child(3),
.custom-table th:nth-child(3) {
  width: 260px;
}
.custom-table td:nth-child(4),
.custom-table th:nth-child(4) {
  width: 150px;
}
.custom-table td:nth-child(5),
.custom-table th:nth-child(5) {
  width: 30px;
}
.custom-table td:nth-child(6),
.custom-table th:nth-child(6) {
  width: 50px;
}
.custom-table td:nth-child(7),
.custom-table th:nth-child(7) {
  width: 80px;
}

.custom-table thead .v-data-table__th {
  background-color: #F8F8F8 !important; 
  /* color: #333 !important;               */
}
</style>