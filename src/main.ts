import * as core from "@actions/core";
import * as github from '@actions/github'
import { cpuUsage } from "process";

type StaleIssue = {
  issue: any;
  priorityRule: PriorityRule;
  lastComment: any;
  daysWithoutComment: number;
};

type PriorityRule = {
  label: string;
  staleDays: number;
}

async function run(): Promise<void> {
  try {

    var today = new Date();

    const prioritiesString = core.getInput("priorities", { required: true });
    const buffer = parseInt(core.getInput("buffer", { required: false }));
    const gitHubToken = core.getInput("github-token", { required: true });
    const context = github.context;

    const client = github.getOctokit(gitHubToken);
    const rules = prioritiesString.split(',');
    const priorityRules = new Array<PriorityRule>();

    rules.forEach(rule => {
      var arr = rule.split('=');
      priorityRules.push({ label: arr[0], staleDays: parseInt(arr[1]) })
    });

    const issues = await client.rest.issues.listForRepo({ owner: context.repo.owner, repo: context.repo.repo });

    const staleIssues = new Array<StaleIssue>();
    for (const issue of issues) {
      if (issue.state != "open")
        continue;

      for (const label of issue.labels) {
        for (const rule of priorityRules) {
          if (rule.label == label.name && issue.assignees.length > 0) {

            let lastComment = {} as any;
            if (issue.comments > 0) {
              await delay(1000);
              const data = await client.rest.issues.listComments({ owner: context.repo.owner, repo: context.repo.repo, issue_number: issue.number })
              let commentsDesc = data.data.reverse();

              commentsDesc.forEach((cm: any) => {

                issue.assignees.forEach((user: any) => {
                  if (cm.user.login == user.login) {
                    lastComment = cm;
                    return;
                  }
                });
              });
            }

            const staleIssue: StaleIssue = {
              issue: issue,
              priorityRule: rule,
              lastComment: lastComment,
              daysWithoutComment: 0
            };

            let dateToCheck: Date = new Date(issue.created_at);
            if (lastComment.created_at) {
              dateToCheck = new Date(lastComment.created_at);
            }

            var diff = today.getTime() - dateToCheck.getTime();
            let days = (diff / (60 * 60 * 24 * 1000));

            if (days >= staleIssue.priorityRule.staleDays - buffer) {
              staleIssue.daysWithoutComment = Math.round(days);
              staleIssues.push(staleIssue);
            }
          }
          break;
        }
      }
    }

    let output = "## Prioritized Issues Needing a Status Update";
    for (const issue of staleIssues) {
      let assignees = "";
      issue.issue.assignees.forEach((user:any) => {
        assignees += ", " + user.login;
      });

      assignees = assignees.substring(2);

      let log = `\n* [Issue #${issue.issue.number}](${issue.issue.html_url}):  ${issue.priorityRule.label} - ${issue.daysWithoutComment} days without a comment - assigned to @${assignees}`;
      output += log;
    }

    if(staleIssues.length > 0) {
      let gist = await client.gists.create({ description: "Stale Issues Needing a Status Update", files: { [ "stale-issues-report.md"] : {content: output.toString()}}});
      console.log("Stale Report Url: " + gist.data.html_url);
      core.setOutput("report-url", gist.data.html_url);
    } else {
      console.log("No results, therefor no report.");
    }


  } catch (error) {
    console.log(error);
    core.setFailed(error.message)
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

run()