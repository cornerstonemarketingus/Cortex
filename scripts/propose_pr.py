#!/usr/bin/env python3
"""Simple PR automation helper (dry-run by default).
Usage: propose_pr.py --branch my-fix --message "Fix X" --path changes/
This helper will create a branch, copy files, commit, and (if gh cli available) create a PR.
"""
import argparse, subprocess, shutil, os

parser = argparse.ArgumentParser()
parser.add_argument('--branch', required=True)
parser.add_argument('--message', required=True)
parser.add_argument('--path', required=True)
parser.add_argument('--dry-run', action='store_true', default=True)
args = parser.parse_args()

if args.dry_run:
    print('DRY-RUN: would create branch', args.branch, 'with message', args.message, 'from path', args.path)
    exit(0)

# Non-dry-run flow (requires git and gh setup)
subprocess.check_call(['git', 'checkout', '-b', args.branch])
subprocess.check_call(['git', 'add', args.path])
subprocess.check_call(['git', 'commit', '-m', args.message])
# push
subprocess.check_call(['git', 'push', '--set-upstream', 'origin', args.branch])
# try to create PR with gh
if shutil.which('gh'):
    subprocess.check_call(['gh', 'pr', 'create', '--fill'])
else:
    print('Push complete. Create a PR manually or install gh cli.')
