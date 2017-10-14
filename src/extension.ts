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

import * as cj_content from './content';
import * as cj_controller from './controller';
import * as cj_contracts from './contracts';
import * as cj_helpers from './helpers';
import * as cj_workspace from './workspace';
import * as FS from 'fs';
import * as Moment from 'moment';
import * as Path from 'path';
import * as vscode from 'vscode';


let controller: cj_controller.Controller;

export function activate(context: vscode.ExtensionContext) {
    let now = Moment();

    // package file
    let pkgFile: cj_contracts.PackageFile;
    try {
        pkgFile = JSON.parse(FS.readFileSync(Path.join(__dirname, '../../package.json'), 'utf8'));
    }
    catch (e) {
        cj_helpers.log(`[ERROR] extension.activate(): ${cj_helpers.toStringSafe(e)}`);
    }

    let outputChannel = vscode.window.createOutputChannel("Cron Jobs");

    // show infos about the app
    {
        if (pkgFile) {
            outputChannel.appendLine(`${pkgFile.displayName} (${pkgFile.name}) - v${pkgFile.version}`);
        }

        outputChannel.appendLine(`Copyright (c) ${now.format('YYYY')}  Marcel Joachim Kloubert <marcel.kloubert@gmx.net>`);
        outputChannel.appendLine('');
        outputChannel.appendLine(`GitHub : https://github.com/mkloubert/vs-cron`);
        outputChannel.appendLine(`Twitter: https://twitter.com/mjkloubert`);
        outputChannel.appendLine(`Donate : [PayPal] https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=W833F9G7EGBNY`);
        outputChannel.appendLine(`         [Flattr] https://flattr.com/submit/auto?fid=o62pkd&url=https%3A%2F%2Fgithub.com%2Fmkloubert%2Fvs-cron`);

        outputChannel.appendLine('');
    }

    controller = new cj_controller.Controller(context, outputChannel, pkgFile);
    cj_workspace.resetSelectedWorkspaceFolder();

    let showPopupMessage = (popupMsg: string, popupAction: (m: string) => Thenable<string>) => {
        popupMsg = cj_helpers.toStringSafe(popupMsg).trim();

        outputChannel.appendLine(popupMsg);
        popupAction(`[vs-cron] ${popupMsg}`).then(() => {
        }, (err) => {
            cj_helpers.log(`[ERROR] extension.activate().showPopupMessage(): ${cj_helpers.toStringSafe(err)}`);
        });
    };

    // get jobs
    let getJobs = vscode.commands.registerCommand('extension.cronJons.getJobs', (cb: (err: any, result: cj_contracts.JobInfo[]) => void) => {
        try {
            let jobInfos = controller.getJobSchedulers().map(s => {
                let le = s.lastExecution;

                return {
                    description: s.description,
                    detail: s.detail,
                    isRunning: s.isRunning,
                    lastExecution: le ? le.utc().toISOString() : null,
                    name: s.name,
                };
            });

            if (cb) {
                cb(null, jobInfos);
            }
        }
        catch (e) {
            cj_helpers.log(`[ERROR] extension.cronJons.getJobs(): ${e}`);
        }
    });

    // open HTML document
    let openHtmlDoc = vscode.commands.registerCommand('extension.cronJons.openHtmlDoc', (doc: cj_contracts.Document) => {
        try {
            let htmlDocs = controller.htmlDocuments;

            let url = vscode.Uri.parse(`vs-cron-html://authority/?id=${encodeURIComponent(cj_helpers.toStringSafe(doc.id))}` + 
                                       `&x=${encodeURIComponent(cj_helpers.toStringSafe(new Date().getTime()))}`);

            let title = cj_helpers.toStringSafe(doc.title).trim();
            if (!title) {
                title = `[vs-cron] HTML document #${cj_helpers.toStringSafe(doc.id)}`;
            }

            vscode.commands.executeCommand('vscode.previewHtml', url, vscode.ViewColumn.One, title).then((success) => {
                cj_helpers.removeDocuments(doc, htmlDocs);
            }, (err) => {
                cj_helpers.removeDocuments(doc, htmlDocs);

                cj_helpers.log(`[ERROR] extension.cronJons.openHtmlDoc(2): ${err}`);
            });
        }
        catch (e) {
            cj_helpers.log(`[ERROR] extension.cronJons.openHtmlDoc(1): ${e}`);
        }
    });

    let restartRunning = vscode.commands.registerCommand('extension.cronJons.restartRunningJobs', () => {
        controller.restartRunningJobs().then((restartedJobs) => {
            let popupMsg: string;
            if (restartedJobs.length < 1) {
                popupMsg = 'NO job has been RE-STARTED.';
            }
            else if (1 == restartedJobs.length) {
                popupMsg = 'One job has been RE-STARTED.';
            }
            else {
                popupMsg = `${restartedJobs.length} jobs have been RE-STARTED.`;
            }

            showPopupMessage(popupMsg,
                             vscode.window.showInformationMessage);
        }, (err) => {
            showPopupMessage(`Could not RE-START RUNNING jobs: ${cj_helpers.toStringSafe(err)}`,
                             vscode.window.showErrorMessage);
        });
    });

    // re-starts a job
    let restartJob = vscode.commands.registerCommand('extension.cronJons.restartJob', () => {
        controller.restartJob().then((selectedJob) => {
            if (false === selectedJob) {
                showPopupMessage('There is no job that can be RE-STARTED.',
                                 vscode.window.showWarningMessage);
            }
            else if (selectedJob) {
                showPopupMessage(`Job '${selectedJob.label}' has been RE-STARTED.`,
                                 vscode.window.showInformationMessage);
            }
        }, (err) => {
            showPopupMessage(`Could not RE-START job: ${cj_helpers.toStringSafe(err)}`,
                             vscode.window.showErrorMessage);
        });
    });

    // re-starts jobs by name
    let restartJobsByName = vscode.commands.registerCommand('extension.cronJons.restartJobsByName', (jobNames: cj_contracts.JobNames) => {
        try {
            jobNames = cj_helpers.asArray(jobNames).map(x => cj_helpers.normalizeString(x)).filter(x => x);
            jobNames = cj_helpers.distinctArray(jobNames);

            jobNames.forEach(jn => {
                let schedulersToRestart = controller.getJobSchedulers()
                                                    .filter(x => cj_helpers.normalizeString(x.name) === jn);

                schedulersToRestart.forEach(s => {
                    let startScheduler = () => {
                        s.start().then((hasStarted) => {
                            //TODO
                        }, (err) => {
                            cj_helpers.log(`[ERROR] extension.cronJons.restartJobsByName(3): ${err}`);
                        });
                    };

                    if (s.isRunning) {
                        // first stop ...
                        s.stop().then((hasStopped) => {
                            // then start...
                            startScheduler();
                        }, (err) => {
                            cj_helpers.log(`[ERROR] extension.cronJons.restartJobsByName(2): ${err}`);
                        });
                    }
                    else {
                        startScheduler();
                    }
                });
            });
        }
        catch (e) {
            cj_helpers.log(`[ERROR] extension.cronJons.restartJobsByName(1): ${e}`);
        }
    });

    // starts a job
    let startJob = vscode.commands.registerCommand('extension.cronJons.startJob', () => {
        controller.startJob().then((selectedJob) => {
            if (false === selectedJob) {
                showPopupMessage('There is no job that can be STARTED.',
                                 vscode.window.showWarningMessage);
            }
            else if (selectedJob) {
                showPopupMessage(`Job '${selectedJob.label}' has been STARTED.`,
                                 vscode.window.showInformationMessage);
            }
        }, (err) => {
            showPopupMessage(`Could not START job: ${cj_helpers.toStringSafe(err)}`,
                             vscode.window.showErrorMessage);
        });
    });

    // starts jobs by name
    let startJobsByName = vscode.commands.registerCommand('extension.cronJons.startJobsByName', (jobNames: cj_contracts.JobNames) => {
        try {
            jobNames = cj_helpers.asArray(jobNames).map(x => cj_helpers.normalizeString(x)).filter(x => x);
            jobNames = cj_helpers.distinctArray(jobNames);

            jobNames.forEach(jn => {
                let schedulersToStart = controller.getJobSchedulers()
                                                  .filter(x => cj_helpers.normalizeString(x.name) === jn &&
                                                               !x.isRunning);

                schedulersToStart.forEach(s => {
                    s.start().then((hasStarted) => {
                        //TODO
                    }, (err) => {
                        cj_helpers.log(`[ERROR] extension.cronJons.startJobsByName(2): ${err}`);
                    });
                });
            });
        }
        catch (e) {
            cj_helpers.log(`[ERROR] extension.cronJons.startJobsByName(1): ${e}`);
        }
    });

    // start non running jobs
    let startNoRunning = vscode.commands.registerCommand('extension.cronJons.startNoRunningJobs', () => {
        controller.startNoRunningJobs().then((startedJobs) => {
            let popupMsg: string;
            if (startedJobs.length < 1) {
                popupMsg = 'NO job has been STARTED.';
            }
            else if (1 == startedJobs.length) {
                popupMsg = 'One job has been STARTED.';
            }
            else {
                popupMsg = `${startedJobs.length} jobs have been STARTED.`;
            }

            showPopupMessage(popupMsg,
                             vscode.window.showInformationMessage);
        }, (err) => {
            showPopupMessage(`Could not START NON-RUNNING jobs: ${cj_helpers.toStringSafe(err)}`,
                             vscode.window.showErrorMessage);
        });
    });

    // stops a job
    let stopJob = vscode.commands.registerCommand('extension.cronJons.stopJob', () => {
        controller.stopJob().then((selectedJob) => {
            if (false === selectedJob) {
                showPopupMessage('There is no job that can be STOPPED.',
                                 vscode.window.showWarningMessage);
            }
            else if (selectedJob) {
                showPopupMessage(`Job '${selectedJob.label}' has been STOPPED.`,
                                 vscode.window.showInformationMessage);
            }
        }, (err) => {
            showPopupMessage(`Could not STOP job: ${cj_helpers.toStringSafe(err)}`,
                             vscode.window.showErrorMessage);
        });
    });

    // stops jobs by name
    let stopJobsByName = vscode.commands.registerCommand('extension.cronJons.stopJobsByName', (jobNames: cj_contracts.JobNames) => {
        try {
            jobNames = cj_helpers.asArray(jobNames).map(x => cj_helpers.normalizeString(x)).filter(x => x);
            jobNames = cj_helpers.distinctArray(jobNames);

            jobNames.forEach(jn => {
                let schedulersToStop = controller.getJobSchedulers()
                                                 .filter(x => cj_helpers.normalizeString(x.name) === jn &&
                                                              x.isRunning);

                schedulersToStop.forEach(s => {
                    s.stop().then((hasStopped) => {
                        //TODO
                    }, (err) => {
                        cj_helpers.log(`[ERROR] extension.cronJons.stopJobsByName(2): ${err}`);
                    });
                });
            });
        }
        catch (e) {
            cj_helpers.log(`[ERROR] extension.cronJons.stopJobsByName(1): ${e}`);
        }
    });

    // stop all running jobs
    let stopNoRunning = vscode.commands.registerCommand('extension.cronJons.stopRunningJobs', () => {
        controller.stopRunningJobs().then((stoppedJobs) => {
            let popupMsg: string;
            if (stoppedJobs.length < 1) {
                popupMsg = 'NO job has been STOPPED.';
            }
            else if (1 == stoppedJobs.length) {
                popupMsg = 'One job has been STOPPED.';
            }
            else {
                popupMsg = `${stoppedJobs.length} jobs have been STOPPED.`;
            }

            showPopupMessage(popupMsg,
                             vscode.window.showInformationMessage);
        }, (err) => {
            showPopupMessage(`Could not STOP RUNNING jobs: ${cj_helpers.toStringSafe(err)}`,
                             vscode.window.showErrorMessage);
        });
    });

    let htmlViewer = vscode.workspace.registerTextDocumentContentProvider('vs-cron-html',
                                                                          new cj_content.HtmlTextDocumentContentProvider(controller));

    // controller
    context.subscriptions
           .push(controller);

    // html viewer
    context.subscriptions
           .push(htmlViewer);

    // commands
    context.subscriptions
           .push(openHtmlDoc,
                 getJobs,
                 startJob, startNoRunning, startJobsByName,
                 stopJob, stopNoRunning, stopJobsByName,
                 restartJob, restartRunning, restartJobsByName);

    // notfiy setting changes
    context.subscriptions
           .push(vscode.workspace.onDidChangeConfiguration(controller.onDidChangeConfiguration, controller));

    controller.onActivated();
}

export function deactivate() {
    if (controller) {
        controller.onDeactivate();
    }
}
