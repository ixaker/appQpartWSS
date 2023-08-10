var highlight = false;
var highlightTimerId;

// инициализация всех таблиц на форме
async function initTables() {
    disableHighlightElement();

    await $('#content table[init]').each(async function() {
        await initTable(this);
    });

    //callbackWSS = callbackTable;

    enableHighlightElement();
}

// инициализация таблицы
async function initTable(table) {
    //console.log('initTable', table);

    createHeaderForTable(table);

    if ($(table)[0].hasAttribute('sort')) {
        $(table).tablesorter();
    } 
    
    $(table).children('tbody').children('.rowData').remove();

    try {
        let param = $(table).data('param')||{};

        NProgress.start();

        await $.ajax({ url: $(table).attr('url'), type: 'GET', dataType: 'json', data: param, success: function(response) {
            //console.log('response', response);

            if (!response.error) {
                response.list.forEach(async (item) => {
                    await callbackTable(item);
                });

                addSubscribeWSS($(table).attr('id'));
            }
        }, complete: function(response){
            NProgress.done();
        }});
    } catch (error) {
        toastr["error"]('Ошибка запроса к 1С'); 
        NProgress.done();           
    }
    //console.log('end initTable');
}

// создание стороки заголовков таблицы
function createHeaderForTable(table) {
    let header = $(table).children('thead');

    if (header.length > 0) {
        return;
    }
    let newRow = $(`<tr></tr>`);

    $(table).find('.config').children().each(function() {
        newRow.append($(`<th class="${$(this).attr('headerClass')||''}" style="${$(this).attr('style')}">${$(this).attr('title')}</th>`));
    });

    $($('<thead></thead>').append(newRow)).prependTo(table);

    if (!$(table)[0].hasAttribute('header')) {
        $(newRow).hide();
    }
}

// добавление новой строки
async function addNewRow(table, newData) {
    //console.log('addNewRow', table, newData);

    const tableID = $(table).attr('id')||'tableID';
    let newRow = $(`<tr id="${newData.uid}" style="display:none"></tr>`);

    $(table).children('tbody').children('.config').children().each(function() {
        const cell = $(this).clone();
        const children = cell.find('.dataCell');  
        
        if (children.length) {
            children.attr('name', cell.attr('name')); 
            children.attr('key', cell.attr('key'));   
        }

        newRow.append(cell);   
    });

    $(newRow).addClass('rowData');
    $(newRow).addClass(tableID);
    $(newRow).find('.btnRow').attr('rowID', newData.uid);
    $(newRow).find('input').prop('disabled', true);
    $(newRow).show();

    const append = $(table).attr('append')||'';

    if (append === 'end') {
        $(table).children('tbody').append(newRow);
    } else {
        $(table).children('tbody').prependTo(newRow);
    }

    const callbackNameAddNevRow = $(table).attr('addNevRow')||'';

    if (callbackNameAddNevRow !== '') {
        eval(callbackNameAddNevRow + "(" + JSON.stringify(newData) + ")");
    }

    $(newRow).find('input:not([url])').each(function() {
        setEventOnChange(this, newData);
        setValid(this, $(this).val() !== '');
    });

    callbackTable(newData);
}

async function reportChanged(row, newData) {
    const newMD5 = await getHash(newData);
    const oldMD5 = row.attr('MD5')||'';
    row.attr('MD5', newMD5);
    //console.log('newMD5', newMD5, 'oldMD5', oldMD5);
    return newMD5 !== oldMD5;
}

function setValueCell(element, value) {
    if ($(element).is(':input')) {
        $(element).val(value);
    } else {
        $(element).text(value);
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
    if (highlight) {
        $(element).addClass('highlight').delay(600).queue(function(next) {
            $(element).removeClass('highlight');
            next();
        });
    }
}

function enableHighlightElement(delay = 2000) {
    clearTimeout(highlightTimerId);

    highlightTimerId = setTimeout(() => {
        highlight = true;
    }, delay);
}

function disableHighlightElement() {
    clearTimeout(highlightTimerId);
    highlight = false;
}

// функция вызываемая для обновления данных в строке
callbackTable = async function(data) {
    //console.log('callbackTable', data);

    const table = $(`#${data.topic}`);
    const row = $('#' + data.uid);
    const newData = data.data;

    if (row.length) {
        //console.log('row', row);

        const filterFunc = $(table).attr('filter')||'';
        let visible = true;

        if (filterFunc !== '') {
            visible = eval(filterFunc + "(" + JSON.stringify(newData) + ")");

            if (!visible) {
                $(row).remove();
                //return;
            }
        }

        $(row).data('data', data);

        if (await reportChanged(row, newData) && visible) {
            $(row).children().children().each(function() {
                let dataCell = this;
                let name = $(dataCell).attr('name');
                let value = newData[name];

                //console.log('dataCell', dataCell, value);

                if (typeof value === 'object' && value !== null) {
                    const newUid = value['uid']||'';

                    if (newUid !== '') {
                        const oldUid = $(dataCell).attr('uid')||'';
                        const key = $(dataCell).attr('key')||'';

                        if (newUid !== oldUid) {
                            if (key.length) {
                                highlightElement(dataCell);
                                $(dataCell).attr('uid', newUid);
                                setValueCell(dataCell, value[key]);
                                //eventOnBlur(dataCell);
                                setValid(dataCell, true);
                            }
                        }
                    }else{
                        $(dataCell).attr('uid', '');
                        setValueCell(dataCell, '');
                        setValid(dataCell, false);
                    }
                } else {
                    const oldValue = getValueCell(dataCell);

                    if (String(oldValue) !== String(value)) {
                        highlightElement(dataCell);

                        if (typeof value === 'boolean') {
                            $(dataCell).prop('checked', value);
                        }else{
                            const typeData = $(dataCell).attr('typeData')||'';

                            if (typeData !== '') {
                                if (typeData === 'date') {
                                    const mask = $(dataCell).attr('mask')||'';
                                    value = formatDate(value, mask);
                                }
                            }

                            setValueCell(dataCell, value)
                            $(dataCell).val(value);

                            setValid(dataCell, String(value) !== '');
                        }
                    }
                }
            });
     
            if ($(table)[0].hasAttribute('sort')) {
                needSort = true;
                let columnSort = parseInt($(table).attr('sort'));


                $(table).trigger("update");
                $(table).trigger("sorton", [[[columnSort, 0]]]);
            } 

        }
        //console.log('callbackTable', '111');
        const callbackAfterWrite = $(table).attr('callbackAfterWrite')||'';
        callback(callbackAfterWrite, data);
        

    }else{
        addNewRow(table, data);
    }
}

function formatDate(dateString, mask) {
    return moment(dateString).format(mask);
}

function setEventOnChange(element, newData) {
    $(element).attr('rowID', newData.uid);

    $(element).on('change', function() {
        var userInput;
        let validValue = false;
        var type = $(this).attr('type');
        const keyName = $(element).attr('name');
        const row = $('#' + newData.uid);
        const data = $(row).data('data');

        console.log('data', data);

        if (type == 'checkbox') {
            userInput = $(this).is(":checked"); // Булево значение
            validValue = true;
            
        } else if (type == 'number') {
            userInput = parseFloat($(this).val()); // Число

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
        
        data.data[keyName] = userInput;
        $(row).data('data', data);

        $(element).parent().parent().attr('MD5', '');
        sendNotificationOnChange(this, userInput);

        logToServer('Изменено значение "'+ $(this).attr('name') +'" = ' + userInput);

    });

    $(element).on('keyup', function(event) {
        if (event.which == 13) {
            event.preventDefault();
            $(this).blur();
        }
    });

    $(element).on('click', function() {
        var val = this.value;
        this.value = '';
        this.value = val;
    });
}

function sendNotificationOnChange(element, value) {
    const docName = $(element).closest('table').attr('id');
    const doc = $(element).closest('tr').attr('id');
    const keyName = $(element).attr('name');
    const row = $('#' + doc);
    const data = $(row).data('data');

    payload = {};
    payload.type = 'Документы';
    payload.docName = docName;
    payload.doc = doc;
    payload.keyName = keyName;
    payload.value = value;
    payload.data = data;

    console.log('sendNotificationOnChange', payload);

    sendWSS('updateDataOnServer', docName, payload);
}

function callback(funcName, param = null) {
    if (funcName !== '') {
        func = window[funcName];

        if (param === null) {
            return func();
        } else {
            return func(param);
        }
    }    
}