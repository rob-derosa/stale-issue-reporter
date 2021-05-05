"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var today = new Date();
            //const prioritiesString = core.getInput("priorities", { required: true })
            //const gitHubToken = core.getInput("github-token", { required: true })
            const prioritiesString = "blocker=5,critical=10,important=60";
            const gitHubToken = "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";
            const context = github.context;
            const client = github.getOctokit(gitHubToken);
            const rules = prioritiesString.split(',');
            const priorityRules = new Array();
            rules.forEach(rule => {
                var arr = rule.split('=');
                priorityRules.push({ label: arr[0], staleDays: parseInt(arr[1]) });
            });
            const issues = yield client.paginate(client.rest.issues.listForRepo, {
                owner: "githubcustomers",
                repo: "LinkedIn",
                // owner: context.repo.owner,
                // repo: context.repo.repo,
                per_page: 500,
            });
            const staleIssues = new Array();
            for (const issue of issues) {
                if (issue.state == "closed")
                    continue;
                for (const label of issue.labels) {
                    for (const rule of priorityRules) {
                        if (rule.label == label.name && issue.assignees.length > 0) {
                            let lastComment = {};
                            if (issue.comments > 0) {
                                yield delay(1000);
                                const data = yield client.rest.issues.listComments({ owner: "githubcustomers", repo: "linkedin", issue_number: issue.number });
                                let commentsDesc = data.data.reverse();
                                commentsDesc.forEach((cm) => {
                                    issue.assignees.forEach((user) => {
                                        if (cm.user.login == user.login) {
                                            lastComment = cm;
                                            return;
                                        }
                                    });
                                });
                            }
                            const staleIssue = {
                                issue: issue,
                                priorityRule: rule,
                                lastComment: lastComment,
                                daysWithoutComment: 0
                            };
                            let dateToCheck = new Date(issue.created_at);
                            if (lastComment.created_at) {
                                dateToCheck = new Date(lastComment.created_at);
                            }
                            var diff = today.getTime() - dateToCheck.getTime();
                            let days = (diff / (60 * 60 * 24 * 1000));
                            if (days >= staleIssue.priorityRule.staleDays) {
                                staleIssue.daysWithoutComment = Math.round(days);
                                staleIssues.push(staleIssue);
                            }
                        }
                        break;
                    }
                }
            }
            for (const issue of staleIssues) {
                let assignees = "";
                issue.issue.assignees.forEach((user) => {
                    assignees += ", " + user.login;
                });
                assignees = assignees.substring(2);
                let log = `Issue #${issue.issue.number} - ${issue.issue.html_url} - ${issue.priorityRule.label} - ${issue.daysWithoutComment} days without a comment - assigned to ${assignees}`;
                console.log(log);
            }
        }
        catch (error) {
            console.log(error);
            core.setFailed(error.message);
        }
    });
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
run();
//# sourceMappingURL=main.js.map