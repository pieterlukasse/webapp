/**
 * Drugs table
 * 
 * ext object params:
 *  isLoading, hasError, data
 */
angular.module('otDirectives')

    /* Directive to display the known drug evidence table */
    .directive('otKnownDrugTable', ['otColumnFilter', 'otApi', 'otConsts', 'otUtils', 'otConfig', '$location', 'otDictionary', function (otColumnFilter, otApi, otConsts, otUtils, otConfig, $location, otDictionary) {
        'use strict';
        // var dbs = otConsts.dbs;
        var searchObj = otUtils.search.translateKeys($location.search());
        var checkPath = otUtils.checkPath;

        return {
            restrict: 'AE',
            templateUrl: 'src/components/known-drug-table/known-drug-table.html',
            scope: {
                // loadFlag: '=?',    // optional load-flag: true when loading, false otherwise. links to a var to trigger spinners etc...
                // data: '=?',        // optional data link to pass the data out of the directive
                // errorFlag: '=?'    // optional error-flag: pass a var to hold parsing-related errors
                title: '@?',       // optional title for filename export
                ext: '=?'       // optional external object to pass things out of the directive; TODO: this should remove teh need for all parameters above
            },
            controller: ['$scope', function ($scope) {
                function init () {
                    $scope.drugs = [];
                }

                init();
            }],
            link: function (scope, elem, attrs) {
                // this probably shouldn't live here, so we'll see later on...
                // var accessLevelPrivate = '<span class=\'ot-access-private\' title=\'private data\'></span>';
                // var accessLevelPublic = '<span class=\'ot-access-public\' title=\'public data\'></span>';

                scope.ext.hasError = false;

                scope.$watchGroup([function () { return attrs.target; }, function () { return attrs.disease; }], function () {
                // if (!attrs.target && !attrs.disease) {
                // Wa want to get data when we have both target and disease
                // so it should return here if one or the other are undefined
                    if (!attrs.target && !attrs.disease) { /* TODO */
                        return;
                    }
                    getDrugData();

                    // =================================================
                    //  D R U G S
                    // =================================================

                    /*
                drug    1   Target context  .biological_subject.properties.target_type
                drug    2   Protein complex members .biological_subject.about
                drug    3   Drug information    .evidence.evidence_chain[0].evidence.experiment_specific
                drug    4   Mechanism of action of drug .biological_subject.properties.activity
                drug    5   Mechanism of action references  .evidence.evidence_chain[0].evidence.provenance_type.literature.pubmed_refs
                drug    6   Evidence codes: target to drug  .evidence.evidence_chain[0].evidence.evidence_codes
                drug    7   Provenance - target .evidence.urls.linkouts[1]
                drug    8   Provenance - drug   .evidence.urls.linkouts[0]
                drug    9   Provenace - marketed drug indication; SourceDB  .evidence.evidence_chain[1].evidence.experiment_specific
                drug    10  Date asserted   .evidence.date_asserted
                drug    11  Evidence codes: drug to disease .evidence.evidence_chain[1].evidence.evidence_codes
                drug    12  Association score   .evidence.evidence_chain[0].evidence.association_score
                */

                    /*
                Drug Information                                                        Gene-Drug Evidence
                Drug    Phase   Type    Mechanism of Action Activity    Clinical Trials Target name Target class    Target context  Protein complex members Evidence type
                */

                    function getDrugData () {
                    // $scope.search.drugs.is_loading = true;
                        scope.ext.isLoading = true;
                        var opts = {
                        // target:attrs.target,
                        // disease:attrs.disease,
                            size: 1000,
                            datasource: otConfig.evidence_sources.known_drug,
                            fields: [
                                'disease.efo_info',
                                'drug',
                                'evidence',
                                'target',
                                'access_level'
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
                                        scope.ext.data = resp.body.data;
                                        initTableDrugs();
                                    } else {
                                        // $log.warn("Empty response : drug data");
                                    }
                                },
                                otApi.defaultErrorHandler
                            )
                            .finally(function () {
                                scope.ext.isLoading = false;
                            });
                    }


                    function formatDrugsDataToArray (data) {
                        var newdata = [];
                        var all_drugs = [];
                        data.forEach(function (item) {
                        // create rows:
                            var row = [];

                            try {
                            // Fill the unique drugs
                                all_drugs.push({
                                    id: item.drug.molecule_name,
                                    url: item.evidence.target2drug.urls[0].url
                                });

                                // 0: data origin: public / private
                                row.push((item.access_level === otConsts.ACCESS_LEVEL_PUBLIC) ? otConsts.ACCESS_LEVEL_PUBLIC_DIR : otConsts.ACCESS_LEVEL_PRIVATE_DIR);

                                // 1: disease
                                row.push('<a href=\'/disease/' + item.disease.efo_info.efo_id.split('/').pop() + '\'>' + item.disease.efo_info.label + '</a>');

                                // 2: drug
                                var link = item.evidence.target2drug.urls[0].url;
                                var linkClass = 'class="ot-external-link"';
                                var target = 'target=_blank';
                                if (item.evidence.target2drug.provenance_type.database.id === 'ChEMBL') {
                                    link = '/summary?drug=' + item.drug.id.split('/').pop();
                                    linkClass = '';
                                    target = '';
                                }
                                row.push('<a ' + linkClass + ' href=\'' + link + '\' ' + target + '>' +
                            item.drug.molecule_name +
                            '</a>');

                                // 3: phase
                                // row.push(item.drug.max_phase_for_all_diseases.label);
                                row.push(item.evidence.drug2clinic.max_phase_for_disease.label);

                                // 4: phase numeric (hidden)
                                row.push(item.drug.max_phase_for_all_diseases.numeric_index);

                                // 5: status
                                var sts = otDictionary.NA;
                                if (otUtils.checkPath(item, 'evidence.drug2clinic.status')) {
                                    sts = item.evidence.drug2clinic.status;
                                }
                                row.push(sts);

                                // 6: type
                                row.push(item.drug.molecule_type);

                                // 7: Mechanism of action
                                var action = item.evidence.target2drug.mechanism_of_action;

                                // publications
                                var refs = [];
                                if (checkPath(item, 'evidence.target2drug.provenance_type.literature.references')) {
                                    refs = item.evidence.target2drug.provenance_type.literature.references;
                                }

                                if (refs.length > 0) {
                                    action += '<br />' + otUtils.getPublicationsString(otUtils.getPmidsList(refs));
                                }

                                if (item.evidence.target2drug.urls && item.evidence.target2drug.urls[2]) {
                                    var extLink = item.evidence.target2drug.urls[2];
                                    action += '<br /><span><a class=\'ot-external-link\' target=_blank href=' + extLink.url + '>' + extLink.nice_name  + '</a></span>';
                                }

                                row.push(action);

                                // col 5: pub ids (hidden)
                                // row.push(pmidsList.join(", "));


                                // 8: Activity
                                var activity = item.target.activity;
                                switch (activity) {
                                case 'drug_positive_modulator' :
                                    activity = 'agonist';
                                    break;
                                case 'drug_negative_modulator' :
                                    activity = 'antagonist';
                                    break;
                                }
                                row.push(activity);

                                // 6: Clinical indications -- REMOVED!
                                // row.push( "<a href='"
                                //             + data[i].evidence.evidence_chain[1].evidence.experiment_specific.urls[0].url
                                //             + "' target='_blank'>" + data[i].evidence.evidence_chain[1].evidence.experiment_specific.urls[0].nice_name + " <i class='fa fa-external-link'></i></a>");

                                // 9: target class
                                var trgc = otDictionary.NA;
                                if (otUtils.checkPath(item, 'target.target_class')) {
                                    trgc = item.target.target_class[0] || otDictionary.NA;
                                }
                                row.push(trgc);


                                // 8: target context / protein complex members

                                // 10: evidence source
                                row.push('Curated from <br /><a class=\'ot-external-link\' href=\'' +
                            item.evidence.drug2clinic.urls[0].url +
                            '\' target=\'_blank\'>' + item.evidence.drug2clinic.urls[0].nice_name + '</a>');

                                // row.push(data[i].evidence.evidence_codes_info[0][0].label);    // Evidence codes


                                // hidden cols for filtering
                                row.push(item.disease.efo_info.label); // disease
                                row.push(item.drug.molecule_name); // drug
                                row.push(item.evidence.target2drug.mechanism_of_action); // mechanism
                                row.push(item.evidence.drug2clinic.urls[0].nice_name); // evidence source

                                newdata.push(row); // use push() so we don't end up with empty rows
                            } catch (e) {
                                scope.ext.hasError = true;
                            // $log.log("Error parsing drugs data:");
                            // $log.log(e);
                            }
                        });

                        var all_drugs_sorted = _.sortBy(all_drugs, function (rec) {
                            return rec.id;
                        });

                        var showLim = 50;
                        scope.show = {};
                        scope.show.limit = showLim;
                        scope.show.ellipsis = '[Show more]';
                        scope.drugs = _.uniqBy(all_drugs_sorted, 'id');
                        scope.drugs.forEach(function (d) {
                            var chemblId = d.url.split('/').pop();
                            if (chemblId.indexOf('CHEMBL') > -1) {
                                d.url = '/summary?drug=' + chemblId;
                            }
                        });
                        scope.show.moreOrLess = scope.drugs.length > showLim;

                        scope.showMoreOrLess = function () {
                            scope.show.moreOrLess = true;
                            if (scope.show.limit === scope.drugs.length) { // It is already open
                                scope.show.limit = showLim;
                                scope.show.ellipsis = '[Show more]';
                            } else {  // It is closed
                                scope.show.limit = scope.drugs.length;
                                scope.show.ellipsis = '[Show less]';
                            }
                        };

                        return newdata;
                    }

                    var dropdownColumns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

                    /*
                     * This is the hardcoded data for the Known Drugs table and
                     * will obviously need to change and pull live data when available
                     */
                    function initTableDrugs () {
                    // $('#drugs-table') // Not anymore
                        var table = elem[0].getElementsByTagName('table');
                        $(table).dataTable(otUtils.setTableToolsParams({
                            'data': formatDrugsDataToArray(scope.ext.data),
                            'autoWidth': false,
                            'paging': true,
                            'order': [[3, 'desc']],
                            // "aoColumnDefs" : [
                            'columnDefs': [
                                {'targets': [4], 'visible': false},
                                {'iDataSort': 3, 'aTargets': [4]},
                                {
                                    'targets': [0],    // the access-level (public/private icon)
                                    'visible': otConfig.show_access_level,
                                    'width': '3%'
                                },
                                {
                                    'targets': [3],
                                    'width': '5.6%'
                                },
                                {
                                    'targets': [5, 6, 7, 8, 9, 10],
                                    'width': '11.2%'
                                },
                                // disease
                                {
                                    'targets': [1],
                                    'width': '11.2%',
                                    'mRender': otColumnFilter.mRenderGenerator(11),
                                    'mData': otColumnFilter.mDataGenerator(1, 11)
                                },
                                // drug
                                {
                                    'targets': [2],
                                    'width': '11.2%',
                                    'mRender': otColumnFilter.mRenderGenerator(12),
                                    'mData': otColumnFilter.mDataGenerator(2, 12)
                                },
                                // mech of action
                                {
                                    'targets': [7],
                                    'width': '11.2%',
                                    'mRender': otColumnFilter.mRenderGenerator(13),
                                    'mData': otColumnFilter.mDataGenerator(7, 13)
                                },
                                // evidence source
                                {
                                    'targets': [10],
                                    'width': '11.2%',
                                    'mRender': otColumnFilter.mRenderGenerator(14),
                                    'mData': otColumnFilter.mDataGenerator(10, 14)
                                }
                            ],
                            // "aoColumnDefs" : [
                            //     {"iDataSort" : 2, "aTargets" : [3]},
                            // ]
                            // "ordering": false
                            // }, $scope.search.info.title+"-known_drugs") );
                            initComplete: otColumnFilter.initCompleteGenerator(dropdownColumns)
                        }, (scope.title ? scope.title + '-' : '') + 'known_drugs'));
                    }
                });
            }
        };
    }]);
