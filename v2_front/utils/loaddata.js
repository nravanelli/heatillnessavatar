import { ref } from 'vue';
import * as d3 from 'd3';
var csvUrl = 'https://raw.githubusercontent.com/YJH-nus/test_case/main/df_processed_v3.csv'
const columns = ref([]); // Declare columns reactive variabl
let originalRows = ref([]); // To keep the unfiltered original data
let rows = ref([]);


const treemapSelection = ref([]); // treemap_selection_idx
const nxgraphDataRef = ref([]); 


const treemapDataRef = ref([]);
const tableDataRef = ref([]);
const sexList = ['F', 'M', 'NR'];
let selected_sex = ref(sexList);
let age_range = ref([18, 64]);

const NUMBER_OF_LEVELS = 4;
const categoryKeys = ['System', 'Organ/Component', 'Category/Type', 'Condition/Symptom'];


export function useCsvData() {
  async function fetchAndParseCSV({
    sex = ['F', 'M', 'NR'],
    age_min = 18,
    age_max = 64,
    outcome,
    outcome_switch = false,
    temp_switch = false,
    temp_min,
    temp_max,
    bmi_switch = false,
    bmi_min,
    bmi_max,
  } = {}) {
    try {
      console.log("Fetching CSV...");
      // get data from github
      const response = await fetch(csvUrl);
      const text = await response.text();
      const parsed_data = d3.csvParseRows(text);
    
      const parsed = parsed_data.map(x => 
        typeof x === 'string' ? x.replace(/Â/g, '') : x);
      const headerRows = parsed.slice(0, NUMBER_OF_LEVELS);
      // 463 rows
      const dataRows = parsed.slice(NUMBER_OF_LEVELS);

      //  "System||Organ||Category||Symptom", "Demographics||Age||NA||NA"
      const headers = headerRows[0].map((_, colIdx) =>
        headerRows.map(row => row[colIdx]).join('||')
      );
      
      const data = dataRows.map(row => {
        const obj = {};
        headers.forEach((key, i) => {
          obj[key] = row[i];
        });
        return obj;
      });

      // 68 columns before 'BN', need to change if data change 
      const infoCols = headers.slice(0, headers.findIndex(h => h.includes('Hyperpyrexia')));
      // 689 columns after 'BO'（include） 
      const symptomCols = [headers[0], ...headers.slice(headers.findIndex(h => h.includes('Hydration status')))];
      //console.log('symptomCols:', symptomCols);
      const symptomCol = symptomCols.slice(0, symptomCols.findIndex(h => h.includes('Body core temperature (°C)')));

      const caseData = data.map(row => {
        const item = {};
        infoCols.forEach(key => {
          const lastKey = key.split('||').at(-1);
          item[lastKey] = row[key];
        });
     
        
        item.Age = parseFloat(item['Age (years)']);
        item.BMI = parseFloat(item['BMI (kg/m2)']);
        item.Temperature = parseFloat(row['Body core temperature (°C)||Body core temperature (°C)||Body core temperature (°C)||Body core temperature (°C)']);
        item.Sex = (item['Sex'] || '').trim();
        item.Outcome = (item['Outcome \n(Recovered / Passed away)'] || '').trim();
        return item;
      });
    console.log('case:', caseData);
      //caseData same with df_case_info

    // symptomsData same with df_symptoms
      const symptomsData = data.map(row => {
        const item = {};
        symptomCol.forEach(col => {
          const levels = col.split('||');        
          const newLevels = levels.map(level => level.replace(/\//g, '_'));
          const newColName = newLevels.join('||');
          item[newColName] = row[col];
        });
        return item;
      });
      
      console.log('df_symptoms:', symptomsData);
      //console.log(Object.keys(symptomsData[0]));

      //const lastColsHeader = caseData[0];
      // const keys = Object.keys(caseData[0]);
      // console.log(keys)
    //   const filteredIndices = caseData
    //     .map((d, idx) => {
    //       const pass =
    //         sex.includes(d.Sex) &&
    //         d.Age >= age_min && d.Age <= age_max &&
    //         (!outcome_switch || (outcome && outcome.includes(d.Outcome))) &&
    //         (!temp_switch || (d.Temperature >= temp_min && d.Temperature <= temp_max)) &&
    //         (!bmi_switch || (d.BMI >= bmi_min && d.BMI <= bmi_max));
    //       return pass ? idx : null;
    //     })
    //     .filter(idx => idx !== null);


        // do filter
        const filteredIndices = caseData
        .map((d, idx) => {
          const Age = d['Age (years)'];
          const pass =
            sex.includes((d.Sex || '').trim()) &&
            Age >= age_min && Age <= age_max;
          return pass ? idx : null;
        })
        .filter(idx => idx !== null);


      // caseData.forEach((d, i) => {
      //   console.log(i, d['Age'], d['Age (years)'], d.Age);
      // });

      // use for draw network graph
      const filteredsymptom = filteredIndices.map(i => ({
        index: i,
        ...symptomsData[i]
      }));
      console.log('filteredsymptom:', filteredsymptom);

      const filteredRows = filteredIndices.map(i => caseData[i]);
      originalRows.value = caseData;
      rows.value = filteredRows;
      columns.value = Object.keys(filteredRows[0] || {}).map(key => ({ label: key, field: key }));
      
      // 409 rows, include index (need delete)
      const filteredCaseData = filteredIndices.map(i => ({
        index: i,
        ...caseData[i]
      }));
      console.log('filteredCaseDat:',Object.keys(filteredCaseData[0]));
      // Treemap
        const df_long = filteredIndices.flatMap(i => {
          const row = data[i];
          return symptomCols.map(col => {
            const val = row[col];
            const levels = col.split('||').map(str => str.replace(/\//g, '_'));
            return {
              'S/N': caseData[i]['S / N'],
              [categoryKeys[0]]: levels[0],
              [categoryKeys[1]]: levels[1],
              [categoryKeys[2]]: levels[2],
              [categoryKeys[3]]: levels[3],
              Presence: val === 'Y' ? 1 : 0
            };
          }).filter(entry => entry.Presence === 1);
        });
    console.log('df_long:',Object.keys(df_long[0]));

    const df_occurrence_map = new Map();
    df_long.forEach(item => {
      const key = categoryKeys.map(k => item[k]).join('||');
      const current = df_occurrence_map.get(key) || 0;
      df_occurrence_map.set(key, current + 1);
    });

    const df_occurrence = Array.from(df_occurrence_map.entries()).map(([key, count]) => {
      const levels = key.split('||');
      const result = {};
      categoryKeys.forEach((k, i) => {
        result[k] = levels[i];
      });
      result.Count = count;
      return result;
    });

    const df_treemap = df_occurrence
    .filter(entry => 
        entry['System'] !== 'Body core temperature (°C)' && entry.Count > 0)
    .map((entry, index) => ({
        ...entry,
        index 
    }));
    console.log('df_treemap:', df_treemap);

    // use for network graph
    // const firstLevelSystems = [...new Set(
    //   df_treemap.map(entry => entry['System']).filter(Boolean)
    // )];
    // console.log(firstLevelSystems);
    // if (firstLevelSystems.length > 0) {
    //   treemapSelection.value = firstLevelSystems; 
    // }

    const nxgraph = buildGraph(filteredsymptom, treemapSelection.value);
    console.log('nodes;',  nxgraph.nodes);

    const selectedFields = ['Authors', 'Year', 'Title', 'Journal', 'PMID/DOI'];

    const filteredTable = filteredCaseData.map(row => {
      return Object.fromEntries(
        Object.entries(row).filter(([key]) => selectedFields.includes(key))
      );
    });
    console.log('filteredTable:', filteredTable);
    columns.value = selectedFields.map(field => ({ text: field, value: field }));
    //console.log(columns);

      return {
        treemapData: df_treemap,
        tabelData: filteredTable,
        nxgraphData: nxgraph,
        originalSymptomData: filteredsymptom
      };
    } catch (error) {
      console.error("Failed to fetch/parse CSV:", error);
    }
  }

async function applyFilters() {
  console.log("Applying frontend filters...");

  const { treemapData: tData, tabelData: filteredTable, nxgraphData: nxgraph, originalSymptomData } = await fetchAndParseCSV({
    sex: selected_sex.value,
    age_min: age_range.value[0],
    age_max: age_range.value[1],
  });

    treemapDataRef.value = tData;
    tableDataRef.value = filteredTable;
    nxgraphDataRef.value = {
      ...nxgraph,
      originalSymptomData
    };

  }

  return {
    columns,
    rows,
    originalRows,
    selected_sex,
    age_range,
    fetchAndParseCSV,
    applyFilters, 
    treemapData: treemapDataRef,
    tableData: tableDataRef,
    nxgraphData: nxgraphDataRef,
    updateTreemapSelection,  
    treemapSelection    
  };
}

function buildGraph(df_filtered, treemapSelection) {
  const columnKeys = Object.keys(df_filtered[0]).slice(1);
  // Convert "Y" -> 1, others -> 0
  const binarizedData = df_filtered.map(row => {
    const newRow = {};
    columnKeys.forEach(key => {
      newRow[key] = row[key] === 'Y' ? 1 : 0;
    });
    return newRow;
  });
  // Drop columns with all 0, Hydration||... 426
  const usedColumns = columnKeys.filter(col =>
    binarizedData.some(row => row[col] === 1)
  );

  console.log('treemapSelection:', treemapSelection);
  const groupLevel = treemapSelection.length > 0 ? treemapSelection.length - 1 : 0;

  // Group column names by selected level
  const groupMap = {}; // e.g. Hydration -> [Hydration||...status1, Hydration||...status2]
  usedColumns.forEach(col => {
    const levels = col.split('||');
    const key = levels[groupLevel];
    if (!groupMap[key]) groupMap[key] = [];
    groupMap[key].push(col);
  });

  // Build symptom-by-group matrix (each group is one node)
  const groupBinaryMatrix = binarizedData.map(row => {
    const newRow = {};
    for (const [group, cols] of Object.entries(groupMap)) {
      newRow[group] = cols.reduce((sum, col) => sum + (row[col] || 0), 0);
    };
    return newRow;
  });

  const nodes = Object.keys(groupMap);
  const edges = [];

  // edge between two nodes if they occur in a row
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      let coOccurrence = 0;

      for (let k = 0; k < groupBinaryMatrix.length; k++) {
        if (groupBinaryMatrix[k][nodeA] > 0 && groupBinaryMatrix[k][nodeB] > 0) {
          coOccurrence += 1;
        }
      }
      if (coOccurrence > 0) {
        //edges.push({ source: nodeA, target: nodeB, weight: coOccurrence });
        const [source, target] = [nodeA, nodeB].sort(); 
        edges.push({ source, target, weight: coOccurrence });
      }
    }
  }

  // If treemapSelection.length > 0, return subgraph (neighbors + selected)
  if (treemapSelection.length > 0) {
    const selectedNode = treemapSelection[treemapSelection.length - 1];
    const finalEdges = [];
    const nodeSet = new Set([selectedNode]);

    edges.forEach(edge => {
      if (edge.source === selectedNode || edge.target === selectedNode) {
        nodeSet.add(edge.source);
        nodeSet.add(edge.target);
        finalEdges.push(edge);
      }
    });

    return {
      nodes: [...nodeSet].map(id => ({ id })),
      edges: finalEdges
    };
  }

  return {
    nodes: nodes.map(id => ({ id })),
    edges
  };
}


function updateTreemapSelection(newSelection) {
  if (!nxgraphDataRef.value.originalSymptomData || nxgraphDataRef.value.originalSymptomData.length === 0) {
    console.warn('No original symptom data available.');
    return [];
  }
  treemapSelection.value = newSelection;

  
  const nxgraph = buildGraph(
    nxgraphDataRef.value.originalSymptomData,
    newSelection
  );
  nxgraphDataRef.value = {
    ...nxgraph,
    originalSymptomData: nxgraphDataRef.value.originalSymptomData
  };

  // calculate next level options
  const level = newSelection.length;
  const nextLevelKeys = new Set();

  nxgraphDataRef.value.originalSymptomData.forEach(row => {
    Object.keys(row).forEach(key => {
      const levels = key.split('||');
      const match = levels.slice(0, level).every((lvl, idx) => lvl === newSelection[idx]);
      if (match && levels[level]) {
        nextLevelKeys.add(levels[level]);
      }
    });
  });
  //console.log('attary:', Array.from(nextLevelKeys));
  return Array.from(nextLevelKeys)
}

