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
     * Gets the object that stores global data for all script.
     */
    public get globalScriptStates(): Object {
        return this._globalScriptStates;
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

        let newJobList = [];

        let cfg = me.config;
        me._globalScriptStates = {};

        let jobs = cj_helpers.asArray(cfg.jobs)
                             .filter(x => x);

        jobs.forEach(x => {
            let newJob = new cj_objects.ConfigJob(x, me);
            newJobList.push(newJob);

            if (cj_helpers.toBooleanSafe(x.autoStart, true)) {
                newJob.start().then(() => {

                }, (err) => {
                    //TODO: log
                });
            }
        });

        this._jobs = newJobList;
    }
}
