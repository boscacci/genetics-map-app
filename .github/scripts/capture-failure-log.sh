#!/usr/bin/env bash
set -u

output_file="${FAILURE_LOG_FILE:-failure-log.txt}"
jobs_json="$(mktemp)"
job_ids_file="$(mktemp)"
repo="${GITHUB_REPOSITORY:-}"
run_id="${GITHUB_RUN_ID:-}"
server_url="${GITHUB_SERVER_URL:-https://github.com}"
token="${GITHUB_TOKEN:-}"

write_fallback() {
  {
    echo "Workflow failure summary"
    echo
    echo "Run: ${server_url}/${repo}/actions/runs/${run_id}"
    echo
    echo "$1"
  } > "$output_file"
}

if [ -z "$repo" ] || [ -z "$run_id" ] || [ -z "$token" ]; then
  write_fallback "Could not collect job details because GITHUB_REPOSITORY, GITHUB_RUN_ID, or GITHUB_TOKEN was missing."
  exit 0
fi

api_headers=(
  -H "Authorization: Bearer ${token}"
  -H "Accept: application/vnd.github+json"
  -H "X-GitHub-Api-Version: 2022-11-28"
)

jobs_url="https://api.github.com/repos/${repo}/actions/runs/${run_id}/jobs?filter=latest&per_page=100"
if ! curl -fsSL "${api_headers[@]}" "$jobs_url" -o "$jobs_json"; then
  write_fallback "Could not collect job details from the GitHub Actions API."
  exit 0
fi

node - "$jobs_json" "$output_file" "$job_ids_file" <<'NODE'
const fs = require('fs');

const [jobsPath, outputPath, jobIdsPath] = process.argv.slice(2);
const payload = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
const jobs = payload.jobs || [];
const failedConclusions = new Set(['failure', 'cancelled', 'timed_out', 'action_required']);
const failedJobs = jobs.filter((job) => (
  failedConclusions.has(job.conclusion) && job.name !== 'notify-failure'
));

const lines = [
  'Workflow failure summary',
  '',
  `Workflow: ${process.env.GITHUB_WORKFLOW || 'unknown'}`,
  `Run: ${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  `Attempt: ${process.env.GITHUB_RUN_ATTEMPT || 'unknown'}`,
  `Event: ${process.env.GITHUB_EVENT_NAME || 'unknown'}`,
  `Ref: ${process.env.GITHUB_REF_NAME || 'unknown'}`,
  `SHA: ${process.env.GITHUB_SHA || 'unknown'}`,
  '',
];

if (failedJobs.length === 0) {
  lines.push('No completed failed upstream jobs were found. The workflow may have been cancelled before a job reached a failure conclusion.');
} else {
  for (const job of failedJobs) {
    lines.push(`Failed job: ${job.name}`);
    lines.push(`Conclusion: ${job.conclusion}`);
    lines.push(`Started: ${job.started_at || 'unknown'}`);
    lines.push(`Completed: ${job.completed_at || 'unknown'}`);
    lines.push(`Job URL: ${job.html_url || 'unknown'}`);

    const problemSteps = (job.steps || []).filter((step) => (
      step.conclusion && !['success', 'skipped'].includes(step.conclusion)
    ));
    if (problemSteps.length > 0) {
      lines.push('Problem steps:');
      for (const step of problemSteps) {
        lines.push(`- ${step.name}: ${step.conclusion}`);
      }
    }
    lines.push('');
  }
}

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
fs.writeFileSync(jobIdsPath, failedJobs.map((job) => job.id).join('\n'));
NODE

while IFS= read -r job_id; do
  [ -n "$job_id" ] || continue
  {
    echo
    echo "----- Completed job log: ${job_id} -----"
  } >> "$output_file"

  log_url="https://api.github.com/repos/${repo}/actions/jobs/${job_id}/logs"
  if ! curl -fsSL -L "${api_headers[@]}" "$log_url" | tail -1000 >> "$output_file"; then
    echo "Could not download logs for completed job ${job_id}." >> "$output_file"
  fi
done < "$job_ids_file"
