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
import * as cj_controller from './controller';
import * as cj_helpers from './helpers';
const cron = require('cron');
import * as Moment from 'moment';
import * as vscode from 'vscode';


/**
 * A job based on config settins.
 */
export class ConfigJob implements vscode.Disposable {
    /**
     * Stores the underlying config entry.
     */
    protected readonly _CONFIG: cj_contracts.Job;
    /**
     * Stores the underlying controller.
     */
    protected readonly _CONTROLLER: cj_controller.Controller;
    /**
     * Stores the current job scheduler.
     */
    protected _scheduler: any;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {cj_contracts.Job} config The config entry.
     * @param {cj_controller.Controller} controller The underlying controller.
     */
    constructor(config: cj_contracts.Job, controller: cj_controller.Controller) {
        this._CONFIG = config;
        this._CONTROLLER = controller;
    }

    /**
     * Gets the underlying config entry.
     */
    public get config(): cj_contracts.Job {
        return this._CONFIG;
    }

    /**
     * Gets the underlying controller.
     */
    public get controller(): cj_controller.Controller {
        return this._CONTROLLER;
    }

    /** @inheritdoc */
    public dispose() {
        this.stopSync();
    }

    /**
     * Stops if the job is currently running or not.
     */
    public get isRunning(): boolean {
        let s = this._scheduler;
        return cj_helpers.toBooleanSafe(s && s.running);
    }

    /**
     * Starts the job.
     * 
     * @return {Thenable<boolean>} The promise.
     */
    public start(): Thenable<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let completed = cj_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                completed(null, me.startSync());
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Starts the job.
     * 
     * @returns {boolean} Job has been started or not.
     */
    protected startSync(): boolean {
        let me = this;

        let started: boolean;

        let s = me._scheduler;
        if (cj_helpers.toBooleanSafe(s && s.running)) {
            started = false;  // already running
        }
        else {
            let cfg = cj_helpers.cloneObject(me.config);
            if (!cfg) {
                cfg = {};
            }

            let jobAction = cfg.action;
            if (!jobAction) {
                jobAction = {};
            }
            if ('object' !== typeof jobAction) {
                let commandAction: cj_contracts.JobCommandAction = {
                    command: cj_helpers.toStringSafe(cfg.action),
                    type: "command",
                };

                jobAction = commandAction;
            }

            let format = cj_helpers.normalizeString(cfg.format);

            let cronTime: string | Date;
            switch (format) {
                case '':
                case 'crontab':
                    cronTime = cj_helpers.toStringSafe(cfg.config);
                    break;

                case 'date':
                    cronTime = Moment(cfg.config).toDate();
                    break;
            }

            let timeZone: string;
            if (cj_helpers.isEmptyString(timeZone)) {
                timeZone = undefined;
            }

            let isExecuting = false;
            let action: () => void;
            switch (cj_helpers.normalizeString(jobAction.type)) {
                case '':
                case 'command':
                    {
                        let jca = <cj_contracts.JobCommandAction>jobAction;
                        action = () => {
                            
                            try {
                                isExecuting = true;

                                let cmdArgs = [ cj_helpers.toStringSafe(jca.command) ];
                                if (jca.arguments) {
                                    cmdArgs = cmdArgs.concat( jca.arguments );
                                }

                                vscode.commands.executeCommand.apply(null, cmdArgs).then(() => {
                                    isExecuting = false;
                                }, (err) => {
                                    isExecuting = true;

                                    //TODO: log
                                });
                            }
                            catch (e) {
                                isExecuting = false;

                                throw e;
                            }
                        };
                    }
                    break;

                case 'script':
                    {
                        let jsa = <cj_contracts.JobScriptAction>jobAction;

                        let scriptState = jsa.state;
                        action = () => {
                            try {
                                isExecuting = true;
                                let tickerCompleted = (err: any, exitCode?: number) => {
                                    try {
                                        if (err) {
                                            //TODO: log
                                        }
                                        else {
                                            if (cj_helpers.isNullOrUndefined(exitCode)) {
                                                exitCode = 0;
                                            }

                                            exitCode = parseInt(cj_helpers.toStringSafe(exitCode).trim());
                                        }
                                    }
                                    finally {
                                        isExecuting = false;
                                    }
                                };

                                let scriptModule = cj_helpers.loadModuleSync<cj_contracts.JobScriptModule>(jsa.script,
                                                                                                           cj_helpers.toBooleanSafe(jsa.cached));
                                if (scriptModule) {
                                    let ticker = scriptModule.tick;
                                    if (ticker) {
                                        let tickerArgs: cj_contracts.JobScriptModuleExecutorArguments = {
                                            globals: me.controller.getGlobals(),
                                            globalState: undefined,
                                            isRunning: undefined,
                                            options: jsa.options,
                                            require: function(id) {
                                                return cj_helpers.requireModule(id);
                                            },
                                            start: function(delay?) {
                                                delay = parseInt(cj_helpers.toStringSafe(delay).trim());

                                                return new Promise<boolean>((resolve, reject) => {
                                                    let completed = cj_helpers.createSimplePromiseCompletedAction(resolve, reject);

                                                    let startJob = () => {
                                                        me.start().then((hasStarted) => {
                                                            completed(null, hasStarted);
                                                        }, (err) => {
                                                            completed(err);
                                                        });
                                                    }; 
                                            
                                                    if (isNaN(delay)) {
                                                        startJob();
                                                    }
                                                    else {
                                                        setTimeout(() => {
                                                            startJob();
                                                        }, delay);
                                                    }
                                                });
                                            },
                                            stop: function(delay?) {
                                                delay = parseInt(cj_helpers.toStringSafe(delay).trim());

                                                return new Promise<boolean>((resolve, reject) => {
                                                    let completed = cj_helpers.createSimplePromiseCompletedAction(resolve, reject);

                                                    let stopJob = () => {
                                                        me.stop().then((hasStopped) => {
                                                            completed(null, hasStopped);
                                                        }, (err) => {
                                                            completed(err);
                                                        });
                                                    };

                                                    if (isNaN(delay)) {
                                                        stopJob();
                                                    }
                                                    else {
                                                        setTimeout(() => {
                                                            stopJob();
                                                        }, delay);
                                                    }
                                                });
                                            },
                                            state: undefined,
                                        };

                                        // tickerArgs.globalState
                                        Object.defineProperty(tickerArgs, 'globalState', {
                                            enumerable: true,
                                            get: () => {
                                                return me.controller.globalScriptStates;
                                            }
                                        });

                                        // tickerArgs.isRunning
                                        Object.defineProperty(tickerArgs, 'isRunning', {
                                            enumerable: true,
                                            get: () => {
                                                return me.isRunning;
                                            }
                                        });

                                        // tickerArgs.state
                                        Object.defineProperty(tickerArgs, 'state', {
                                            enumerable: true,
                                            get: () => {
                                                return scriptState;
                                            },
                                            set: (newValue) => {
                                                scriptState = newValue;
                                            }
                                        });

                                        let tickerResult = ticker(tickerArgs);
                                        if (tickerResult) {
                                            if ('object' === typeof tickerResult) {
                                                tickerResult.then((ec) => {
                                                    tickerCompleted(null, ec);
                                                }, (err) => {
                                                    tickerCompleted(err);
                                                });
                                            }
                                            else {
                                                tickerCompleted(null, tickerResult);
                                            }
                                        }
                                        else {
                                            tickerCompleted(null, 0);
                                        }
                                    }
                                    else {
                                        // no function
                                        tickerCompleted(null);
                                    }
                                }
                                else {
                                    // no module
                                    tickerCompleted(null);
                                }
                            }
                            catch (e) {
                                isExecuting = false;

                                throw e;
                            }
                        };
                    }
                    break;

                default:
                    // unknown
                    action = () => {
                        try {
                            isExecuting = true;
                        }
                        finally {
                            isExecuting = false;
                        }
                    };
                    break;
            }

            let newJob = new cron.CronJob({
                cronTime: cronTime,
                onTick: () => {
                    try {
                        action();
                    }
                    catch (e) {
                        //TODO: log
                    }
                },
                start: false,
                timeZone: timeZone,
            });

            me._scheduler = newJob;
            newJob.start();

            started = true;
        }

        return started;
    }

    /**
     * Stops the job.
     * 
     * @return {Thenable<boolean>} The promise.
     */
    public stop(): Thenable<boolean> {
        let me = this;

        return new Promise<boolean>((resolve, reject) => {
            let completed = cj_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                completed(null, me.stopSync());
            }
            catch (e) {
                completed(e);
            }
        });
    }

    /**
     * Stops the job.
     * 
     * @returns {boolean} Job has been stopped or not.
     */
    protected stopSync(): boolean {
        let stopped = false;
        
        let oldScheduler = this._scheduler;
        if (cj_helpers.toBooleanSafe(oldScheduler && oldScheduler.running)) {
            oldScheduler.stop();

            stopped = true;
        }

        this._scheduler = null;
        return stopped;
    }
}
