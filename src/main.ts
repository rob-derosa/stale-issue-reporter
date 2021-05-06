import * as core from "@actions/core";
import * as github from '@actions/github'

type StaleIssue = {
  issue: any;
  priorityRule: PriorityRule;
  lastComment: any;
  daysWithoutComment: number;
};

type PriorityRule = {
  label: string;
  staleDays: number;
  rank: number;
}

async function run(): Promise<void> {
  try {

    var today = new Date();

    const labelsString = core.getInput("labels", { required: true });
    const buffer = parseInt(core.getInput("buffer", { required: false }));
    const gitHubToken = core.getInput("github-token", { required: true });
    const context = github.context;

    const client = github.getOctokit(gitHubToken);
    const rules = labelsString.split(',');
    const priorityRules = new Array<PriorityRule>();

    let rank = 0;
    rules.forEach(rule => {
      var arr = rule.split('=');
      priorityRules.push({ label: arr[0], staleDays: parseInt(arr[1]), rank: rank });
      rank++;
    });

    const issues = await client.paginate(client.rest.issues.listForRepo, {
      owner: context.repo.owner,
      repo: context.repo.repo,
      per_page: 500,
    });

    const staleIssues = new Array<StaleIssue>();
    for (const issue of issues) {
      if (issue.state != "open")
        continue;

      for (const label of issue.labels) {
        for (const rule of priorityRules) {
          if (rule.label == label.name && issue.assignees.length > 0) {

            let lastComment = {} as any;
            if (issue.comments > 0) {
              await delay(1000); //Need to do legit rate-limit failover
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

    //Sort based on label order
    var sortedIssues: StaleIssue[] = staleIssues.sort((n1, n2) => {
      if (n1.priorityRule.rank > n2.priorityRule.rank) {
        return 1;
      }

      if (n1.priorityRule.rank < n2.priorityRule.rank) {
        return -1;
      }

      return 0;
    });

    const repo = `${context.repo.owner}/${context.repo.repo}`;
    let output = `## Stale issues as of ${new Date().toLocaleDateString('en-US')} for [${repo}](${repo})`;
    let lastPriority;
    for (const issue of sortedIssues) {
      if (lastPriority != issue.priorityRule.label) {
        lastPriority = issue.priorityRule.label;
        output += `\n### ${lastPriority}`;
      }

      let assignees = "";
      issue.issue.assignees.forEach((user: any) => {
        assignees += `, [${user.login}](https://github.com/${user.login})`;
      });

      assignees = assignees.substring(2);

      let log = `\n* [Issue #${issue.issue.number}](${issue.issue.html_url}): ~${issue.daysWithoutComment} days without a status update - assigned to ${assignees}`;
      output += log;
    }

    if (staleIssues.length > 0) {
      let gist = await client.gists.create({ description: "Stale Prioritized Issues", files: { ["stale-issues-report.md"]: { content: output.toString() } } });
      console.log("Stale Issues Report Url: " + gist.data.html_url);
      core.setOutput("report-url", gist.data.html_url);
    } else {
      console.log("No results, therefore no report.");
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