<template>
    <v-card>
        <v-card-title>Symptoms/Conditions</v-card-title>
        <v-card-text class="plot-container">
            <div ref="plotlyContainer" class="plot-inner"></div>
        </v-card-text>
    </v-card>
</template>
<script>

import Plotly from 'plotly.js-dist';
import { nextTick } from 'vue';


const color_map = {
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
export default {
    name: 'TreemapPlotly',
    props:{
        data: {
        type: Object,
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
        window.addEventListener('resize', this.handleResize);
        // if (this.data.data1) {
        //     this.renderChart(this.data.data1, this.data.data2);
        // }
  
    },
    beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    },
    watch:{
      data: {
      handler(newData) {
        this.plotlyContainer = this.$refs.plotlyContainer;

        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.renderChart(newData.data1, newData.data2);
        }, 100);
        //this.renderChart(newData.data1, newData.data2);
    
      },
      immediate: true,
      deep: true
    }
    },
    methods: {
         handleResize() {
            if (this.plotlyContainer) {
            Plotly.Plots.resize(this.plotlyContainer);
            }
        },
        async renderChart(data1, data2){
            try {
                //console.log("Loading CSV data...");
                // if (!data || data.length === 0) return;
                // console.log("Treemap data received:", filteredRows);
                //var filteredRows = await d3.csv('https://https://raw.githubusercontent.com/NUS-HRPC/nexgen-treemap/blob/main/python/df_processed_v3.csv')
                var labels = ["All Symptoms"];
                var parents = [""];
                var values = [];
                var ids = ["All Symptoms"];
                var values = [];
                var colors = ["white"];
                var nodeSet = new Set();
                var nodeCounts = {}; 

                nodeSet.add("All Symptoms");
                nodeCounts["All Symptoms"] = 0;

                data1.forEach(row => {
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
            const text = labels.map(label => label);
            
            var data = [{
                type: "treemap",
                labels: labels,
                ids: ids,
                parents: parents,
                values: values,
                marker: {
                    colors: colors
                },
                text: text,
                textinfo: "text",
                hovertemplate:
                "<b>Label:</b> %{label}<br>" +
                "<b>Count:</b> %{value}<extra></extra>",
                branchvalues: "total" 
            }];

            const layout = {
            showlegend: false,
            margin: { l: 40, r: 40, b: 20, t: 20 },
            xaxis: { showgrid: false, zeroline: false, showticklabels: false},
            yaxis: { showgrid: false, zeroline: false, showticklabels: false},
            height: 600,

            //autosize: true,
            plot_bgcolor: '#f9f9f9',  
            paper_bgcolor: '#ffffff',   
            };
                //console.log("Rendering treemap with data:", data);
                await nextTick();
                Plotly.purge(this.plotlyContainer);
                Plotly.newPlot(this.plotlyContainer, data, layout, { responsive: true });
                
               
                this.plotlyContainer.on('plotly_click', (eventData) => {
                    //clickid:    SYS:Central Nervous System
                    const clickedId = eventData.points?.[0]?.id;
                    const point = eventData.points[0];
                    const fullData = point.fullData;

                    if (!clickedId) return;

                    const updatedText = [...text];
                    if (clickedId.endsWith('Muscle damage')){
                         const data2Text = Object.entries(data2)
                            .map(([key, value]) => {
                                return `${key}: ${value}`;
                            })
                            .join('<br>');
                        const nodeLabel = fullData.labels[point.pointNumber] || clickedId;
                        const fullText = `${nodeLabel}<br><br>${data2Text}`;
                        
                        updatedText[point.pointNumber] = fullText;
       
                        Plotly.restyle(this.plotlyContainer, { text: [updatedText] }, [0]);
                    };
                 
                    
                    // id parse layer: SYM:system:organ:category:symptom）
                    const pathParts = clickedId.split(':');
                    //console.log(pathParts);
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

<style scoped>
/* .plot-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  overflow-x: auto; 
}

.plot-inner {
  max-width: 1100px;
  height: 600px;
} */


.plot-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.plot-inner {
  width: 100%;
  height: 100%;
  min-height: 600px;
}
</style>

