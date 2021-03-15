# Assemble Take Home Assignment

Assemble is a browser-based spreadsheet app built largely in `pl/pgsql` via triggers. The goal of this test is to introduce you to database-oriented programming and gauge your ability to solve a non-trivial but not too complex problem.

## How to take this test

For this test, our goal is to give you time to think through a problem similar to the ones you'll encounter at Rewired and understand how you think through it and see how you come to solutions.

Please don't spend more than 3-5 hours on it! If you don't have 3-5 hours to devote to it,
just let us know and we can come up with something else.

Down below, there is an introduction to the task and additional questions to think through. Of course, the ideal submission would include passing tests and good answers to all questions, but a submission that lays out your goals, thoughtfully answers the questions and contains no code can be better than one that just makes the tests pass.

To get started, read the rest of the README, get your dev environment set up, and get going!

To submit, create a branch called `first-last` and commit your changes there. Next, push your branch to a repo on your personal GitHub, make sure `ben-pr-p` and `bchrobot` have access, and send an email to [hiring@politicsrewired.com](mailto:hiring@politicsrewired.com) letting us know you've finished. In that email, also include any additional thoughts related to the questions.

## Getting Started

1. Get PostgreSQL up and running. You can see instructions 
   [here (for Mac OS)](https://postgresapp.com/) or 
   [here (for Windows)](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
   If it's taking more than a few minutes, send an email to
   [ben@politicsrewired.com](mailto:ben@politicsrewired.com) and we'll set up a 
   small remote database for you. In order to run the migrations and tests, 
   you'll need Postgresql running locally on 5432. If you'd like to use a 
   remote Postgres or local postgres running on a different port, just 
   set `export DATABASE_URL=<your database url>`. 

2. Install NodeJS and [Yarn](https://classic.yarnpkg.com/en/docs/install/#mac-stable). 
   This take home has been tested with Node v12 and v14.

3. Create the database to run the tests. You may find it easiest to pop into `psql`:

```
MacBook-Pro-5:assemble-backend-engineer-take-home benpacker$ psql
psql (12.2, server 11.8)
Type "help" for help.

benpacker=# create database rewired_test;
CREATE DATABASE
```

From there, you can run:

```
yarn migrate watch
```

And each time you change the file `sql/current/02-prevent-sends-to-triple-unsubscribes.sql`,
your changes will be reflected in the database and errors displayed in your terminal.

Then, you can run:
```
yarn test
```
to run the tests.

## The Test

### Background

This repo contains a simple reproduction of one component of a messaging application. In this application,
(not included here), sending messages is accomplished by inserting into the `outbound_messages` table, which then,
via triggers, queue the sending of the message (also not included here).

Each user of the application has an entry in the `profiles` table.

When a message is sent, we later receive a delivery report via a webhook. This delivery report will contain
an event - in this case, the event is either `'delivered'` or `'failed'`, and if it's `failed`, there will also be
an associated error code, here simplified to either `30007` (flagged as spam) or `21610`
(failed to send because the contact was opted out).

This `21610` error is the one we're focusing on here. It occurs when a message is 
sent from a specific profile to a phone number that has already opted out from messages
from that specific profile.

Twilio has asked us kindly not to send messages to contacts who have unsubscribed 
from 3 separate users of ours, and so we need to start keeping track of that, and throw
an error when someone attempts to send a message to a phone number that has already
unsubscribed from 3 distinct profiles.

### Goal

To get started, take a look at the tests in `__tests__/assignment.spec.ts`.
If you run `yarn test`, you can tell that one test is failing. Your goal is to make all tests pass!

To do this, you should not _need_ to modify any code in `assignment.spec.ts` or write any Javascript - we'd like you to find a
solution that relies on the features provided by PostgreSQL itself.

To verify that the test code is working properly, you can uncomment the provided test cheat in the second migration file.
This cheat relies on a specific body being passed in and is not a proper, general, solution, but it is provided to test
the test as well as provide an example for how to trigger the specific error that we're looking for.

If you'd like to write any additional tests in `assignment.spec.ts` (or create another test file) to test
intermediate components of your solution, feel free to do so.

### Documentation

For a quick introduction to database oriented programming, check out
[this blog post](https://pgdash.io/blog/postgres-server-side-programming.html).
For a quick introduction to why you'd want to do this, check out [this talk](https://www.youtube.com/watch?v=XDOrhTXd4pE).

Optimal solutions may use PostgreSQL features that aren't in other traditional RDBMS.
The following links may be useful:
- [CREATE TRIGGER](https://www.postgresql.org/docs/13/sql-createtrigger.html)
- [CREATE FUNCTION](https://www.postgresql.org/docs/13/sql-createfunction.html)
- [Array type](https://www.postgresql.org/docs/13/arrays.html)
- [JSON(B) type](https://www.postgresqltutorial.com/postgresql-json/)

### Questions

1. Assume that your application contains over 500 million messages and over 500
   million delivery reports. Will it be fast to check, before sending a message, if
   the recipient shouldn't be texted? If not, what could be done to speed it up?

2. Assuming similarly large row counts, will it be fast to handle an incoming 21610
   delivery report? If not, what could be done to speed it up?

3. Suppose that just before you're ready to release your changes, someone on your team
   tells you that even though the magic number is 3 distinct unsubscribes now, it may
   change in the future to 2, 4, 5, etc. Does this change how you approach your solution
   at all?

