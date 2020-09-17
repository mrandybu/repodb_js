let appHost = "http://127.0.0.1:5000/";
let taskId = "";

let searchParams = new URLSearchParams(location.search);
if (searchParams.get("task")) {
    taskId = searchParams.get("task");
    submitTask();
}

readConfig("../config.json");

function readConfig(file) {
    let rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function () {
        if (rawFile.readyState === XMLHttpRequest.DONE && rawFile.status === 200) {
            let content = rawFile.responseText;
            if (content) {
                let data = JSON.parse(content);
                appHost = data["httpType"] + "://" + data["appHost"];
                if (data["appPort"]) {
                    appHost += ":" + data["appPort"];
                }
                appHost += "/";
            }
        }
    }
    rawFile.send(null);
}

function sendRequest(url, success, async = true) {
    $.ajax({
        url: url,
        type: "GET",
        async: async,
        success: function (result) {
            success(result);
        },
        error: function (error) {
            setElMessage("alert", "Server error");
            visibleEls([
                ["inputAlert", true],
                ["linkBlock", false],
                ["infoBlock", false],
                ["taskContent", false],
                ["accordion", false]
            ]);
        },
    });
}

function getElem(element) {
    return document.getElementById(element);
}

function setVisible(element, visible) {
    let type = false;
    if (visible === false) {
        type = true;
    }
    getElem(element).hidden = type;
}

function visibleEls(elements) {
    for (let i in elements) {
        let value = elements[i];
        if (typeof value[Symbol.iterator] === "function" && value.length === 2) {
            if (typeof value[1] === "boolean") {
                setVisible(value[0], value[1]);
            }
        }
    }
}

function setElMessage(element, message, add = false) {
    element = getElem(element);
    if (add === false) {
        element.innerHTML = message;
    } else {
        element.innerHTML += message;
    }
}

function submitTask() {
    visibleEls([
        ["inputAlert", false],
        ["linkBlock", false],
        ["infoBlock", false],
        ["taskContent", false],
        ["accordion", false]
    ]);

    if (!taskId) {
        taskId = getElem("taskId").value;
    }

    if (taskId != parseInt(taskId, 10)) {
        setVisible("inputAlert", true);
        getElem("taskId").value = "";
        return
    }

    const lAlt = getElem("lAlt");

    lAlt.innerHTML = "Task " + taskId + " on git.altlinux.org";
    lAlt.href = "http://git.altlinux.org/tasks/" + taskId;

    setVisible("mainSpinner", true);

    let taskInfoUrl = appHost + "task_info?task=" + taskId;
    sendRequest(taskInfoUrl, showTaskInfo, false);

    if (getElem("inputAlert").hidden === false) {
        setVisible("mainSpinner", false);
        return;
    }

    visibleEls([
        ["mainSpinner", false],
        ["wdInfo", false],
        ["whatDepsTableMain", false],
        ["wdsSpinner", true],
        ["mcInfo", false],
        ["misConfTableMain", false],
        ["mcSpinner", true]
    ]);

    const lWeb = getElem("lWeb");
    const lCont = getElem("lCont");

    lWeb.innerHTML = "Task " + taskId + " build repo";
    lWeb.href = "http://git.altlinux.org/tasks/" + taskId + "/build/repo/";

    lCont.innerHTML = "Task " + taskId + " on webery.altlinux.org";
    lCont.href = "http://webery.altlinux.org/task/" + taskId;

    setVisible("linkBlock", true);

    let whatDepsUrl = appHost + "what_depends_src?task=" + taskId;
    sendRequest(whatDepsUrl, showWhatDeps);

    let misConfUrl = appHost + "misconflict_packages?task=" + taskId;
    sendRequest(misConfUrl, showMisConf);

    getElem("taskId").value = "";
}

function getColsName(list) {
    let cols = [];
    for (let i = 0; i < list.length; i++) {
        for (let k in list[i]) {
            if (cols.indexOf(k) === -1) {
                cols.push(k);
            }
        }
    }
    return cols;
}

function createTable(list) {
    let cols = getColsName(list);

    let table = document.createElement("table");

    let tr = table.insertRow(-1);

    for (let i = 0; i < cols.length; i++) {
        let theader = document.createElement("th");
        theader.innerHTML = cols[i];
        tr.appendChild(theader);
    }

    for (let i = 0; i < list.length; i++) {
        let trow = table.insertRow(-1);
        for (let j = 0; j < cols.length; j++) {
            let cell = trow.insertCell(-1);
            cell.innerHTML = list[i][cols[j]];
        }
    }

    return table;
}

function showTaskInfo(response) {
    if (response.includes("Error")) {
        setVisible("inputAlert", true);
        return;
    }

    response = JSON.parse(response);

    let taskMeta = {};
    ["user", "branch", "status", "task_msg"].forEach(elem => {
        taskMeta[elem] = JSON.stringify(response[0][elem]).replace(/"/g, "");
    });

    if (!taskMeta["task_msg"]) {
        taskMeta["task_msg"] = "no task message";
    }

    setElMessage("infoBlock",
        "<i><h6>" +
        "Task " + "<b>#" + taskId + "</b> " +
        "status <b>" + taskMeta["status"] + "</b></h6></i>");

    setElMessage("infoBlock",
        "<i><h6>Message: <b>" + taskMeta["task_msg"] + "</b></h6></i>",
        true);

    setElMessage("infoBlock",
        "<h5>" +
        "<span class='badge badge-secondary'>" + taskMeta["user"] + "</span>" + " " +
        "<span class='badge badge-info'>" + taskMeta["branch"] + "</span>" +
        "</h5>", true);

    setVisible("infoBlock", true);

    let list = [];
    let desc = [];
    for (let i in response) {
        let _item = response[i];

        let archs = [];
        for (let j in _item["task_content"]) {
            if (j !== "noarch") {
                let arch_link = "http://git.altlinux.org/tasks/" + taskId + "/build/" + _item["subtask"] + "/" + j;
                archs.push("<a target='_blank' href='" + arch_link + "'>" + j + "</a>");
            } else {
                archs.push(j);
            }
        }

        let descJson = {};
        let paoLink = "https://packages.altlinux.org/ru/sisyphus/srpms/" + _item["src_pkg"];
        descJson["name"] = "<a target='_blank' href='" + paoLink + "'>" + _item["src_pkg"] + "</a>";
        descJson["description"] = _item["description"];
        desc.push(descJson);

        let removeFields = ["description", "task_content", "branch", "user", "status", "task_msg"];
        for (let field in removeFields) {
            delete _item[removeFields[field]];
        }

        let subtask_link = "http://git.altlinux.org/tasks/" + taskId + "/gears/" + _item["subtask"] + "/git";

        _item["src_pkg"] = "<a target='_blank' href='" + subtask_link + "'>" + _item["src_pkg"] + "</a>";
        _item["archs"] = archs.join(", ");
        _item["version"] = _item["version"] + "-" + _item["release"];

        ["approve", "disapprove"].forEach(elem => {
            let msg = "";
            if (_item[elem][0]) {
                msg = _item[elem][0];
            }
            if (_item[elem][1]) {
                msg += "<br>" + "<b>" + _item[elem][1] + "</b> ";
            }
            if (_item[elem][2]) {
                msg += "<i>" + _item[elem][2] + "</i>";
            }

            _item[elem] = msg;
        });

        if (!_item["beehive_check"]) {
            _item["beehive_check"] = "<i>no beehive check result...</i>";
        }

        setElMessage("beehiveCheckLink", "Check beehive result #" + taskId);
        setElMessage("beehiveCheckMsg", "<pre>" + _item["beehive_check"] + "</pre>");

        delete _item["release"];
        delete _item["beehive_check"];

        list.push(_item);
    }

    desc.sort(function (a, b) {
        if (a.name > b.name) {
            return 1;
        }
        if (a.name < b.name) {
            return -1;
        }
        return 0;
    });

    let descEl = getElem("descTable");
    descEl.innerHTML = "";
    descEl.appendChild(createTable(desc));

    let el = getElem("taskContent");
    el.innerHTML = "";
    el.appendChild(createTable(list));

    setVisible("taskContent", true);
    setVisible("accordion", true);
}

function showWhatDeps(response) {
    if (response.length > 2) {
        response = JSON.parse(response);

        let list = [];
        for (let i in response) {
            response[i]["version"] = response[i]["version"] + "-" + response[i]["release"];

            let removeFields = ["release", "epoch", "serial_", "branch", "cycle", "requires", "archs"];
            for (let field in removeFields) {
                delete response[i][removeFields[field]];
            }

            response[i]["acl"] = response[i]["acl"].join(" ");

            list.push(response[i]);
        }


        setElMessage("resultRebuildLink", "RESULT #" + taskId);
        getElem("resultRebuildLink").href = "http://bb.ipa.basealt.ru/RESULT/" + taskId;

        let table = createTable(list);

        let el = getElem("whatDepsTable");
        el.innerHTML = "";
        el.appendChild(table);
        setVisible("whatDepsTableMain", true);
    } else {
        setElMessage("wdInfo", "<i>No information about dependencies...</i>");
        setVisible("wdInfo", true);
    }

    setVisible("wdsSpinner", false);
}

function showMisConf(response) {
    if (response.length > 2) {
        response = JSON.parse(response);

        let list = [];
        for (let i in response) {
            response[i]["version"] = response[i]["version"] + "-" + response[i]["release"];
            response[i]["files_with_conflict"] = response[i]["files_with_conflict"].join(", ");

            delete response[i]["release"];
            delete response[i]["epoch"];

            list.push(response[i]);
        }

        let table = createTable(list);

        let el = getElem("misConfTable");
        el.innerHTML = "";
        el.appendChild(table);
        setVisible("misConfTableMain", true);
    } else {
        setElMessage("mcInfo", "<i>No information about conflicts...</i>");
        setVisible("mcInfo", true);
    }

    setVisible("mcSpinner", false);
}
