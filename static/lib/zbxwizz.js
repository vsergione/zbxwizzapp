/**
 *
 * @param opts
 */
function show_modal(opts = {}) {
    let $modal = $("#generic_modal").clone().appendTo("body").removeAttr("id")   // clone modal template
        .on("hidden.bs.modal", () => $modal.remove())  // setup cleanup after modal is closed
        .modal();   // open modal

    // set modal title if present
    if (!opts.title) {
        $modal.find(".modal-header").remove()
    } else {
        $modal.find(".modal-header").html(opts.title);
    }
    // set footer if present
    if (opts.footer) {
        $modal.find(".modal-footer").empty().append(opts.footer);
    }
    // set modal content
    $modal.find(".modal-body").empty().append(opts.body ? opts.body : "No content");
    if (opts.size) {
        $modal.find(".modal-dialog").addClass("modal-" + opts.size);
    }
}

let zbx, apiUrl, apiKey;
let specs = {};

function load_req_tpl(editor, key) {
    if (key.length)
        editor.setText(localStorage.getItem(key));
}


function import_from_api (resource, tpl){
    overlay.show();
    let params;
    return new Promise((resolve,reject)=>{
        try {
            tpl = eval("`" + tpl + "`");
            // console.log(tpl);
            params = JSON.parse(tpl);
            // console.log(params);
            zbx.get(resource, params)
                .then((data) => {
                    if (!data.result)
                        reject(json(data));

                    if (data.result.length === 0)
                        resolve(null);
                    
                    data = {
                        fields: Object.keys(data.result[0]),
                        records:  data.result
                    };
                    for(let i=0;i<data.records.length;i++) {
                        let tmp = Object.assign({},data.records[i]);
                        Object.keys(data.records[i])
                            .forEach(fld=>{
                                data.records[i][fld]=typeof data.records[i][fld] ==="object" ? json(data.records[i][fld]) : data.records[i][fld]
                            });
                        data.records[i] = {
                            flds:data.records[i],
                            data: {
                                'csv':tmp
                            }
                        }
                    }
                    /**
                     * @type {DataTable}
                     */
                    let dt = worksheets.get_active_sheet();
                    dt.reset().load_data(data.fields, data.records,'csv');
                    resolve(data);
                })
                .catch(e=>{
                    reject(e);
                })
                .finally(() => overlay.hide());
        } catch (e) {
            overlay.hide();
            reject(e)      
        }
    });
    
}

function normalize_import_records(records) {
    for (let i = 0; i < records.length; i++) {
        let rec = records[i];
        if (rec.flds) {
            continue;
        }
        let tmp = Object.assign({}, rec);
        let flds = {};
        Object.keys(rec).forEach(fld => {
            flds[fld] = typeof rec[fld] === "object" ? json(rec[fld]) : rec[fld];
        });
        records[i] = {
            flds: flds,
            data: { csv: tmp }
        };
    }
    return records;
}

function import_from_js(script) {
    overlay.show();
    return new Promise((resolve, reject) => {
        try {
            let ctx = { ws: worksheets ? worksheets.sheets : {}, zbx, json, obj };
            let data;
            with (ctx) {
                data = eval(script);
            }
            if (!data || !data.fields || !data.records) {
                reject("Script must return { fields: [], records: [] }");
                return;
            }
            if (data.records.length === 0) {
                resolve(null);
                return;
            }
            normalize_import_records(data.records);
            worksheets.get_active_sheet().reset().load_data(data.fields, data.records, 'csv');
            resolve(data);
        } catch (e) {
            reject(e);
        } finally {
            overlay.hide();
        }
    });
}

function req_import_js(script, form) {
    import_from_js(script)
        .then((resp) => {
            if (resp === null) {
                show_modal({ body: 'No records returned' });
            }
        })
        .catch((e) => {
            show_modal({
                body: 'Error running import script:<pre class="pre" style="overflow: scroll">' + script + "/ " + e + '</pre>'
            });
        });
}

function req_import_from_api(reqTpl, form) {
    import_from_api (form.resource.value,reqTpl)
        .then((resp)=>{
            console.log(resp);
            if(resp===null) 
                show_modal({
                    body: 'No records returned'
                })
        })
        .catch((e)=>{
            show_modal({
                body: 'Error perfoming the request:<pre class="pre" style="overflow: scroll">'+reqTpl+"/ "+e+'</pre>'
            })
        })
        .finally(()=>overlay.hide())
    

    
    
}

function remove_template(btn) {
    $(btn.form.templates).children().toArray()
        .forEach(opt => {
            if (opt.selected) {
                localStorage.removeItem(opt.value);
                $(opt).remove();
            }
        });
}

/**
 * push data to zabbix
 */
function push_to_api(template, form) {

    show_modal({
        body: $("<div>").html("<p>Pushing to Zabbix can lead to damage if the request is not properly configured. Please confirm you have reviewed the request and you are sure you want to perform the operation</p>"+
            (form.operation.value=="delete"?"<div class='alert alert-danger'>You are trying to perform a DELETE operation</div>":""))
        .append($("<button class='btn btn-danger' data-dismiss='modal'>Confirm</button>").on("click",()=>exec_push(template, form)))
    });

    function exec_push(template, form) {
        let method = form.resource.value + "." + form.operation.value;
        overlay.show();
        let ps = [];
        let err = false;
        worksheets.get_active_sheet().rows.filter(row => row.isSelected)
            .forEach((row) => {
                row.lastResponse = null;
                if(err) return;
                let data = {
                    data: row.data,
                    cols: row.vals,
                    flds: row.fld_vals
                };
                
                    
                try {
                    with (data) {
                        let req = eval("`" + template + "`");
                        console.log(req);
                        let params = JSON.parse(req);
                        
                        
                        ps.push(zbx.req(method, params)
                            .then((resp) => {
                                console.log(resp)
                                row.lastResponse = resp;
                            })
                            .catch((e) => console.log("syncfailed",e))
                        );
                    }
                } catch (e) {
                    err = {
                        err: e,
                        row: row,
                        tpl: template
                    };
                }
            });
        Promise.all(ps).finally(()=>{
            overlay.hide();
            if(err) {
                show_modal({body: "Some error occured: "+json(err)})
            }
        });
    }
    
    
}

function pull_from_api(rows, resource, label, template) {
    return new Promise((resolve,reject)=>{
        let ps = [];
        overlay.show();
        rows.forEach((row) => {
            // console.log(row);
            let data = {
                data: row.data,
                cols: row.vals,
                flds: row.fld_vals
            };

            with (data) {
                let req = eval("`" + template + "`");
                try {
                    row.set_loading();
                    let tmp = JSON.parse(req);
                    let p = zbx.get(resource, tmp)
                        .then((resp) => {
                            if (resp.result) {
                                if(resp.result.length)
                                    row.data[label] = resp.result.length==1 ? resp.result[0] : resp.result ;
                                else
                                row.data[label]  = null;
                            }
                            row.lastResponse = resp;
                        })
                        .catch(e => {
                            console.log(e)
                        })
                        .finally(() => {
                            row.unset_loading();
                        });
                    ps.push(p);
                } catch (e) {
                    row.data.last_error = e.toString();
                }
            }

        });
        Promise.all(ps).then(()=>resolve()).catch((e) => reject(e)).finally(() => overlay.hide());
    });
}
/**
 * pull data from zabbix
 */
function req_pull(template, form) {
    let rows = worksheets.get_active().rows.filter(row => row.isSelected);
    if(!rows.length) return alert("No rows selected");
    pull_from_api(rows,form.resource.value,form.label.value,template).catch(e=>alert("Some error happend:" + e)).finally(() => overlay.hide())
}


function downloadBlob(content, filename, contentType) {
    // Create a blob
    var blob = new Blob([content], {type: contentType});
    var url = URL.createObjectURL(blob);

    // Create a link to download it
    var pom = document.createElement('a');
    pom.href = url;
    pom.setAttribute('download', filename);
    pom.click();
    URL.revokeObjectURL(url);
}

function sanitize_export_filename(name, ext) {
    const base = (name || 'export').replace(/[^\w.\- ]+/g, '_').trim() || 'export';
    return `${base}.${ext}`;
}

function sanitize_excel_sheet_name(name) {
    return (name || 'Sheet').replace(/[\\/*?:\[\]]/g, '_').substring(0, 31) || 'Sheet';
}

function get_export_filter(scope) {
    switch (scope) {
        case 'selected':
            return row => row.isSelected;
        case 'visible':
            return row => !row.isHidden;
        default:
            return null;
    }
}

function get_export_rows(dt, filter = null) {
    return {
        dt,
        fields: dt.fields,
        records: dt.export(filter),
    };
}

function get_active_export_rows(filter = null) {
    return get_export_rows(worksheets.get_active_sheet(), filter);
}

function build_excel_worksheet(dt, filter = null) {
    const { fields, records } = get_export_rows(dt, filter);
    const rows = records.map(record => {
        const row = {};
        fields.forEach(fld => {
            row[fld] = record.flds[fld] ?? '';
        });
        return row;
    });
    return rows.length || fields.length
        ? XLSX.utils.json_to_sheet(rows, { header: fields })
        : XLSX.utils.aoa_to_sheet([]);
}

function unique_excel_sheet_tab_names(sheetIds) {
    const used = new Set();
    return sheetIds.map(id => {
        let base = sanitize_excel_sheet_name(id);
        let candidate = base;
        let i = 2;
        while (used.has(candidate)) {
            const suffix = '_' + i;
            candidate = base.substring(0, 31 - suffix.length) + suffix;
            i++;
        }
        used.add(candidate);
        return candidate;
    });
}

function excel_export_filename(sheetIds) {
    if (sheetIds.length === 1) {
        return sanitize_export_filename(sheetIds[0], 'xlsx');
    }
    return sanitize_export_filename('zbxwizz-export', 'xlsx');
}

function save_data(filter = null) {
    const { dt, fields, records } = get_active_export_rows(filter);
    const csv = Papa.unparse(records.map(d => d.flds), {
        quotes: true,
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ",",
        header: true,
        newline: "\n",
        skipEmptyLines: false,
        columns: fields.length ? fields : null,
    });
    downloadBlob(csv, sanitize_export_filename(dt.name, 'csv'), "text/csv;charset=utf-8;");
}

function save_data_json(filter = null) {
    const { dt, fields, records } = get_active_export_rows(filter);
    const payload = {
        sheet: dt.name,
        fields,
        records,
    };
    const json = JSON.stringify(payload, null, 2);
    downloadBlob(json, sanitize_export_filename(dt.name, 'json'), "application/json;charset=utf-8;");
}

function save_data_excel(filter = null, sheetIds = null) {
    if (typeof XLSX === 'undefined') {
        show_modal({
            title: 'Export to Excel',
            body: 'Excel export library is not loaded. Run <code>npm run vendor</code> in the static folder and reload.',
        });
        return;
    }

    if (!sheetIds || sheetIds.length === 0) {
        sheetIds = [worksheets.get_active_sheet().name];
    }

    const wb = XLSX.utils.book_new();
    const entries = sheetIds
        .map(id => ({ id, dt: worksheets.sheets[id] }))
        .filter(entry => entry.dt);
    const tabNames = unique_excel_sheet_tab_names(entries.map(entry => entry.id));
    entries.forEach((entry, idx) => {
        XLSX.utils.book_append_sheet(
            wb,
            build_excel_worksheet(entry.dt, filter),
            tabNames[idx]
        );
    });

    if (wb.SheetNames.length === 0) {
        show_modal({
            title: 'Export to Excel',
            body: 'No sheets selected for export.',
        });
        return;
    }

    XLSX.writeFile(wb, excel_export_filename(entries.map(e => e.id)));
}

function export_sheet_data(format, filter = null) {
    switch (format) {
        case 'csv':
            save_data(filter);
            break;
        case 'json':
            save_data_json(filter);
            break;
        case 'xlsx':
            save_data_excel(filter);
            break;
        default:
            console.warn('Unknown export format', format);
    }
}

function prompt_export_excel() {
    const sheetNames = worksheets.sheetsNames;
    const activeName = worksheets.get_active_sheet().name;

    const $body = $(`
        <div class="excel-export-form">
            <label class="d-block mb-2">Which rows should be exported?</label>
            <select class="custom-select custom-select-sm row-filter-select mb-3">
                <option value="">All records</option>
                <option value="selected">Only selected</option>
                <option value="visible">Only visible</option>
            </select>
            <label class="d-block mb-2">Which sheets?</label>
            <div class="mb-2">
                <label class="d-inline-block mr-3">
                    <input type="radio" name="sheetScope" value="all" checked> All sheets
                </label>
                <label class="d-inline-block">
                    <input type="radio" name="sheetScope" value="pick"> Selected sheets
                </label>
            </div>
            <div class="sheet-export-list border rounded p-2 bg-light" hidden></div>
            <div class="sheet-export-error text-danger small mt-2" hidden></div>
        </div>
    `);

    const $list = $body.find('.sheet-export-list');
    const $toggleAll = $('<label class="d-block mb-1 pb-1 border-bottom">')
        .append(
            $('<input type="checkbox" class="sheet-export-toggle-all">').prop('checked', true),
            ' Select all'
        );
    $list.append($toggleAll);

    sheetNames.forEach(name => {
        $list.append(
            $('<label class="d-block sheet-export-pick">').append(
                $('<input type="checkbox" name="sheet" class="sheet-export-check">')
                    .val(name)
                    .prop('checked', name === activeName),
                ' ',
                $('<span>').text(name)
            )
        );
    });

    $body.find('[name="sheetScope"]').on('change', () => {
        const pick = $body.find('[name="sheetScope"]:checked').val() === 'pick';
        $list.prop('hidden', !pick);
        $body.find('.sheet-export-error').prop('hidden', true);
    });

    $toggleAll.find('input').on('change', function () {
        $list.find('.sheet-export-check').prop('checked', this.checked);
    });

    $list.on('change', '.sheet-export-check', () => {
        const checks = $list.find('.sheet-export-check');
        $toggleAll.find('input').prop(
            'checked',
            checks.length > 0 && checks.filter(':checked').length === checks.length
        );
    });

    const $footer = $('<div class="text-right"></div>');
    $footer.append(
        $('<button type="button" class="btn btn-secondary mr-2" data-dismiss="modal">Cancel</button>'),
        $('<button type="button" class="btn btn-primary">Export</button>').on('click', () => {
            const filter = get_export_filter($body.find('.row-filter-select').val());
            let sheetIds;
            if ($body.find('[name="sheetScope"]:checked').val() === 'all') {
                sheetIds = [...sheetNames];
            } else {
                sheetIds = $list.find('.sheet-export-check:checked').map((_, el) => el.value).get();
                if (!sheetIds.length) {
                    $body.find('.sheet-export-error')
                        .text('Select at least one sheet to export.')
                        .prop('hidden', false);
                    return;
                }
            }
            save_data_excel(filter, sheetIds);
            $footer.closest('.modal').modal('hide');
        })
    );

    show_modal({
        title: 'Export to Excel',
        body: $body,
        footer: $footer,
    });
}

function prompt_export_data(format) {
    if (format === 'xlsx') {
        prompt_export_excel();
        return;
    }

    const labels = { csv: 'CSV', json: 'JSON' };
    const $body = $(`
        <div>
            <label class="d-block mb-2">Which rows should be exported?</label>
            <select class="custom-select custom-select-sm">
                <option value="">All records</option>
                <option value="selected">Only selected</option>
                <option value="visible">Only visible</option>
            </select>
        </div>
    `);
    const $footer = $('<div class="text-right"></div>');
    $footer.append(
        $('<button type="button" class="btn btn-secondary mr-2" data-dismiss="modal">Cancel</button>'),
        $('<button type="button" class="btn btn-primary">Export</button>').on('click', () => {
            export_sheet_data(format, get_export_filter($body.find('select').val()));
            $footer.closest('.modal').modal('hide');
        })
    );
    show_modal({
        title: `Export to ${labels[format] || format}`,
        body: $body,
        footer: $footer,
    });
}

function transform_col(colId,expr) {
    worksheets.get_active_sheet().col(colId)
        .filter(cell=>!cell.row.isHidden)
        .forEach((cell)=>cell.val = transform_cell(cell,expr))
}

function transform_cell(cell, expr) {
    // console.log(cell);
    let data = {
        data: cell.row.data,
        cols: cell.row.vals,
        flds: cell.row.fld_vals,
        self: cell.val,
        ws: worksheets.sheets,
        lastResponse: cell.row.lastResponse
    };

    if (expr !== "")
        try{
            with (data) {
                let newVal = eval(expr);
                if (newVal !== null && typeof newVal === "object") {
                    newVal = JSON.stringify(newVal);
                }
                return newVal;
            }
        }
        catch(e) {
            return e.message
        }
}

/**
 *
 * @param event
 * @param apply
 */
function transform_data(event, apply = false) {
    // console.log(event)
    let src = event.target;
    let el = src.form.xpression;
    let col = $(el).parents("th").attr("data-col")*1;
    let expr = el.value;

    /**
     *
     * @param {Cell} cell
     * @returns {any}
     */


    /**
     * @type {DataTable}
     */


    if (!apply) {
        let dt = worksheets.get_active_sheet();
        console.log(col,dt.col(col));
        let cell = dt.col(col).filter(cell=>!cell.row.isHidden).shift();

        try {
            el.form.preview.value = transform_cell(cell,expr);
        } catch (e) {
            console.log(e);
            el.form.preview.value = "Error: " + e.message
        }
        return;
    }

    transform_col(col,expr);
    
    minimize_transform(event, true);
}

/**
 *
 * @param form
 */
function filter_rows(form,clear=false) {
    let th = $(form).parents("th");
    let val = form.filter.value.replaceAll("{value}", form.term.value);
    // th.removeClass("filterActive");

    val = val ? val : ".*";
    let rgx = new RegExp(val, "i");
    let col = th.attr("data-col")*1;

    th.addClass("filterActive");
    /**
     *
     * @type {DataTable}
     */
    let dt = worksheets.get_active_sheet();
    dt.col(col).forEach(col => {
        if (!rgx.test(col.val)) {
            // console.log("filterOut", col);
            col.row.filter_out(col);
        } else {
            // console.log("filterIn", col);
            col.row.filter_in(col);
        }
    });

    if(clear) th.removeClass("filterActive");
    worksheets.update_stats();

}




// Array.prototype.unique = function(){
//     function distinct(value, index, array) {
//         return array.indexOf(value) === index;
//     }
//     return this.filter(distinct);
// };
function load_file(src) {

}

/**
 *
 * @param input
 * @param {DataTable} dt
 */
function load_csv(input,dt) {
    if(!dt)
        dt = worksheets.get_active_sheet();
    return new Promise((resolve,reject)=>{
        console.log("Import CSV");
        $(input).parse({
            config: {
                header: true,
                complete: (data) => {
                    console.log(data);
                    if(data.errors.length) {
                        show_modal({
                            body: "Some error occured while importing the CSV: <pre>"+json(data.errors,null,4)+"</pre>"
                        })
                    }
                    data.data.pop();
                    data = {
                        records: data.data,
                        fields: data.meta.fields
                    };

                    for(let i=0;i<data.records.length;i++) {
                        data.records[i] = {
                            flds: data.records[i]
                        }
                    }
                    console.log(data);
                    
                    dt.reset().load_data(data.fields, data.records)
                    resolve();
                }
            }
        });
    })
}


/**
 *
 * @returns {DataTable}
 */
function get_active_sheet() {
    let container = $($("#sheetSelector").find("button.active").attr("data-target"));
    if (container)
        return container.data("dt");
    return;
}

function load_api_key(src) {
    $.get("./zbx_api_key.txt").then(data => {
        src.form.token.value = data;
    });
}

function load_api_url(src) {
    $.get("./zbx_url.txt").then(data => {
        src.form.url.value = data;
    });
}

function save_zbx_config(form) {
    $("#zbxLogo").addClass("notConnected");
    localStorage.setItem("zbxUrl", form.url.value);
    localStorage.setItem("zbxToken", form.token.value);
    zbx_connect();
}

function zbx_connect() {
    let url = localStorage.getItem("zbxUrl");
    let token = localStorage.getItem("zbxToken");
    let form = $("#zbxConfigForm")[0];
    form.url.value = url;
    form.token.value = token;
    zbx = new ZBXApi(url, token);
    overlay.show();
    zbx.get("host", {limit: 1}).then(data => {
        if (typeof data.result !== undefined) {
            $("#zbxLogo").removeClass("notConnected");
        }
    }).finally(() => overlay.hide());
}
function save_req_tpl(prefix, selectId, editor) {
    let name = prompt("Template name");
    localStorage.setItem(prefix + name, editor.getText());
    setup_req_tpl_select(selectId, prefix);
}

function setup_req_tpl_select(id, prefix) {
    let sel = $(id).empty().append("<option value=''>Select template</option>");
    let prefixLen = prefix.length;
    Object.keys(localStorage)
        .filter(key => key.indexOf(prefix) !== -1)
        .sort()
        .forEach(key => $("<option>").text(key.substr(prefixLen)).attr("value", key).appendTo(sel));
}

function preview_request(editor,rowContext=false) {
    try {
        let previewEl = $(editor.container.parentNode).find(".preview>pre");
        if(rowContext) {
            let row = worksheets.get_active_sheet().rows.filter(row => row.isSelected)[0];
            // console.log(row);
            if (row) {
                let data = {
                    data: row.data,
                    cols: row.vals,
                    flds: row.fld_vals
                };
                console.log(data);
                with (data) {
                    try {
                        previewEl.text(eval("`" + editor.getText() + "`"));
                    } catch (e) {
                        console.log(e);
                        previewEl.text("Invalid JS template: "+e.message)
                    }
                }
            } else {
                previewEl.text("No rows selected");
            }
        }
        else {
            try {
                previewEl.text(eval("`" + editor.getText() + "`"));
            } catch (e) {
                console.log(e);
                previewEl.text("Invalid JS template: "+e.message)
            }
        }
        
    } catch (e) {
        console.log(e);
    }
}

const pullReqTplEditor = new JSONEditor($("#pullReqTplEditor")[0], {
    mode: 'code', onChange: () => {
        preview_request(pullReqTplEditor,true)
    }
});
const pushReqTplEditor = new JSONEditor($("#pushReqTplEditor")[0], {
    mode: 'code', onChange: () => {
        preview_request(pushReqTplEditor,true)
    }
});
const importReqTplEditor = new JSONEditor($("#importReqTplEditor")[0], {
    mode: 'code', onChange: () => {
        preview_request(importReqTplEditor)
    }
});
const importJSTplEditor = new JSONEditor($("#importJSTplEditor")[0], {
    mode: 'code', onChange: () => {
        preview_request(importJSTplEditor)
    }
});


const pullReqTplPfx = "pullReqTpl_"
const pushReqTplPfx = "pushReqTpl_"
const importReqTplPfx = "importReqTpl_"
const importJSTplPfx = "importJSTpl_"


setup_req_tpl_select("#pullReqTemplates", pullReqTplPfx);
setup_req_tpl_select("#pushReqTemplates", pushReqTplPfx);
setup_req_tpl_select("#importReqTemplates", importReqTplPfx);
setup_req_tpl_select("#importJSTemplates", importJSTplPfx);

/**
 * @type WorkSheets
 */
var worksheets;

function run() {
    $("#warning").remove();

    setTimeout(async () => {
        zbx_connect();
        worksheets = await WorkSheets.load('#worksheets', '#sheetSelector');
        $("#sheetSelector").sortable({
            stop: ()=>worksheets.reorder()
        });
        scheduleAutosave();
    }, 300);
}

$(document).ready(() => {
    if (localStorage.getItem("userlevel") === "courageous") {
        run();
    }
});

let overlay = {
    el: $("#overlay"),
    show: function () {
        this.el.show();
    },
    hide: function () {
        this.el.hide();
    }
};

function generateUID() {
    // I generate the UID from two parts here
    // to ensure the random number provide enough bits.
    var firstPart = (Math.random() * 46656) | 0;
    var secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}

function minimize_transform(event, force = false) {
    let slf = event.target;
    if ($(event.relatedTarget).parents(".transform")[0] == $(event.target).parents(".transform")[0] && !force) {
        return;
    }
    setTimeout(() => $(slf).parents('.transform').removeClass('active'), 100)
}

function save_transformation(src) {
    console.log("Save transformation", src.form.xpression.value);
    localStorage.setItem("transfo_" + generateUID(), src.form.xpression.value);
}

function remove_transformation(src) {
    localStorage.removeItem($(src.form.templates).val());
    $(src.form.templates).children(":selected").remove();
}

function list_transformations(src, ev) {
    if (ev.target.tagName === "OPTION")
        return;
    console.log(ev);
    let sel = $(src).empty();
    Object.keys(localStorage).filter(key => key.indexOf("transfo_") !== -1).forEach(key => {
        $("<option>").val(key).text(localStorage.getItem(key)).appendTo(sel)
    });
}

function load_transfo(src) {
    src.form.xpression.value = $(src).children(":selected").text();
    $(src.form.xpression).trigger("focus").trigger("change");
    console.log(src);
}



function json(obj,opt1=null,opt2=null) {
    return JSON.stringify(obj,opt1,opt2)
}
function obj(str) {
    return JSON.parse(str);
}


function autosave(stop=false) {
    if (!worksheets) return Promise.resolve();
    return worksheets.flushAllSaves().finally(() => {
        if (!stop) scheduleAutosave();
    });
}

function scheduleAutosave() {
    setTimeout(() => autosave(), 60000);
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && worksheets) {
        worksheets.flushAllSaves();
    }
});

window.addEventListener("beforeunload", () => {
    if (worksheets) {
        worksheets.flushAllSaves();
    }
});


function save_structure() {

    let config = json(worksheets.get_active_sheet().columnFields);
    show_modal({
        body:`
        Save table structures<br>
        <form  onsubmit="event.preventDefault();console.log(this.structname.value);localStorage.setItem('tbl_struct_'+this.structname.value,this.config.value);">
        <label class="d-block">Name<br>
        <input name="structname" class="w-100" required/>
        </label>
        <label class="d-block">Config<br>
        <textarea name="config" style="width: 100%; height: 100px" required>${config}</textarea>
        </label>
        <button type="submit">Save</button>
        </form>
        `
    });
}
function manage_struct() {
    let tmp = Object.keys(localStorage).filter(s=>s.match(/^tbl_struct/))
        .map(s=>"<option value='"+s+"'>"+s.substr(11)+"</option>");
    console.log(tmp)
    show_modal({
        body:`
        <form>
        <label class="d-block">Saved table structures<br>
        <select name="struct" onchange="this.form.preview.value=localStorage.getItem($(this).val())" class="w-100"><option></option>${tmp ? tmp.join() : ""}</select>
        </label>
        <label class="d-block">
        Preview<br>
        <textarea class="w-100" style="width: 100px" name="preview"></textarea></label>
        <button onclick="localStorage.removeItem(this.form.struct.value)" type="button" data-dismiss="modal">Delete</button>
        <button onclick="restore_structure(this.form.struct.value)" data-dismiss="modal">Restore</button>
        </form>
        `
    });
}

function restore_structure(name) {
    let struct = localStorage.getItem(name);
    let fields = obj(struct);
    worksheets.new_sheet(null,{
        records: worksheets.get_active_sheet().export(),
        fields: fields
    })
}


function select_all_visible() {
    worksheets.get_active().rows.forEach(row=>row.select(true));
}

function download_string(filename, mime, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:'+mime+';charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

function save_env() {
    let name = prompt("File name");
    if (!name) return;
    worksheets.flushAllSaves().then(async () => {
        let config = await sheetStore.getConfig();
        let data = {
            worksheets: config ?? {},
            sheets: {},
            name: name
        };
        for (const s of data.worksheets.sheets ?? []) {
            data.sheets[s] = await sheetStore.getSheet(s);
        }
        download_string(data.name + ".json", "application/json", json(data));
    });
}

function load_env(form) {
    console.log(form);
    let fr = new FileReader();
    fr.addEventListener(
        "load",
        async () => {
            try {
                let data = obj(fr.result);
                await sheetStore.removeAllSheets();
                await sheetStore.setConfig(data.worksheets);
                for (const s of Object.keys(data.sheets)) {
                    await sheetStore.setSheet(s, data.sheets[s]);
                }
                Object.keys(localStorage).filter(k=>k.match(/^sheet\-.*-data$/)).forEach(k=>localStorage.removeItem(k));
                localStorage.removeItem("worksheets");
                window.location.reload();
            }
            catch (e) {
                console.log(e);
            }
        },
        false,
    );
    fr.readAsText(form.envfile.files[0]);
}
