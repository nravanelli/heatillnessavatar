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
  'Muscular System': '#f39c12',
};

export default {
    name: 'TreemapPlotly',
    props:{
        data: {
        type: Object,
        default: () => []
        }
    },
    //emits: ['node-selected'], // parent monitor
    data() {
    return {
      plotlyContainer: null,
    };
    },
    mounted() {
        this.plotlyContainer = this.$refs.plotlyContainer;
        //window.addEventListener('resize', this.handleResize);
        // if (this.data.data1) {
        //     this.renderChart(this.data.data1, this.data.data2);
        // }
  
    },
    // beforeUnmount() {
    // window.removeEventListener('resize', this.handleResize);
    // },
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
    prepareTreemapDataFromLevels(occurrenceData) {
      const labels = ['All Symptoms'];
      const parents = [''];
      const ids = ['All Symptoms'];
      const colors = ['white'];

      const nodeSet = new Set(['All Symptoms']);
      const nodeCounts = { 'All Symptoms': 0 };

      let maxLevel = 0;
      occurrenceData.forEach(row => {
        const levels = Object.keys(row)
          .filter(k => k.startsWith('Level'))
          .map(k => row[k])
          .filter(Boolean);
        if (levels.length > maxLevel) maxLevel = levels.length;
      });

      occurrenceData.forEach(row => {
        const levels = [];
        for (let i = 1; i <= maxLevel; i++) {
          const lvl = row[`Level${i}`];
          if (lvl) levels.push(lvl);
        }

        const count = row.Count || 0;

        let parentId = 'All Symptoms';

        levels.forEach((levelVal, idx) => {
          const idParts = levels.slice(0, idx + 1).map((v, i) => `L${i + 1}:${v}`);
          const id = idParts.join('||');

          if (!nodeSet.has(id)) {
            labels.push(levelVal);
            ids.push(id);
            parents.push(parentId);

            if (idx === 0) {
              colors.push(color_map[levelVal] || '#cccccc');
            } else {
              colors.push('#f0f0f0');
            }

            nodeSet.add(id);
            nodeCounts[id] = 0;
          }

          parentId = id;
        });

        let tempId = parentId;
        while (tempId) {
          nodeCounts[tempId] = (nodeCounts[tempId] || 0) + count;
          const parentIndex = ids.indexOf(tempId);
          tempId = parents[parentIndex];
        }
        nodeCounts['All Symptoms'] += count;
      });

      const values = ids.map(id => nodeCounts[id] || 0);

      return { labels, parents, ids, values, colors };
    },
    async renderChart(occurrenceData, data2) {
      if (!occurrenceData || !occurrenceData.length) {
        if (this.$refs.plotlyContainer) {
          Plotly.purge(this.$refs.plotlyContainer);
        }
        return;
      }
      const { labels, parents, ids, values, colors } = this.prepareTreemapDataFromLevels(occurrenceData);

      const data = [
        {
          type: 'treemap',
          labels,
          parents,
          ids,
          values,
          marker: { colors },
          textinfo: 'label',
          branchvalues: 'total',
          hovertemplate: '<b>%{label}</b><br>Count: %{value}<extra></extra>',
        },
      ];

      const layout = {
        margin: { l: 40, r: 40, b: 20, t: 20 },
        height: 600,
        paper_bgcolor: '#fff',
        plot_bgcolor: '#f9f9f9',
        showlegend: false,
      };

      Plotly.purge(this.$refs.plotlyContainer);
      await Plotly.newPlot(this.$refs.plotlyContainer, data, layout, { responsive: true });
    },
  },
};
</script>
<style scoped>

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
