angular.module('otServices')
    .factory('otColumnFilter', [function () {
        function regexFull (val) {
            return '^' + val + '$';
        }

        function addColumnFilterDropdown (column, api, filters) {
            // see https://datatables.net/examples/api/multi_filter_select.html
            var footer = $(column.footer()).empty();
            var select = $('<select style="width:100%;"><option value=""></option></select>')
                .appendTo(footer)
                .on('change', function (a) {
                    var val = $.fn.dataTable.util.escapeRegex(
                        $(this).val()
                    );
                    var filter = filters.filter(function (f) {
                        return f === column[0][0];
                    })[0];
                    var search = regexFull(val);
                    column
                        .search(val ? search : '', true, false)
                        .draw();

                    // update other columns options (saving selection if it applies)
                    api.columns({search: 'applied'}).every(function () {
                        var otherColumn = this;
                        var footer = $(otherColumn.footer());
                        var select = $('select', footer);
                        var otherVal = select.val();

                        // update the select options
                        select.empty().append('<option value=""></option>');
                        otherColumn.data().unique().sort().each(function (d, j) {
                            select.append('<option value="' + d + '">' + d + '</option>');
                        });
                        select.val(otherVal);
                    });

                    $('.filter-label', button).html($(this).val());
                    button.attr('title', $(this).val());

                    select.hide();
                    button.show();
                });

            var button = $('<button class="btn column-filter btn-sm" style="width:100%;"><span class="text-left pull-left filter-label"></span><span class="pull-right fa fa-times"></span></button>')
                .appendTo(footer)
                .click(function () {
                    column
                        .search('', true, false)
                        .draw();

                    // update other columns options (saving selection if it applies)
                    api.columns({search: 'applied'}).every(function () {
                        var otherColumn = this;
                        var footer = $(otherColumn.footer());
                        var select = $('select', footer);
                        var otherVal = select.val();

                        // update the select options
                        select.empty().append('<option value=""></option>');
                        otherColumn.data().unique().sort().each(function (d, j) {
                            select.append('<option value="' + d + '">' + d + '</option>');
                        });
                        select.val(otherVal);
                    });

                    select.val('');

                    select.show();
                    button.hide();
                })
                .hide();

            column.data().unique().sort().each(function (d, j) {
                select.append('<option value="' + d + '">' + d + '</option>');
            });
        }

        function addColumnFilters (api, columns) {
            api.columns().every(function () {
                var column = this;
                if (columns.indexOf(column[0][0]) !== -1) {
                    addColumnFilterDropdown(column, api, columns);
                }
            });
        }

        function mRenderGenerator (colFilter) {
            return function (data, type, full) {
                switch (type) {
                case 'display':
                default:
                    return data;
                case 'filter':
                    return full[colFilter];
                }
            };
        }

        function mDataGenerator (colDisplay, colFilter) {
            return function (source, type, val) {
                switch (type) {
                case 'display':
                    return source[colDisplay];
                case 'filter':
                default:
                    return source[colFilter];
                }
            };
        }

        function initCompleteGenerator (columns) {
            return function () {
                var api = this.api();
                addColumnFilters(api, columns);
            };
        }

        return {
            mRenderGenerator: mRenderGenerator,
            mDataGenerator: mDataGenerator,
            initCompleteGenerator: initCompleteGenerator
        };
    }]);
