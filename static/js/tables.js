var highlight = false;
var highlightTimerId;
let totalPageCount;

// инициализация всех таблиц на форме
async function initTables() {
    console.log('--- initTables ---')
    disableHighlightElement();

    await $('#content table[init]').each(async function () {
        await initTable(this);
    });

    enableHighlightElement();
}

function prepareData(response) {

    function mapAndAssignValues(source, target, mapping) {
        for (let key in mapping) {
            const value = mapping[key];

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                target[key] = {};
                mapAndAssignValues(source, target[key], mapping[key]);
            } else {
                target[key] = source[value];
            }
        }
    }

    if ("KeyMapping" in response) {
        response.list = [];

        response.data.forEach(element => {
            const item = {};
            mapAndAssignValues(element, item, response.KeyMapping);
            response.list.push({ data: item });
        });
    }

    if ("Имя" in response) {
        response.list.forEach(element => {
            element.data["Имя"] = response["Имя"];
            element.data["ТипСсылки"] = response["ТипСсылки"];
        });
    }
    console.log('response prepareData finish', response);
}

// инициализация таблицы
async function initTable(table) {
    console.log('--- initTable ---')
    console.log('initTable', table);
    const tableJQ = $(table);
    tableJQ.data('isLoading', true);

    createHeaderForTable(tableJQ);

    if ($(table)[0].hasAttribute('sort')) {
        tableJQ.tablesorter();
    }

    // tableJQ.children('tbody').children('.rowData').remove();

    try {
        let param = tableJQ.data('param') || {};
        let id_response = tableJQ.attr('id') + Date.now();
        console.log('param', param)

        NProgress.start();

        await $.ajax({
            url: `${tableJQ.attr('url')}`, type: 'GET', dataType: 'json', data: param, success: async function (response) {
                console.log('initTable response', tableJQ);

                tableJQ.children('tbody').children('.rowData').remove();
                if (!response.error) {

                    totalPageCount = response.totalPages || 100;

                    function mapAndAssignValues(source, target, mapping) {
                        for (let key in mapping) {
                            const value = mapping[key];

                            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                target[key] = {};
                                mapAndAssignValues(source, target[key], mapping[key]);
                            } else {
                                target[key] = source[value];
                            }
                        }
                    }

                    if ("KeyMapping" in response) {
                        response.list = [];

                        response.data.forEach(element => {
                            const item = {};
                            mapAndAssignValues(element, item, response.KeyMapping);
                            response.list.push({ data: item });
                        });
                    }
                    console.log('log response.list', response);

                    if ("Имя" in response) {
                        response.list.forEach(element => {
                            element.data["Имя"] = response["Имя"];
                            element.data["ТипСсылки"] = response["ТипСсылки"];
                        });
                    }
                    console.log('log response.list', response);

                    // if ("RenamedKeys" in response) {
                    //     response.list.forEach(element => {
                    //         response.RenamedKeys.forEach(key => {
                    //             // console.log("element", element, "key", key)
                    //             element.data[key.originalKey] = element.data[key.shortKey];
                    //             // delete element.data[key.shortKey];
                    //             // console.log("element[key.originalKey]", element[key.originalKey])
                    //         })
                    //     })
                    // }

                    console.log('response arter rename', response);
                    tableJQ.data('response', response);
                    callbackFromAttr(table, 'callbackBeforeInitTable', response);

                    // remove attr, save attr
                    console.log('Is attr in table', tableJQ.attr("sort"));
                    const attrSort = tableJQ.attr("sort");
                    tableJQ.removeAttr("sort");
                    console.log('has attr', $(table)[0].hasAttribute('sort'));

                    // response.list.forEach(async (item) => {
                    //     await callbackTable(item);
                    // });

                    response.list.forEach(async (item) => {
                        item.data["skipFilter"] = true;
                    });

                    async function executeAsync() {
                        // Створюємо масив обіцянок для кожного виклику callbackTable
                        const promises = response.list.map(item => {
                            // console.log('call callbackTable2', item);

                            // const name = item.data['Имя'];
                            // console.log('table name', name);
                            //item['tableID'] = item.data['Имя'];

                            // const listTablesForName = $('table[name="' + name + '"]');
                            // console.log('listTablesForName', listTablesForName);

                            // callbackTable2(item);

                            // listTablesForName.each(function () {
                            //     const table = $(this);
                            //     const tableID = $(this).attr('id');
                            //     item['tableID'] = tableID;

                            //     callbackTable2(item);
                            // });
                            const tableID = tableJQ.attr('id');
                            item['tableID'] = tableID;
                            // callbackTable2(item);
                            addNewRow(tableJQ, item);
                        })

                        // Розв'язуємо всі обіцянки і чекаємо їхнього завершення
                        await Promise.all(promises);
                        console.log('executeAsync end');
                        // sort(table);
                    }

                    // Викликаємо функцію для виконання асинхронного циклу
                    const result = await executeAsync();

                    if (attrSort !== undefined) {
                        tableJQ.attr("sort", attrSort)
                        console.log('Back attr in table', tableJQ.attr("sort"));
                        sort(table);
                    }

                    addSubscribeWSS(tableJQ.attr('id'));

                    callbackFromAttr(table, 'callbackAfterInitTable', response);
                }
            }, complete: function (response) {
                NProgress.done();
                //console.log('initTable_complete', response, table);
                tableJQ.data('isLoading', false);

                delete activeRequests[id_response];

            }, beforeSend: function (response) {
                // Сохраняем объект запроса в глобальную переменную
                //globalRequest = jqXHR;
                //console.log('initTable_beforeSend', response, table);

                activeRequests[id_response] = response;

            }
        });
    } catch (error) {
        //toastr["error"]('Ошибка запроса к 1С'); 
        NProgress.done();
        tableJQ.data('isLoading', false);
    }
    //console.log('end initTable');
}

async function loadAdditionalData(tableJQ) {

    console.log('--- loadAdditionalData ---')
    const attrSort = tableJQ.attr("sort");
    let isLoading = tableJQ.data('isLoading') || false;
    console.log('start loadAdditional isLoading', isLoading);

    try {
        let param = tableJQ.data('param') || {};
        param.page += 1;
        tableJQ.data('param', param);
        let id_response = tableJQ.attr('id') + Date.now();
        console.log('param', param)

        await $.ajax({
            url: `${tableJQ.attr('url')}`, type: 'GET', dataType: 'json', data: param, success: async function (response) {
                console.log('loadAdditionalData response', tableJQ);

                if (!response.error) {

                    prepareData(response);

                    // tableJQ.data('response', response);

                    response.list.forEach(async (item) => {
                        item.data["skipFilter"] = true;
                    });

                    callbackFromAttr(table, 'callbackBeforeInitTable', response);

                    async function executeAsync() {
                        // Створюємо масив обіцянок для кожного виклику callbackTable
                        const promises = response.list.map(item => {

                            const tableID = tableJQ.attr('id');
                            item['tableID'] = tableID;
                            addNewRow(tableJQ, item);
                        })

                        // Розв'язуємо всі обіцянки і чекаємо їхнього завершення
                        await Promise.all(promises);

                        console.log('executeAsync end');
                    }

                    // Викликаємо функцію для виконання асинхронного циклу
                    const result = await executeAsync();

                    if (attrSort !== undefined) {
                        tableJQ.attr("sort", attrSort)
                        console.log('Back attr in table', tableJQ.attr("sort"));
                        sort(tableJQ);
                    }

                    callbackFromAttr(tableJQ, 'callbackAfterInitTable', response);
                }
                // tableJQ.data('isLoading', false);
            }, complete: function (response) {
                delete activeRequests[id_response];

            }, beforeSend: function (response) {
                activeRequests[id_response] = response;

            }, always: function (response) {
                console.log('isloading=false1');

                // tableJQ.data('isLoading', false);
            }
        });
    } catch (error) {
        console.error('error', error);

        console.log('isloading=false2');

        tableJQ.data('isLoading', false);
    } finally {
        console.log('isloading=false');
        tableJQ.data('isLoading', false);
    }
}

// создание стороки заголовков таблицы
function createHeaderForTable(tableJQ) {
    console.log('--- createHeaderForTable', tableJQ.children('tbody').children('.config').children())


    let header = tableJQ.children('thead');

    if (header.length > 0) {
        return;
    }
    let newRow = $(`<tr></tr>`);
    tableJQ.children('tbody').children('.config').children().each(function () {
        // console.log('append', $(this).attr('title'))
        newRow.append($(`<th class="${$(this).attr('headerClass') || ''}" style="${$(this).attr('style')}">${$(this).attr('title')}</th>`));
    });

    $($('<thead></thead>').append(newRow)).prependTo(tableJQ);
    console.log('tableJQ', tableJQ);

    if (!tableJQ[0].hasAttribute('header')) {
        newRow.hide();
    }
}

// добавление новой строки
async function addNewRow(table, newData) {
    const tableID = table.attr('name') || table.attr('id') || 'tableID';
    let newRow = $(`<tr id="${newData.data.uid}" style="display:none"></tr>`);

    table.children('tbody').children('.config').children().each(function () {
        const cell = $(this).clone();
        const children = cell.find('.dataCell');
        // cell.css("width", "");

        if (children.length) {
            children.attr('name', cell.attr('name'));
            children.attr('key', cell.attr('key'));
        }

        newRow.append(cell);
    });

    newRow.addClass('rowData');
    newRow.addClass(tableID);
    newRow.find('.btnRow').attr('rowID', newData.data.uid);
    newRow.find('input').prop('disabled', true);
    newRow.show();
    newRow.data('data', { data: {}, edited: {}, tableID: tableID });

    let append = table.attr('append') || '';

    if (newData.hasOwnProperty('isSingleDataUpdate')) {

        append = 'start';
    }

    if (append === 'end') {
        table.children('tbody').append(newRow);
    } else {
        table.children('tbody').prepend(newRow);
    }

    callbackFromAttr(table, 'addNevRow', newData);

    newRow.find('input:not([url])').each(function () {
        setEventOnChange(this, newData);

        if ($(this)[0].hasAttribute('checkValid')) {
            setValid(this, $(this).val() !== '');
        }
    });

    newRow.find('[url]:not([url=""])').each(function () {
        initInputAutocompleteForTable(this);

        if ($(this)[0].hasAttribute('checkValid')) {
            setValid(this, ($(this).attr('uid') || '') !== '');
        }
    });

    newRow.find('[data-mask]:not([data-mask=""])').each(function () {
        initInputTimeMask(this);
    });

    await callbackTable2(newData);
}


function setValueCellOld(element, value) {
    console.log('setValueCell', element.nodeName, value);

    if ($(element).is(':input')) {
        $(element).val(value);
    } else {
        $(element).text(value);
    }
}

function setValueCell(element, value) {

    if (element.nodeName === 'INPUT') {
        element.value = value;
    } else {
        element.textContent = value;
    }
}

function getValueCell(element) {
    if ($(element).is(':input')) {
        return $(element).val();
    } else {
        return $(element).text();
    }
}

function highlightElement(element) {
    /*     if (highlight) {
            $(element).addClass('highlight').delay(600).queue(function(next) {
                $(element).removeClass('highlight');
                next();
            });
        } */
}

function enableHighlightElement(delay = 2000) {
    /*     clearTimeout(highlightTimerId);
    
        highlightTimerId = setTimeout(() => {
            highlight = true;
        }, delay); */
}

function disableHighlightElement() {
    /*     clearTimeout(highlightTimerId);
        highlight = false; */
}

// функция вызываемая для обновления данных в строке
callbackTable = async function (data) {
    // console.log('callbackTable start');
    //data.MD5 = await getHash(data);
    const listTablesForName = $('table[name="' + data.data['Имя'] + '"]');
    if (listTablesForName.length > 0) {
        listTablesForName.each(function () {
            const table = $(this);
            const tableID = $(this).attr('id');
            data['tableID'] = tableID;

            callbackTable2(data);
        });
    } else {

        data['tableID'] = data.data['Имя'];
        await callbackTable2(data);
    }
}

// функция вызываемая для обновления данных в строке
callbackTable2 = async function (data) {
    const table = $(`#${data.tableID}`);
    const newData = data.data;
    const skipFilter = newData.skipFilter || false;
    const row = table.find('#' + newData.uid);
    let visible = true;

    if (!skipFilter) {
        visible = callbackFromAttr(table, 'filter', newData);
    }

    if (row.length) {
        const oldData = row.data('data');
        if (!visible) {
            row.remove();
        }

        data.edited = {};
        row.data('data', data);

        callbackFromAttr(table, 'callbackAddNewRow', row);
        fillData(row, newData, oldData);

        sort(table);

        callbackFromAttr(table, 'callbackAfterWrite', data);
    } else {
        if (visible) {
            await addNewRow(table, data);
        }
    }
}

function fillData(row, newData, oldData) {
    row.children().children().each(function () {
        let dataCell = this;
        const dataCellJQ = $(dataCell);
        let name = dataCellJQ.attr('name') || '';

        if (name !== '') {
            let value = newData[name];

            if (typeof value === 'object' && value !== null) {
                const newUid = value['uid'] || '';
                const key = dataCellJQ.attr('key') || '-';
                let subValue = value[key];

                if (subValue === undefined) {
                    subValue = '';
                }
                const valid = subValue.length ? true : false;
                setValueCell(dataCell, subValue);
                setValid(dataCell, valid);

            } else {
                const oldValue = oldData.data[name] || '';

                if (String(oldValue) !== String(value)) {

                    if (typeof value === 'boolean') {
                        dataCellJQ.prop('checked', value);
                    } else {
                        const typeData = dataCellJQ.attr('typeData') || '';

                        if (typeData !== '') {
                            if (typeData === 'date') {
                                const mask = dataCellJQ.attr('mask') || '';
                                value = formatDate(value, mask);
                            }
                        }

                        setValueCell(dataCell, value)
                        setValid(dataCell, String(value) !== '');
                    }
                }
            }
        };
    })
}

function sort(table) {
    if ($(table)[0].hasAttribute('sort')) {
        console.log('Sort real');
        $(table).trigger("update");

        let columnSort = parseInt($(table).attr('sort'));
        let sortDirection = parseInt($(table).attr('sortdirection') || '0');

        if ($(table)[0].hasAttribute('sort_2')) {
            let columnSort_2 = parseInt($(table).attr('sort_2'));

            $(table).trigger("sorton", [[[columnSort, 0], [columnSort_2, 0]]]);
            // console.log("sort_2", [[[columnSort, 0],[columnSort_2, 0]]]);
        } else {
            $(table).trigger("sorton", [[[columnSort, sortDirection]]]);
        }
    }
}

function formatDate(dateString) {
    // console.log('formateDate', dateString)
    return `${dateString.substring(8, 10)}.${dateString.substring(5, 7)}`;
}

function formatDateTime(dateString) {
    // console.log('formateDate', dateString)
    return `${dateString.substring(8, 10)}.${dateString.substring(5, 7)}.${dateString.substring(0, 4)} ${dateString.substring(11, 16)}`;
}

function setEventOnChange(element, newData) {

    $(element).attr('rowID', newData.data.uid);

    $(element).on('change', function () {
        var userInput;
        let validValue = false;
        var type = $(this).attr('type');
        const keyName = $(element).attr('name');
        const rowID = $(this).attr('rowID');
        const row = $('#' + rowID);
        const data = $(row).data('data');
        var sync = $(this).attr('sync') || 'auto';

        console.log('onChange', keyName, element);
        console.log('row', row);

        row.attr('MD5', '');
        //console.log('data', data);

        if (type == 'checkbox') {
            userInput = $(this).is(":checked");
            validValue = true;

        } else if (type == 'number') {
            userInput = parseFloat($(this).val());

            if (userInput > 0) {
                validValue = true;
            }

        } else {
            userInput = $(this).val(); // Для всех остальных типов вернём строку

            if (userInput !== '') {
                validValue = true;
            }
        }

        if ($(this)[0].hasAttribute('checkValid')) {
            setValid(this, validValue);
        }
        console.log('data.edited', data);
        data.edited[keyName] = userInput;
        $(row).data('data', data);
        console.log('data.edited', data);
        $(element).parent().parent().attr('MD5', '');

        if (sync === 'auto') {
            sendNotificationOnChangeRowTable(this);
        }

        logToServer('Изменено значение "' + $(this).attr('name') + '" = ' + userInput);

    });

    $(element).on('keyup', function (event) {
        if (event.which == 13) {
            event.preventDefault();
            $(this).blur();
        }
    });

    $(element).on('click', function () {
        $(this).focus();
        $(this).select();
        /* var val = this.value;
        this.value = '';
        this.value = val; */
    });
}

function initInputAutocompleteForTable(element) {
    try {
        const url = $(element).attr('url');

        $(element).autocomplete({
            source: function (req, res) {
                const data = { term: req.term };
                const row = $(this.element).closest('tr');
                const dataRow = $(row).data('data');

                data.report = $(row).attr('id') || '';
                data.stanok = stanok.uid;
                data.dataRow = dataRow;

                $.ajax({
                    method: 'POST', url: url,
                    dataType: "json",
                    data: JSON.stringify(data),
                    contentType: 'application/json',
                    success: function (data) { res(data); }
                });
            },
            select: function (event, ui) {
                const keyName = $(this).attr('name');
                const row = $(this).closest('tr');
                const data = $(row).data('data');
                const sync = $(this).attr('sync') || 'auto';
                console.log('on select ', ui.item, keyName, JSON.parse(JSON.stringify(data)));
                const item = JSON.parse(JSON.stringify(ui.item));
                data.edited[keyName] = {};
                data.edited[keyName] = item;
                console.log('data.edited', item, data);
                console.log('on select 2', ui.item, keyName, JSON.parse(JSON.stringify(data)));
                $(row).data('data', data);

                const data2 = $(row).data('data');
                console.log('on select 3', ui.item, keyName, JSON.parse(JSON.stringify($(row).data('data'))));
                $(this).attr('uid', ui.item.uid);

                if ($(this)[0].hasAttribute('checkValid')) {
                    setValid(this, true);
                }

                if (sync === 'auto') {
                    //row.attr('MD5', '');
                    console.log('on select 3', ui.item, keyName, JSON.parse(JSON.stringify($(row).data('data'))));
                    sendNotificationOnChangeRowTable(this);
                }

                $(this).blur();
            },
            open: function (event, ui) {
                console.log('autocomplete open')
                const autocompleteTop = $(this).autocomplete("widget").offset().top;
                const windowTop = $(window).scrollTop();
                const scrollAmount = autocompleteTop - windowTop;
                console.log('    open autocompleteTop', autocompleteTop, 'windowTop', windowTop, 'scrollAmount', scrollAmount, this)

                $(window).scrollTop(windowTop + scrollAmount);
            },
            position: { my: "left top", at: "right top" },
            minLength: parseInt($(element).attr('minLength') || 1)
        }).on("input", function () {
            $(element).attr('uid', '');
            if ($(this)[0].hasAttribute('checkValid')) {
                setValid(this, false);
            }
        }).on("blur", function () {
            const keyName = $(this).attr('name');
            const row = $(this).closest('tr');
            const data = $(row).data('data');
            const sync = $(this).attr('sync') || 'auto';
            const UID = $(this).attr('uid') || '';

            if (UID === '') {
                $(this).val('');

                data.edited[keyName] = { uid: '' };
                $(row).data('data', data);

                if (sync === 'auto') {
                    sendNotificationOnChangeRowTable(this);
                }
            }

        }).on("focus", function () {

        }).on("click", function () {
            $(this).autocomplete("search");
            $(this).select();
        });
    } catch (error) {
        toastr["error"]('Ошибка при initInputAutocomplete');
    }
}

function sendNotificationOnChangeRowTable(elementInput) {
    console.log('sendNotificationOnChangeRowTable');
    const table = $(elementInput).closest('table');
    const docName = $(table).attr('name') || $(table).attr('id');
    const row = $(elementInput).closest('tr');
    const data = $(row).data('data');

    console.log('sendNotificationOnChangeRowTable', data);
    if (Object.keys(data.edited).length) {
        $('#overlay').fadeIn();
        console.log('fadeIn');
        sendWSS('updateDataOnServer', docName, data);
    }
}

function callbackFromAttr(element, attr, param = null) {
    try {
        const callbackFunc = $(element).attr(attr) || '';

        if (callbackFunc !== '') {
            let func = window[callbackFunc];

            if (param === null) {
                return func();
            } else {
                return func(param);
            }
        }
    } catch (error) {
        console.log('callbackFromAttr', error, attr, param, func, callbackFunc);
    }
}

function test(func, count, name, ...args) {
    const timeStart = Date.now();
    for (let i = 0; i < count; i++) {
        func(...args)
    }
    const timeStop = Date.now();
    console.log(`time work ${name} - `, timeStop - timeStart);
}

let debounceTimerTable;
const debounceDelayTable = 200;

$(window).on('scroll', function () {
    clearTimeout(debounceTimerTable);
    debounceTimerTable = setTimeout(async function () {
        const scrollTop = $(this).scrollTop();
        const windowHeight = $(this).height();
        const documentHeight = $(document).height();
        const isPositionForLoading = scrollTop + windowHeight >= documentHeight - windowHeight


        $('#content table').each(async function () {
            const tableJQ = $(this);
            const param = tableJQ.data('param') || {};
            const page = param.page || 0;

            if (param.hasOwnProperty('page') && tableJQ.is(':visible')) {
                const isLoading = tableJQ.data('isLoading') || false;
                const isAdditionalPage = page < totalPageCount;

                if (!isLoading && isPositionForLoading && isAdditionalPage) {
                    tableJQ.data('isLoading', true);
                    await loadAdditionalData(tableJQ);
                }
            }
        });
    }.bind(this), debounceDelayTable);
});


// const elem = document.getElementById('content');


// test(setValueCell, 10000, 'setValueCell', elem, 1)
// test(setValueCellOld, 10000, 'setValueCellOld', elem, 1)