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
   * [Commands](#commands-1)
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
                "description": "Saves all opened files all 5 minutes.",
                
                "time": "*/5 * * * *",
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

##### Commands [[&uarr;](#commands-)]

##### Scripts [[&uarr;](#scripts-)]

### Commands [[&uarr;](#how-to-use-)]
