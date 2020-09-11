let appHost = "http://127.0.0.1:5000/";

function sendRequest(url, success, async = true) {
    $.ajax({
        url: url,
        type: "GET",
        success: function (result) {
            success(result);
        },
        error: function (error) {
            document.getElementById("alert").innerHTML = "Server error";
            document.getElementById("inputAlert").hidden = false;
            document.getElementById("linkBlock").hidden = true;
        },
        async: async
    });
}

function submitTask() {
    document.getElementById("linkBlock").hidden = true;
    document.getElementById("accordion").hidden = true;

    let inpAlert = document.getElementById("inputAlert");
    inpAlert.hidden = true;

    let taskId = document.getElementById("taskId").value;

    if (taskId != parseInt(taskId, 10)) {
        inpAlert.hidden = false;
        document.getElementById("taskId").value = "";
        return
    }

    const lAlt = document.getElementById("lAlt");

    lAlt.innerHTML = "Task " + taskId + " on git.altlinux.org";
    lAlt.href = "http://git.altlinux.org/tasks/" + taskId;

    let mainSpinner = document.getElementById("mainSpinner");
    mainSpinner.hidden = false;

    let taskInfoUrl = appHost + "task_info?task=" + taskId;
    sendRequest(taskInfoUrl, showTaskInfo, false);

    if (inpAlert.hidden === false) {
        mainSpinner.hidden = true;
        return;
    }

    mainSpinner.hidden = true;

    $("#tableTask").hide();
    $("#whatDepsTable tr").remove();
    document.getElementById("mcInfo").hidden = true;
    document.getElementById("wdsSpinner").hidden = false;
    document.getElementById("mcSpinner").hidden = false;

    const lWeb = document.getElementById("lWeb");
    const lCont = document.getElementById("lCont");

    lWeb.innerHTML = "Task " + taskId + " build repo";
    lWeb.href = "http://git.altlinux.org/tasks/" + taskId + "/build/repo/";

    lCont.innerHTML = "Task " + taskId + " on webery.altlinux.org";
    lCont.href = "http://webery.altlinux.org/task/" + taskId;

    document.getElementById("linkBlock").hidden = false;

    let whatDepsUrl = appHost + "what_depends_src?task=" + taskId;
    sendRequest(whatDepsUrl, showWhatDeps);

    let misConfUrl = appHost + "misconflict_packages?task=" + taskId;
    sendRequest(misConfUrl, showMisConf);

    document.getElementById("taskId").value = "";
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
        document.getElementById("inputAlert").hidden = false;
        return;
    }

    response = JSON.parse(response);

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

        let removeFields = ["description", "task_content", "branch", "user"]
        for (let field in removeFields) {
            delete response[i][removeFields[field]];
        }

        response[i]["archs"] = archs.join(", ");
        response[i]["version"] = response[i]["version"] + "-" + response[i]["release"];

        delete response[i]["release"];

        list.push(response[i]);
    }

    let descEl = document.getElementById("descTable");
    descEl.innerHTML = "";
    descEl.appendChild(createTable(desc));

    let el = document.getElementById("tableTask");
    el.innerHTML = "";
    el.appendChild(createTable(list));

    $("#tableTask").show();

    document.getElementById("accordion").hidden = false;
}

function showWhatDeps(response) {
    response = JSON.parse(response);

    let list = [];
    for (let i in response) {
        let removeFields = ["epoch", "serial_", "branch", "cycle", "requires"];
        for (let field in removeFields) {
            delete response[i][removeFields[field]];
        }

        response[i]["archs"] = response[i]["archs"].join(" ");
        response[i]["acl"] = response[i]["acl"].join(" ");

        list.push(response[i]);
    }

    let table = createTable(list);

    let el = document.getElementById("whatDepsTable");
    el.innerHTML = "";
    el.appendChild(table);

    document.getElementById("wdsSpinner").hidden = true;
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

        let el = document.getElementById("misConfTable");
        el.innerHTML = "";
        el.appendChild(table);
    } else {
        document.getElementById("mcInfo").hidden = false;
        document.getElementById("mcInfo").innerHTML = "No information about conflicts...";
    }

    document.getElementById("mcSpinner").hidden = true;
}
