<template>
  <v-card>
    <v-card-title>Network Chart</v-card-title>
    <v-card-text>
      <div ref="plotlyContainer" style="width: 100%;"></div>
    </v-card-text>
  </v-card>
</template>

<script>
import Plotly from 'plotly.js-dist';
import { nextTick } from 'vue';

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
  }
  },
  methods: {
    async renderGraph(graphData, selectiondata) {
      try {
        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return;

        const lastSelection =
          Array.isArray(selectiondata) && selectiondata.length
            ? selectiondata[selectiondata.length - 1]
            : null;


        const nodes = graphData.nodes;
        const edges = graphData.edges || [];
        console.log(graphData);
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

  
        const edgeX = [], edgeY = [];
        edges.forEach(({ source, target }) => {
          const src = positions[source];
          const tgt = positions[target];
          if (src && tgt) {
            edgeX.push(src.x, tgt.x, null);
            edgeY.push(src.y, tgt.y, null);
          }
        });

        const nodeX = [], nodeY = [], nodeText = [], nodeColor = []
        nodes.forEach(node => {
          const pos = positions[node.id];
          nodeX.push(pos.x);
          nodeY.push(pos.y);
          nodeText.push(node.id);

        if (!lastSelection) {
          nodeColor.push('#33e0cc');
        } else {
          nodeColor.push(node.id === lastSelection ? '#ff5733' : '#33e0cc');
        }
        })
          
        const customData = nodes.map(node => {
          const connections = edgeMap[node.id] || [];
          return connections.map(c => `- ${c.other}: ${c.weight}`).join('<br>');
        });

        const data = [
          {
            type: 'scatter',
            mode: 'lines',
            x: edgeX,
            y: edgeY,
            line: { width: 2, color: '#888' },
            hoverinfo: 'none'
          },
          {
            type: 'scatter',
            mode: 'markers+text',
            x: nodeX,
            y: nodeY,
            text: nodeText,
            customdata: customData,
            textposition: 'top center',
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
          //title: 'Network Graph',
          showlegend: false,
          hovermode: 'closest',
          //margin: { l: 40, r: 20, b: 20, t: 40 },
          xaxis: { showgrid: false, zeroline: false, showticklabels: false },
          yaxis: { showgrid: false, zeroline: false, showticklabels: false },
          height: 800,
          width: 1000,
          plot_bgcolor: '#f9f9f9',  
          paper_bgcolor: '#ffffff',   
        };

        await nextTick();
        Plotly.newPlot(this.$refs.plotlyContainer, data, layout, { responsive: true });

      } catch (error) {
        console.error('Error rendering Plotly graph:', error);
      }
    }
  }
};
</script>


