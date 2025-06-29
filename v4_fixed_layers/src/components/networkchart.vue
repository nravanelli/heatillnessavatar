<template>
  <v-card>
    <v-card-title>Associated Symptoms/Conditions</v-card-title>
    <v-card-text class="plot-container">
      <div class="plot-inner">
      <div ref="plotlyContainer" class="plot-graph" hide-details="auto"></div>
         <div v-if="shouldShowSlider" style="display: flex; align-items: center; justify-content: flex-start; width: 100%; margin-top: 10px; padding-left: 10px; ">
          <span class="slider-label"> Number of Symptoms to show </span>
            <v-slider
                v-model="show_nodes_count"
                :min="30"
                :max="maxNodeCount"
                :step="1"
                style="max-width: 400px; margin: 0 10px"
                thumb-label="always"
                color="blue-darken-2"
            />
            <span style="font-weight: 500; white-space: nowrap; padding-bottom: 20px;">
              Max: {{ maxNodeCount }}
            </span>
          </div>
      </div>
   
      
    </v-card-text>
  </v-card>
</template>


<script>
import Plotly from 'plotly.js-dist';
import { nextTick } from 'vue';
//const maxNodeCount = ref(50);

export default {
  name: 'NetworkPlotly',
  props: {
    graphData: {
      type: Object,
      default: () => ({ nodes: [], edges: [] })
    },
    treemapSelection: Object
  },
  mounted() {
    this.renderGraph(this.graphData, this.selectiondata);
   
  },
 watch: {
  graphData: {
    handler(newVal) {
      this.renderGraph(newVal, this.treemapSelection);
    
    },
    deep: true,
    immediate: true
  },
  treemapSelection: {
    handler(newVal) {
      this.renderGraph(this.graphData, newVal);
     
    },
    deep: true,
    immediate: true
  },
   show_nodes_count(newVal) {
    this.renderGraph(this.graphData, this.treemapSelection);
  }
  },
  data() {
    return {
      show_nodes_count: 30,        
    };
  },
  computed: {
    shouldShowSlider() {
      return (
        this.treemapSelection &&
        Object.keys(this.treemapSelection).length &&
        this.graphData &&
        Array.isArray(this.graphData.nodes) &&
        this.graphData.nodes.length > 30
      );
    },
    maxNodeCount() {
      return this.graphData && this.graphData.nodes
    ? this.graphData.nodes.length
    : 0;
}
  },
  methods: {

    async renderGraph(graphData, selectiondata) {
      try {
        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return;
        //console.log(selectiondata);
        //console.log(graphData.nodes);
        //console.log(graphData.edges);

        const result = {};
        const level = graphData.level;

        for (const key in graphData.groupmap) {
          const values = graphData.groupmap[key];

          for (const entry of values) {
            const parts = entry.split('||');

            if (parts[level] === key) {
              result[key] = parts[0]; 
              break; 
            }
          }
        }

        var color_map = {
        'Cardiovascular System': '#c0392b',
        'Urinary System': '#f4d03f',
        'Lymphatic System (Thymus, Lymph nodes, Spleen, Lymphatic vessels)': '#aed6f1',
        'Integumentary System (hair, skin, nails, glands)': '#7d3c98',
        'Respiratory System': '#2e86c1',
        // 'Hydration':'#cccccc',
        'Digestive System': '#af601a',
        'Endocrine System': 'pink',
        'Muscular System': '#f39c12',
        'Others': '#b3b6b7',
        'Central Nervous System': '#16a085',
        };

        let nodes = [];
        let edges = [];

        if (graphData.nodes.length > 30){
        const sortedEdges = [...graphData.edges].sort((a, b) => b.weight - a.weight);
        //console.log('sorted:', sortedEdges);
        const edgesToShow = sortedEdges.slice(0, this.show_nodes_count);
        const nodeIds = new Set();
            edgesToShow.forEach(e => {
              nodeIds.add(e.source);
              nodeIds.add(e.target);
            });
      
        //nodeIds.add(graphData.nodes[0].id);
        const filteredNodes = graphData.nodes.filter(n => nodeIds.has(n.id));
         
        nodes = filteredNodes;
        edges = edgesToShow;}
        else{
        nodes = graphData.nodes;
        edges = graphData.edges || [];
        }

        // const lastSelection =
        //   Array.isArray(selectiondata) && selectiondata.length
        //     ? selectiondata[selectiondata.length - 1]
        //     : null;

        if (!nodes || nodes.length === 0) return;

        const positions = {};
        const { id: centerId } = nodes[0];
        positions[centerId] = { x: 0, y: 0 };

        const connWeights = {}; 
        const edgeMap = {};  

        edges.forEach(edge => {
          const { source, target, weight } = edge;

          if (source === centerId) connWeights[target] = weight;
          else if (target === centerId) connWeights[source] = weight;

      
          [source, target].forEach(node => {
            if (!edgeMap[node]) edgeMap[node] = [];
            const other = node === source ? target : source;
            edgeMap[node].push({ other, weight });
          });
        });

        const weights = Object.values(connWeights);
        const minWeight = Math.min(...weights);
        const maxWeight = Math.max(...weights);

        const normalize_line = w => {
          if (maxWeight === minWeight) return 0.5;
          return ((w - minWeight) / (maxWeight - minWeight)) + 1; 
        };

        const normalize = w => {
          if (maxWeight === minWeight) return 0.5;
          return 1 - (w - minWeight) / (maxWeight - minWeight); 
        };
        const otherNodes = nodes.slice(1);
        const angleStep = (2 * Math.PI) / otherNodes.length;

        otherNodes.forEach((node, i) => {
        const rawWeight = connWeights[node.id] || minWeight; 
        const normWeight = normalize(rawWeight);
        const radius = 1 + 2 * normWeight; // [1, 3]
        positions[node.id] = {
          x: radius * Math.cos(i * angleStep),
          y: radius * Math.sin(i * angleStep)
        };});

        const edgeTraces = [];
        edges.forEach(({ source, target, weight }) => {
          const src = positions[source];
          const tgt = positions[target];
          if (src && tgt) {
            edgeTraces.push({
              type: 'scatter',
              mode: 'lines',
              x: [src.x, tgt.x],
              y: [src.y, tgt.y],
              line: {
                width: normalize_line(weight ?? 2),
                color: '#888'
              },
              hoverinfo: 'none',
              showlegend: false
            });
          }
        });


        const nodeX = [], nodeY = [], nodeText = [], nodeColor = []
        //console.log(nodes);
        nodes.forEach(node => {
          const pos = positions[node.id];
          nodeX.push(pos.x);
          nodeY.push(pos.y);
          nodeText.push(node.id);

        // if (!lastSelection) {
        //   nodeColor.push('#33e0cc');
        // } else {
        //   nodeColor.push(node.id === lastSelection ? '#ff5733' : '#33e0cc');
        // }
        // })
        
        const systemKey = result[node.id];
        if (systemKey && color_map[systemKey]) {
          nodeColor.push(color_map[systemKey]);
        }
        }
      );
      //console.log(nodeText);
        const customData = nodes.map(node => {
          const connections = edgeMap[node.id] || [];
          return connections.map(c => `- ${c.other}: ${c.weight}`).join('<br>');
        });


    const legendTraces = Object.entries(color_map).map(([system, color]) => {
      const displayName = 
      system === 'Lymphatic System (Thymus, Lymph nodes, Spleen, Lymphatic vessels)' ? 'Lymphatic System' :
      system === 'Integumentary System (hair, skin, nails, glands)' ? 'Integumentary System' :
      system;
      return {
      type: 'scatter',
      mode: 'markers',
      x: [null],
      y: [null],
      name: displayName,
      marker: {
        color: color,
        size: 10
      },
      showlegend: true,
      hoverinfo: 'skip'
    }});
      const edgeTracesNoLegend = edgeTraces.map(trace => ({
        ...trace,
        showlegend: false
      }));
      //console.log(legendTraces);
        const data = [
          ...edgeTracesNoLegend,
          ...legendTraces,
        
          // {
          //   type: 'scatter',
          //   mode: 'lines',
          //   x: edgeX,
          //   y: edgeY,
          //   //line: { width: 2, color: '#888' },
          //   hoverinfo: 'none'
          // },
          {
            type: 'scatter',
            mode: 'markers+text',
            x: nodeX,
            y: nodeY,
            text: nodeText,
            customdata: customData,
            textposition: 'top center',
            showlegend: false,
            marker: {
              size: 10,
              color: nodeColor,
              line:{
                width:2,
                color: '#000000' 

              },
            },
            hoverinfo: 'text',
            hovertemplate:
              "<b>Node:</b> %{text}<br>" +
              "<b>Connections:</b><br>%{customdata}<extra></extra>",
          }
        ];

        const layout = {
          showlegend: true,
          hovermode: 'closest',
          margin: { l: 0, r: 0, b: 20, t: 30 },
          xaxis: { showgrid: false, zeroline: false, showticklabels: false},
          yaxis: { showgrid: false, zeroline: false, showticklabels: false},
          // height: 750,
          width: 1000,
          legend: {
            orientation: 'v', 
            x: 1.0,              
            y: 1.0,             
            xanchor: 'left',   
            yanchor: 'top',    
            //bgcolor: 'rgba(249,249,249,0.8)', 
            //bordercolor: '#EEEEEE',
            //borderwidth: 1,
            font: {
              family: 'Arial',
              size: 12,
              color: 'black'
            },
             itemwidth:6
          },
          //autosize: true,
          plot_bgcolor: '#FAFAFA',  
          paper_bgcolor: '#ffffff',   
        };

        await nextTick();
        
        Plotly.purge(this.$refs.plotlyContainer);
        Plotly.newPlot(this.$refs.plotlyContainer, data, layout, { responsive: true });

      } catch (error) {
        console.error('Error rendering Plotly graph:', error);
      }
    }
  }
};
</script>

<style scoped>
.plot-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  /* height: 100%; */
  overflow: hidden; 
}

.plot-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 1000px;
  height: auto;
  min-height: 800px;
}

.plot-graph {
  width: 100%;
  height: auto;
  min-height: 750px;
}

.slider-label {
  font-weight: 500;
  white-space: nowrap;
  margin-right: 10px;
  padding-bottom: 20px;
}

</style>


<style>
.v-slider-thumb__label > div {
  background-color: white !important;
  color: black !important;
}
</style>


