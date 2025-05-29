<template>
    <v-card>
        <v-card-title>Treemap Chart</v-card-title>
        <v-card-text>
            <div id="anychart-container" style="width: 50%; height: 500px;"></div>
        </v-card-text>
    </v-card>
</template>

<script>
export default {
    name: 'TreemapAnyChart',  //https://www.anychart.com/blog/2022/06/08/treemap-js/
    mounted() {
        this.renderChart();
    },
    methods: {
        renderChart() {
            anychart.onDocumentReady(function () {

                // create the data
                var dataSet = [
                    {
                        "name": "Galaxies",
                        "children": [
                            {
                                "name": "Elliptical",
                                "children": [
                                    { "name": "IC 1101", "value": 4000000 },
                                    { "name": "Hercules A", "value": 1500000 },
                                    { "name": "A2261-BCG", "value": 1000000 },
                                    { "name": "ESO 306-17", "value": 1000000 },
                                    { "name": "ESO 444-46", "value": 402200 }
                                ]
                            },
                            {
                                "name": "Spiral",
                                "children": [
                                    { "name": "Rubin's Galaxy", "value": 832000 },
                                    { "name": "Comet Galaxy", "value": 600000 },
                                    { "name": "Condor Galaxy", "value": 522000 },
                                    { "name": "Tadpole Galaxy", "value": 280000 },
                                    { "name": "Andromeda Galaxy", "value": 220000 }
                                ]
                            }
                        ]
                    }
                ];

                //  create the treemap chart and set the data
                var chart = anychart.treeMap(dataSet, "as-tree");

                // set the maximum depth of the chart in a single visualization
                chart.maxDepth(10);

                // set the chart title
                chart.title("The 10 Largest Galaxies in the Known Universe");

                // set the container id for the chart
                chart.container("anychart-container");

                // set a custom color scale
                var customColorScale = anychart.scales.linearColor();
                customColorScale.colors(['#37B8F7', '#ffcc00']);
                chart.colorScale(customColorScale);
                chart.colorRange().enabled(true);
                chart.colorRange().length('90%');

                // format the labels
                chart.labels().useHtml(true);
                chart.labels().format(
                    "<span style='font-size: 24px; color: #00076f'>{%name}</span><br>{%value}"
                );

                // format the tooltips
                chart.tooltip().format(
                    "Scale: {%value} light years"
                );

                // initiate drawing the chart
                chart.draw();

            });
        }
    },
};
</script>

<style>
#chart-container {
    margin: 20px;
}
</style>