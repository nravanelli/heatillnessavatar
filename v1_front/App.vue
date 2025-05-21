<script setup>
import { ref, onMounted, watch } from 'vue';
import Papa from 'papaparse';
import TreemapAnyChart from './components/TreemapAnyChart.vue';
import TreemapPlotly from './components/TreemapPlotly.vue';

const columns = ref([]); // Declare columns reactive variable
let originalRows = ref([]); // To keep the unfiltered original data
let rows = ref([]);

const sexList = ['female', 'male', 'other', 'unknown'];
let selected_sex = ref(sexList);
let age_range = ref([0, 100]);


async function fetchAndParseCSV() {
  console.log("Starting fetchAndParseCSV...");
  try {
    //console.log("Fetching CSV data from URL...");
    const response = await fetch('https://calmcode.io/static/data/titanic.csv');

    //const response = await fetch('https://raw.githubusercontent.com/YJH-nus/test_case/main/test_data.csv');
    console.log("CSV data fetched successfully.");
    const csvText = await response.text();
    console.log("CSV text loaded. Beginning parsing...");
    Papa.parse(csvText, {
      header: true,
      complete: function (results) {
        console.log("CSV parsing complete. Results:", results);
        if (results.data.length > 0) {
          columns.value = Object.keys(results.data[0]).map(key => ({ label: key, field: key }));
          console.log("Extracted columns:", columns.value);
        } else {
          console.warn("No data found in CSV.");
        }
        originalRows.value = results.data;
        console.log("Stored original rows:", originalRows.value);
        applyFilters(); // Apply initial filters
      },
      error: function (error) {
        console.error("Error during CSV parsing:", error);
      }
    });
  } catch (error) {
    console.error('Error fetching and parsing CSV:', error);
  }
}

onMounted(() => {
  console.log("Component mounted. Initiating CSV fetch.");
  fetchAndParseCSV();
});

function applyFilters() {
  console.log("Applying filters...");
  rows.value = originalRows.value.filter(row => {
    const age = Number(row.age);
    const fitsAgeRange = age <= age_range.value[1] && age >= age_range.value[0];
    const fitsSexFilter = selected_sex.value.includes(row.sex);
    console.log(`Row: ${JSON.stringify(row)} | Age: ${age} | fitsAgeRange: ${fitsAgeRange} | fitsSexFilter: ${fitsSexFilter}`);
    return fitsAgeRange && fitsSexFilter;
  });
  console.log("Filtered rows:", rows.value);
}

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
        <v-range-slider v-model="age_range" label="Age" min="0" max="100" step="1"></v-range-slider>
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
      <TreemapPlotly></TreemapPlotly>
      <br>
      <h1>CSV Data</h1>
      <div v-if="rows.length">
        <v-data-table :items="rows"></v-data-table>
      </div>
      <div v-else>
        Loading...
      </div>
    </v-container>
  </v-app>
</template>