<template>
  <v-card>
    <v-card-title>Associated Symptoms/Conditions</v-card-title>
    <v-card-text>
      <div ref="plotlyContainer" style="width: 100%; height: 800px;"></div>
    </v-card-text>
  </v-card>
</template>

<script>
import Plotly from 'plotly.js-dist';
import { nextTick } from 'vue';

export default {
  name: 'BarChartPlotly',
  props: {
    graphData: {
      type: Object,
      default: () => ({ nodes: [], edges: [] })
    },
    treemapSelection: Object
  },
  mounted() {
    this.renderBarChart(this.graphData, this.selectiondata);
  },
  watch: {
    graphData: {
      handler(newVal) {
        this.renderBarChart(newVal, this.treemapSelection);
      },
      deep: true,
      immediate: true
    },
    treemapSelection: {
      handler(newVal) {
        this.renderBarChart(this.graphData, newVal);
      },
      deep: true,
      immediate: true
  }
  },
  methods: {
    async renderBarChart(graphData, selectiondata) {
      try {
        const edges = graphData.edges || [];
        if (!edges.length) return;
        
        const sortedEdges = [...edges].sort((a, b) => b.weight - a.weight);
        //console.log('sortedEdges:', sortedEdges);
     
        const lastSelection =
          Array.isArray(selectiondata) && selectiondata.length
            ? selectiondata[selectiondata.length - 1]
            : null;

        // const labels = sortedEdges.map(e => {
        //   if (lastSelection === e.source) return e.target;
        //   if (lastSelection === e.target) return e.source;
        // });
        let labels = [];
        let weights = []
        let hoverTexts =[];
        if (!lastSelection) {
          labels = sortedEdges.map(e => e.source);
          weights = sortedEdges.map(e => e.weight);
          hoverTexts = sortedEdges.map(e =>
          `(${e.source}, <br> ${e.weight})`
        );
        } else {
    
      const relatedEdges = sortedEdges.filter(
        e => e.source === lastSelection || e.target === lastSelection
      );

      labels = relatedEdges.map(e =>
        e.source === lastSelection ? e.target : e.source
      );
      weights = relatedEdges.map(e => e.weight);
      hoverTexts = relatedEdges.map(e =>
        ` (${e.source === lastSelection ? e.target : e.source}, ${e.weight})`
      );};

        const data = [
          {
            type: 'bar',
            x: labels,
            y: weights,
            hovertext: hoverTexts,
            hoverinfo: 'text',
            marker: {
              color: '#33aaff'
            }
          }
        ];
        const layout = {
          xaxis: {
            title: 'Node',
            tickangle: -45, 
            showgrid: false, 
            zeroline: false,
            //range:[0, 20],
          },
          yaxis: {
            title: 'Count'
          },
          dragmode: 'pan', 
          //yaxis: { showgrid: false, zeroline: false, showticklabels: false },
          height: 850,
          width: 400,
          margin: { b: 370, l: 50, r: 50, t: 50 },
          plot_bgcolor: '#f9f9f9',
          paper_bgcolor: '#ffffff',
          hovermode: 'closest',
          // barmode: 'group',        
          // bargroupgap: 0.3,         
          bargap: 0.3              
        };

        await nextTick();
        Plotly.newPlot(this.$refs.plotlyContainer, data, layout, { responsive: true });

      } catch (error) {
        console.error('Error rendering bar chart:', error);
      }
    }
  }
};
</script>
