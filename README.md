# vs-cron

[![Latest Release](https://vsmarketplacebadge.apphb.com/version-short/mkloubert.vs-cron.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-cron)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/mkloubert.vs-cron.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-cron)
[![Rating](https://vsmarketplacebadge.apphb.com/rating-short/mkloubert.vs-cron.svg)](https://marketplace.visualstudio.com/items?itemName=mkloubert.vs-cron#review-details)

[Visual Studio Code](https://code.visualstudio.com/) (VS Code) extension that runs tasks periodically.

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=W833F9G7EGBNY) [![](https://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?fid=o62pkd&url=https%3A%2F%2Fgithub.com%2Fmkloubert%2Fvs-cron)

1. [Install](#install-)
2. [How to use](#how-to-use-)
   * [Settings](#settings-)
     * [Jobs](#jobs-)
       * [Commands](#commands-)
        * [Scripts](#scripts-)
   * [Commands](#commands--1)
3. [Documentation](#documentation-)

## Install [[&uarr;](#table-of-contents)]

Launch VS Code Quick Open (Ctrl+P), paste the following command, and press enter:

```bash
ext install vs-cron
```

Or search for things like `vs-cron` in your editor.

## How to use [[&uarr;](#table-of-contents)]

### Settings [[&uarr;](#how-to-use-)]

Open (or create) your `settings.json` in your `.vscode` subfolder of your workspace.

Add a `cron.jobs` section:

```json
{
    "cron.jobs": {
    }
}
```

| Name | Description |
| ---- | --------- |
| `globals` | Global data available from everywhere. |
| `jobs` | One or more [job](#jobs-) to define. |
| `timeZone` | The custom default value for the timezone to use. |

#### Jobs [[&uarr;](#settings-)]

```json
{
    "cron.jobs": {
        "jobs": [
            {
                "name": "My AutoSave using CronTab format",
                "description": "Saves all opened files all 30 seconds.",
                
                "time": "*/30 * * * * *",
                "action": "workbench.action.files.saveAll"
            },
            
            {
                "name": "My Script using specific date",
                "description": "Runs a script at a specific time.",
                
                "format": "date",
                "time": "1979-09-05 23:09:00",
                "action": {
                    "type": "script",
                    "script": "./my-cron-script.js"
                }
            }
        ]
    }
}
```

| Name | Description |
| ---- | --------- |
| `action` | The [action](#actions-) to define. |
| `autoStart` | Run on startup or not. Default: `(false)` |
| `description` | The description for the job. |
| `format` | The format to use. Can be `crontab` or `date`. Default: `crontab` |
| `maximum` | The maximum number of executions. |
| `minimum` | The minimum number of ticks before the job does its first action. |
| `name` | The (display) name of the job. |
| `runParallel` | Indicates if this job can be run parallel to another or not. Default: `(false)` |
| `startDelay` | The start delay in milliseconds. |
| `time` | The time value that is used to configure the job. For `crontab` format, s. [cron module](https://www.npmjs.com/package/cron) |
| `timeZone` | The custom timezone to use. |
| `validFrom` | Defines the minumum time the job can be executed. |
| `validUntil` | Defines the maximum time the job can be executed. |

##### Actions [[&uarr;](#jobs-)]

The `action` can be a string, for executing a command, or an object with a `type` property:

| Value | Description |
| ---- | --------- |
| `command` | Execute a [command](#commands-). |
| `script` | Execute a [script](#scripts-). |

###### Commands [[&uarr;](#actions-)]

```json
{
    "cron.jobs": {
        "jobs": [
            {
                "name": "My AutoSave",
                "description": "Saves all opened files all 5 minutes.",
                
                "time": "*/5 * * * *",
                "action": {
                    "type": "command",
                    "command": "workbench.action.files.saveAll"
                }
            }
        ]
    }
}
```

The `action` property has the following format:

| Name | Description |
| ---- | --------- |
| `arguments` | Optional / required arguments for the command. |
| `command` | The ID of the command to execute. |

###### Scripts [[&uarr;](#actions-)]

```json
{
    "cron.jobs": {
        "globals": "Marcel K! Marcel K! Marcel K!",
    
        "jobs": [
            {
                "name": "My Script",
                "description": "Runs a script every minute.",

                "action": {
                    "type": "script",
                    "script": "./my-cron-script.js",
                    
                    "options": "TM",
                    "state": 23979
                }
            }
        ]
    }
}
```

The `action` property has the following format:

| Name | Description |
| ---- | --------- |
| `cached` | Store script (module) in cache or not. Default: `(false)` |
| `options` | Optional data for the execution. |
| `script` | The path to the script to execute. |
| `state` | The initial state value for the script. |

The `./my-cron-script.js` script file should look like this:

```javascript
exports.tick = function(args) {
    // access VS Code API (s. https://code.visualstudio.com/Docs/extensionAPI/vscode-api)
    var vscode = require('vscode');

    // access Node.js API provided by VS Code
    // s.  (s. https://nodejs.org/api/)
    var fs = require('fs');

    // access an own module
    var myModule = require('./my-module.js');

    // access a module used by the extension:
    // s. https://mkloubert.github.io/vs-cron/modules/_helpers_.html
    var helpers = args.require('./helpers');

    // access a module that is part of the extentsion
    // s. https://github.com/mkloubert/vs-cron/blob/master/package.json
    var moment = args.require('moment');
    
    // access the global data from the settings
    // 
    // from the example above this is: "Marcel K! Marcel K! Marcel K!"
    var globals = args.globals;

    // access the data from the settings
    // 
    // from the example above this is: "TM"
    var opts = args.options;

    // share / store data (while current session)...
    // ... for this script
    var myState = args.state;  // 23979 at the beginning (s. settings above)
    args.state = new Date();
    // ... with other scripts of this type
    args.globalState['myScript'] = new Date();
    
    // access permanent data storages
    // s. https://github.com/Microsoft/vscode/blob/master/src/vs/workbench/common/memento.ts
    var myAppWideValue = args.appState.get('myAppValue');  // app wide
    args.workspaceState.update('myWorkspaceValue', 'New workspace wide value');  // workspace wide
    
    // registers for a one-time event
    args.once('myEvent', function(v) {
        // 'v' should be 'Anders Hejlsberg'
        // if upcoming 'args.emit()' is called
        args.log("From 'myEvent': " + v);
    });
    
    // emit 'myEvent' event (s. above)
    args.emit('myEvent', 'Anders Hejlsberg');

    // open HTML document in new tab (for reports e.g.)
    args.openHtml('<html>This is an HTML document</html>', 'My HTML document').then(function() {
        // HTML opened
    }, function(err) {
        // opening HTML document failed
    });


    // ...
}
```

The `args` parameter uses the [JobScriptModuleExecutorArguments](https://mkloubert.github.io/vs-cron/interfaces/_contracts_.jobscriptmoduleexecutorarguments.html) interface.

You can return a number (sync execution), a [Promise](https://github.com/Microsoft/vscode-extension-vscode/blob/master/thenable.d.ts) or nothing (default exit code `0`).

### Commands [[&uarr;](#how-to-use-)]

Press `F1` to open the list of commands and enter one of the following commands:

![Demo How to execute](https://raw.githubusercontent.com/mkloubert/vs-cron/master/demos/demo1.gif)

| Name | Description | Command |
| ---- | ---- | --------- |
| `Cron Jobs: Restart all jobs` | Restarts all running jobs. | `extension.cronJons.restartRunningJobs` |
| `Cron Jobs: Restart job` | Restarts a specific job. | `extension.cronJons.restartJob` |
| `Cron Jobs: Start job` | Starts a specific job. | `extension.cronJons.startJob` |
| `Cron Jobs: Start all jobs` | Starts all non-running jobs. | `extension.cronJons.startNoRunningJobs` |
| `Cron Jobs: Stop all running jobs` | Stops all running jobs. | `extension.cronJons.stopRunningJobs` |
| `Cron Jobs: Stop job` | Stops a specific job. | `extension.cronJons.stopJob` |

## Documentation [[&uarr;](#table-of-contents)]

The full API documentation can be found [here](https://mkloubert.github.io/vs-cron/).
