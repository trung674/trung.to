---
title: "Learnings from migrating 20 TB of files"
pubDatetime: 2026-10-11
tags:
  - rclone
  - google-cloud-storage
description: "Six lessons from migrating 20 TB of files from On-Premise to Cloud with rclone."
---

A problem I recently worked on was to migrate 20 TB of files from an on-premises server to Google Cloud Storage (GCS). The dataset was about 350 million static files, ranging in size from 1 KB to 100 MB. With no prior experience in data migration of this scale, I immediately searched Google for the best solutions to copy files from a local directory to GCS and [rclone](https://rclone.org/) came up as the top result.

After jumping between `rclone` docs, I installed the tool on the server and ran `rclone copy`, pointing it at the local directory where the files are located as the source and the private GCS bucket as the destination, along with some additional options such as [no-traverse](https://rclone.org/docs/#no-traverse), [transfers](https://rclone.org/docs/#transfers-int) & [checkers](https://rclone.org/docs/#checkers-int). The result? 5 hours in and the server ran out of memory, crashed then rebooted. The problem was that one of the sub-folder in the source directory had over 100 million files and there wasn't enough RAM on the server for `rclone` to hold the full directory listing.

I then turned to a different solution, [Google Cloud Storage Transfer Service](https://cloud.google.com/storage-transfer-service) (STS). Again, I followed the doc, set up an [STS agent](https://docs.cloud.google.com/storage-transfer/docs/managing-on-prem-agents) , pointed it at the source directory and started the transfer job. No more out-of-memory issue this time so I let it run overnight. Next morning, only just over 100 GB had been copied after 10 hours! At that rate, it would take months to finish the migration using STS. I could have tried to [maximize agent performance](https://docs.cloud.google.com/storage-transfer/docs/on-prem-agent-best-practices#sizing-agents), but in the end I didn't bother, because I personally found it difficult to work with STS.

After much trial and error, I managed to find a suitable strategy using `rclone` and successfully migrated all 20 TB in 3 days. The tips below are valuable lessons I learned throughout the journey and I hope they will be useful for others who are working on similar tasks.

## Tip #1: Sync file activity across storage locations

Before starting any migration activity, we need to make sure all file changes (create, edit, delete) are applied to both the source and the destination. Do this first, and we won't need to worry about file discrepancy during and after the migration.

## Tip #2: Index the data source

Indexing the source directory will give us a full view of what we will be working on:
- the directory structure
- the file types
- the total number of files
- the smallest and the the largest file

Utilize local CLI tools such as `find` to explore the directory, `wc` for file count, `sort` for finding file with smallest/largest size, `awk` & `sed` for editing. These tools are battle-tested and fast, chaining them together will help create an index file listing every files inside the source directory in whatever format we want. <u>This index file will be the source of truth for all future tasks to be carried out.</u>

## Tip #3: Exclude unwanted files

Peeking at the index file, we may find a staggering number of files which should not be made public, for example: `.htaccess`, `.DS_Store`, `.git` folder (!?), and much more.

Unless there is a serious business requirement, signed off by relevant stakeholders, to keep those files in the new world, REMOVE their entries from the index file and by all means, DO NOT migrate them!

## Tip #4: Divide and conquer

A large index file of hundreds of millions of lines, passing to `rclone` via [files-from](https://rclone.org/filtering/#files-from-read-list-of-source-file-names) option, would cause the tool to choke trying to load the file content in memory if there isn't enough RAM on the machine. Instead, split the index file into smaller chunks using `split`, then start one `rclone` process for each chunk using `xargs`. This approach has several benefits:

- **Maximizing the throughput**: Multiple processes can copy multiple files at the same time. The number of concurrent copies can be increased further by tuning `transfers` option.
- **Failures cost less:** If a process crashes, gets throttled, or the machine reboots, we only re-run on that chunk.
- **Memory stays bounded:** Each process holds only the provided chunk data, so no single process needs more than 1 GB of RAM.
- **One slow process doesn’t affect everything:** A chunk with a giant directory or troublesome files only slows its own process, other processes continue to operate normally.
- **Verification is easier:** We can run `rclone check` per chunk and fix problems in isolation, rather than checking hundreds of millions of files at once.

## Tip #5: Log errors for troubleshooting

It can be difficult to keep track of errors when running multiple `rclone` processes in parallel. By logging all of `rclone`'s output to a file with [log-file](https://rclone.org/docs/#log-file-string) option, we can then search for errors across the log files with `grep`. For better clarity, append the index chunk ID/name to the log file name, making it easy to see which log file was generated by which process.

## Tip #6: Validate the transferred data

Always prepare a verification plan to confirm that all files are copied successfully from the source to the destination. No error logs does not mean there wasn't any silent failures. At minimum, the following checks are needed:

- Are the file contents the same between the source and the destination?
- Is the directory structure the same between the source and the destination?
- Is the number of files the same between the source and the destination?
- Are any excluded files/folders (from tip #3) present at the destination?
- Is Content-Type metadata correct (if applicable)? For example, the Content-Type metadata of an HTML file should be `text/html` instead of `application/octet-stream`.

> [!HINT]
> Index the destination directory after the migration with `rclone lsf`, then compare the source index and the destination index with `diff`.
>
> We could add extra info to the indexes such as file checksum to also verify the file integrity between the source and the destination.

What checks required depend on the file types. Having a concrete verification plan will save us a lot of time and give us the confidence to say:

**"The migration is completed!"**

Thank you for reading ❤️