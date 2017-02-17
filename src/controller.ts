'use strict';

/// <reference types="node" />

// The MIT License (MIT)
// 
// vs-cron (https://github.com/mkloubert/vs-cron)
// Copyright (c) Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

import * as cj_contracts from './contracts';
import * as cj_helpers from './helpers';
import * as cj_objects from './objects';
import * as Moment from 'moment';
import * as vscode from 'vscode';


/**
 * The extension controller.
 */
export class Controller implements vscode.Disposable {
    /**
     * Stores the current configuration.
     */
    protected _config: cj_contracts.Configuration;
    /**
     * Stores the underlying extension context.
     */
    protected readonly _CONTEXT: vscode.ExtensionContext;
    /**
     * Stores the global state object for script.
     */
    protected _globalScriptStates: Object;
    /**
     * Stores HTML documents.
     */
    protected _htmlDocs: cj_contracts.Document[];
    /**
     * The current list of running jobs.
     */
    protected _jobs: cj_objects.ConfigJob[];
    /**
     * Stores the global output channel.
     */
    protected readonly _OUTPUT_CHANNEL: vscode.OutputChannel;
    /**
     * Stores the package file of that extension.
     */
    protected readonly _PACKAGE_FILE: cj_contracts.PackageFile;
    
    /**
     * Initializes a new instance of that class.
     * 
     * @param {vscode.ExtensionContext} context The underlying extension context.
     * @param {vscode.OutputChannel} outputChannel The global output channel to use.
     * @param {cj_contracts.PackageFile} pkgFile The package file of that extension.
     */
    constructor(context: vscode.ExtensionContext,
                outputChannel: vscode.OutputChannel,
                pkgFile: cj_contracts.PackageFile) {
        this._CONTEXT = context;
        this._OUTPUT_CHANNEL = outputChannel;
        this._PACKAGE_FILE = pkgFile;
    }

    /**
     * Gets the current configuration.
     */
    public get config(): cj_contracts.Configuration {
        return this._config;
    }

    /**
     * Gets the underlying extension context.
     */
    public get context(): vscode.ExtensionContext {
        return this._CONTEXT;
    }

    /** @inheritdoc */
    public dispose() {
    }

    /**
     * Returns a copy of the globals from the settings.
     * 
     * @returns {any} The global data.
     */
    public getGlobals(): any {
        return cj_helpers.cloneObject(this.config.globals);
    }

    /**
     * Returns a copy of the list of job job schedulers.
     * 
     * @returns {cj_contracts.JobScheduler[]} The list of schedulers.
     */
    public getJobSchedulers(): cj_contracts.JobScheduler[] {
        return this._jobs.map(x => x);
    }

    /**
     * Gets the object that stores global data for all script.
     */
    public get globalScriptStates(): Object {
        return this._globalScriptStates;
    }

    /**
     * Gets the list of HTML documents.
     */
    public get htmlDocuments(): cj_contracts.Document[] {
        return this._htmlDocs;
    }

    /**
     * Logs a message.
     * 
     * @param {any} msg The message to log.
     * 
     * @chainable
     */
    public log(msg: any): Controller {
        let now = Moment();

        this.outputChannel
            .appendLine(`[${now.format('YYYY-MM-DD HH:mm:ss')}] ${cj_helpers.toStringSafe(msg)}`);

        return this;
    }

    /**
     * Is invoked after extension has been activated.
     */
    public onActivated() {
        this.reloadConfiguration();
    }

    /**
     * Is invoked when extension will be deactivated.
     */
    public onDeactivate() {
        let jobs = cj_helpers.asArray(this._jobs)
                             .filter(x => x);

        jobs.forEach(x => {
            cj_helpers.tryDispose(x);
        });
    }

    /**
     * Event after configuration changed.
     */
    public onDidChangeConfiguration() {
        this.reloadConfiguration();
    }

    /**
     * Gets the global output channel.
     */
    public get outputChannel(): vscode.OutputChannel {
        return this._OUTPUT_CHANNEL;
    }

    /**
     * Gets the package file of that extension.
     */
    public get packageFile(): cj_contracts.PackageFile {
        return this._PACKAGE_FILE;
    }

    /**
     * Reloads configuration.
     */
    public reloadConfiguration() {
        let cfg = <cj_contracts.Configuration>vscode.workspace.getConfiguration("cron.jobs");

        this._config = cfg;
        this._htmlDocs = [];

        this.reloadJobs();
    }

    /**
     * Reloads the jobs.
     */
    protected reloadJobs() {
        let me = this;
        
        let oldJobs = cj_helpers.asArray(me._jobs)
                                .filter(x => x);

        oldJobs.forEach(x => {
            cj_helpers.tryDispose(x);
        });

        let newJobList: cj_objects.ConfigJob[] = [];

        let cfg = me.config;
        me._globalScriptStates = {};

        let jobs = cj_helpers.asArray(cfg.jobs)
                             .filter(x => x);

        jobs.forEach(x => {
            let newJob = new cj_objects.ConfigJob(x, me);
            newJobList.push(newJob);

            if (cj_helpers.toBooleanSafe(x.autoStart)) {
                newJob.start().then(() => {
                }, (err) => {
                    me.log(`[ERROR] Controller.reloadJobs(): ${cj_helpers.toStringSafe(err)}`);
                });
            }
        });

        me._jobs = newJobList;
    }

    /**
     * Restarts a specific job.
     * 
     * @returns {Thenable<false|cj_objects.ConfigJobQuickPickItem>} The promise. 
     */
    public restartJob(): Thenable<false | cj_objects.ConfigJobQuickPickItem> {
        let me = this;

        return new Promise<false | cj_objects.ConfigJobQuickPickItem>((resolve, reject) => {
            let completed = cj_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let quickPicks = cj_helpers.configJobsToQuickPicks(me._jobs
                                                                     .filter(x => x && x.isRunning));
                quickPicks.sort((x, y) => {
                    return cj_helpers.compareValues(cj_helpers.normalizeString(x.label),
                                                    cj_helpers.normalizeString(x.label));
                });
                                           
                if (quickPicks.length > 0) {
                    vscode.window.showQuickPick(quickPicks, {
                        placeHolder: 'Select the job you would like to RE-START...',
                    }).then(x => {
                        if (x) {
                            // first stop ...
                            x.job.stop().then(() => {
                                // ... then start
                                x.job.start().then(() => {
                                    completed(null, x);
                                }, (err) => {
                                    completed(err, x);
                                });
                            }, (err) => {
                                completed(err);
                            });
                        }
                        else {
                            completed(null);  // nothing selected
                        }
                    });
                }
                else {
                    completed(null, false);  // no items available
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Restarts all running jobs.
     * 
     * @returns {Thenable<cj_objects.ConfigJob[]>} The promise.
     */
    public restartRunningJobs(): Thenable<cj_objects.ConfigJob[]> {
        let me = this;
        
        return new Promise<cj_objects.ConfigJob[]>((resolve, reject) => {
            let completed = cj_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let restartedJobs: cj_objects.ConfigJob[] = [];
                let runningJobs = me._jobs.filter(x => x.isRunning);

                let nextJob: () => void;
                nextJob = () => {
                    if (runningJobs.length < 1) {
                        completed(null, restartedJobs);
                        return;
                    }

                    let j = runningJobs.shift();
                    
                    // first stop ...
                    j.stop().then(() => {
                        // ... and start again
                        j.start().then((hasStarted) => {
                            if (hasStarted) {
                                restartedJobs.push(j);
                            }

                            nextJob();
                        }, (err) => {
                            completed(err);
                        });
                    }, (err) => {
                        completed(err);
                    });
                };

                nextJob();
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Starts a specific job.
     * 
     * @returns {Thenable<false|cj_objects.ConfigJobQuickPickItem>} The promise. 
     */
    public startJob(): Thenable<false | cj_objects.ConfigJobQuickPickItem> {
        let me = this;

        return new Promise<false | cj_objects.ConfigJobQuickPickItem>((resolve, reject) => {
            let completed = cj_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let quickPicks = cj_helpers.configJobsToQuickPicks(me._jobs
                                                                     .filter(x => x && !x.isRunning));
                quickPicks.sort((x, y) => {
                    return cj_helpers.compareValues(cj_helpers.normalizeString(x.label),
                                                    cj_helpers.normalizeString(x.label));
                });
                                           
                if (quickPicks.length > 0) {
                    vscode.window.showQuickPick(quickPicks, {
                        placeHolder: 'Select the job you would like to START...',
                    }).then(x => {
                        if (x) {
                            x.job.start().then(() => {
                                completed(null, x);
                            }, (err) => {
                                completed(err, x);
                            });
                        }
                        else {
                            completed(null);  // nothing selected
                        }
                    });
                }
                else {
                    completed(null, false);  // no items available
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Starts all non-running jobs.
     * 
     * @returns {Thenable<cj_objects.ConfigJob[]>} The promise.
     */
    public startNoRunningJobs(): Thenable<cj_objects.ConfigJob[]> {
        let me = this;
        
        return new Promise<cj_objects.ConfigJob[]>((resolve, reject) => {
            let completed = cj_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let startedJobs: cj_objects.ConfigJob[] = [];
                let nonRunningJobs = me._jobs.filter(x => !x.isRunning);

                let nextJob: () => void;
                nextJob = () => {
                    if (nonRunningJobs.length < 1) {
                        completed(null, startedJobs);
                        return;
                    }

                    let j = nonRunningJobs.shift();
                    
                    j.start().then((hasStarted) => {
                        if (hasStarted) {
                            startedJobs.push(j);
                        }

                        nextJob();
                    }, (err) => {
                        completed(err);
                    });
                };

                nextJob();
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Stops a specific job.
     * 
     * @returns {Thenable<false|cj_objects.ConfigJobQuickPickItem>} The promise. 
     */
    public stopJob(): Thenable<false | cj_objects.ConfigJobQuickPickItem> {
        let me = this;

        return new Promise<false | cj_objects.ConfigJobQuickPickItem>((resolve, reject) => {
            let completed = cj_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let quickPicks = cj_helpers.configJobsToQuickPicks(me._jobs
                                                                     .filter(x => x && x.isRunning));
                quickPicks.sort((x, y) => {
                    return cj_helpers.compareValues(cj_helpers.normalizeString(x.label),
                                                    cj_helpers.normalizeString(x.label));
                });
                                           
                if (quickPicks.length > 0) {
                    vscode.window.showQuickPick(quickPicks, {
                        placeHolder: 'Select the job you would like to STOP...',
                    }).then(x => {
                        if (x) {
                            x.job.stop().then(() => {
                                completed(null, x);
                            }, (err) => {
                                completed(err, x);
                            });
                        }
                        else {
                            completed(null);  // nothing selected
                        }
                    });
                }
                else {
                    completed(null, false);  // no items available
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Stops all running jobs.
     * 
     * @returns {Thenable<cj_objects.ConfigJob[]>} The promise.
     */
    public stopRunningJobs(): Thenable<cj_objects.ConfigJob[]> {
        let me = this;
        
        return new Promise<cj_objects.ConfigJob[]>((resolve, reject) => {
            let completed = cj_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let stoppedJobs: cj_objects.ConfigJob[] = [];
                let runningJobs = me._jobs.filter(x => x.isRunning);

                let nextJob: () => void;
                nextJob = () => {
                    if (runningJobs.length < 1) {
                        completed(null, stoppedJobs);
                        return;
                    }

                    let j = runningJobs.shift();
                    
                    j.stop().then((hasStopped) => {
                        if (hasStopped) {
                            stoppedJobs.push(j);
                        }

                        nextJob();
                    }, (err) => {
                        completed(err);
                    });
                };

                nextJob();
            }
            catch (e) {
                completed(e);
            }
        });
    }
}
