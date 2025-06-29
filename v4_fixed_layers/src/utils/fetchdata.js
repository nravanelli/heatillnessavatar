import { ref } from 'vue';
import * as d3 from 'd3';
import csvRaw from '@/data/df_processed_v4.1.csv?raw';

const NUMBER_OF_LEVELS = 4;
const categoryKeys = ['System', 'Organ/Component', 'Category/Type', 'Condition/Symptom'];
const selectedFields = ['Authors', 'Year', 'Title', 'Journal', 'PMID/DOI', 'Cases', 'Study Type', 'Abstract'];

const state = {
  columns: ref([]),
  rows: ref([]),
  studies: ref([]),
  cases: ref([]),
  unique_symptoms: ref([]),
  affected_systems: ref([]),
  caseData: ref([]),
  symptomData: ref([]),
  treemapSelection: ref([]),
  nxgraphData: ref([]),
  treemapData: ref([]),
  tableData: ref([]),
  muscleDamageData: ref([])
};

let prevDfTreemap = [];

function parseCSVData(original_data) {
  const parsed = original_data.map(x => 
        typeof x === 'string' ? x.replace(/Â/g, '') : x);

  const headerRows = parsed.slice(0, NUMBER_OF_LEVELS);
  // 657 rows
  const dataRows = parsed.slice(NUMBER_OF_LEVELS);
  //  "System||Organ||Category||Symptom", "Demographics||Age||NA||NA"
  const headers = headerRows[0].map((_, colIdx) =>
    headerRows.map(row => row[colIdx]).join('||')
  );
  //same as data in loaddata.js

  const data = dataRows.map(row => {
    const obj = {};
    headers.forEach((key, i) => {
      obj[key] = row[i];
    });
    return obj;
  });

  return{
    data: data,
    headers: headers
  }
}

function extractCaseData(data, headers) {
  //  need to change if data change, 77 column from hyper 
  const infoCols = headers.slice(0, headers.findIndex(h => h.includes('Hyperpyrexia')));
  //console.log(infoCols);
  return data.map(row => {
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
    item.Rh = item['RH\n(%)'] ? parseFloat(item['RH\n(%)']) : null;
    item.WBGT = item['WBGT\n(°C)'] ? parseFloat(item['WBGT\n(°C)']) : null;
    
    return item;
  });
}

function extractSymptomData(data, headers) {
  // extract symtoms 888 column 
  const symptomCols = [headers[0], ...headers.slice(headers.findIndex(h => h.includes('Hydration status')))];
  const symptomCol = symptomCols.slice(0, symptomCols.findIndex(h => h.includes('Body core temperature (°C)')));
  //console.log(symptomCols);
  return data.map(row => {
    const item = {};
    symptomCol.forEach(col => {
      const levels = col.split('||');        
      const newLevels = levels.map(level => level.replace(/\//g, '_'));
      const newColName = newLevels.join('||');
      item[newColName] = row[col];
    });
    return item;
  });
}

function applyFiltersToData(caseData, filters) {
  const {
    sex_switch = false, select_sex,
    age_switch = false, age_min, age_max,
    outcome_switch = false, outcome,
    temp_switch = false, temp_min, temp_max,
    bmi_switch = false, bmi_min, bmi_max,
    rh_switch = false, rh_min, rh_max,
    wbgt_switch = false, wbgt_min, wbgt_max
  } = filters;
  
  return caseData.reduce((acc, d, i) => {
    const sex = d.Sex || '';
    const age = d.Age;
    const temp = d.Temperature;
    const bmi = d.BMI;
    const outcome_val = d.Outcome || '';
    const rh = d.Rh;
    const wbgt = d.WBGT;

    if (
      (!sex_switch || select_sex.includes(sex)) &&
      (!age_switch || (age >= age_min && age <= age_max)) &&
      (!outcome_switch || (outcome && outcome.includes(outcome_val))) &&
      (!temp_switch || (temp >= temp_min && temp <= temp_max)) &&
      (!bmi_switch || (bmi >= bmi_min && bmi <= bmi_max)) &&
      (!rh_switch || (rh !== null && rh >= rh_min && rh <= rh_max)) &&
      (!wbgt_switch || (wbgt !== null && wbgt >= wbgt_min && wbgt <= wbgt_max))
    ) {
      acc.push(i);
    }
    return acc;
  }, []);
}

function processTreemapData(filteredIndices, data, caseData, symptomCols) {
  const df_long = [];
  const ICK_col = 'Muscular System||Muscular System||Muscle Function||Initial Creatine Kinase';
  const affectedSystemsSet = new Set();
  const uniqueSymptomsSet = new Set();

  for (const i of filteredIndices) {
    const row = data[i];

    for (const col of symptomCols) {
      const val = row[col];
      if (val === 'Y') {
        const ICK_value = row[ICK_col];
        const levels = col.split('||').map(str => str.replace(/\//g, '_'));

        df_long.push({
          'S/N': caseData[i]['S/N'],
          'Sex': caseData[i]['Sex'],
          'ICK_value': ICK_value,
          [categoryKeys[0]]: levels[0],
          [categoryKeys[1]]: levels[1],
          [categoryKeys[2]]: levels[2],
          [categoryKeys[3]]: levels[3],
          Presence: 1,
        });
        //console.log(df_long);

        if (levels[0] && levels[0] !== 'Others') {
          affectedSystemsSet.add(levels[0]);
        }
        uniqueSymptomsSet.add(levels[3]);
      }
    }
  }

  state.affected_systems.value = affectedSystemsSet.size;
  state.unique_symptoms.value = uniqueSymptomsSet.size;
  
  const occurrenceMap = df_long.reduce((map, item) => {
    const key = categoryKeys.map(k => item[k]).join('||');
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());

  const df_occurrence = Array.from(occurrenceMap.entries()).map(([key, count]) => {
    const levels = key.split('||');
    return {
      ...Object.fromEntries(categoryKeys.map((k, i) => [k, levels[i]])),
      Count: count
    };
  });

  //process different number of keys
    // function process_keys(){};

     const filteredOccurrence = df_occurrence
    .filter(entry => entry['System'] !== 'Body core temperature (°C)' && entry.Count > 0)
    .map((entry, index) => ({ ...entry, index }));
  //console.log(filteredOccurrence);
  return {
    occurrenceData: filteredOccurrence,
    longFormatData: df_long
  };

}

function calculateMuscleDamage(df) {
    let sumM = 0, countM = 0;
    let sumF = 0, countF = 0;

    const muscleDamageRows = df.filter(entry => {
    const conMatch = entry['Condition/Symptom'] === 'Muscle damage';
    const ickRaw = entry['ICK_value'];

    if (!conMatch || !ickRaw || ickRaw === 'N') return false;

    const ickValue = parseFloat(ickRaw);
    if (isNaN(ickValue)) return false;

    const sex = entry['Sex'];
    const isMRange = sex === 'M' && ickValue >= 45 && ickValue <= 250;
    const isFRange = sex === 'F' && ickValue >= 30 && ickValue <= 150;
    const outsideRange = !isMRange && !isFRange;

   
    if (outsideRange) {
      if (sex === 'M') {
        sumM += ickValue;
        countM++;
      } else if (sex === 'F') {
        sumF += ickValue;
        countF++;
      }
      return true;
    }
    return false;
  });

    const avgM = countM > 0 ? parseFloat((sumM / countM).toFixed(2)) : 0;
    const avgF = countF > 0 ? parseFloat((sumF / countF).toFixed(2)) : 0;
    return {'Male': avgM, 'Female': avgF};

  }

export function useCsvData() {
  async function fetchAndParseCSV(filters = {}) {
    try {
      // const response = await fetch(csvUrl);
      // const text = await response.text();
      // const parsed_data = d3.csvParseRows(text);
      const parsed_data = d3.csvParseRows(csvRaw);
      const {data: data, headers: headers}= parseCSVData(parsed_data);  
      
      // 933 columns after 'BW'（include）
      const symptomCols = [headers[0], ...headers.slice(headers.findIndex(h => h.includes('Hydration status')))];
      //const symptomCol = symptomCols.slice(0, symptomCols.findIndex(h => h.includes('Body core temperature (°C)')));
      const caseData = extractCaseData(data, headers);
      state.caseData.value = caseData;
      
      const symptomsData = extractSymptomData(data, headers);
      state.symptomData.value = symptomsData;
      //console.log(symptomsData);
      
      const filteredIndices = applyFiltersToData(caseData, filters);
    
      // Process filtered data
      const filteredRows = filteredIndices.map(i => caseData[i]);
      state.rows.value = filteredRows;

      const filteredCaseData = filteredIndices.map(i => ({ index: i, ...caseData[i] }));
      //columns.value = Object.keys(filteredRows[0] || {}).map(key => ({ label: key, field: key }));

      //console.log('f', filteredCaseData); // no symtoms
      // Remove duplicates
      const seen = new Set();
      const df_case_info_filtered = filteredCaseData.filter(row => {
        const sn = row['S/N'];
        return seen.has(sn) ? false : (seen.add(sn), true);
      });
      //console.log('df', df_case_info_filtered);
      state.studies.value = df_case_info_filtered.length;
      state.cases.value = filteredCaseData.length;
      
      const { occurrenceData: df_treemap, longFormatData: df_long } = processTreemapData(filteredIndices, data, caseData, symptomCols);
      
      const dfTreemapChanged = JSON.stringify(prevDfTreemap) !== JSON.stringify(df_treemap);
      if (dfTreemapChanged) {
        state.treemapSelection.value = [];
      }
      prevDfTreemap = [...df_treemap];
      
      const filteredsymptom = filteredIndices.map(i => ({
        index: i,
        ...symptomsData[i]
      }));
      
      const nxgraph = buildGraph(filteredsymptom, state.treemapSelection.value);

      const muscleDamageV = calculateMuscleDamage(df_long);
      const filteredTable = handletableselection(filteredCaseData);
      
      state.columns.value = selectedFields.map(field => ({ text: field, value: field }));
      
      return {
        treemapData: df_treemap,
        tableData: filteredTable,
        nxgraphData: nxgraph,
        originalSymptomData: filteredsymptom,
        mDamage: muscleDamageV
      };
    } catch (error) {
      console.error("Failed to fetch/parse CSV:", error);
      throw error;
    }
  }

  async function applyFilters(options = {}) {
    try {
      const { 
        treemapData: tData, 
        tableData: filteredTable, 
        nxgraphData: nxgraph, 
        originalSymptomData, 
        mDamage: muscleDamageV 
      } = await fetchAndParseCSV(options);
      
      state.treemapData.value = tData;
      state.tableData.value = filteredTable;
      state.nxgraphData.value = {
        ...nxgraph,
        originalSymptomData
      };
      state.muscleDamageData.value = muscleDamageV;
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  }

  return {
    ...state,
    fetchAndParseCSV,
    applyFilters,
    updateTreemapSelection: (selection) => {
  state.treemapSelection.value = [...selection];
  //console.log(selection);
  //console.log(state.treemapSelection.value);
  const nxgraph = buildGraph(state.symptomData.value, selection);

  state.nxgraphData.value = {
    ...nxgraph,
    originalSymptomData: state.symptomData.value
  };
}
  };
};


function handletableselection(df, includeIndex=false){
    const BASE_COLUMNS = ['Authors', 'Year', 'Title', 'Journal', 'PMID/DOI', 'Study type (case study/case series/XX)', 'Abstract'];
    const table_columns = includeIndex ? ['S/N', ...BASE_COLUMNS] : BASE_COLUMNS;
    const SelectF = includeIndex ? ['S/N', ...selectedFields] : selectedFields;

    const groupMap = new Map();
      for (const row of df) {
      const key = table_columns.map(col => row[col]).join("|"); // group key
      if (!groupMap.has(key)) {
        groupMap.set(key, { ...Object.fromEntries(table_columns.map(col => [col, row[col]])), Cases: 1 });
      } else {
        groupMap.get(key).Cases += 1;
      }
    }
    const data_table = Array.from(groupMap.values()).map(row => {;
    const renamed = { ...row };
 
    if (renamed['PMID/DOI']?.startsWith('https')) {
      renamed['PMID/DOI'] = `PMID: NIL\nDOI: ${renamed['PMID/DOI'].slice(19)}`;
    }
    renamed["Authors"] = manualFix(renamed["Authors"]);
    renamed["Abstract"] = manualFix(renamed["Abstract"]);
    renamed["Study Type"] = renamed["Study type (case study/case series/XX)"];
    delete renamed["Study type (case study/case series/XX)"];
    return renamed;
  });
   
    const table_data = data_table.sort((a, b) => a.Authors.toLowerCase().localeCompare(b.Authors.toLowerCase()));
    return table_data.sort((a, b) => a.Authors.toLowerCase().localeCompare(b.Authors.toLowerCase()))
    .map(row => Object.fromEntries(
      Object.entries(row).filter(([key]) => SelectF.includes(key))
    ));   
};

export function second_table(filteredCaseData, filteredsymptom, treemapSelection){
    //console.log(treemapSelection);
    //console.log(filteredsymptom); //  S_N||S_N||S_N||S_N
    //console.log(filteredCaseData); //   S/N

    const columnKeys = Object.keys(filteredsymptom[0]).slice(1);
    const binarizedData = filteredsymptom.map(row => {
      const newRow = {};
      columnKeys.forEach(key => {
        newRow[key] = row[key] === 'Y' ? 1 : 0;
      });
      return newRow;
    });

    const usedColumns = columnKeys.filter(col =>
      binarizedData.some(row => row[col] === 1)
    );

      let df_case_info_filtered = [];

      const isUnique = (() => {
        const seen = new Set();
        return (row) => {
          const sn = row['S/N'];
          if (seen.has(sn)) return false;
          seen.add(sn);
          return true;
        };
      })();

      if (treemapSelection.length === 0) {
        // Case 1: No selection, return all unique rows
        df_case_info_filtered = filteredCaseData.filter(isUnique);
      } else {
        // Case 2: Filter based on treemapSelection
        const level = treemapSelection.length;

        const matchingIndexes = binarizedData.reduce((acc, row, idx) => {
          const isMatch = usedColumns.some(col => {
            const levels = col.split('||');
            return levels.length >= level &&
              levels.slice(0, level).every((lvl, i) => lvl === treemapSelection[i]) &&
              row[col] === 1;
          });
          if (isMatch) acc.push(idx);
          return acc;
        }, []);

        const matchedRows = matchingIndexes.map(idx => filteredCaseData[idx]);
        df_case_info_filtered = matchedRows.filter(isUnique);
      }

    //console.log('df_case_info_filtered:', df_case_info_filtered);
    
    // for table2 selection
    const snSet = new Set(df_case_info_filtered.map(row => row['S/N']));
    // match symptom rows（'S_N||S_N||S_N||S_N'）
    const seenSN = new Set();
    const uniqueMatchsymrow = filteredsymptom.filter(row => {
      const sn = row['S_N||S_N||S_N||S_N'];
      if (!sn || !snSet.has(sn) || seenSN.has(sn)) return false;
      seenSN.add(sn);
      return true;
    });

    // original key set
    const rawColumnKeys = Object.keys(uniqueMatchsymrow[0]);
    const cleanedColumnToSN = uniqueMatchsymrow.reduce((acc, row) => {
      const sn = row['S_N||S_N||S_N||S_N'];
      if (!sn) return acc;

      rawColumnKeys.forEach(key => {
        if (row[key] === 'Y') {
          const cleanedKey = key.split('||').at(-1);
          if (!acc[cleanedKey]) acc[cleanedKey] = [];
          acc[cleanedKey].push(String(sn));
        }
      });
        return acc;
      }, {});

    const symptomNames = Object.keys(cleanedColumnToSN).filter(key => key !== treemapSelection[treemapSelection.length - 1]);
    //console.log(symptomNames);

    const filteredTable = handletableselection(df_case_info_filtered, true);
    //console.log(Object.keys(filteredTable[0]));
    //datatable2Ref.value = filteredTable 
    return {
      datat2: filteredTable,
      select_filter: cleanedColumnToSN,
      symptomNames: symptomNames 
    }
};

function manualFix(str) {
  return str
    .replace(/ÇŽ/g, 'ă') 
    .replace(/È™/g, 'ș')  
    .replace(/È›/g, 'ț')
    .replace(/Ã³/g, 'ó')
    .replace(/Â/g, '')
    .replace(/Î”/g, '');
};


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
  // Drop columns with all 0, Hydration||...  Others||Others||Others||Overhydratio
  const usedColumns = columnKeys.filter(col =>
    binarizedData.some(row => row[col] === 1)
  );
   //console.log(usedColumns);
  //console.log('treemapSelection:', treemapSelection);
  //const groupLevel = treemapSelection.length > 0 ? treemapSelection.length - 1 : 0;
  const groupLevel = Math.max(0, treemapSelection.length - 1);
  //console.log(groupLevel);
  // Group column names by selected level
  const groupMap = {}; // e.g. Hydration -> [Hydration||...status1, Hydration||...status2]
  usedColumns.forEach(col => {
    const levels = col.split('||');
    const key = levels[groupLevel];
    if (!groupMap[key]) groupMap[key] = [];
    groupMap[key].push(col);
  });
  //console.log(groupMap);

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
      edges: finalEdges,
      level: groupLevel,
      groupmap: groupMap
    };
  }

  return {
    nodes: nodes.map(id => ({ id })),
    edges,
    level: groupLevel,
    groupmap: groupMap
  };
};





