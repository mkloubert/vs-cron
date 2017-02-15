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
import * as cj_objects from './objects';
import * as FS from 'fs';
import * as Moment from 'moment';
import * as Path from 'path';
import * as vscode from 'vscode';

/**
 * Describes a simple 'completed' action.
 * 
 * @param {any} [err] The occurred error.
 * @param {TResult} [result] The result.
 */
export type SimpleCompletedAction<TResult> = (err?: any, result?: TResult) => void;


let nextHtmlDocId = -1;

/**
 * Returns a value as array.
 * 
 * @param {T | T[]} val The value.
 * 
 * @return {T[]} The value as array.
 */
export function asArray<T>(val: T | T[]): T[] {
    if (!Array.isArray(val)) {
        return [ val ];
    }

    return val;
}

/**
 * Clones an object / value deep.
 * 
 * @param {T} val The value / object to clone.
 * 
 * @return {T} The cloned value / object.
 */
export function cloneObject<T>(val: T): T {
    if (!val) {
        return val;
    }

    return JSON.parse(JSON.stringify(val));
}

/**
 * Compares two values for a sort operation.
 * 
 * @param {T} x The left value.
 * @param {T} y The right value.
 * 
 * @return {number} The "sort value".
 */
export function compareValues<T>(x: T, y: T): number {
    if (x === y) {
        return 0;
    }

    if (x > y) {
        return 1;
    }

    if (x < y) {
        return -1;
    }

    return 0;
}

/**
 * Converts config jobs to quick pick items.
 * 
 * @param {cj_objects.ConfigJob|cj_objects.ConfigJob[]} jobs The jobs to convert.
 * 
 * @returns {cj_objects.ConfigJobQuickPickItem[]} The quick pick items.
 */
export function configJobsToQuickPicks(jobs: cj_objects.ConfigJob | cj_objects.ConfigJob[]): cj_objects.ConfigJobQuickPickItem[] {
    return asArray(jobs).filter(x => x).map((x, i) => {
        let label = toStringSafe(x.config.name).trim();
        if (!label) {
            label = `Cron Job #${i + 1}`;
        }

        let description = toStringSafe(x.config.description).trim();

        let detail = toStringSafe(x.config.__detail);
        if (isEmptyString(detail)) {
            detail = undefined;
        }

        return {
            description: description,
            detail: detail,
            job: x,
            label: label,
        };
    });
}

/**
 * Creates a simple 'completed' callback for a promise.
 * 
 * @param {Function} resolve The 'succeeded' callback.
 * @param {Function} reject The 'error' callback.
 * 
 * @return {SimpleCompletedAction<TResult>} The created action.
 */
export function createSimplePromiseCompletedAction<TResult>(resolve: (value?: TResult | PromiseLike<TResult>) => void,
                                                            reject?: (reason: any) => void): SimpleCompletedAction<TResult> {
    return (err?, result?) => {
        if (err) {
            if (reject) {
                reject(err);
            }
        }
        else {
            if (resolve) {
                resolve(result);
            }
        }
    };
}

/**
 * Returns the value from a "parameter" object.
 * 
 * @param {Object} params The object.
 * @param {string} name The name of the parameter.
 * 
 * @return {string} The value of the parameter (if found).
 */
export function getUrlParam(params: Object, name: string): string {
    if (params) {
        name = normalizeString(name);

        for (let p in params) {
            if (normalizeString(p) == name) {
                return toStringSafe(params[p]);
            }
        }
    }
}

/**
 * Checks if the string representation of a value is empty
 * or contains whitespaces only.
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is empty or not.
 */
export function isEmptyString(val: any): boolean {
    return '' === toStringSafe(val).trim();
}

/**
 * Checks if a value is (null) or (undefined).
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is (null)/(undefined) or not.
 */
export function isNullOrUndefined(val: any): boolean {
    return null === val ||
           'undefined' === typeof val;
}

/**
 * Loads a module.
 * 
 * @param {string} file The path of the module's file.
 * @param {boolean} useCache Use cache or not.
 * 
 * @return {TModule} The loaded module.
 */
export function loadModuleSync<TModule extends cj_contracts.ScriptModule>(file: string, useCache: boolean = false): TModule {
    if (!Path.isAbsolute(file)) {
        file = Path.join(vscode.workspace.rootPath, file);
    }
    file = Path.resolve(file);

    let stats = FS.lstatSync(file);
    if (!stats.isFile()) {
        // TODO: throw new Error(i18.t('isNo.file', file));
        throw new Error(`${file} is NO file!`);
    }

    if (!useCache) {
        delete require.cache[file];  // remove from cache
    }
    
    return require(file);
}

/**
 * Logs a message.
 * 
 * @param {any} msg The message to log.
 */
export function log(msg: any) {
    let now = Moment();

    msg = toStringSafe(msg);
    console.log(`[vs-cron :: ${now.format('YYYY-MM-DD HH:mm:ss')}] => ${msg}`);
}

/**
 * Opens a HTML document in a new tab for a document storage.
 * 
 * @param {cj_contracts.Document[]} storage The storage to open for.
 * @param {string} html The HTML document (source code).
 * @param {string} [title] The custom title for the tab.
 * @param {any} [id] The custom ID for the document in the storage.
 * 
 * @returns {Thenable<any>} The promise.
 */
export function openHtmlDocument(storage: cj_contracts.Document[],
                                 html: string, title?: string, id?: any): Thenable<any> {
    return new Promise((resolve, reject) => {
        let completed = createSimplePromiseCompletedAction(resolve, reject);

        try {
            let body: Buffer;
            let enc = 'utf8';
            if (html) {
                body = new Buffer(toStringSafe(html), enc);
            }

            if (isNullOrUndefined(id)) {
                id = 'vscjGlobalHtmlDocs::660e0c72-ef45-4305-b82c-fec885062295::' + (++nextHtmlDocId);
            }

            let doc: cj_contracts.Document = {
                body: body,
                encoding: enc,
                id: id,
                mime: 'text/html',
            };

            if (!isEmptyString(title)) {
                doc.title = toStringSafe(title).trim();
            }

            if (storage) {
                storage.push(doc);
            }

            vscode.commands.executeCommand('extension.cronJons.openHtmlDoc', doc).then((result: any) => {
                completed(null, result);
            }, (err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}

/**
 * Normalizes a value as string so that is comparable.
 * 
 * @param {any} val The value to convert.
 * @param {(str: string) => string} [normalizer] The custom normalizer.
 * 
 * @return {string} The normalized value.
 */
export function normalizeString(val: any, normalizer?: (str: string) => string): string {
    if (!normalizer) {
        normalizer = (str) => str.toLowerCase().trim();
    }

    return normalizer(toStringSafe(val));
}

/**
 * Removes documents from a storage.
 * 
 * @param {cj_contracts.Document|cj_contracts.Document[]} docs The document(s) to remove.
 * @param {cj_contracts.Document[]} storage The storage.
 * 
 * @return {cj_contracts.Document[]} The removed documents.
 */
export function removeDocuments(docs: cj_contracts.Document | cj_contracts.Document[],
                                storage: cj_contracts.Document[]): cj_contracts.Document[] {
    let ids = asArray(docs).filter(x => x)
                           .map(x => x.id);

    let removed = [];

    if (storage) {
        for (let i = 0; i < storage.length; ) {
            let d = storage[i];
            if (ids.indexOf(d.id) > -1) {
                removed.push(d);
                storage.splice(i, 1);
            }
            else {
                ++i;
            }
        }
    }

    return removed;
}

/**
 * Loads a module from the extension context.
 * 
 * @param {string} id The ID / path of the module.
 * 
 * @return {any} The loaded module.
 */
export function requireModule(id: string) {
    return require(toStringSafe(id));
}

/**
 * Converts a value to a boolean.
 * 
 * @param {any} val The value to convert.
 * @param {any} defaultValue The value to return if 'val' is (null) or (undefined).
 * 
 * @return {boolean} The converted value.
 */
export function toBooleanSafe(val: any, defaultValue: any = false): boolean {
    if (isNullOrUndefined(val)) {
        return defaultValue;
    }

    return !!val;
}

/**
 * Converts a value to a string that is NOT (null) or (undefined).
 * 
 * @param {any} str The input value.
 * @param {any} defValue The default value.
 * 
 * @return {string} The output value.
 */
export function toStringSafe(str: any, defValue: any = ''): string {
    if (isNullOrUndefined(str)) {
        str = '';
    }
    str = '' + str;
    if (!str) {
        str = defValue;
    }

    return str;
}

/**
 * Tries to dispose an object.
 * 
 * @param {vscode.Disposable} obj The object to dispose.
 * 
 * @return {boolean} Operation was successful or not.
 */
export function tryDispose(obj: vscode.Disposable): boolean {
    try {
        if (obj) {
            obj.dispose();
        }

        return true;
    }
    catch (e) {
        log(`[ERROR] helpers.tryDispose(): ${toStringSafe(e)}`);

        return false;
    }
}

/**
 * Extracts the query parameters of an URI to an object.
 * 
 * @param {vscode.Uri} uri The URI.
 * 
 * @return {Object} The parameters of the URI as object.
 */
export function uriParamsToObject(uri: vscode.Uri): Object {
    if (!uri) {
        return uri;
    }

    let params: any;
    if (!isEmptyString(uri.query)) {
        // s. https://css-tricks.com/snippets/jquery/get-query-params-object/
        params = uri.query.replace(/(^\?)/,'')
                          .split("&")
                          .map(function(n) { return n = n.split("="), this[normalizeString(n[0])] =
                                                                           toStringSafe(decodeURIComponent(n[1])), this}
                          .bind({}))[0];
    }

    if (!params) {
        params = {};
    }

    return params;
}
