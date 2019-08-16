const YAML = require('yamljs');
const colog = require("colog");
const { spawn } = require('child_process');
const process = require("process");
const fs = require("fs");

const args = process.argv.slice(2);

let restartDelay = 1000;
let file = null;
let runner = "node";

for (let i = 0; i < args.length; i++) {
    let a = args[i];

    if (a === "--cwd") {
        process.chdir(args[++i]);
    }
    else if (a === "--restart-delay") {
        restartDelay = +args[++i];
    }
    else if (a === "--config") {
        file = args[++i];
    }
    else if (a === "--runner") {
        runner = args[++i];
    }
}

if (!runner || !file) {
    colog.error("Invalid command");
    return;
}

console.log("Starting " + file + " " + runner + " in " + process.cwd());

const settings = YAML.load(file);

settings.apps.forEach(app => {
    runApp(app);
});

function runApp(app) {
    colog.info("Starting " + app.name);

    const instance = spawn(runner, [app.script]);

    instance.stdout.on('data', (data) => {
        colog.log(
            colog.colorGreen(`${app.name}`) +
            colog.colorWhite(`: ${data}`));
    });

    instance.stderr.on('data', (data) => {
        colog.error(`${app.name}: ${data}`);
    });

    instance.on('close', (code) => {
        colog.log(
            colog.colorRed(`${app.name}`) +
            colog.colorWhite(` exited with code ${code}`));

        setTimeout(() => runApp(app), restartDelay);
    });
}

setInterval(() => {
    try {
        if (fs.existsSync("./exit_app_runner")) {
            colog.info("Closing app runner...");
            fs.unlinkSync("./exit_app_runner");
            process.exit();
        }
    }
    catch (err) {
        colog.error(err);
    }
}, 10000);