angular.module('otFacets')
    .directive('otHistogramSliderFacetPrimitive', [function () {
        /**
   * Render the histogram
   * @param {*} histogramData 
   * @param {*} svg 
   * @param {*} width 
   * @param {*} height 
   */
        var render = function (scope, state, svg, width, height) {
            var margins = {top: 20, right: 20, bottom: 25, left: 40};
            var histogramWidth = width - margins.left - margins.right;
            var histogramHeight = height - margins.top - margins.bottom;

            // width/height
            svg.attr('width', width)
                .attr('height', height);

            // scales
            var x = d3.scale.ordinal()
                .domain(_.range(1, state.max + 1))
                .rangeBands([0, histogramWidth], 0.2);
            var y = d3.scale.linear()
                .domain([0, d3.max(state.histogramData, function (d) { return d.value; })])
                .range([histogramHeight, 0])
                .nice(5);

            // container group
            var gBacking = svg.select('g.histogram-backing-container');
            var g = svg.select('g.histogram-container');

            if (gBacking.empty()) {
                gBacking = svg.append('g')
                    .classed('histogram-backing-container', true);
            }
            gBacking.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

            if (g.empty()) {
                g = svg.append('g')
                    .classed('histogram-container', true);

                g.append('text')
                    .attr('dy', -3)
                    .classed('message-label', true);
            }
            g.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

            // // x-axis
            // var xAxis = d3.svg.axis()
            //     .scale(x)
            //     .orient('bottom')
            //     .tickSize(0)
            //     .tickPadding(8);

            // y-axis
            var yAxis = d3.svg.axis()
                .scale(y)
                .orient('left')
                .ticks(5)
                .innerTickSize(3)
                .outerTickSize(3)
                .tickPadding(1);

            var gYAxis = svg.select('g.y-axis');
            if (gYAxis.empty()) {
                gYAxis = svg.append('g')
                    .classed('y-axis', true);
            }
            gYAxis.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')')
                .call(yAxis);

            var gAxis = svg.select('g.x-axis');
            if (gAxis.empty()) {
                gAxis = svg.append('g')
                    .classed('x-axis', true);
                gAxis.append('text')
                    .classed('start', true);
                gAxis.append('text')
                    .classed('end', true);
            }
            gAxis.attr('transform', 'translate(' + margins.left + ',' + (margins.top + histogramHeight) + ')')
            //     .call(xAxis);
            gAxis.select('text.start')
                .attr('dy', 10)
                .attr('text-anchor', 'start')
                .text('Low');
            gAxis.select('text.end')
                .attr('dx', histogramWidth)
                .attr('dy', 10)
                .attr('text-anchor', 'end')
                .text('High');

            var gYAxisLabel = svg.select('g.y-axis-label');
            if (gYAxisLabel.empty()) {
                gYAxisLabel = svg.append('g')
                    .classed('y-axis-label', true);

                gYAxisLabel.append('text')
                    .attr('transform', 'rotate(-90)')
                    .attr('text-anchor', 'end')
                    .attr('dy', -30)
                    .classed('end', true)
                    .text('Targets');
            }
            gYAxisLabel.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

            // helper functions
            var selectBasedOn = function (g, minValue) {
                if (minValue === 0) {
                    g.selectAll('rect.hist-bar')
                        .classed('selected', false)
                        .classed('deselected', true);
                } else {
                    g.selectAll('rect.hist-bar')
                        .classed('selected', function (d) { return d.key >= minValue; })
                        .classed('deselected', function (d) { return d.key < minValue; });
                }
            };
            var mouseoverHandler = function (d, i, vals) {
                // base colouring on current element's key
                selectBasedOn(g, d.key);

                // show message
                // var total = state.histogramData.filter(function (b) {
                //     return b.key >= d.key;
                // }).reduce(function (a, b) {
                //     return a + b.value;
                // }, 0);
                // g.select('.message-label').text('Filter level ' + d.key + ' (~' + total + ' targets)');
                // g.select('.message-label').text('Show targets with tissue specificity ' + d.key + ' or above in any of the selected tissues');
                g.select('.message-label').text('Tissue specificity ' + d.key + ' or above');
            };
            var mouseoutHandler = function () {
                // base colouring on level
                selectBasedOn(g, state.level);
                g.select('.message-label').text('');
            };
            var clickHandler = function (d) {
                state.setLevel(d.key);
                // Note: Need to trigger a digest cycle here
                scope.$apply();
                selectBasedOn(g, d.key);
            };

            // // ensure histogram data is sorted by key
            state.histogramData.sort(function (a, b) {
                return d3.ascending(a.key, b.key);
            });

            // backing rectangles
            // JOIN
            var barBacking = gBacking.selectAll('rect.backing-rectangle')
                .data(state.histogramData.filter(function (d) { return d.value > 0; }));

            // ENTER
            barBacking.enter()
                .append('rect')
                .classed('backing-rectangle', true);

            // ENTER + UPDATE
            var fullHeight = Math.abs(y.range()[1] - y.range()[0]);
            barBacking
                .attr('x', function (d) { return x(d.key); })
                .attr('y', 0)
                .attr('width', x.rangeBand())
                .attr('height', function (d) { return d.value > 0 ? fullHeight : 0; })
                .on('mouseover', mouseoverHandler)
                .on('mouseout', mouseoutHandler)
                .on('click', clickHandler);

            // EXIT
            barBacking.exit()
                .remove();

            // histogram rectangles
            // JOIN
            var bar = g.selectAll('rect.hist-bar')
                .data(state.histogramData);

            // ENTER
            bar.enter()
                .append('rect')
                .classed('hist-bar', true);

            // ENTER + UPDATE
            bar
                .attr('x', function (d) { return x(d.key); })
                .attr('y', function (d) { return y(d.value); })
                .attr('width', x.rangeBand())
                .attr('height', function (d) { return y(0) - y(d.value); })
                .on('mouseover', mouseoverHandler)
                .on('mouseout', mouseoutHandler)
                .on('click', clickHandler);

            // EXIT
            bar.exit()
                .remove();

            // // histogram count labels
            // // JOIN
            // var label = g.selectAll('g.count')
            //     .data(state.histogramData);

            // // ENTER
            // label.enter()
            //     .append('g')
            //     .attr('transform', function (d) {
            //         return 'translate(' + x(d.key) + ',' + (-2) + ')';
            //     })
            //     .classed('count', true)
            //     .append('text');

            // // ENTER + UPDATE
            // label
            //     .select('text')
            //     .attr('transform', 'rotate(-90)')
            //     .attr('dy', x.rangeBand() / 2)
            //     .text(function (d) { return (d.value > 0) ? d.value : ''; });

            // // EXIT
            // label.exit()
            //     .remove();

            // set selection state
            selectBasedOn(g, state.level);
        };


        return {
            restrict: 'E',
            scope: {
                facet: '='
            },
            templateUrl: 'facets/primitives/histogram-slider-facet-primitive.html',
            link: function (scope, elem, attrs) {
                var ngSvg = elem.find('svg')[0];
                var svg = d3.select(ngSvg);

                // TODO: set width based on parent width
                var width = 220;
                var height = 120;

                function scopeToState (scope) {
                    return {
                        histogramData: scope.facet.histogramData,
                        min: scope.facet.min,
                        max: scope.facet.max,
                        level: scope.facet.level,
                        setLevel: scope.facet.setLevel
                    };
                }

                render(scope, scopeToState(scope), svg, width, height);

                // ensure a re-render occurs on level/data change
                scope.$watchCollection('facet.histogramData', function () {
                    render(scope, scopeToState(scope), svg, width, height);
                });
                scope.$watch('facet.level', function () {
                    render(scope, scopeToState(scope), svg, width, height);
                });
            }
        };
    }]);
