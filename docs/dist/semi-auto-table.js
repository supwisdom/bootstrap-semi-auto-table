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

  // SemiAutoTable CLASS DEFINITION
  // ======================

  var SemiAutoTable = function (element, options) {

    this.options = options;

    this.$table = $(element);

    this.initLayout();
    this.initRowButton();
    this.initMenuItems();
    this.initPaginator();
    this.initSortBy();

  }

  SemiAutoTable.VERSION = '0.0.1';


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

    var type = rowOption.type;
    var showSelectAll = rowOption.showSelectAll;
    var inputName = rowOption.inputName;
    var rowSelector = rowOption.rowSelector;

    if (type == 'checkbox') {

      this.$rowIdInputList = this.$table.find(':checkbox[name="' + inputName + '"]');

      if (showSelectAll) {

        var allChecked = false;

        this.$selectAll = this.addMenuItem({

          title: $.fn.semiAutoTable.locales[this.options.locale].select_all,

          callback: function () {
            self.$rowIdInputList.prop('checked', !allChecked);
            allChecked = !allChecked;
          },

          dropdowns: [
            {
              title: $.fn.semiAutoTable.locales[this.options.locale].select_inverse,
              callback: function () {

                $.each(self.$rowIdInputList, function (index, input) {
                  var $input = $(input);
                  $input.prop('checked', !$input.prop('checked'));
                });
                allChecked = false;

              }
            }
          ]

        });

        this.$selectAll.addClass('.select-all-btn');
        this.$selectAll.prependTo(this.$menuBar);

      }

      this.$rows = this.$table.find(rowSelector);
      this.$rows.on('click', function (event) {

        if ($(event.target).is(':checkbox')) {
          return;
        }

        var $row = $(event.currentTarget);
        var $input = $row.find(':checkbox[name="' + inputName + '"]');
        if ($(event.target).is('label') && $(event.target).attr('for') == $input.attr('id')) {
          return;
        }

        $input.prop('checked', !$input.prop('checked'));

      });

    }

    else if (type == 'radio') {

      this.$rowIdInputList = this.$table.find(':radio[name="' + inputName + '"]');

      this.$rows = this.$table.find(rowSelector);
      this.$rows.on('click', function (event) {

        if ($(event.target).is(':radio')) {
          return;
        }
        var $row = $(event.currentTarget);
        var $input = $row.find(':radio[name="' + inputName + '"]');
        if ($(event.target).is('label') && $(event.target).attr('for') == $input.attr('id')) {
          $.each(self.$rowIdInputList, function (index, input) {
            var $input = $(input);
            $input.prop('checked', false);
          });
          return;
        }
        var checked = !$input.prop('checked');

        $.each(self.$rowIdInputList, function (index, input) {
          var $input = $(input);
          $input.prop('checked', false);
        });

        $input.prop('checked', checked);

      });

    } else {

      throw 'Unrecgonized rowOption.type';

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

    if (this.$selectAll) {
      this.$menuBar.children().not(this.$selectAll).find('[data-toggle="dropdown"]').tooltip('destroy');
      this.$menuBar.children().not(this.$selectAll).find('[data-toggle="tooltip"]').tooltip('destroy');
      this.$menuBar.children().not(this.$selectAll).remove();
    } else {
      this.$menuBar.find('[data-toggle="dropdown"]').tooltip('destroy');
      this.$menuBar.find('[data-toggle="tooltip"]').tooltip('destroy');
      this.$menuBar.children().remove();
    }

    this.options.menus = option;
    var menus = this.options.menus;

    var self = this;

    $.each(menus, function (index, menuItemDefinition) {

      self.addMenuItem(menuItemDefinition);

    });

    this.$menuBar.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
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
    var title = buttonDefinition.title;
    var btnClass = buttonDefinition.btnClass;
    var callback = buttonDefinition.callback;
    var icon = buttonDefinition.icon;
    var dropdowns = buttonDefinition.dropdowns;
    var tooltip = buttonDefinition.tooltip;

    var buttonOption = {
      title: title,
      icon: icon,
      callback: callback,
      btnClass: btnClass,
      tooltip: tooltip
    };

    if (!dropdowns || dropdowns.length == 0) {

      this.appendButton($btnGroup, buttonOption);

    } else {

      // handle btn group nesting http://getbootstrap.com/components/#btn-groups-nested
      $btnGroup = this.appendButtonGroup($btnGroup);
      var $dropdown;
      if (!callback) {
        // 普通下拉菜单
        $dropdown = this.appendDropdown($btnGroup, buttonOption);
      } else {
        // 分离式下拉菜单
        this.appendButton($btnGroup, buttonOption);
        $dropdown = this.appendDropdown($btnGroup, {
          btnClass: btnClass
        });
      }

      $.each(dropdowns, function (index, dropdown) {
        if (typeof dropdown == 'string') {
          if (dropdown == 'divider') {
            self.appendDropdownDivider($dropdown)
          } else {
            throw "Unrecgonized menu item: " + dropdown;
          }
        } else {
          self.appendDropdownItem($dropdown, {
            title: dropdown.title,
            callback: dropdown.callback,
            icon: dropdown.icon
          });
        }
      });

    }

  }

  SemiAutoTable.prototype.appendButton = function ($btnGroup, option) {

    var self = this;
    var title = option.title;
    var callback = option.callback;
    var icon = option.icon;
    var btnClass = option.btnClass || this.options.btnClass;
    var tooltip = option.tooltip;

    var $btn = $('<button type="button"></button>');
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

    $btn.appendTo($btnGroup);
    if (callback) {
      $btn.on('click', function (event) {
        event.preventDefault();
        callback(event);
      });
    } else {
      $btn.on('click', function (event) {
        event.preventDefault();
      });
    }
    return $btn;

  }

  SemiAutoTable.prototype.appendDropdown = function ($btnGroup, option) {

    var title = option.title;
    var btnClass = option.btnClass || this.options.btnClass;
    var icon = option.icon;
    var tooltip = option.tooltip;

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

    $btn.appendTo($btnGroup);

    var $icon = $('<i class="fa fa-caret-down"></i>');
    $icon.appendTo($btn);

    var $dropdown = $('<ul class="dropdown-menu" role="menu"></ul>');
    $dropdown.appendTo($btnGroup);
    return $dropdown;

  }


  SemiAutoTable.prototype.appendDropdownItem = function ($dropdown, option) {

    var self = this;
    var title = option.title;
    var callback = option.callback;
    var icon = option.icon;

    var $li = $('<li></li>');
    $li.appendTo($dropdown);

    var $anchor = $('<a href="#"></a>');

    if (title && title.length != 0) {
      $anchor.text(title);
    }
    if (icon && icon.length != 0) {
      $anchor.prepend('<i class="' + icon + ' title-icon"></i>');
    }

    if (callback) {
      $anchor.on('click', function (event) {
        event.preventDefault();
        callback(event);
      });
    } else {
      $anchor.on('click', function (event) {
        event.preventDefault();
      });
    }
    $anchor.appendTo($li);

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

    this.$sortItems = this.$table.find('[data-sort-by]');
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

    this.initPageInfo(pageOption);
    this.initPageSize(pageOption);
    this.initPages(pageOption);
    this.initPageJumper(pageOption);

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

    var self = this;
    var currentPage = pageOption.currentPage;
    var rowsPerPage = pageOption.rowsPerPage;
    var totalRows = pageOption.totalRows;

    var rowStart = (currentPage - 1) * rowsPerPage + 1;
    var rowEnd = rowStart + rowsPerPage - 1 > totalRows ? totalRows : rowStart + rowsPerPage - 1;

    this.$pageInfo = this._addMenuItem(this.$paginator, {

      title: rowStart + '-' + rowEnd + ' of ' + totalRows,
      tooltip: format($.fn.semiAutoTable.locales[this.options.locale].current_page, currentPage),
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
      self.$table.triggerHandler('pageSizeChange');

    })

    $pageSize.appendTo(this.$paginator);

    $pageSize.selectpicker();
    $pageSize.selectpicker('hide');

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

    var self = this;
    var currentPage = pageOption.currentPage;
    var totalPages = pageOption.totalPages;

    var pages = [];
    if (currentPage != 1) {
      pages.push({
        icon: 'fa fa-angle-double-left',
        tooltip: $.fn.semiAutoTable.locales[this.options.locale].first_page,
        callback: function () {
          self.triggerPageChangeEvent({
            currentPage: 1
          });
        }
      });
      pages.push({
        icon: 'fa fa-angle-left',
        tooltip: format($.fn.semiAutoTable.locales[this.options.locale].prev_page, currentPage - 1),
        callback: function () {
          self.triggerPageChangeEvent({
            currentPage: self.pageObject.currentPage - 1
          });
        }
      });
    }

    if (currentPage != totalPages) {
      pages.push({
        icon: 'fa fa-angle-right',
        tooltip: format($.fn.semiAutoTable.locales[this.options.locale].prev_page, currentPage + 1),
        callback: function () {
          self.triggerPageChangeEvent({
              currentPage: self.pageObject.currentPage + 1
            }
          );
        }
      });
      pages.push({
        icon: 'fa fa-angle-double-right',
        tooltip: $.fn.semiAutoTable.locales[this.options.locale].last_page,
        callback: function () {
          self.triggerPageChangeEvent({
            currentPage: totalPages
          });
        }
      })
    }

    this.$pages = this._addMenuItem(this.$paginator, pages);
    this.$pages.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });

  }

  /**
   * 初始化跳页
   * @param pageOption
   */
  SemiAutoTable.prototype.initPageJumper = function (pageOption) {

    if (this.$pageJumper) {
      this.$pageJumper.remove();
      delete this.$pageJumper;
    }

    if (this.$pageGo) {
      this.$pageGo.remove();
      delete this.$pageGo;
    }

    var self = this;
    var currentPage = pageOption.currentPage;
    var totalPages = pageOption.totalPages;

    var $pageJumper = this.appendButtonGroup(this.$paginator);
    $pageJumper.addClass('page-jump');

    var $pageNo = $('<input type="text" value="' + currentPage + '"/>');
    $pageNo.appendTo($pageJumper);
    $pageJumper.append('<span> / ' + totalPages + '</span>');

    $pageNo.data('prevVal', currentPage);
    $pageNo.keydown(function (event) {

      if (event.keyCode == 13) {
        var val = $(this).val();
        event.preventDefault();
        event.stopImmediatePropagation();
        self.triggerPageChangeEvent({
          currentPage: parseInt(val, 10)
        });
      }

    }).keyup(function () {

      var $input = $(this);
      var prevVal = $input.data('prevVal') || '';
      var val = $input.val();
      if (val == '') {
        return;
      }
      if (!/^[0-9]*[1-9][0-9]*$/.test(val)) {
        $input.val(prevVal);
        return;
      }

      var pageNo = parseInt(val, 10);
      if (pageNo > self.getPageObject().totalPages) {
        $input.val(prevVal);
        return;
      }

      $input.data('prevVal', pageNo);
      self.pageObject.currentPage = parseInt(val, 10);

    });

    this.$table.off('pageSizeChange');
    this.$table.on('pageSizeChange', function () {
      $pageNo.val(self.pageObject.currentPage);
      $pageNo.data('prevVal', self.pageObject.currentPage);
      $pageJumper.children('span').text(' / ' + self.pageObject.totalPages);
    });
    $pageJumper.hide();

    var $pageGo = this._addMenuItem(this.$paginator, {
      title: 'Go',
      callback: function () {
        self.triggerPageChangeEvent({});
      }
    })
    $pageGo.hide();

    this.$pageGo = $pageGo;
    this.$pageJumper = $pageJumper;
  }

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

    this.$sortItems.off('click');
    this.$sortItems.find('i.fa').remove();
    this.$sortItems.removeClass('semi-auto-table-sorter');
    this.$table.removeClass(this.options.tableClass);
    this.$table.removeData('semiAutoTable');
    this.$container.after(this.$table);
    this.$container.remove();

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

    tableWrapperClass: "table-responsive semi-auto-table-data",
    tableClass: "table table-striped table-condensed table-hover",

    rowOption: {
      showSelectAll: true,
      type: 'checkbox',
      inputName: "row.id",
      rowSelector: "> tbody > tr"
    },

    menus: [],

    sortOption: {},

    pageOption: {

      rowsPerPageOptions: '20,50,100,200,500,1000',
      currentPage: null,
      rowsPerPage: null,
      totalPages: null,
      totalRows: null

    }

  }

  $.fn.semiAutoTable.locales = {}

  // SemiAutoTable NO CONFLICT
  // =================
  $.fn.semiAutoTable.noConflict = function () {

    $.fn.semiAutoTable = old;
    return this;

  }

}(jQuery);

+function ($) {

  $.fn.semiAutoTable.locales['en-US'] = {

    select_all: 'All',
    select_inverse: 'Inverse select',

    next_page: 'Next page {0}',
    prev_page: 'Prev page {0}',
    first_page: 'First page',
    last_page: 'Last page',
    current_page: 'Current page {0}',
    page_size: '{0} rows per page',

    sort_asc: 'Ascending',
    sort_desc: 'Descending',
    sort_none: 'Unsorted'

  }

}(jQuery);

+function ($) {

  $.fn.semiAutoTable.locales['zh-CN'] = {

    select_all: '全选',
    select_inverse: '反选',

    next_page: '下页第 {0} 页',
    prev_page: '上页第 {0} 页',
    first_page: '第一页',
    last_page: '最后一页',
    current_page: '当前第 {0} 页',
    page_size: '每页 {0} 条',

    sort_asc: '升序排列',
    sort_desc: '降序排列',
    sort_none: '未排序'

  }

}(jQuery);
