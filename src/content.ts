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
import * as vscode from 'vscode';


/**
 * HTML executor.
 * 
 * @param {HtmlViewerExecutorArguments} args The arguments.
 * 
 * @return {HtmlViewerExecutorResult} The result.
 */
export type HtmlViewerExecutor = (args: HtmlViewerExecutorArguments) => HtmlViewerExecutorResult;

/**
 * Arguments for a HTML executor.
 */
export interface HtmlViewerExecutorArguments {
    /**
     * The cancellation token.
     */
    readonly cancelToken: vscode.CancellationToken;
    /**
     * The URI.
     */
    readonly uri: vscode.Uri;
    /**
     * 
     */
    readonly workspaceState: Object;
}

/**
 * The result of a HTML executor.
 */
export type HtmlViewerExecutorResult = string | Thenable<string>;

/**
 * A module that executes logic for a HTML content provider.
 */
export interface HtmlViewerModule {
    /**
     * The HTML executor.
     */
    readonly execute: HtmlViewerExecutor;
}


/**
 * HTML content provider.
 */
export class HtmlTextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    /**
     * Stores the underlying controller.
     */
    protected readonly _CONTROLLER: cj_controller.Controller;
    
    /**
     * Initializes a new instance of that class.
     * 
     * @param {cj_controller.Controller} controller The underlying controller instance.
     */
    constructor(controller: cj_controller.Controller) {
        this._CONTROLLER = controller;
    }

    /**
     * Gets the underlying controller.
     */
    public get controller(): cj_controller.Controller {
        return this._CONTROLLER;
    }

    /** @inheritdoc */
    public provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Thenable<string> {
        let me = this;
        
        return new Promise<string>((resolve, reject) => {
            let completed = cj_helpers.createSimplePromiseCompletedAction(resolve, reject);

            try {
                let htmlDocs = me.controller.htmlDocuments;

                let doc: cj_contracts.Document;

                let params = cj_helpers.uriParamsToObject(uri);

                let idValue = decodeURIComponent(cj_helpers.getUrlParam(params, 'id'));

                if (!cj_helpers.isEmptyString(idValue)) {
                    let id = idValue.trim();
                    
                    // search for document
                    for (let i = 0; i < htmlDocs.length; i++) {
                        let d = htmlDocs[i];

                        if (cj_helpers.toStringSafe(d.id).trim() == id) {
                            doc = d;
                            break;
                        }
                    }
                }

                let html = '';

                if (doc) {
                    if (doc.body) {
                        let enc = cj_helpers.normalizeString(doc.encoding);
                        if (!enc) {
                            enc = 'utf8';
                        }

                        html = doc.body.toString(enc);
                    }
                }

                completed(null, html);
            }
            catch (e) {
                completed(e);
            }
        });
    }
}
