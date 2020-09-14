let appHost = "http://127.0.0.1:5000/";

function sendRequest(url, success, async = true) {
    $.ajax({
        url: url,
        type: "GET",
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
        async: async
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

    let taskId = getElem("taskId").value;

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

    let user = JSON.stringify(response[0]["user"]).replace(/"/g, "");
    let branch = JSON.stringify(response[0]["branch"]).replace(/"/g, "");

    setElMessage("infoBlock", "<h5>" + "<span class='badge badge-secondary'>" + user + "</span>" +
        " " + "<span class='badge badge-info'>" + branch + "</span>" + "</h5>")
    setVisible("infoBlock", true);

    let list = [];
    let desc = [];
    for (let i in response) {
        let archs = [];
        for (let j in response[i]["task_content"]) {
            archs.push(j);
        }

        let descJson = {};
        descJson["name"] = response[i]["src_pkg"];
        descJson["description"] = response[i]["description"];
        desc.push(descJson);

        let removeFields = ["description", "task_content", "branch", "user"];
        for (let field in removeFields) {
            delete response[i][removeFields[field]];
        }

        response[i]["archs"] = archs.join(", ");
        response[i]["version"] = response[i]["version"] + "-" + response[i]["release"];

        delete response[i]["release"];

        list.push(response[i]);
    }

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

            let removeFields = ["release", "epoch", "serial_", "branch", "cycle", "requires"];
            for (let field in removeFields) {
                delete response[i][removeFields[field]];
            }

            response[i]["archs"] = response[i]["archs"].join(" ");
            response[i]["acl"] = response[i]["acl"].join(" ");

            list.push(response[i]);
        }

        let table = createTable(list);

        let el = getElem("whatDepsTable");
        el.innerHTML = "";
        el.appendChild(table);
        setVisible("whatDepsTableMain", true);
    } else {
        setElMessage("wdInfo", "No information about dependencies...");
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
        setElMessage("mcInfo", "No information about conflicts...");
        setVisible("mcInfo", true);
    }

    setVisible("mcSpinner", false);
}
