<template>
    <v-card>
        <v-card-title>Treemap Chart</v-card-title>
        <v-card-text>
            <div id="plotly-container" style="width: 100%;"></div>
        </v-card-text>
    </v-card>
</template>

<script>
import * as d3 from 'd3';
import { color } from 'd3';
import Plotly from 'plotly.js-dist';
import axios from 'axios';

export default {
    name: 'TreemapPlotly',
    mounted() {
        this.renderChart();
    },
    methods: {
        async renderChart(){
            try {
                console.log("Loading CSV data...");
                var filteredRows = await d3.csv('https://raw.githubusercontent.com/YJH-nus/test_case/main/test_data.csv')
                //console.log("CSV data loaded:", filteredRows);
                //var filteredRows = await this.fetchTreemapData(); 
                console.log("Treemap data received:", filteredRows);
                // Apply both filters together
                //var filtered = rows.filter(row => row.year === "2007" && row.continent === "Asia");

                // function unpack(rows, key) {
                //     return rows.map(row => row[key]);
                // }

                // var filteredRows = rows.filter(row => row.year === "2007");
                // console.log("Filtered rows:", filteredRows);

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
                    labels.push(uniqueCategory);
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
                console.log(nodeCounts);
            });
            console.log(nodeSet);
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
                "<b>Count:</b> %{value}<extra></extra>"
            }];

                console.log("Rendering treemap with data:", data);
                Plotly.newPlot('plotly-container', data, {height: 700, width: 1000});
                console.log("Treemap rendered successfully.");
            } catch (err) {
                console.error('Error loading CSV data:', err);
            }
        }
    }
}
</script>
