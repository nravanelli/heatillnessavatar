<script setup>
import { ref, onMounted, watch } from 'vue';
import Papa from 'papaparse';
import TreemapAnyChart from './components/TreemapAnyChart.vue';
import TreemapPlotly from './components/TreemapPlotly.vue';
import NetworkPlotly from './components/networkchart.vue';
import BarChartPlotly from './components/barchart.vue';
import {useCsvData} from '@/utils/loaddata'
const sexList = ['F', 'M', 'NR'];


const {
  columns,
  rows,
  age_range,       
  selected_sex,
  fetchAndParseCSV,
  applyFilters,
  treemapData, 
  tableData, 
  nxgraphData,
  updateTreemapSelection,
  treemapSelection
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
  //console.log("Treemap:", treemapData.value);
  //console.log("table:", tableData.value);
  //console.log('front_nxdata:', nxgraphData.value);
});

async function handleTreemapSelection(selection) {
  const nextLevelOptions = updateTreemapSelection(selection);
  //console.log("Next level options:", nextLevelOptions);
  //console.log('current:', treemapSelection.value);
  //console.log("Next level options:", current_selection);
  // nextLevelOptionsRef.value = nextLevelOptions
};
// function applyFilters() {
//   console.log("Applying filters...");
//   rows.value = originalRows.value.filter(row => {
//     const age = Number(row.age);
//     const fitsAgeRange = age <= age_range.value[1] && age >= age_range.value[0];
//     const fitsSexFilter = selected_sex.value.includes(row.sex);
//     console.log(`Row: ${JSON.stringify(row)} | Age: ${age} | fitsAgeRange: ${fitsAgeRange} | fitsSexFilter: ${fitsSexFilter}`);
//     return fitsAgeRange && fitsSexFilter;
//   });
//   console.log("Filtered rows:", rows.value);
// }

// Watch for changes in `selected_sex` and `age_range` and apply filters
watch([selected_sex, age_range], () => {
  console.log("Filter inputs changed: selected_sex =", selected_sex.value, "age_range =", age_range.value);
  applyFilters();
});
</script>

<template>
  <v-app>
    <v-container class="px-5">
      <v-combobox v-model="selected_sex" label="Select sex" :items="sexList" variant="outlined" multiple></v-combobox>
      <v-card variant="outlined">
        <v-range-slider v-model="age_range" label="Age" min="18" max="64" step="1"></v-range-slider>
      </v-card>
      <br>
      <v-card variant="outlined">
        <p>Selected sex: {{ selected_sex.join(', ') || 'None' }}</p>
        <p>Selected age range: {{ age_range[0] }} to {{ age_range[1] }}</p>
      </v-card>
      <br>
      
      <!-- Uncomment these if you want to render the treemaps -->
      <!-- <TreemapAnyChart></TreemapAnyChart>
      <br> -->
      <TreemapPlotly :data="treemapData" @node-selected="handleTreemapSelection"/>
      <NetworkPlotly :graphData="nxgraphData" :treemapSelection="treemapSelection" />
      <BarChartPlotly :graphData="nxgraphData" :treemapSelection="treemapSelection"/>
      <br>
      <h1>Data Table</h1>
      <div v-if="rows.length">
        <v-data-table :items="tableData" :headers="columns.value" class="elevation-1"></v-data-table>
      </div>
      <div v-else>
        Loading...
      </div>
    </v-container>
  </v-app>
</template>