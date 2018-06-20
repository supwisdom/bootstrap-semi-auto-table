+function ($) {
  'use strict';

  // http://jqueryvalidation.org/jQuery.validator.format/
  var format = function (source, params) {
    if (arguments.length === 1) {
      return source;
    }
    if (arguments.length > 2 && params.constructor !== Array) {
      params = $.makeArray(arguments).slice(1);
    }
    if (params.constructor !== Array) {
      params = [params];
    }
    $.each(params, function (i, n) {
      source = source.replace(new RegExp("\\{" + i + "\\}", "g"), function () {
        return n;
      });
    });
    return source;
  };

  var keySet = function (obj) {
    var keys = [];
    $.each(_.keys(obj), function () {
      keys.push(parseInt(this));
    });
    return keys;
  }

  var reCalColumnWidth = function (datatable, tableWidth) {
    var $thead = $(datatable.table().header());
    var $tbody = $(datatable.table().body());

    $.each($thead.find("th:visible"), function () {
      var index = parseInt($(this).attr("data-column-index"));
      $(this).outerWidth($tbody.find("tr:first").find("td:eq(" + index + ")").outerWidth());
    });

    if (tableWidth) {
      $thead.parent("table").width(tableWidth);
    } else {
      var width = $tbody.parent("table")[0].style.width;
      $thead.parent("table").css('width', width);
      $thead.parent("table").css('max-width', width);
    }

  }

  var localStorage = window.localStorage;

  var storageKeySuffix = "-table";

  var resizable = true;

  var toolbarHeight = $('.semi-auto-table-toolbar').outerHeight();

  var tableHeaderHeight = $(".dataTables_scrollHead").outerHeight();

  var resizableTable = null;


  // SemiAutoTable CLASS DEFINITION
  // ======================

  var SemiAutoTable = function (element, options) {

    this.options = options;

    this.$table = $(element);
    this.$table.css('max-width', this.$table[0].style.width);

    this.itemKey = this.options.saveStatus.key + storageKeySuffix;

    this.initTable = true;
    this.initLayout();

    if (this.options.useDataTable) {
      this.initMenuItems();
      this.addDataTablePlugin();
    } else {
      this.initRowButton();
      this.initMenuItems();
      this.initPaginator();
      this.initSortBy();
      this.selectedRowCount();
    }

  }

  SemiAutoTable.VERSION = '0.0.1';

  SemiAutoTable.prototype.getSavedStatus = function () {
    return localStorage.getItem(this.itemKey) ? JSON.parse(localStorage.getItem(this.itemKey)) : {};
  }

  SemiAutoTable.prototype.addDataTablePlugin = function () {

    var _self = this;

    // if ((this.options.columns instanceof Array) && _self.options.columns.length == 0) {
    //   throw "parameter columns is not a empty array";
    // }

    var tableData = false;
    if (_self.options.data && _self.options.data.length > 0) {
      tableData = _self.options.data;
    }

    var colReorder;
    if (_self.options.colOrderArrangable) {
      colReorder = {
        reorderCallback: function () {
          if (!resizable) {
            return false;
          }
          _self.renderResizableTable();
        }
      }
    }

    if (_self.options.fixedHeader.enabled) {

      _self.$table.DataTable({
        retrieve: true,
        data: tableData,
        columns: _self.options.columns,
        ajax: _self.options.ajax,
        colReorder: colReorder,
        searching: false,
        paging: false,
        ordering: false,
        info: false,
        autoWidth: false,
        "dom": 'Zlfrtip',
        "scrollY": (_self.options.fixedHeader.scrollY || 0) + "px",
        "scrollX": _self.$table.width() + "px",
        "scrollCollapse": true,
        fnDrawCallback: _self.fnDrawCallback(),
        initComplete: _self.initComplete(),
        language: {
          "emptyTable": $.fn.semiAutoTable.locales[_self.options.locale].data_table.emptyTable,
          "loadingRecords": $.fn.semiAutoTable.locales[_self.options.locale].data_table.loadingRecords
        }
      });
    } else {
      _self.$table.DataTable({
        retrieve: true,
        data: tableData,
        columns: _self.options.columns,
        ajax: _self.options.ajax,
        colReorder: colReorder,
        searching: false,
        paging: false,
        ordering: false,
        info: false,
        autoWidth: false,
        "dom": 'Zlfrtip',
        fnDrawCallback: _self.fnDrawCallback(),
        initComplete: _self.initComplete(),
        language: {
          "emptyTable": $.fn.semiAutoTable.locales[_self.options.locale].data_table.emptyTable,
          "loadingRecords": $.fn.semiAutoTable.locales[_self.options.locale].data_table.loadingRecords
        }
      });
    }

  }

  SemiAutoTable.prototype.fnDrawCallback = function () {
    var _self = this;
    return function (settings) {

      var dataTableAPI = $(settings.nTable).DataTable();
      var json = dataTableAPI.ajax.json();
      var isLoading = dataTableAPI.settings()[0].iDraw <= 1;

      if (!isLoading) {
        _self.bindRowClick();
        _self.selectedRowCount();

        if (_self.$selectColumn) {
          // var hidenColumns = _self.$selectColumn.find("input:not(:checked)");
          //
          // var $trs = _self.$table.find("tbody > tr");
          // $.each(hidenColumns, function() {
          //   var index = $(this).parents('li').index() + 1;
          //   $.each($trs, function () {
          //     $(this).find('td:eq('+index+')').hide();
          //   });
          // });
          var originOrder = [];
          if (_self.options.saveStatus.enabled) {
            originOrder = _self.getSavedStatus()["order"];
          } else {
            var dataTable = _self.$table.DataTable();
            originOrder = dataTable.columns().indexes();
          }
          _self.updateColumnSelect({}, originOrder);
        }


        if (_self.options.fixedHeader.enabled && resizableTable) {
          _self.renderResizableTable();
        }
      }

      _self.options.reDrawCallback(json, isLoading);
    }
  }

  SemiAutoTable.prototype.initComplete = function () {
    var _self = this;
    return function (settings, json) {
      // if (settings.fnRecordsDisplay() <= 0) {
      //   $(settings.nTBody).hide();
      // }
      //更新分页
      if (json && json.data) {
        _self.options.pageOption["totalRows"] = json.data.length;
        _self.options.pageOption["totalPages"] = Math.ceil(json.data.length / _self.options.rowsPerPage);
      }

      _self.renderColumnSelect();
      _self.initRowButton();
      _self.initPaginator();
      _self.initSortBy();
      _self.selectedRowCount();

      if (_self.options.fixedHeader.enabled) {
        var datatable = _self.$table.DataTable();
        if (settings.fnRecordsTotal() > 0) {
          reCalColumnWidth(datatable);
        }
        $(datatable.table().header()).parent("table").css('height', '');

        _self.$table.on("change-scrollY", function (event, $body, fixedHeader) {
          _self.changeTableScrollY($body, {enabled: fixedHeader});
        });

        _self.$table.trigger("change-scrollY", [$(settings.nScrollBody), _self.options.fixedHeader.enabled]);
        resizable = true;

        //窗口变化时，重新计算表格宽度
        $(window).resize(_.throttle(function () {
          var $thead = $(datatable.table().header());
          var $hide_head = $(datatable.table().body()).parent("table").find("thead");

          $.each($thead.find("th"), function () {
            var index = parseInt($(this).attr("data-column-index"));
            $hide_head.find("th:eq(" + index + ")").css('width', this.style.width);
          });

          var width = $thead.parent("table")[0].style.width;
          $hide_head.parent("table").css('width', width);
          $hide_head.parent("table").css('max-width', width);
        }, 300));
      }

      _self.options.completeTableCallback(json);
    }
  }

  SemiAutoTable.prototype.changeTableScrollY = function ($scrollBody, option) {
    this.options.fixedHeader = $.extend({}, this.options.fixedHeader, option);
    if (!this.options.fixedHeader.enabled) {
      return false;
    }
    if ((toolbarHeight && toolbarHeight == $('.semi-auto-table-toolbar').outerHeight()) &&
        (tableHeaderHeight && tableHeaderHeight == $(".dataTables_scrollHead").outerHeight())) {
      return false;
    }

    tableHeaderHeight = $(".dataTables_scrollHead").outerHeight();
    toolbarHeight = $('.semi-auto-table-toolbar').outerHeight();
    var maxHeight = this.options.fixedHeader.scrollY ? (this.options.fixedHeader.scrollY - toolbarHeight - tableHeaderHeight) : 0;
    $scrollBody.css('max-height', maxHeight + 'px');
    $scrollBody.height(maxHeight);
  }

  SemiAutoTable.prototype.renderColumnSelect = function () {
    var dataTable = this.$table.DataTable();
    var _self = this;

    if (this.options.colOrderArrangable) {
      this.$table.find('th').css("cursor", "pointer");

      var originOrder = [];
      if (_self.options.saveStatus.enabled) {
        originOrder = _self.getSavedStatus()["order"];
      } else {
        originOrder = dataTable.columns().indexes();
      }

      // var hideColumns = this.options.columnOption.hideColumns;
      // if (hideColumns.length > 0) {
      //   for (var i = 0; i < hideColumns.length; i++) {
      //     order.splice($.inArray(hideColumns[i], order), 1);
      //   }
      // }
      if (originOrder && originOrder.length > 0) {
        resizable = false;
      }
      dataTable.colReorder.order(originOrder, true);
    }

    //隐藏列
    this.initColumnSelect(originOrder ? originOrder : null);

    if (this.options.colResizable) {
      this.$table.addClass("col-resizable");

      resizableTable = this.$table.colResizable({
        liveDrag: true,
        postbackSafe: {
          enabled: _self.options.saveStatus.enabled,
          key: _self.options.saveStatus.key + storageKeySuffix
        },
        gripInnerHtml: "<div class='grip'></div>",
        draggingClass: "dragging",
        partialRefresh: false,
        resizeMode: 'overflow',
        onDrag: _self.freshHeaderWidth()
      });
    }


    dataTable.on('column-reorder', function (e, settings, details) {

      var order = dataTable.colReorder.order();

      _self.reOrderColumnSelect(order, details);

      if (_self.options.saveStatus.enabled) {

        var savedStatus = _self.getSavedStatus();
        savedStatus['order'] = order;
        localStorage.setItem(_self.itemKey, JSON.stringify(savedStatus));
      }

      _self.bindRowClick();
    });


    var hiddenColumns = {};
    $.each(this.options.columnOption.hideColumns, function () {
      hiddenColumns[this] = _self.getSavedStatus()['hidden-columns'][this] ? _self.getSavedStatus()['hidden-columns'][this] : 125;
    });
    this.$table.on('showOrHideCol', function (event, clickEvent, isDisabled, index, $fixed_th_hide, $td_hide) {
      if (isDisabled) {
        return false;
      }


      if (_self.options.saveStatus.enabled) {
        var current_savedStatus = _self.getSavedStatus()['hidden-columns'];
        for (var key in current_savedStatus) {
          if (_.keys(hiddenColumns).indexOf(key) == -1) {
            hiddenColumns[key] = current_savedStatus[key];
          }
        }
      }

      var show = $(clickEvent.currentTarget).find(':checkbox').prop("checked");
      if (!$(clickEvent.target).is(':checkbox')) {
        show = !show;
        $(clickEvent.currentTarget).find(':checkbox').prop("checked", show).trigger('change');
      }


      var $th_hide = _self.$table.find("tr th:eq(" + $fixed_th_hide.index() + ")");
      var i = $fixed_th_hide.index();
      if (_self.options.colOrderArrangable) {
        $th_hide = _self.$table.find("tr th[data-column-index=" + parseInt($fixed_th_hide.attr("data-column-index")) + "]");
        var current_order = $(this).DataTable().colReorder.order();
        i = current_order[parseInt($fixed_th_hide.attr("data-column-index"))];
      }

      if (!$th_hide.length) {
        $fixed_th_hide = $(_self.$table.DataTable().table().header()).find("th:eq(" + index + ")");
        if (!$td_hide.length) {
          $td_hide = _self.$table.find("tbody>tr").find("td:eq(" + index + ")")
        }
      }

      if (show) {
        if (current_savedStatus && hiddenColumns[i]) {
          var width = hiddenColumns[i];
          $th_hide.css('width', width + 'px');
          $th_hide.outerWidth(width);
        }
        $th_hide.show();
        $td_hide.show();
        $fixed_th_hide.show();

        delete hiddenColumns[i];
      } else {
        var originWidth = 0;
        $.each($fixed_th_hide.parent('tr').find("th:visible"), function () {
          originWidth += $(this).outerWidth();
        });

        $th_hide.hide();
        $td_hide.hide();
        $fixed_th_hide.hide();

        hiddenColumns[i] = $fixed_th_hide.outerWidth();
        _self.$table.width(originWidth - $fixed_th_hide.outerWidth());

      }

      if (_self.options.saveStatus.enabled) {
        var savedStatus = _self.getSavedStatus();
        savedStatus['hidden-columns'] = hiddenColumns;
        localStorage.setItem(_self.itemKey, JSON.stringify(savedStatus));
      }

      if (_self.options.fixedHeader.enabled) {
        reCalColumnWidth(dataTable, originWidth - $fixed_th_hide.outerWidth());
      }
      _self.renderResizableTable();
    });

  }

  SemiAutoTable.prototype.freshHeaderWidth = function () {
    if (!this.options.fixedHeader.enabled) {
      return false;
    }

    var _self = this
    return function (event, ss) {
      var datatable = _self.$table.DataTable();
      reCalColumnWidth(datatable);

      _self.$table.trigger("change-scrollY", [$(".dataTables_scrollBody"), _self.options.fixedHeader.enabled]);
    }
  }


  SemiAutoTable.prototype.renderResizableTable = function () {
    var _self = this;
    this.$table.colResizable({
      disable: true
    });
    this.$table.colResizable({
      liveDrag: true,
      postbackSafe: {
        enabled: _self.options.saveStatus.enabled,
        key: _self.options.saveStatus.key + storageKeySuffix,
        refreshStorage: true
      },
      gripInnerHtml: "<div class='grip'></div>",
      draggingClass: "dragging",
      partialRefresh: true,
      resizeMode: 'overflow',
      onDrag: _self.freshHeaderWidth()
    });
  }

  SemiAutoTable.prototype.getTableJson = function () {
    return this.$table.DataTable().ajax.json();
  }

  SemiAutoTable.prototype.initLayout = function () {

    var $container = $('<div></div>');
    $container.addClass(this.options.containerClass);
    this.$container = $container;
    this.$table.after($container);
    this.$table.appendTo($container);

    var $toolbarRow = $('<div class="' + this.options.toolbarClass + '"></div>');
    $toolbarRow.appendTo($container);

    var $menuBarWrapper = $('<div class="' + this.options.menuBarWrapperClass + '"></div>');
    $menuBarWrapper.appendTo($toolbarRow);

    var $menuBar = $('<div class="' + this.options.menuBarClass + '" role="toolbar"></div>');
    $menuBar.appendTo($menuBarWrapper)
    this.$menuBar = $menuBar;

    var $paginatorWrapper = $('<div class="' + this.options.paginatorWrapperClass + '"></div>');
    $paginatorWrapper.appendTo($toolbarRow);

    var $paginator = $('<div class="' + this.options.paginatorClass + '" role="toolbar"></div>');
    $paginator.appendTo($paginatorWrapper);
    this.$paginator = $paginator;

    var $tableWrapper = $('<div class="' + this.options.tableWrapperClass + '" >');
    if (!this.options.fixedHeader.enabled && this.options.overflow) {
      $tableWrapper.addClass("table-responsive");
    }

    $tableWrapper.appendTo($container);
    this.$table.appendTo($tableWrapper);
    this.$table.addClass(this.options.tableClass);

  }

  /**
   * 初始化全选按钮，和点击table的行会自动勾选row.id input的行为
   */
  SemiAutoTable.prototype.initRowButton = function () {

    this.updateRowButton(this.options.rowOption);

  }

  /**
   * 更新全选按钮，和点击table的行会自动勾选row.id input的行为
   * @param option 不必是完整参数，完整参数的例子：
   * {
   *    showSelectAll: true,
   *    type: 'checkbox',
   *    inputName: "row.id",
   *    rowSelector: "> tbody > tr"
   * }
   */
  SemiAutoTable.prototype.updateRowButton = function (option) {

    if (this.$rowIdInputList) {
      this.$rowIdInputList.off('click');
      delete this.$rowIdInputList;
    }

    if (this.$selectAll) {
      this.$selectAll.remove();
      delete this.$selectAll;
    }

    if (this.$rows) {
      this.$rows.off('click');
    }

    if (!option) {
      return;
    }

    this.options.rowOption = $.extend({}, this.options.rowOption, option);

    var self = this;
    var rowOption = this.options.rowOption;
    var selectColor = this.options.selectColor;

    var type = rowOption.type;
    var showSelectAll = rowOption.showSelectAll;
    var inputName = rowOption.inputName;

    if (type == 'checkbox') {

      if (showSelectAll) {

        var allChecked = false;

        this.$selectAll = this.addMenuItem({

          // title: $.fn.semiAutoTable.locales[this.options.locale].select_all,
          // title: '<input type="checkbox"/>',
          checkbox: true,
          callback: function () {
            self.$selectAll.find("input[type='checkbox']").prop('checked', !allChecked);

            $.each(self.$rowIdInputList.not(':hidden'), function () {
              if ($(this).prop('checked') == allChecked) {
                $(this).prop('checked', !allChecked).trigger('change');

                if ($(this).is(':checked')) {
                  $(this).closest('tr').addClass(selectColor);
                } else {
                  $(this).closest('tr').removeClass(selectColor);

                }
              } else {
                $(this).prop('checked', !allChecked);
              }
            });
            self.selectedRowCount();
            allChecked = !allChecked;
          },

          dropdowns: [

            {
              title: $.fn.semiAutoTable.locales[this.options.locale].select_all,
              callback: function () {
                $.each(self.$rowIdInputList, function (index, input) {
                  var $input = $(input);
                  var checked = $input.prop("checked");
                  if (!checked) {
                    $input.prop('checked', !checked).trigger('change');
                  }
                  if ($input.is(':checked')) {
                    $input.closest('tr').addClass(selectColor);
                  } else {
                    $input.closest('tr').removeClass(selectColor);

                  }
                });
                self.selectedRowCount();
              }
            },
            {
              title: $.fn.semiAutoTable.locales[this.options.locale].select_inverse,
              callback: function () {

                $.each(self.$rowIdInputList, function (index, input) {
                  var $input = $(input);
                  $input.prop('checked', !$input.prop('checked')).trigger('change');
                  if ($input.is(':checked')) {
                    $input.closest('tr').addClass(selectColor);
                  } else {
                    $input.closest('tr').removeClass(selectColor);

                  }
                });
                self.selectedRowCount();
                allChecked = false;

              }
            },
            {
              title: $.fn.semiAutoTable.locales[this.options.locale].select_clear,
              callback: function () {
                $.each(self.$rowIdInputList, function (index, input) {
                  var $input = $(input);
                  var checked = $input.prop("checked");
                  if (checked) {
                    $input.prop('checked', !checked).trigger('change');
                  }
                  if ($input.is(':checked')) {
                    $input.closest('tr').addClass(selectColor);
                  } else {
                    $input.closest('tr').removeClass(selectColor);

                  }
                });
                self.selectedRowCount();
              }
            }
          ]

        });

        this.$selectAll.addClass('select-all-btn');
        this.$selectAll.prependTo(this.$menuBar);

      }

      this.bindRowClick(this.options.rowOption);

    }

    else if (type == 'radio') {

      this.bindRowClick(this.options.rowOption);

    } else {

      throw 'Unrecgonized rowOption.type';

    }

  }

  SemiAutoTable.prototype.bindRowClick = function (option) {

    this.options.rowOption = $.extend({}, this.options.rowOption, option);

    var rowOption = this.options.rowOption;

    var rowSelector = rowOption.rowSelector;

    this.$rows = this.$table.find(rowSelector);

    this.bindRowsAndAddRowClick(option, this.$rows);
  }


  /**
   * 初始化选择展示的列菜单按钮
   */
  SemiAutoTable.prototype.initColumnSelect = function (order) {
    this.updateColumnSelect(this.options.columnOption, order);
  }

  /**
   * 更新选择展示的列菜单按钮
   */
  SemiAutoTable.prototype.updateColumnSelect = function (option, order) {

    if (this.$selectColumn) {
      this.$selectColumn.remove();
      delete this.$selectColumn;
    }

    this.options.columnOption = $.extend({}, this.options.columnOption, option);

    var self = this;
    var columnOption = this.options.columnOption;
    var showColumnSelect = columnOption.showColumnSelect;
    var stickyColumns = columnOption.stickyColumns;
    var hideColumns = columnOption.hideColumns;
    if (this.options.saveStatus.enabled) {
      var savedStatus = this.getSavedStatus();
      hideColumns = savedStatus['hidden-columns'] ? keySet(savedStatus['hidden-columns']) : [];
    }

    var dropdowns = [];
    var $th = this.$table.find("thead>tr>th");
    var $tr = this.$table.find("tr");
    if (showColumnSelect) {
      $th.each(function (index, th) {
        var $th_hide = $tr.find('th:eq(' + index + ')');
        var $td_hide = $tr.find('td:eq(' + index + ')');
        var $fixed_th_hide = $(self.$table.DataTable().table().header()).find("th:eq(" + index + ")");

        var $table = self.$table;
        var checked = true;
        var disabled = false;
        //初始化隐藏的列

        var order_index = (savedStatus && savedStatus['order']) ? savedStatus['order'][index] : index;
        if (hideColumns.indexOf(order_index) != -1) {
          checked = false;
          $th_hide.hide();
          $td_hide.hide();
          $fixed_th_hide.hide();
        }
        //不能操作的列
        if (stickyColumns.indexOf(index) != -1) {
          disabled = true;
        }
        if ($(th).text() && $(th).text().length != 0) {
          var dropdown_title = '<label class="checkbox-inline columns-title">' +
              '<input type="checkbox" value="' + (order ? order[index] : index);
          if (checked) {
            dropdown_title += '" checked="' + checked;
          }
          //不能隐藏的列
          if (disabled) {
            dropdown_title += '" disabled="' + disabled;
          }
          dropdown_title += '"/>' + $(th).text() + '</label>';
          dropdowns.push({
            title: dropdown_title,
            callback: function (event) {
              $table.trigger('showOrHideCol', [event, disabled, (order ? order[index] : index), $fixed_th_hide, /*$table.find("tbody>tr").find("td:eq("+index+")")*/$td_hide]);
            }
          });
        }
      });
      this.$selectColumn = this.addMenuItem({
        // icon: 'fa fa-th',
        title: '列显设置',
        dropdowns: dropdowns,
        keepOpen: true
      });

      if (this.$menuBar.find(".select-all-btn").length > 0) {
        this.$menuBar.find(".select-all-btn").after(this.$selectColumn);
      } else {
        this.$selectColumn.prependTo(this.$menuBar);
      }
    }
  }

  /**
   * 重新排列选择隐藏列的菜单
   * @param order
   * @param details
   */
  SemiAutoTable.prototype.reOrderColumnSelect = function (order, details) {
    if (details.from < details.to) {
      $(".columns-title input[value=" + order[details.to - 1] + "]").parents('li').after($(".columns-title input[value=" + order[details.to] + "]").parents('li'))
    } else {
      $(".columns-title input[value=" + order[details.to + 1] + "]").parents('li').before($(".columns-title input[value=" + order[details.to] + "]").parents('li'))
    }
  }

  /**
   * 初始化菜单
   * @param menus
   */
  SemiAutoTable.prototype.initMenuItems = function () {

    this.updateMenuItems(this.options.menus);

  }

  /**
   * 更新菜单栏
   * @param option menuItemDefinition数组
   */
  SemiAutoTable.prototype.updateMenuItems = function (option) {

    if (!this.$selectAll && !this.$selectColumn) {
      this.$menuBar.find('[data-toggle="dropdown"]').tooltip('destroy');
      this.$menuBar.find('[data-toggle="tooltip"]').tooltip('destroy');
      this.$menuBar.children().remove();
    }
    if (this.$selectAll && !this.$selectColumn) {
      this.$menuBar.children().not(this.$selectAll).find('[data-toggle="dropdown"]').tooltip('destroy');
      this.$menuBar.children().not(this.$selectAll).find('[data-toggle="tooltip"]').tooltip('destroy');
      this.$menuBar.children().not(this.$selectAll).remove();
    }
    if (!this.$selectAll && this.$selectColumn) {
      this.$menuBar.children().not(this.$selectColumn).find('[data-toggle="dropdown"]').tooltip('destroy');
      this.$menuBar.children().not(this.$selectColumn).find('[data-toggle="tooltip"]').tooltip('destroy');
      this.$menuBar.children().not(this.$selectColumn).remove();
    }
    if (this.$selectAll && this.$selectColumn) {
      this.$menuBar.children().not(this.$selectAll).not(this.$selectColumn).find('[data-toggle="dropdown"]').tooltip('destroy');
      this.$menuBar.children().not(this.$selectAll).not(this.$selectColumn).find('[data-toggle="tooltip"]').tooltip('destroy');
      this.$menuBar.children().not(this.$selectAll).not(this.$selectColumn).remove();
    }

    this.options.menus = option;
    var menus = this.options.menus;

    var self = this;

    $.each(menus, function (index, menuItemDefinition) {
      self.addMenuItem(menuItemDefinition);

    });

    this.renderButtonTag(menus);

    this.$menuBar.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });

  }

  /**
   * 添加标记
   * @param menuItemDefinition
   */
  SemiAutoTable.prototype.renderButtonTag = function (menus) {

    var _self = this;
    $.each(menus, function (index, menuItemDefinition) {
      var menuItems;
      if (menuItemDefinition instanceof Array) {
        menuItems = menuItemDefinition;
      } else {
        menuItems = [menuItemDefinition];
      }
      $.each(menuItems, function (index, menu) {
        if (!menu.tag || !menu.tag.trim()) {
          return;
        }
        if (!menu.id) {
          return;
        }
        var btnGroup = _self.$menuBar.find('[data-id=' + menu.id + ']');
        btnGroup.append('<div class="btn-group-tag" data-tag="' + menu.tag + '">'
            + menu.tag.substring(0, 2) + '</div>');
      });

    });
  }

  /**
   * 添加菜单
   * @param menuItemDefinition
   */
  SemiAutoTable.prototype.addMenuItem = function (menuItemDefinition) {
    return this._addMenuItem(this.$menuBar, menuItemDefinition);
  }

  /**
   * 添加菜单 到指定位置
   * @param $container
   * @param menuItemDefinition
   * @private
   */
  SemiAutoTable.prototype._addMenuItem = function ($container, menuItemDefinition) {

    var self = this;
    var $btnGroup = this.appendButtonGroup($container);
    if ($.isArray(menuItemDefinition)) {
      $.each(menuItemDefinition, function (index, groupItemDef) {
        if (groupItemDef.dropdowns && groupItemDef.dropdowns.length == 0) {
          return;
        }
        self.appendButtonItem($btnGroup, groupItemDef);
      });
    } else {
      this.appendButtonItem($btnGroup, menuItemDefinition);
    }
    return $btnGroup;

  }

  SemiAutoTable.prototype.appendButtonGroup = function ($container) {

    var $btnGroup = $('<div class="btn-group" role="group"></div>');
    $btnGroup.addClass(this.options.btnGroupSize);
    $btnGroup.appendTo($container);
    return $btnGroup;

  }

  SemiAutoTable.prototype.appendButtonItem = function ($btnGroup, buttonDefinition) {

    var self = this;
    var id = buttonDefinition.id;
    var title = buttonDefinition.title;
    var btnClass = buttonDefinition.btnClass;
    var callback = buttonDefinition.callback;
    var icon = buttonDefinition.icon;
    var dropdowns = buttonDefinition.dropdowns;
    var tooltip = buttonDefinition.tooltip;
    var keepOpen = buttonDefinition.keepOpen;
    var checkbox = buttonDefinition.checkbox;
    var enabled = buttonDefinition.enabled;

    var buttonOption = {
      id: id,
      title: title,
      icon: icon,
      callback: callback,
      btnClass: btnClass,
      tooltip: tooltip,
      checkbox: checkbox,
      enabled: enabled
    };

    if (!dropdowns || dropdowns.length == 0) {

      this.appendButton($btnGroup, buttonOption);

    } else {

      // handle btn group nesting http://getbootstrap.com/components/#btn-groups-nested
      $btnGroup = this.appendButtonGroup($btnGroup);
      var $dropdown;
      if (!callback) {
        // 普通下拉菜单
        buttonOption = $.extend({}, buttonOption, {keepOpen: keepOpen});
        $dropdown = this.appendDropdown($btnGroup, buttonOption, dropdowns.length);
      } else {
        // 分离式下拉菜单
        this.appendButton($btnGroup, buttonOption);
        $dropdown = this.appendDropdown($btnGroup, {
          btnClass: btnClass,
          keepOpen: keepOpen
        }, dropdowns.length);
      }

      $.each(dropdowns, function (index, dropdown) {
        if (typeof dropdown == 'string') {
          if (dropdown == 'divider') {
            self.appendDropdownDivider($dropdown)
          } else {
            throw "Unrecgonized menu item: " + dropdown;
          }
        } else {
          // if (title && title.indexOf('<input type="checkbox"') == -1) {
          //   self.appendDropdownItemByDropdown($dropdown, dropdown, dropdowns.length);
          // } else {

          if (dropdowns.length <= 9) {
            self.appendDropdownItemByDropdown($dropdown, dropdown, dropdowns.length);
          } else {

            if (index % 3 == 0) {
              var $tr = $('<tr></tr>');
              $dropdown.find("tbody").append($tr);
              self.appendDropdownItemByDropdown($tr, dropdown, dropdowns.length);
            } else {
              self.appendDropdownItemByDropdown($dropdown.find("tr").eq(-1), dropdown, dropdowns.length);
            }
          }
        }
        // }
      });

    }

  }

  SemiAutoTable.prototype.appendDropdownItemByDropdown = function ($dropdown, dropdown, dropdownLen) {

    var self = this;
    self.appendDropdownItem($dropdown, {
      title: dropdown.title,
      callback: dropdown.callback,
      icon: dropdown.icon
    }, dropdownLen);

  }

  SemiAutoTable.prototype.appendButton = function ($btnGroup, option) {

    var self = this;
    var id = option.id;
    var title = option.title;
    var callback = option.callback;
    var icon = option.icon;
    var btnClass = option.btnClass || this.options.btnClass;
    var tooltip = option.tooltip;
    var checkbox = option.checkbox;
    var enabled = option.enabled;

    var $btn = $('<button type="button" data-id=' + id + '></button>');
    $btn.addClass('btn');
    $btn.addClass(btnClass);

    if (tooltip && tooltip.length != 0) {
      $btn.attr('data-toggle', 'tooltip');
      $btn.attr('title', tooltip);
    }
    if (title && title.length != 0) {
      $btn.text(title);
    }
    if (icon && icon.length != 0) {
      $btn.prepend('<i class="' + icon + ' title-icon"></i>');
    }
    if (checkbox) {
      $btn.prepend("<input type='checkbox' style='margin:0;padding:0;'/>")
    }
    if (enabled === false) {
      $btn.attr("disabled", "disabled");
    }


    $btn.appendTo($btnGroup);
    if (callback) {
      $btn.on('click', function (event) {
        if (!($(event.target).is(':checkbox') || $(event.target).is(':radio'))) {
          event.preventDefault();
        }
        callback(event);
      });
    } else {
      $btn.on('click', function (event) {
        if ($(event.target).is(':checkbox') || $(event.target).is(':radio')) {
          return;
        }
        event.preventDefault();
      });
    }
    return $btn;

  }

  SemiAutoTable.prototype.appendDropdown = function ($btnGroup, option, dropdownLen) {

    var title = option.title;
    var btnClass = option.btnClass || this.options.btnClass;
    var icon = option.icon;
    var tooltip = option.tooltip;
    var keepOpen = option.keepOpen || false;
    var checkbox = option.checkbox;


    var $btn = $('<button type="button" class="dropdown-toggle" data-toggle="dropdown" aria-expanded="false"></button>');
    $btn.addClass('btn');
    $btn.addClass(btnClass);

    if (tooltip && tooltip.length != 0) {
      $btn.attr('title', tooltip);
      $btn.tooltip({container: 'body'});
    }
    if (title && title.length != 0) {
      $btn.text(title);
    }
    if (icon && icon.length != 0) {
      $btn.prepend('<i class="' + icon + ' title-icon"></i>');
    }
    if (checkbox) {
      $btn.prepend("<input type='checkbox' style='margin:0;padding:0;'/>")
    }

    $btn.appendTo($btnGroup);

    var $icon = $('<i class="fa fa-caret-down"></i>');
    $icon.appendTo($btn);

    var $dropdown;
    // if (title && title.length != 0) {
    //   $dropdown = $('<ul class="dropdown-menu" role="menu"></ul>');
    // } else {
    if (dropdownLen <= 9) {
      $dropdown = $('<ul class="dropdown-menu" role="menu"></ul>');
    } else {
      $dropdown = $('<table class="dropdown-menu" role="menu"><tbody></tbody></table>');
    }
    // }
    $dropdown.appendTo($btnGroup);

    if (keepOpen) {
      $dropdown.on("click", function (e) {
        e.stopPropagation();
      });
    }
    return $dropdown;

  }


  SemiAutoTable.prototype.appendDropdownItem = function ($dropdown, option, dropdownLen) {

    var self = this;
    var title = option.title;
    var callback = option.callback;
    var icon = option.icon;

    var $liOrTd;
    if (title && title.indexOf('<input type="checkbox"') == -1) {
      $liOrTd = $('<li></li>');
    } else {
      if (dropdownLen <= 9) {
        $liOrTd = $('<li></li>');
      } else {
        $liOrTd = $('<td></td>');
      }
    }
    $liOrTd.appendTo($dropdown);

    var $anchor = $('<a href="#"></a>');

    if (title && title.length != 0) {
      $anchor.html(title);
    }
    if (icon && icon.length != 0) {
      $anchor.prepend('<i class="' + icon + ' title-icon"></i>');
    }

    if (callback) {
      $anchor.on('click', function (event) {
        if (!($(event.target).is(':checkbox') || $(event.target).is(':radio'))) {
          event.preventDefault();
        }
        callback(event);
      });
    } else {
      $anchor.on('click', function (event) {
        if ($(event.target).is(':checkbox') || $(event.target).is(':radio')) {
          return;
        }
        event.preventDefault();
      });
    }

    $anchor.appendTo($liOrTd);

  }

  SemiAutoTable.prototype.appendDropdownDivider = function ($dropdown) {

    var $li = $('<li class="divider"></li>');
    $li.appendTo($dropdown);

  }

  /**
   * 初始化排序
   */
  SemiAutoTable.prototype.initSortBy = function () {

    this.updateSortBy(this.options.sortOption);

  };

  /**
   * 更新排序
   * @param sortOption
   * {
   *     'sortName': 'sortStatus'
   * }
   */
  SemiAutoTable.prototype.updateSortBy = function (sortOption) {

    if (this.sortObject) {
      delete this.sortObject;
    }
    if (this.$sortItems) {
      // 清理原来的东西
      this.$sortItems.children('i').remove();
      this.$sortItems.off('click');
      delete this.$sortItems;
    }

    var self = this;
    this.options.sortOption = sortOption;
    var sortObject = $.extend({}, sortOption);
    this.sortObject = sortObject;

    this.$sortItems = this.options.fixedHeader.enabled ? $('[data-sort-by]') : this.$table.find('[data-sort-by]');
    this.$sortItems.addClass('semi-auto-table-sorter');

    // 初始化tooltip
    this.$sortItems.each(function (index, ele) {

      var $anchor = $(ele);

      $anchor.tooltip({
        title: function () {
          var $this = $(this);
          if ($this.data('sort') == 'asc') {
            return $.fn.semiAutoTable.locales[self.options.locale].sort_asc;
          } else if ($this.data('sort') == 'desc') {
            return $.fn.semiAutoTable.locales[self.options.locale].sort_desc;
          } else {
            return $.fn.semiAutoTable.locales[self.options.locale].sort_none;
          }
        },
        container: 'body'
      });

    });

    // 初始化点击事件
    this.$sortItems.each(function (index, ele) {

      var $anchor = $(ele);

      $anchor.on('click', function (event) {

        event.preventDefault();

        $anchor.tooltip('hide');

        var by = $anchor.data('sort-by');
        var dir = $anchor.data('sort');

        var obj = {};
        if (dir == 'none') {
          obj[by] = 'asc';
        } else if (dir == 'asc') {
          obj[by] = 'desc';
        } else if (dir == 'desc') {
          obj[by] = 'none';
        }

        self.triggerSortChangeEvent(obj);

      });

    });

    // 初始化图标
    this.$sortItems.each(function (index, ele) {

      var $anchor = $(ele),
          by = $anchor.data('sort-by'),
          dir = sortObject[by] ? sortObject[by] : 'none';
      ;

      $anchor.data('sort', dir);
      if ('asc' == dir) {
        $anchor.append("<i class='fa fa-sort-asc' />");
      } else if ('desc' == dir) {
        $anchor.append("<i class='fa fa-sort-desc' />");
      } else {
        $anchor.append("<i class='fa fa-sort' />");
      }

    });

  }

  /**
   * 获得当前的排序对象
   */
  SemiAutoTable.prototype.getSortObject = function () {
    return $.extend({}, this.sortObject);
  }

  /**
   * 初始化分页
   * @param pageOption
   */
  SemiAutoTable.prototype.initPaginator = function () {

    this.updatePaginator(this.options.pageOption);

  };

  /**
   * 更新分页
   * @param option 可以是不完整参数，完整参数的例子
   * {
   *  show: true,
   *  rowsPerPageOptions: '20,50,100,200,500,1000',
   *  currentPage: null,
   *  rowsPerPage: null,
   *  totalPages: null,
   *  totalRows: null
   * }
   */
  SemiAutoTable.prototype.updatePaginator = function (option) {

    if (this.pageObject) {
      delete this.pageObject;
    }
    if (!option) {
      this.$paginator.empty();
      return;
    }

    this.options.pageOption = $.extend({}, $.fn.semiAutoTable.defaults.pageOption, option);

    var pageOption = this.options.pageOption;

    if (pageOption.currentPage == null) {
      throw 'pageOption.currentPage is null';
    }
    if (pageOption.totalPages == null) {
      throw 'pageOption.totalPages is null';
    }
    if (pageOption.totalRows == null) {
      throw 'pageOption.totalRows is null';
    }
    if (!pageOption.rowsPerPageOptions || pageOption.rowsPerPageOptions.length == 0) {
      throw 'pageOption.rowsPerPageOptions is null or empty';
    }

    pageOption._rowsPerPageOptions = pageOption.rowsPerPageOptions.split(',');
    pageOption.rowsPerPage = pageOption.rowsPerPage || pageOption._rowsPerPageOptions[0];

    this.pageObject = {
      currentPage: pageOption.currentPage,
      totalPages: pageOption.totalPages,
      totalRows: pageOption.totalRows,
      rowsPerPage: pageOption.rowsPerPage || pageOption._rowsPerPageOptions[0]
    };

    // this.initPageInfo(pageOption);
    this.initPageJumper(pageOption);
    this.initPages(pageOption);
    this.initPageSize(pageOption);
    // this.initPageJumper(pageOption);

  }

  /**
   * 初始化分页信息
   * @param pageOption
   */
  SemiAutoTable.prototype.initPageInfo = function (pageOption) {

    if (this.$pageInfo) {
      this.$pageInfo.find('[data-toggle="tooltip"]').tooltip('destroy');
      this.$pageInfo.off('click');
      this.$pageInfo.remove();
      delete this.$pageInfo;
    }

    if (pageOption.totalRows == 0) {
      return;
    }

    var self = this;
    var currentPage = pageOption.currentPage;
    var rowsPerPage = pageOption.rowsPerPage;
    var totalRows = pageOption.totalRows;

    var rowStart = (currentPage - 1) * rowsPerPage + 1;
    var rowEnd = rowStart + rowsPerPage - 1 > totalRows ? totalRows : rowStart + rowsPerPage - 1;

    var hasPageTooltip = this.options.pageTooltip;
    this.$pageInfo = this._addMenuItem(this.$paginator, {

      title: rowStart + '-' + rowEnd + ' of ' + totalRows,
      tooltip: hasPageTooltip ? format($.fn.semiAutoTable.locales[this.options.locale].current_page, currentPage) : "",
      callback: function (event) {

        self.$pageInfo.hide();
        self.$pages.hide();
        self.$pageSize.selectpicker('show');
        self.$pageJumper.show();
        self.$pageGo.show();

      }

    });

    this.$pageInfo.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });

  }

  /**
   * 初始化页长
   * @param pageOption
   */
  SemiAutoTable.prototype.initPageSize = function (pageOption) {

    if (this.$pageSize) {
      this.$pageSize.selectpicker('destroy');
      this.$pageSize.off('change');
      this.$pageSize.remove();
      delete this.$pageSize;
    }

    if (pageOption.totalRows == 0) {
      return;
    }

    var self = this;
    var rowsPerPage = pageOption.rowsPerPage;
    var rowsPerPageOptions = pageOption._rowsPerPageOptions;

    var $pageSize = $('<select></select>');
    this.$pageSize = $pageSize;

    $pageSize.addClass('rows-per-page');
    $pageSize.addClass(this.options.btnGroupSize);
    $.each(rowsPerPageOptions, function (index, num) {

      var $option = $('<option></option>');
      $option.attr('value', num);
      $option.text(format($.fn.semiAutoTable.locales[self.options.locale].page_size, num));
      $option.appendTo($pageSize);

      if (num == rowsPerPage) {
        $option.prop('selected', 'selected');
      }

    });

    $pageSize.on('change', function () {

      var val = $(this).val();
      var rowsPerPage = parseInt(val, 10);
      var totalPages = Math.ceil(self.pageObject.totalRows / rowsPerPage);
      var currentPage = self.pageObject.currentPage > totalPages ? totalPages : self.pageObject.currentPage;

      self.pageObject.rowsPerPage = rowsPerPage;
      self.pageObject.totalPages = totalPages;
      self.pageObject.currentPage = currentPage;
      // self.$table.triggerHandler('pageSizeChange');
      self.triggerPageChangeEvent({})

    })

    $pageSize.appendTo(this.$paginator);

    $pageSize.selectpicker();
    // $pageSize.selectpicker('hide');

  }

  /**
   * 初始化翻页
   * @param pageOption
   */
  SemiAutoTable.prototype.initPages = function (pageOption) {

    if (this.$pages) {
      this.$pages.find('[data-toggle="tooltip"]').tooltip('destroy');
      this.$pages.off('click');
      this.$pages.remove();
      delete this.$pages;
    }

    if (pageOption.totalRows == 0) {
      return;
    }

    var self = this;
    var currentPage = pageOption.currentPage;
    var totalPages = pageOption.totalPages;

    var hasTooltip = this.options.pageTooltip;

    var pages = [];
    // if (currentPage != 1) {
    // pages.push({
    //   icon: 'fa fa-angle-double-left',
    //   tooltip: hasTooltip ? $.fn.semiAutoTable.locales[this.options.locale].first_page : "",
    //   callback: function () {
    //     self.triggerPageChangeEvent({
    //       currentPage: 1
    //     });
    //   }
    // });
    pages.push({
      icon: 'fa fa-angle-left',
      tooltip: hasTooltip ? format($.fn.semiAutoTable.locales[this.options.locale].prev_page, currentPage - 1) : "",
      enabled: currentPage != 1 ? true : false,
      callback: function () {
        self.triggerPageChangeEvent({
          currentPage: self.pageObject.currentPage - 1
        });
      }
    });
    // }

    // if (currentPage != totalPages) {
    pages.push({
      icon: 'fa fa-angle-right',
      tooltip: hasTooltip ? format($.fn.semiAutoTable.locales[this.options.locale].next_page, currentPage + 1) : "",
      enabled: currentPage != totalPages ? true : false,
      callback: function () {
        self.triggerPageChangeEvent({
              currentPage: self.pageObject.currentPage + 1
            }
        );
      }
    });
    // pages.push({
    //   icon: 'fa fa-angle-double-right',
    //   tooltip: hasTooltip ? $.fn.semiAutoTable.locales[this.options.locale].last_page : "",
    //   callback: function () {
    //     self.triggerPageChangeEvent({
    //       currentPage: totalPages
    //     });
    //   }
    // })
    // }

    this.$pages = this._addMenuItem(this.$paginator, pages);
    this.$pages.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });

  };

  /**
   * 初始化跳页
   * @param pageOption
   */
  SemiAutoTable.prototype.initPageJumper = function (pageOption) {
    if (this.$pageJumper) {
      this.$pageJumper.selectpicker('destroy');
      this.$pageSize.off('change');
      this.$pageJumper.remove();
      delete this.$pageJumper;
    }

    if (pageOption.totalRows == 0) {
      return;
    }

    var self = this;
    var currentPage = pageOption.currentPage;
    var totalPages = pageOption.totalPages;

    var $pageJumper = $("<select></select>")
    this.$pageJumper = $pageJumper;

    $pageJumper.addClass('rows-per-page');
    $pageJumper.addClass(this.options.btnGroupSize);

    $.each(_.range(1, totalPages+1), function (index, num) {
      var $option = $('<option></option>');
      $option.attr('value', num);
      $option.text(num + '/' + totalPages);
      $option.appendTo($pageJumper);

      if (num == currentPage) {
        $option.prop('selected', 'selected');
      }
    });

    $pageJumper.on('change', function () {
      var val = $(this).val();
      var selectedPage = parseInt(val, 10);
      self.pageObject.currentPage = selectedPage;
      // self.$table.triggerHandler('pageSizeChange');
      self.triggerPageChangeEvent({});
    });

    $pageJumper.appendTo(this.$paginator);

    $pageJumper.selectpicker();
  };
  // SemiAutoTable.prototype.initPageJumper = function (pageOption) {
  //
  //   if (this.$pageJumper) {
  //     this.$pageJumper.remove();
  //     delete this.$pageJumper;
  //   }
  //
  //   if (this.$pageGo) {
  //     this.$pageGo.remove();
  //     delete this.$pageGo;
  //   }
  //
  //   if (pageOption.totalRows == 0) {
  //     return;
  //   }
  //
  //   var self = this;
  //   var currentPage = pageOption.currentPage;
  //   var totalPages = pageOption.totalPages;
  //
  //   var $pageJumper = this.appendButtonGroup(this.$paginator);
  //   $pageJumper.addClass('page-jump');
  //
  //   var $pageNo = $('<input type="text" value="' + currentPage + '"/>');
  //   $pageNo.appendTo($pageJumper);
  //   $pageJumper.append('<span> / ' + totalPages + '</span>');
  //
  //   $pageNo.data('prevVal', currentPage);
  //   $pageNo.keydown(function (event) {
  //
  //     if (event.keyCode == 13) {
  //       var val = $(this).val();
  //       event.preventDefault();
  //       event.stopImmediatePropagation();
  //       self.triggerPageChangeEvent({
  //         currentPage: parseInt(val, 10)
  //       });
  //     }
  //
  //   }).keyup(function () {
  //
  //     var $input = $(this);
  //     var prevVal = $input.data('prevVal') || '';
  //     var val = $input.val();
  //     if (val == '') {
  //       return;
  //     }
  //     if (!/^[0-9]*[1-9][0-9]*$/.test(val)) {
  //       $input.val(prevVal);
  //       return;
  //     }
  //
  //     var pageNo = parseInt(val, 10);
  //     if (pageNo > self.getPageObject().totalPages) {
  //       $input.val(prevVal);
  //       return;
  //     }
  //
  //     $input.data('prevVal', pageNo);
  //     self.pageObject.currentPage = parseInt(val, 10);
  //
  //   });
  //
  //   this.$table.off('pageSizeChange');
  //   this.$table.on('pageSizeChange', function () {
  //     $pageNo.val(self.pageObject.currentPage);
  //     $pageNo.data('prevVal', self.pageObject.currentPage);
  //     $pageJumper.children('span').text(' / ' + self.pageObject.totalPages);
  //   });
  //   $pageJumper.hide();
  //
  //   var $pageGo = this._addMenuItem(this.$paginator, {
  //     title: 'Go',
  //     callback: function () {
  //       self.triggerPageChangeEvent({});
  //     }
  //   })
  //   $pageGo.hide();
  //
  //   this.$pageGo = $pageGo;
  //   this.$pageJumper = $pageJumper;
  // }

  /**
   * 获得当前的分页对象
   */
  SemiAutoTable.prototype.getPageObject = function () {
    return $.extend({}, this.pageObject);
  }

  /**
   * 获得用户选中的row.id数组
   */
  SemiAutoTable.prototype.getSelectedRows = function () {

    var res = [];
    if (!this.$rowIdInputList) {
      return res;
    }
    $.each(this.$rowIdInputList, function (index, inputEle) {

      if ($(inputEle).prop('checked')) {
        res.push(inputEle.value);
      }

    });
    return res;

  }

  /**
   * 获取选中条数并显示
   */
  SemiAutoTable.prototype.selectedRowCount = function () {
    if (this.options.selectedNum && this.$paginator.find(".selected-items-num").length == 0) {
      this.$paginator.prepend('<div class="pull-left text-primary selected-items">已选<span class="selected-items-num">0</span>条</div>');
    }
    this.$paginator.find(".selected-items-num").text(this.getSelectedRows().length);
  }

  /**
   * 触发分页变动事件
   */
  SemiAutoTable.prototype.triggerPageChangeEvent = function (pageObject) {

    this.$table.triggerHandler('pageChange', $.extend({}, this.pageObject, pageObject));

  }

  /**
   * 触发排序变动事件
   */
  SemiAutoTable.prototype.triggerSortChangeEvent = function (sortObject) {

    this.$table.triggerHandler('sortChange', sortObject);

  }

  /**
   * 获得semiAutoTable对象
   * @returns {SemiAutoTable}
   */
  SemiAutoTable.prototype.get = function () {
    return this;
  }

  /**
   * destroy semiAutoTable
   */
  SemiAutoTable.prototype.destroy = function () {

    if (this.$sortItems) {
      this.$sortItems.off('click');
      this.$sortItems.find('i.fa').remove();
      this.$sortItems.removeClass('semi-auto-table-sorter');
    }

    this.$table.unbind('pageChange');
    this.$table.unbind('sortChange');

    this.$table.removeClass(this.options.tableClass);
    this.$table.removeData('semiAutoTable');
    this.$container.after(this.$table);
    this.$container.remove();

  }
  /**
   * 增加一行,
   * 使用dataTable的情况下，传入的参数是对象Object，属性和原有的相同
   *      dataObj={"name":"wang", "id":"3",...}
   * 不使用dataTable的情况下，传入的参数是数组，可以做渲染
   *      dataObj=["<input name="row.id" type="checkbox" value="4"/>",2,3,4,5], 第一列的name必须和原有的一样。
   * @param dataObj
   */
  SemiAutoTable.prototype.addRow = function (dataObj) {
    if (this.options.useDataTable) {
      var dataTable = this.$table.DataTable();
      dataTable.row.add(dataObj).draw();
    } else {
      var originTdLength = this.$table.find('tbody tr').eq(0).find('td').length;
      var $tr = $('<tr role="row"></tr>');

      for (var i = 0; i < originTdLength; i++) {
        $tr.append('<td>' + dataObj[i] + '</td>')
      }
      this.$table.find('tbody').append($tr);
      var $addTr = this.$table.find('tr:last');

      this.bindRowsAndAddRowClick(this.options.rowOption, $addTr);
    }

  }

  SemiAutoTable.prototype.bindRowsAndAddRowClick = function (option, $rows) {

    this.options.rowOption = $.extend({}, this.options.rowOption, option);

    var self = this;
    var rowOption = this.options.rowOption;
    var selectColor = this.options.selectColor;

    var type = rowOption.type;
    var inputName = rowOption.inputName;

    this.$rows = $rows;
    if (type == 'checkbox') {
      this.$rowIdInputList = this.$table.find(':checkbox[name="' + inputName + '"]');
      this.$rows.unbind('click').on('click', function (event) {
        if ($(this).find(':checkbox[name="' + inputName + '"]').is(':checked')) {
          $(this).addClass(selectColor);
        } else {
          $(this).removeClass(selectColor);
        }

        if ($(event.target).is(':checkbox')) {
          self.selectedRowCount();
          return;
        }

        var $row = $(event.currentTarget);
        var $input = $row.find(':checkbox[name="' + inputName + '"]');
        if ($input.length == 0) {
          return;
        }
        if ($(event.target).is('label') && $(event.target).attr('for') == $input.attr('id')) {
          return;
        }

        if ($input.is(':checked')) {
          $(this).removeClass(selectColor);
        } else {
          $(this).addClass(selectColor);
        }

        $input.prop('checked', !$input.prop('checked')).trigger('change');
        self.selectedRowCount();

      });

    } else if (type == 'radio') {
      this.$rowIdInputList = this.$table.find(':radio[name="' + inputName + '"]');

      this.$rows.unbind('click').on('click', function (event) {

        if ($(this).find(':radio[name="' + inputName + '"]').is(':checked')) {
          $(this).addClass(selectColor).siblings().removeClass("selectColor");
        } else {
          $(this).removeClass(selectColor);
        }

        if ($(event.target).is(':radio')) {
          self.selectedRowCount();
          return;
        }
        var $row = $(event.currentTarget);
        var $input = $row.find(':radio[name="' + inputName + '"]');
        if ($input.length == 0) {
          return;
        }
        if ($(event.target).is('label') && $(event.target).attr('for') == $input.attr('id')) {
          $.each(self.$rowIdInputList, function (index, input) {
            var $input = $(input);
            $input.prop('checked', false).trigger('change');
          });
          return;
        }

        if ($input.is(':checked')) {
          $(this).removeClass(selectColor);
        } else {
          $(this).addClass(selectColor).siblings().removeClass("selectColor");

        }

        var checked = !$input.prop('checked');

        $.each(self.$rowIdInputList, function (index, input) {
          var $input = $(input);
          $input.prop('checked', false).trigger('change');
        });

        $input.prop('checked', checked).trigger('change');
        self.selectedRowCount();

      });
    }
  }
  // SemiAutoTable PLUGIN DEFINITION
  // =======================

  function Plugin(option) {

    var args = arguments;
    var ret;
    this.each(function () {
      var $this = $(this);
      var data = $this.data('semiAutoTable');

      if (!data) {
        var options = $.extend(true, {}, $.fn.semiAutoTable.defaults, typeof option == 'object' && option);
        $this.data('semiAutoTable', (data = new SemiAutoTable(this, options)))
      }

      if (typeof option == 'string') {
        if (args.length == 1) {
          var _ret = data[option].call(data);
          if (typeof _ret != 'undefined') {
            ret = _ret;
          }
        } else {
          var _ret = data[option].apply(data, Array.prototype.slice.call(args, 1));
          if (typeof _ret != 'undefined') {
            ret = _ret;
          }
        }
      }
    })

    if (typeof ret != 'undefined') {
      return ret;
    }
    return this;

  }

  var old = $.fn.semiAutoTable

  $.fn.semiAutoTable = Plugin
  $.fn.semiAutoTable.Constructor = SemiAutoTable
  $.fn.semiAutoTable.defaults = {

    locale: 'zh-CN',

    containerClass: '',

    btnGroupSize: 'btn-group-sm',
    btnClass: "btn-default",

    toolbarClass: "row semi-auto-table-toolbar",

    menuBarWrapperClass: "col-sm-12 col-md-8 semi-auto-table-menubar",
    menuBarClass: "btn-toolbar",

    paginatorWrapperClass: "col-sm-12 col-md-4 semi-auto-table-paginator",
    paginatorClass: "btn-toolbar pull-right",

    // tableWrapperClass: "table-responsive semi-auto-table-data",
    tableWrapperClass: "semi-auto-table-data",
    tableClass: "table table-striped table-condensed table-hover",

    rowOption: {
      showSelectAll: true,
      type: 'checkbox',
      inputName: "row.id",
      rowSelector: "> tbody > tr"
    },

    columnOption: {
      showColumnSelect: false,
      stickyColumns: [],
      hideColumns: []
    },

    menus: [],

    sortOption: {},

    pageOption: {

      rowsPerPageOptions: '20,50,100,200,500,1000',
      currentPage: null,
      rowsPerPage: null,
      totalPages: null,
      totalRows: null

    },

    //是否显示选中条数
    selectedNum: true,

    //分页按钮是否显示tooltip
    pageTooltip: false,

    // 设置选中行的背景颜色，仅支持Bootstrap定义的五种颜色 success、info、active、warning、danger
    // 默认为info
    selectColor: 'info',


    //是否使用dataTable, 如果为false, 下面的colResizable, colOrderArrangable等配置均无效
    useDataTable: true,

    //是否可拉伸
    colResizable: false,

    //是否可移动列的位置
    colOrderArrangable: false,

    //是否记录表状态
    saveStatus: {
      enabled: false,
      key: ""
    },

    //表格json数据
    data: [],

    //表格数据格式，对应data, 不能为空数组
    columns: null,

    //dataTable用ajax获取数据
    ajax: null,

    //画完table需要调用的函数，用户自定义
    completeTableCallback: function () {
    },

    //重新渲染表格的回调函数
    reDrawCallback: function () {
    },

    //表头是否固定
    fixedHeader: {
      enabled: false,
      scrollY: 0
    },

    //表格是否可以横纵向拉伸
    overflow: true

  }

  $.fn.semiAutoTable.locales = {}

  // SemiAutoTable NO CONFLICT
  // =================
  $.fn.semiAutoTable.noConflict = function () {

    $.fn.semiAutoTable = old;
    return this;

  }

}(jQuery);
