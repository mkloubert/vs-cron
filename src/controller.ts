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
     * Is invoked after extension has been activated.
     */
    public onActivated() {
        this.reloadConfiguration();
    }

    /**
     * Is invoked when extension will be deactivated.
     */
    public onDeactivate() {
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
    }
}
