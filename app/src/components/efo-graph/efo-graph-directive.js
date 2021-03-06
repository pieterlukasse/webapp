angular.module('otDirectives')
    .directive('otEfoGraph', ['otApi', function (otApi) {
        'use strict';
        return {
            restrict: 'E',
            scope: {
                efo: '&disease'
            },
            link: function (scope, elem, attrs) {
                var w = (attrs.width || elem[0].parentNode.offsetWidth) - 40;
                var efoGraph = diseaseGraph()
                    .width(w)
                    .height(700)
                    .cttvApi(otApi.getSelf());

                scope.$watch(function () { return attrs.efo; }, function (efo_str) {
                    if (!efo_str) {
                        return;
                    }
                    var efo = JSON.parse(efo_str);
                    efoGraph.data(efo);
                    efoGraph(elem[0]);
                });
            }
        };
    }]);
