# Issue Reporter 

Generates a gist report of issues with a label of `blocker`, `critical` or `important` and assigned to a user but has not had a fresh status update (comment) in X amount of days depending on the priority label.

## Sample Usage

```yaml
name: 'Remind assignees'
on:
  workflow_dispatch
jobs:
  generate-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: rob-derosa/issue-comment-reminder@main
        name: "Send reminders"
        with:
          priorities: "blocker=14,critical=30,important=60"
          buffer: 3
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## License

MIT