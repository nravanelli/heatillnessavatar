import { ref } from 'vue';
import * as d3 from 'd3';
import csvRaw from '@/data/df_processed_v3.csv?raw';

//var csvUrl = 'https://raw.githubusercontent.com/YJH-nus/test_case/main/df_processed_v3.csv'
//var csvUrl = import.meta.env.BASE_URL + '/data/df_processed_v3.csv'

const columns = ref([]); 
let originalRows = ref([]); 
let rows = ref([]);
let studies = ref([]);
let cases = ref([]);
let unique_symptoms = ref([]);
let affected_systems = ref([]);
const caseDataRef = ref([]);
const symptomDataRef = ref([]);
const treemapSelection = ref([]);
const nxgraphDataRef = ref([]); 

const treemapDataRef = ref([]);
const tableDataRef = ref([]);

const NUMBER_OF_LEVELS = 4;
const categoryKeys = ['System', 'Organ/Component', 'Category/Type', 'Condition/Symptom'];


export function useCsvData() {
  let prevDfTreemap = [];
  async function fetchAndParseCSV({
    sex_switch = false,
    select_sex,
    age_switch = false,
    age_min,
    age_max,
    outcome,
    outcome_switch = false,
    temp_switch = false,
    temp_min,
    temp_max,
    bmi_switch = false,
    bmi_min,
    bmi_max,
    rh_switch=false,
    rh_min,
    rh_max,
    wbgt_switch=false,
    wbgt_min,
    wbgt_max
  } = {}) {
    try {
      console.log("Fetching CSV...");
      // get data from github
      // const response = await fetch(csvUrl);
      // const text = await response.text();

      // const parsed_data = d3.csvParseRows(text);
      const parsed_data = d3.csvParseRows(csvRaw); 
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
        item.Rh = item['RH (%)'] ? parseFloat(item['RH (%)']) : null;
        item.WBGT = item['WBGT (°C)'] ? parseFloat(item['WBGT (°C)']) : null;
        //console.log(item.WBGT);
        return item;
      });
      caseDataRef.value = caseData;
    //console.log('case:', caseData);
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
      symptomDataRef.value = symptomsData;
      console.log('df_symptoms:', symptomsData);
      //console.log(Object.keys(symptomsData[0]));

        // filter
        console.log(select_sex);
        const filteredIndices = caseData
        .map((d, idx) => {
          const sex = (d.Sex || '').trim();
          const age = d['Age (years)'];
          const temp = d.Temperature;
          const bmi = d.BMI;
          const outcome_val = (d.Outcome || '').trim();
          const rh = d.Rh;
          const wbgt = d.WBGT;
          const pass =
            (!sex_switch || select_sex.includes(sex)) &&
            (!age_switch || (age >= age_min && age <= age_max)) &&
            (!outcome_switch || (outcome && outcome.includes(outcome_val))) &&
            (!temp_switch || (temp >= temp_min && temp <= temp_max)) &&
            (!bmi_switch || (bmi >= bmi_min && bmi <= bmi_max))&&
            (!rh_switch || (rh !== null && rh >= rh_min && rh <= rh_max))&&
            (!wbgt_switch || (wbgt !== null && wbgt >= wbgt_min && wbgt <= wbgt_max));
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
      console.log(columns.value);

      // 409 rows, include index (need delete)
      const filteredCaseData = filteredIndices.map(i => ({
        index: i,
        ...caseData[i]
      }));
      console.log('filteredCaseDat:',filteredCaseData);

      // const snValues = filteredCaseData.map(row => row['S/N']);
      // const uniqueSNSet = new Set(snValues);
      // const uniqueCount = uniqueSNSet.size;

      // console.log('Unique Count:', uniqueCount);
      // console.log('Unique S/N values:', Array.from(uniqueSNSet));
      
      
      const seen = new Set();
      const df_case_info_filtered = filteredCaseData.filter(row => {
        const sn = row['S/N'];
        if (seen.has(sn)) {
          return false; 
        } else {
          seen.add(sn); 
          return true;
        }
      });

      studies.value = df_case_info_filtered.length;
      cases.value = filteredCaseData.length;
      //text_stactic.value = filteredCaseData;

      // console.log('s/n:', df_case_info_filtered.length);
      // console.log('no dupliacte:', df_case_info_filtered);

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


    const affectedSystemsSet = new Set(
        df_long
          .map(row => row['System'])
          .filter(system => system && system !== 'Others')
      );
      affected_systems.value = affectedSystemsSet.size;
      const uniqueSymptomsSet = new Set(
        df_long.map(row => row['Condition/Symptom']).filter(symptom => symptom)
      );
      unique_symptoms.value = uniqueSymptomsSet.size;

     
      //console.log('affected_systems:', affected_systems);
      //console.log('unique_symptoms:', unique_symptoms);

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
    //console.log('df_treemap:', df_treemap);
    const dfTreemapChanged = isDfTreemapChanged(prevDfTreemap, df_treemap);
     if (dfTreemapChanged) {
        treemapSelection.value = [];
      }
      prevDfTreemap = [...df_treemap];

    const nxgraph = buildGraph(filteredsymptom, treemapSelection.value);
    console.log('nodes;',  nxgraph.nodes);

    const filteredTable = handletableselection(filteredCaseData);

    const selectedFields = ['Authors', 'Year', 'Title', 'Journal', 'PMID/DOI', 'Cases', 'Study Type', 'Abstract'];
    console.log('filteredTable:', filteredTable);
    columns.value = selectedFields.map(field => ({ text: field, value: field }));
    console.log('c:', columns);

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


async function applyFilters(options = {}) {
  fetchAndParseCSV(options).then(({ treemapData: tData, tabelData: filteredTable, nxgraphData: nxgraph, originalSymptomData }) => {
    treemapDataRef.value = tData;
    tableDataRef.value = filteredTable;
    nxgraphDataRef.value = {
      ...nxgraph,
      originalSymptomData
    };
  });
}


  return {
    columns,
    rows,
    originalRows,
    fetchAndParseCSV,
    applyFilters, 
    CaseOR: caseDataRef,
    SympOR: symptomDataRef,
    treemapData: treemapDataRef,
    tableData: tableDataRef,
    nxgraphData: nxgraphDataRef,
    updateTreemapSelection,  
    treemapSelection,
    studies,
    cases,
    unique_symptoms,
    affected_systems  
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
   //console.log(usedColumns);
  //console.log('treemapSelection:', treemapSelection);
  const groupLevel = treemapSelection.length > 0 ? treemapSelection.length - 1 : 0;
  console.log(groupLevel);
  // Group column names by selected level
  const groupMap = {}; // e.g. Hydration -> [Hydration||...status1, Hydration||...status2]
  usedColumns.forEach(col => {
    const levels = col.split('||');
    const key = levels[groupLevel];
    if (!groupMap[key]) groupMap[key] = [];
    groupMap[key].push(col);
  });
  console.log(groupMap);

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

 function isDfTreemapChanged(oldDf, newDf) {
    if (oldDf.length !== newDf.length) return true;
    for (let i = 0; i < oldDf.length; i++) {
      if (JSON.stringify(oldDf[i]) !== JSON.stringify(newDf[i])) {
        return true;
      }
    }
    return false;
  }

export function second_table(filteredCaseData, filteredsymptom, treemapSelection){
    console.log(treemapSelection);
    console.log(filteredsymptom); //  S_N||S_N||S_N||S_N
    console.log(filteredCaseData); //   S/N
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

    const level = treemapSelection.length;
    console.log(level);
    const matchingIndexes = [];
    binarizedData.forEach((row, rowIndex) => {
      const match = usedColumns.some(col => {
        const levels = col.split('||');
        const isExactMatch = levels.length >= level &&
          levels.slice(0, level).every((lvl, idx) => lvl === treemapSelection[idx]);

        return isExactMatch && row[col] === 1;
      });

      if (match) {
        matchingIndexes.push(rowIndex);
      }
    });
    //console.log('binarizedData:', binarizedData);
    const matchedRows = matchingIndexes.map(idx => filteredCaseData[idx]);
    console.log(matchedRows); // S/N

    const seen = new Set();
    const df_case_info_filtered = matchedRows.filter(row => {
      const sn = row['S/N'];
      if (seen.has(sn)) {
        return false; 
      } else {
        seen.add(sn); 
        return true;
      }
    });
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

    console.log(cleanedColumnToSN);
    const symptomNames = Object.keys(cleanedColumnToSN);
    //console.log(symptomNames);

    const filteredTable = handletableselection(df_case_info_filtered, true);
    //console.log(Object.keys(filteredTable[0]));
    //datatable2Ref.value = filteredTable 
    return {
      datat2: filteredTable,
      select_filter: cleanedColumnToSN,
      symptomNames: symptomNames 
    }
}

function handletableselection(df_case_info_filtered, findIndex=false){
    let data_table_columns = [];
    let selectedFields = [];
    if (findIndex === false){
      data_table_columns = ['Authors', 'Year', 'Title', 'Journal', 'PMID/DOI', 'Study type (case study/case series/XX)', 'Abstract']
      selectedFields = ['Authors', 'Year', 'Title', 'Journal', 'PMID/DOI', 'Cases', 'Study Type', 'Abstract'];
    }
    else{
      data_table_columns = ['S/N', 'Authors', 'Year', 'Title', 'Journal', 'PMID/DOI', 'Study type (case study/case series/XX)', 'Abstract']
      selectedFields = ['S/N', 'Authors', 'Year', 'Title', 'Journal', 'PMID/DOI', 'Cases', 'Study Type', 'Abstract'];
    };
    console.log(data_table_columns);
    const groupMap = new Map();

      for (const row of df_case_info_filtered) {
      const key = data_table_columns.map(col => row[col]).join("|"); // group key
      if (!groupMap.has(key)) {
        groupMap.set(key, { ...Object.fromEntries(data_table_columns.map(col => [col, row[col]])), Cases: 1 });
      } else {
        groupMap.get(key).Cases += 1;
      }
    }
    const df_table = Array.from(groupMap.values());
    console.log('df_table:', df_table); // S/N

    const data_table = df_table.map(row => {
    const renamed = { ...row };
    if (renamed["Abstract"]) {
    renamed["Abstract"] = renamed["Abstract"].replace(/Â/g, '').replace(/Î”/g, '');
    //renamed["Abstract"] = renamed["Abstract"].replace(/[^\x00-\x7F]/g, ''); 
    };

    renamed["Study Type"] = renamed["Study type (case study/case series/XX)"];
    delete renamed["Study type (case study/case series/XX)"];
    return renamed;
  });

    const table_data = data_table.sort((a, b) => a.Authors.toLowerCase().localeCompare(b.Authors.toLowerCase()));
    console.log(table_data);
    const filteredTable = table_data.map(row => {
      return Object.fromEntries(
        Object.entries(row).filter(([key]) => selectedFields.includes(key))
      );
    });
    return filteredTable
}


