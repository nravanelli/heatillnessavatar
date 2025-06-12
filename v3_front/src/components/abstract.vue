<template>
  <v-card style="height: 100%; display: flex; flex-direction: column;">
    <v-card-title>Abstract</v-card-title>
     <v-card-text style="height: 828px; font-size: 16px; font-weight: 400; text-align: justify; flex: 1; overflow-y: auto;">
      <div v-if="row">
        <div class="abstract-text" v-html="formattedAbstract"></div>
      </div>
      <div v-else>
        Select a row from the Data Table to view abstract.
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'Abstract',
  props: {    
  row: {
    type: Object,
    default: null
  }
    },
  
    data() {
        return {
        formattedAbstract: ''
        };
    },
    watch: {
    row(newVal) {
      this.renderabstract(newVal);
    }},
    methods: {
        async renderabstract(selected_row){

        if (!selected_row || !selected_row['PMID/DOI']) {
        this.formattedAbstract = 'Select a row from the Data Table to view abstract.';
        return;
      }
        const pmid_doi = selected_row['PMID/DOI'];
        const parts = pmid_doi.split('DOI: ');
        const pmid = parts[0].replace('PMID: ', '').trim();
        const doi = parts[1] ? parts[1].trim() : 'NIL';
        const abstract = selected_row.Abstract;
        
        let doilinks = '';
        let pmidlinks = '';
        // Add DOI link 
        if (doi !== 'NIL') {
            doilinks = `<a href="https://doi.org/${doi}" target="_blank">${doi}</a><br>`;
            }
        if (pmid !== 'NIL') {
            pmidlinks = `<a href="https://pubmed.ncbi.nlm.nih.gov/${pmid}" target="_blank">${pmid}</a><br>`;
        }
        this.formattedAbstract = `${pmidlinks}<br>${doilinks}<br>${abstract}`;
        }
            }   
    
};
</script>