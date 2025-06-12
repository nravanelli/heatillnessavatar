<template>
    <v-card>
        <v-card-title>Symptoms/Conditions</v-card-title>
        <v-card-text>
            <div id="plotly-container" ref="plotlyContainer" style="width: 100%;"></div>
        </v-card-text>
    </v-card>
</template>
<script>

import Plotly from 'plotly.js-dist';
import { nextTick } from 'vue';

export default {
    name: 'TreemapPlotly',
    props:{
        data: {
        type: Array,
        default: () => []
        }
    },
    emits: ['node-selected'], // parent monitor
    data() {
    return {
      plotlyContainer: null,
    };
    },
    mounted() {
        this.plotlyContainer = this.$refs.plotlyContainer;
        this.renderChart(this.data);
    },
    watch:{
      data: {
      handler(newData) {
        this.renderChart(newData);
      },
      immediate: true,
      deep: true
    }
    },
    methods: {
        async renderChart(data){
            try {
                //console.log("Loading CSV data...");
                // if (!data || data.length === 0) return;
                var filteredRows = data;
                // console.log("Treemap data received:", filteredRows);
                //var filteredRows = await d3.csv('https://https://raw.githubusercontent.com/NUS-HRPC/nexgen-treemap/blob/main/python/df_processed_v3.csv')
                var labels = [];
                var parents = [];
                var values = [];
                var ids = [];
                var values = [];
                var colors = [];

                var nodeSet = new Set();
                var nodeCounts = {}; 
                var color_map = {
                    'Cardiovascular System': '#c0392b',
                    'Urinary System': '#f4d03f',
                    'Others': '#b3b6b7',
                    'Central Nervous System': '#16a085',
                    'Digestive System': '#af601a',
                    'Integumentary System (hair, skin, nails, glands)': '#7d3c98',
                    'Lymphatic System (Thymus, Lymph nodes, Spleen, Lymphatic vessels)': '#aed6f1',
                    'Endocrine System': 'pink',
                    'Respiratory System': '#2e86c1',
                    'Muscular System': '#f39c12'
                };

                labels.push("All Symptoms");
                parents.push("");
                ids.push("All Symptoms");
                colors.push("white"); 
                nodeSet.add("All Symptoms");
                nodeCounts["All Symptoms"] = 0;

                filteredRows.forEach(row => {
                    var system = row["System"];
                    var organComponent = row["Organ/Component"];
                    var category = row["Category/Type"];
                    var condition = row["Condition/Symptom"];
                    var count = +row["Count"];
                    var systemColor = color_map[system] || '#cccccc'; 
                    if (!system || !organComponent || !category || !condition) return; 
                   
 
                    var systemId = `SYS:${system}`;
                    var organId = `ORG:${system}:${organComponent}`;
                    var uniqueCategory = (category === organComponent) ? `Category - ${category}` : category;
                    var categoryId = `CAT:${system}:${organComponent}:${uniqueCategory}`;
                    var conditionId = `SYM:${system}:${organComponent}:${uniqueCategory}:${condition}`;
                // System node
                if (!nodeSet.has(systemId)) {
                    labels.push(system);
                    ids.push(systemId);
                    parents.push("All Symptoms");
                    colors.push(systemColor);
                    nodeSet.add(systemId);
                    nodeCounts[systemId] = 0;
                }

                // Organ/Component layer
                if (!nodeSet.has(organId)) {
                    labels.push(organComponent);
                    ids.push(organId);
                    parents.push(systemId);
                    colors.push(systemColor);
                    nodeSet.add(organId);
                    nodeCounts[organId] = 0;
                }

            // Category/Type layer
                if (!nodeSet.has(categoryId)) {
                    labels.push(category);
                    ids.push(categoryId);
                    parents.push(organId);
                    colors.push(systemColor);
                    nodeSet.add(categoryId);
                    nodeCounts[categoryId] = 0;
                }

                // Condition/Symptom
                if (!nodeSet.has(conditionId)) {
                    labels.push(condition);
                    ids.push(conditionId);
                    parents.push(categoryId);
                    colors.push(systemColor);
                    nodeSet.add(conditionId);
                    nodeCounts[conditionId] = count;
                }

                // count number of each layer
                nodeCounts[categoryId] += count;
                nodeCounts[organId] += count;
                nodeCounts[systemId] += count;
                nodeCounts["All Symptoms"] += count;
                //console.log(nodeCounts);
            });
            //console.log(nodeSet);
            values = ids.map(id => nodeCounts[id] || 0);
            var data = [{
                type: "treemap",
                labels: labels,
                ids: ids,
                parents: parents,
                values: values,
                marker: {
                    colors: colors
                },
                hovertemplate:
                "<b>Label:</b> %{label}<br>" +
                "<b>Count:</b> %{value}<extra></extra>",
                branchvalues: "total" 
            }];

            const layout = {
            showlegend: false,
            margin: { l: 50, r: 50, b: 40, t: 40 },
            xaxis: { showgrid: false, zeroline: false, showticklabels: false},
            yaxis: { showgrid: false, zeroline: false, showticklabels: false},
            height: 600,
            width: 1100,
            plot_bgcolor: '#f9f9f9',  
            paper_bgcolor: '#ffffff',   
            };
                console.log("Rendering treemap with data:", data);
                await nextTick();
                Plotly.newPlot('plotly-container', data, layout, { responsive: true } );
                
                //let selectFortable = '';
                this.plotlyContainer.on('plotly_click', (eventData) => {
                    //clickid:    SYS:Central Nervous System
                    const clickedId = eventData.points?.[0]?.id;
                    if (!clickedId) return;
                    
                    // id parse layer: SYM:system:organ:category:symptom）
                    const pathParts = clickedId.split(':');
                    
                    let selection = [];
                    
                    if (clickedId.startsWith('SYM:')) {
                        selection = pathParts.slice(1, 5);
                     
                        
                    } else if (clickedId.startsWith('CAT:')) {
                        selection = pathParts.slice(1, 4); //Array
                    } else if (clickedId.startsWith('ORG:')) {
                        selection = pathParts.slice(1, 3);
                        
                    } else if (clickedId.startsWith('SYS:')) {
                        selection = pathParts.slice(1, 2);
                       
                    } else if (clickedId === 'All Symptoms') {
                        selection = [];

                    }
                this.$emit('node-selected', selection);})

            } catch (err) {
                console.error('Error loading CSV data:', err);
            }  
   
        }
    }
}
</script>
