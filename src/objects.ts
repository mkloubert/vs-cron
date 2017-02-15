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
import * as events from 'events';
import * as Moment from 'moment';
const momentTimeZone = require('moment-timezone');
import * as vscode from 'vscode';


/**
 * Name of the event that indicates if a job has been started.
 */
export const EVENT_JOB_STARTED = 'job.started';
/**
 * Name of the event that indicates if a job has been stopped.
 */
export const EVENT_JOB_STOPPED = 'job.stopped';

/**
 * A job based on config settins.
 */
export class ConfigJob extends events.EventEmitter implements vscode.Disposable {
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
        super();

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

        this.removeAllListeners();
    }

    /**
     * Gets if the job is currently running or not.
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
            let newScheduler: any;
            let isActive = true;

            let stopScheduler = () => {
                isActive = false;

                me.stop().then(() => {
                    //TODO
                }, (err) => {
                    //TODO: log
                });
            };

            let startedActions: Function[] = [];

            let cfg = me.config;

            let jobAction = cfg.action;
            if (!jobAction) {
                jobAction = {
                    type: "command",
                };
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
                    if (cj_helpers.isEmptyString(cronTime)) {
                        cronTime = '* * * * *';
                    }
                    break;

                case 'date':
                    cronTime = Moment(cfg.config).toDate();
                    break;
            }

            // timezone
            let timeZone = cj_helpers.toStringSafe(me.controller.config.timeZone).trim();
            let customTimeZone = cj_helpers.toStringSafe(cfg.timeZone).trim();
            if (!cj_helpers.isEmptyString(customTimeZone)) {
                timeZone = customTimeZone;  // use custom timezone for job
            }
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
                                            log: function(msg) {
                                                me.controller.log(msg);
                                                return this;
                                            },
                                            options: jsa.options,
                                            outputChannel: undefined,
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

                                        // tickerArgs.outputChannel
                                        Object.defineProperty(tickerArgs, 'outputChannel', {
                                            enumerable: true,
                                            get: () => {
                                                return me.controller.outputChannel;
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

            
            // start delay
            startedActions.push(() => {
                let startDelay = parseInt(cj_helpers.toStringSafe(cfg.startDelay));
                
                if (!isNaN(startDelay)) {
                    isActive = false;

                    setTimeout(() => {
                        isActive = true;
                    }, startDelay);
                }
            });

            let validFrom: Moment.Moment;
            if (!cj_helpers.isEmptyString(cfg.validFrom)) {
                let vf = cj_helpers.toStringSafe(cfg.validFrom);

                if (timeZone) {
                    validFrom = momentTimeZone.tz(vf, timeZone);
                }
                else {
                    validFrom = Moment(vf);
                }
            }

            let validUntil: Moment.Moment;
            if (!cj_helpers.isEmptyString(cfg.validUntil)) {
                let vu = cj_helpers.toStringSafe(cfg.validUntil);

                if (timeZone) {
                    validUntil = momentTimeZone.tz(vu, timeZone);
                }
                else {
                    validUntil = Moment(vu);
                }
            }

            let isValid = (): boolean => {
                let now = Moment();

                if (validFrom && validFrom.isValid()) {
                    if (now.isBefore(validFrom)) {
                        return false;  // not valid yet
                    }
                }

                if (validUntil && validUntil.isValid()) {
                    if (now.isAfter(validUntil)) {
                        // stop it to save resources
                        stopScheduler();
                        return false;  // not valid anymore
                    }
                }

                return true;
            };

            let maximum = parseInt(cj_helpers.toStringSafe(cfg.maximum).trim());
            let minimum = parseInt(cj_helpers.toStringSafe(cfg.minimum).trim());

            let counter = 0;

            newScheduler = new cron.CronJob({
                cronTime: cronTime,
                onTick: () => {
                    try {
                        if (!isActive) {
                            return;  // no active
                        }

                        if (!isValid()) {
                            return;  // no valid (anymore)
                        }

                        if (isExecuting) {
                            if (!cj_helpers.toBooleanSafe(cfg.runParallel)) {
                                // do not run while
                                // this job is executing
                                return;
                            }
                        }

                        ++counter;

                        if (!isNaN(minimum)) {
                            if (counter < minimum) {
                                return;
                            }
                        }

                        if (!isNaN(maximum)) {
                            if (counter > maximum) {
                                // stop it to save resources
                                stopScheduler();
                                return;
                            }
                        }
                        
                        action();
                    }
                    catch (e) {
                        //TODO: log
                    }
                },
                start: false,
                timeZone: timeZone,
            });

            newScheduler.start();

            startedActions.forEach(x => {
                x();
            });

            me._scheduler = newScheduler;

            started = true;
        }

        if (started) {
            try {
                me.emit(EVENT_JOB_STARTED);
            }
            catch (e) {
                cj_helpers.log(`[ERROR] objects.ConfigJob.startSync(): ${cj_helpers.toStringSafe(e)}`);
            }
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
        let me = this;

        let stopped = false;
        
        let oldScheduler = me._scheduler;
        if (cj_helpers.toBooleanSafe(oldScheduler && oldScheduler.running)) {
            oldScheduler.stop();
            stopped = true;

            me._scheduler = null;
        }

        if (stopped) {
            try {
                me.emit(EVENT_JOB_STOPPED);
            }
            catch (e) {
                cj_helpers.log(`[ERROR] objects.ConfigJob.stopSync(): ${cj_helpers.toStringSafe(e)}`);
            }
        }

        return stopped;
    }
}

/**
 * A quick pick item for a config job.
 */
export interface ConfigJobQuickPickItem extends vscode.QuickPickItem {
    /**
     * The underlying job.
     */
    job: ConfigJob;
}