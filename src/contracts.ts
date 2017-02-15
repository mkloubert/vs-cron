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


/**
 * App settings
 */
export interface Configuration {
    /**
     * Data that is available everywhere, in scripts e.g.
     */
    globals?: any;
    /**
     * One or more job to configure.
     */
    jobs?: Job | Job[];
}

/**
 * Settings for a job.
 */
export interface Job {
    /**
     * The command / action to invoke.
     */
    action?: string | JobAction;
    /**
     * Directly run on startup or not.
     */
    autoStart?: boolean;
    /**
     * The value to configure the job.
     */
    config?: string;
    /**
     * Format.
     */
    format?: string;
    /**
     * The custom timezone to use.
     */
    timeZone?: string;
}

/**
 * A job action.
 */
export interface JobAction {
    type?: string;
}

/**
 * A job action for running a command.
 */
export interface JobCommandAction extends JobAction {
    /**
     * The optional arguments for the execution.
     */
    arguments?: any[];
    /**
     * The ID of the command to execute.
     */
    command: string;
}

/**
 * A job action for running a script.
 */
export interface JobScriptAction extends JobAction {
    /**
     * Store script (module) in cache or not.
     */
    cached?: boolean;
    /**
     * Optional data for the execution.
     */
    options?: any;
    /**
     * The path to the script to execute.
     */
    script: string;
    /**
     * The initial state value for the script.
     */
    state?: any;
}

/**
 * A script module of a job.
 */
export interface JobScriptModule extends ScriptModule {
    /**
     * The action for a job tick.
     */
    tick: JobScriptModuleExecutor;
}

/**
 * Describes a function that is executed on a job tick.
 * 
 * @param {JobScriptModuleExecutorArguments} args The arguments for the execution.
 * 
 * @returns {JobScriptModuleExecutorResult} The result.
 */
export type JobScriptModuleExecutor = (args: JobScriptModuleExecutorArguments) => JobScriptModuleExecutorResult;

/**
 * The result of a job tick.
 */
export type JobScriptModuleExecutorResult = Thenable<number> | number | void;

/**
 * The arguments for a job tick.
 */
export interface JobScriptModuleExecutorArguments extends ScriptArguments {
}

/**
 * Describes the structure of the package file of that extenstion.
 */
export interface PackageFile {
    /**
     * The display name.
     */
    displayName: string;
    /**
     * The (internal) name.
     */
    name: string;
    /**
     * The version string.
     */
    version: string;
}

/**
 * Script arguments.
 */
export interface ScriptArguments {
    /**
     * The global data from the settings.
     */
    readonly globals: any;
    /**
     * Gets an object that stores data for all scripts.
     */
    readonly globalState: Object;
    /**
     * Gets if the underlying job is currently running or not.
     */
    readonly isRunning: boolean;
    /**
     * Additional / optional data for the execution.
     */
    readonly options: any;
    /**
     * Loads a module from the script context.
     * 
     * @param {string} id The ID of the module.
     * 
     * @returns any The loaded module.
     */
    readonly require: (id: string) => any;
    /**
     * Starts the underlying job.
     * 
     * @param {number} [delay] The delay in milliseconds.
     * 
     * @return {Thenable<boolean>} The promise.
     */
    readonly start: (delay?: number) => Thenable<boolean>;
    /**
     * Stops the underlying job.
     * 
     * @param {number} [delay] The delay in milliseconds.
     * 
     * @return {Thenable<boolean>} The promise.
     */
    readonly stop: (delay?: number) => Thenable<boolean>;
    /**
     * Gets or sets a value for the script that is available while the current session.
     */
    state: any;
}

/**
 * A script module.
 */
export interface ScriptModule {
}
