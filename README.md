# Stale Issue Reminder 

Generates a gist report of stale issues. A stale issue is an assigned issue that is labeled and has not had a recent comment within the required threshold. For example, an issue with a `blocker` label is required to have the assignee(s) post a new comment every 14 days. We can optionally pass in a `buffer` parameter of `3` if we would like to include issues where the assignee(s) have not posted a comment within 11 days, giving the assignee(s) a bit more notice.

A URL of the new gist will be output and show in the log.

## Sample Usage

```yaml
name: 'Generate stale issues report'
on:
  workflow_dispatch
jobs:
  generate-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: ./
        name: "generate report of stale issues"
        with:
          labels: "blocker=14,critical=30,important=60"
          buffer: 3
          github-token: ${{ secrets.GIST_PAT }}
```

## License

MIT