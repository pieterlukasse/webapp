/* Evidence tables Directives */

angular.module('otDirectives')

    .directive('otRareDiseaseTable', ['otApi', 'otConsts', 'otUtils', 'otConfig', '$location', 'otDictionary', '$log', 'otClearUnderscoresFilter', function (otApi, otConsts, otUtils, otConfig, $location, otDictionary, $log, otClearUnderscoresFilter) {
        'use strict';

        var searchObj = otUtils.search.translateKeys($location.search());
        var checkPath = otUtils.checkPath;

        return {
            restrict: 'AE',

            templateUrl: 'src/components/rare-disease-table/rare-disease-table.html',

            scope: {
                loadFlag: '=?',    // optional load-flag: true when loading, false otherwise. links to a var to trigger spinners etc...
                data: '=?',        // optional data link to pass the data out of the directive
                title: '=?',       // optional title for filename export
                errorFlag: '=?'    // optional error-flag: pass a var to hold parsing-related errors
            },

            link: function (scope, elem, attrs) {
                scope.errorFlag = false;
                scope.$watchGroup([function () { return attrs.target; }, function () { return attrs.disease; }], function () {
                    if (attrs.target && attrs.disease) {
                        getData();
                    }
                });

                function getData () {
                    scope.loadFlag = true;
                    var opts = {
                        size: 1000,
                        datasource: otConfig.evidence_sources.genetic_association.rare,
                        fields: [
                            'disease.efo_info',
                            'evidence',
                            'variant',
                            'type',
                            'access_level',
                            'sourceID'
                        ]
                    };

                    if (attrs.target) {
                        opts.target = attrs.target;
                    }
                    if (attrs.disease) {
                        opts.disease = attrs.disease;
                    }
                    _.extend(opts, searchObj);

                    var queryObject = {
                        method: 'GET',
                        params: opts
                    };

                    return otApi.getFilterBy(queryObject)
                        .then(
                            function (resp) {
                                if (resp.body.data) {
                                    scope.data = resp.body.data;
                                    initTable();
                                } else {
                                    $log.warn('Empty response : rare disease data');
                                }
                            },
                            otApi.defaultErrorHandler
                        )
                        .finally(function () {
                            scope.loadFlag = false;
                        });
                }


                /*
                 * Takes the data object returned by the API and formats it 
                 * to an array of arrays to be displayed by the dataTable widget.
                 */
                function formatDataToArray (data) {
                    var newdata = [];
                    data.forEach(function (item) {
                        // create rows:
                        var row = [];

                        try {
                            var db = item.sourceID;

                            // col 0: data origin: public / private
                            row.push((item.access_level !== otConsts.ACCESS_LEVEL_PUBLIC) ? otConsts.ACCESS_LEVEL_PUBLIC_DIR : otConsts.ACCESS_LEVEL_PRIVATE_DIR);

                            // disease
                            row.push(item.disease.efo_info.label);

                            // mutation
                            var mut = otDictionary.NA;
                            if (checkPath(item, 'variant.id') && item.variant.id) {
                                var rsId = item.variant.id.split('/').pop();
                                if (rsId.indexOf('rs') === 0) {
                                    mut = '<a class=\'ot-external-link\' href=http://www.ensembl.org/Homo_sapiens/Variation/Explore?v=' + rsId + ' target=_blank>' + rsId + '</a>';
                                } else if (rsId.indexOf('RCV') === 0) {
                                    mut = '<a class=\'ot-external-link\' href=https://www.ncbi.nlm.nih.gov/clinvar/' + rsId + '/ target=_blank>' + rsId + '</a>';
                                } else {
                                    mut = rsId;
                                }
                            }
                            row.push(mut);

                            // mutation consequence
                            var cons = '';
                            if (item.type === 'genetic_association' && checkPath(item, 'evidence.gene2variant')) {
                                cons = otClearUnderscoresFilter(otUtils.getEcoLabel(item.evidence.evidence_codes_info, item.evidence.gene2variant.functional_consequence.split('/').pop()));
                            } else if (item.type === 'somatic_mutation') {
                                cons = otClearUnderscoresFilter(item.type);
                            } else {
                                cons = 'Curated evidence';
                            }

                            // TODO: This is a hack in the UI that needs to be solved at the data level
                            // In the next release this should go
                            if (cons === 'trinucleotide repeat microsatellite feature') {
                                cons = 'trinucleotide expansion';
                            }
                            row.push(cons);

                            // Clinical consequences
                            var clin = 'N/A';
                            if (item.evidence.variant2disease && item.evidence.variant2disease.clinical_significance) {
                                clin = item.evidence.variant2disease.clinical_significance;
                            }
                            row.push(clin);

                            // evidence source
                            if (item.type === 'genetic_association' && checkPath(item, 'evidence.variant2disease')) {
                                row.push('<a class=\'ot-external-link\' href=\'' + item.evidence.variant2disease.urls[0].url + '\' target=_blank>' + item.evidence.variant2disease.urls[0].nice_name + '</a>');
                            } else {
                                // TODO: Genomics England URLs are wrong, so (hopefully temporarily) we need to hack them in the UI
                                // TODO: We can't use otConsts.dbs.GENOMICS_ENGLAND here because the id in the data is wrongly assigned to 'Genomics England PanelApp'. This needs to be fixed at the data level
                                if (db === otConsts.dbs.GENOMICS_ENGLAND) {
                                    item.evidence.urls[0].url = item.evidence.urls[0].url.replace('PanelApp', 'PanelApp/EditPanel');
                                }
                                if (db === otConsts.dbs.GENE_2_PHENOTYPE) {
                                    row.push('<a class=\'ot-external-link\' href=\'' + item.evidence.urls[0].url + '\' target=_blank>Further details in Gene2Phenotype database</a>');
                                } else {
                                    row.push('<a class=\'ot-external-link\' href=\'' + item.evidence.urls[0].url + '\' target=_blank>' + item.evidence.urls[0].nice_name + '</a>');
                                }
                            }

                            // publications
                            var refs = [];

                            if (item.type === 'genetic_association') {
                                if (checkPath(item, 'evidence.variant2disease.provenance_type.literature')) {
                                    refs = item.evidence.variant2disease.provenance_type.literature.references;
                                } else if (checkPath(item, 'evidence.provenance_type.literature.references')) {
                                    // this code might be redundant here:
                                    // perhaps we don't need to check against genetic_association,
                                    // but just check whether there is variant2disease field etc...
                                    refs = item.evidence.provenance_type.literature.references;
                                }
                            } else {
                                if (checkPath(item, 'evidence.provenance_type.literature.references')) {
                                    refs = item.evidence.provenance_type.literature.references;
                                }
                            }

                            var pmidsList = otUtils.getPmidsList(refs);
                            row.push(pmidsList.length ? otUtils.getPublicationsString(pmidsList) : 'N/A');

                            // Publication ids (hidden)
                            row.push(pmidsList.join(', '));


                            newdata.push(row); // push, so we don't end up with empty rows
                        } catch (e) {
                            scope.errorFlag = true;
                            $log.error('Error parsing rare disease data:');
                            $log.error(e);
                        }
                    });
                    return newdata;
                }


                function initTable () {
                    var table = elem[0].getElementsByTagName('table');
                    $(table).DataTable(otUtils.setTableToolsParams({
                        'data': formatDataToArray(scope.data),
                        'ordering': true,
                        'order': [[1, 'asc']],
                        'autoWidth': false,
                        'paging': true,
                        'columnDefs': [
                            {
                                'targets': [0],    // the access-level (public/private icon)
                                'visible': otConfig.show_access_level,
                                'width': '3%'
                            },
                            {
                                'targets': [7],
                                'visible': false
                            },
                            {
                                'targets': [2, 5, 6],
                                'width': '14%'
                            },
                            {
                                'targets': [3, 4],
                                'width': '20%'
                            }
                        ]
                    }, (scope.title ? scope.title + '-' : '') + '-rare_diseases'));
                }
            }
        };
    }]);