# [DEPRECATED] Change Log (vs-cron)

## 3.0.0 (January 9th, 2019; FINAL VERSION => DEPRECATED)

* **the extension is now marked as DEPRECATED ... it is RECOMMENDED to use [vscode-powertools](https://marketplace.visualstudio.com/items?itemName=ego-digital.vscode-powertools) by [e.GO Digital](https://github.com/egodigital)**
* if you have suggestions and other kind of issues for that new extension, feel free to [open an issue here](https://github.com/egodigital/vscode-powertools/issues)

## 2.0.1 (October 14th, 2017; multi root support)

* started to refactor to new, upcoming [Multi Root Workspace API](https://github.com/Microsoft/vscode/wiki/Extension-Authoring:-Adopting-Multi-Root-Workspace-APIs)

## 1.5.0 (March 30th, 2017; filters)

* added `if`, `isFor` and `platforms` settings, that can define when a job is availble on a machine / system

## 1.4.0 (February 20th, 2017; deploy files)

* added [deploy](https://mkloubert.github.io/vs-cron/interfaces/_contracts_.jobscriptmoduleexecutorarguments.html#deploy) method to [JobScriptModuleExecutorArguments](https://mkloubert.github.io/vs-cron/interfaces/_contracts_.jobscriptmoduleexecutorarguments.html) which make use of `extension.deploy.filesTo` command, provided by [vs-deploy](https://github.com/mkloubert/vs-deploy) extension

## 1.2.0 (February 17th, 2017; new version popups)

* now showing popups for new installed versions of that extension, which can be deactivated by [disableNewVersionPopups](https://mkloubert.github.io/vs-cron/interfaces/_contracts_.configuration.html#disablenewversionpopups) property

## 1.1.0 (February 17th, 2017; additional commands and script extensions)

* added invisible `extension.cronJons.getJobs` command to receive [JobInfo](https://mkloubert.github.io/vs-cron/interfaces/_contracts_.jobinfo.html) objects
* added invisible `extension.cronJons.restartJobsByName` command to to re-start jobs by name
* added invisible `extension.cronJons.startJobsByName` command to to start jobs by name
* added invisible `extension.cronJons.stopJobsByName` command to to stop jobs by name
* added [previousValue](https://mkloubert.github.io/vs-cron/interfaces/_contracts_.jobscriptmoduleexecutorarguments.html#previousvalue) and [nextValue](https://mkloubert.github.io/vs-cron/interfaces/_contracts_.jobscriptmoduleexecutorarguments.html#nextvalue) properties to share data between two executions

## 1.0.0 (February 15th, 2017; initial release)

* have a look at the [README](https://github.com/mkloubert/vs-cron/blob/master/README.md) to learn more
