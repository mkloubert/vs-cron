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

import * as vscode from 'vscode';


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
    /**
     * The default timezone to use.
     */
    timeZone?: string;
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
     * A description for the job.
     */
    description?: string;
    /**
     * Format.
     */
    format?: string;
    /**
     * The maximum number of executions.
     */
    maximum?: number;
    /**
     * The minimum number of ticks before the job does its first action.
     */
    minimum?: number;
    /**
     * The (display) name of the job.
     */
    name?: string;
    /**
     * Indicates if this job can ran parallel to another or not.
     */
    runParallel?: boolean;
    /**
     * The start delay in milliseconds.
     */
    startDelay?: number;
    /**
     * The custom timezone to use.
     */
    timeZone?: string;
    /**
     * Defines the minumum time the job can be executed.
     */
    validFrom?: string;
    /**
     * Defines the maximum time the job can be executed.
     */
    validUntil?: string;
}

/**
 * A job action.
 */
export interface JobAction {
    /**
     * Type of the action.
     */
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
     * Events an event.
     * 
     * @param {string} event The event to emit.
     * @param {any[]} [args] Additional arguments for the event.
     * 
     * @returns {boolean} Event was emitted or not.
     */
    readonly emit: (event: string | Symbol, ...args: any[]) => boolean;
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
     * Logs a message.
     * 
     * @param {any} msg The message to log.
     * 
     * @chainable
     */
    readonly log: (msg: any) => ScriptArguments;
    /**
     * Registers for an event.
     * 
     * @param {string|Symbol} event The event to register for.
     * @param {Function} listener The event listener.
     * 
     * @chainable
     */
    readonly on: (event: string | Symbol, listener: Function) => ScriptArguments;
    /**
     * Registers for an one-time event.
     * 
     * @param {string|Symbol} event The event to register for.
     * @param {Function} listener The event listener.
     * 
     * @chainable
     */
    readonly once: (event: string | Symbol, listener: Function) => ScriptArguments;
    /**
     * Additional / optional data for the execution.
     */
    readonly options: any;
    /**
     * Gets the output channel the script can use.
     */
    readonly outputChannel: vscode.OutputChannel;
    /**
     * Registers for an one-time event.
     * 
     * @param {string|Symbol} event The event to register for.
     * @param {Function} listener The event listener.
     * 
     * @chainable
     */
    readonly removeListener: (event: string | Symbol, listener: Function) => ScriptArguments;
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
